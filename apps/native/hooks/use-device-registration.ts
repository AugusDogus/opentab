import { decryptFromDevice, deserializeEncryptedPayload } from "@opentab/crypto";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { isDevice } from "expo-device";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

import { useDeviceIdentifier } from "@/hooks/use-device-identifier";
import { useEncryptionKeys } from "@/hooks/use-encryption-keys";
import { trpc } from "@/utils/trpc";

const openUrl = (url: string) => {
  Linking.openURL(url);
};

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const setupNotificationChannel = async (): Promise<void> => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
};

const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
};

const getPushToken = async (): Promise<string | null> => {
  if (!isDevice) {
    console.log("Push notifications are only available on physical devices");
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log("Push notification permission not granted");
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error("EAS project ID is not configured");
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
};

/**
 * Decrypt notification data and extract URL
 */
const decryptNotificationUrl = (
  data: Record<string, unknown>,
  secretKey: string,
): string | null => {
  const encryptedDataStr = data?.encryptedData as string | undefined;
  if (!encryptedDataStr) return null;

  try {
    const encryptedPayload = deserializeEncryptedPayload(encryptedDataStr);
    const decryptedData = decryptFromDevice(encryptedPayload, secretKey);
    return decryptedData.url;
  } catch (error) {
    console.error("Failed to decrypt notification data:", error);
    return null;
  }
};

export const useDeviceRegistration = () => {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const hasHandledInitialNotification = useRef(false);
  const { deviceIdentifier, isLoading: isDeviceIdLoading } = useDeviceIdentifier();
  const { publicKey, secretKey, isLoading: isKeysLoading } = useEncryptionKeys();

  // Query the devices list to check if this device is already registered
  const devices = useQuery(trpc.device.list.queryOptions());

  const registerDeviceMutation = useMutation(
    trpc.device.register.mutationOptions({
      onSuccess: (data) => {
        console.log("Device registered successfully:", data);
        devices.refetch();
      },
      onError: (error) => {
        console.error("Failed to register device:", error);
      },
    }),
  );

  const registerDevice = useCallback(async () => {
    if (!deviceIdentifier) {
      console.log("Device identifier not yet loaded, skipping registration");
      return;
    }

    if (!publicKey) {
      console.log("Encryption keys not yet loaded, skipping registration");
      return;
    }

    if (!devices.data) {
      console.log("Devices list not yet loaded, skipping registration");
      return;
    }

    if (registerDeviceMutation.isPending) {
      console.log("Registration already in progress, skipping");
      return;
    }

    // Check if this device is already registered
    const isAlreadyRegistered = devices.data.some(
      (device) => device.deviceIdentifier === deviceIdentifier,
    );

    if (isAlreadyRegistered) {
      console.log("Device already registered, skipping");
      return;
    }

    await setupNotificationChannel();
    const pushToken = await getPushToken();
    const deviceName = Constants.deviceName ?? `${Platform.OS} device`;

    registerDeviceMutation.mutate({
      deviceType: "mobile",
      deviceName,
      pushToken: pushToken ?? undefined,
      deviceIdentifier,
      publicKey,
    });
  }, [registerDeviceMutation, deviceIdentifier, devices.data, publicKey]);

  useEffect(() => {
    // Don't set up notification handlers until we have the secret key
    if (!secretKey) return;

    // Handle cold start from notification
    if (!hasHandledInitialNotification.current) {
      hasHandledInitialNotification.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        const data = response?.notification.request.content.data;
        if (data) {
          const url = decryptNotificationUrl(data, secretKey);
          if (url) openUrl(url);
        }
      });
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data) {
        const url = decryptNotificationUrl(data, secretKey);
        if (url) openUrl(url);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [secretKey]);

  return {
    registerDevice,
    isRegistering: registerDeviceMutation.isPending || isDeviceIdLoading || isKeysLoading,
    registrationError: registerDeviceMutation.error,
    deviceIdentifier,
  };
};
