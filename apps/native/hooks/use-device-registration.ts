import { useMutation } from "@tanstack/react-query";
import Constants from "expo-constants";
import { isDevice } from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useEffect, useRef, useCallback } from "react";

import { useDeviceIdentifier } from "@/hooks/use-device-identifier";
import { trpc } from "@/utils/trpc";

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

type UseDeviceRegistrationOptions = {
  onUrlReceived?: (url: string) => void;
};

export const useDeviceRegistration = (options: UseDeviceRegistrationOptions = {}) => {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const onUrlReceivedRef = useRef(options.onUrlReceived);
  const hasRegisteredRef = useRef(false);
  const { deviceIdentifier, isLoading: isDeviceIdLoading } = useDeviceIdentifier();

  // Keep the ref up to date with the latest callback
  useEffect(() => {
    onUrlReceivedRef.current = options.onUrlReceived;
  }, [options.onUrlReceived]);

  const registerDeviceMutation = useMutation(
    trpc.device.register.mutationOptions({
      onSuccess: (data) => {
        console.log("Device registered successfully:", data);
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

    // Only register once per app session to avoid duplicate registrations
    if (hasRegisteredRef.current) {
      console.log("Device already registered in this session, skipping");
      return;
    }

    hasRegisteredRef.current = true;

    await setupNotificationChannel();
    const pushToken = await getPushToken();
    const deviceName = Constants.deviceName ?? `${Platform.OS} device`;

    registerDeviceMutation.mutate({
      deviceType: "mobile",
      deviceName,
      pushToken: pushToken ?? undefined,
      deviceIdentifier,
    });
  }, [registerDeviceMutation, deviceIdentifier]);

  useEffect(() => {
    // Handle notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification);
    });

    // Handle notification tap (when user taps on notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const url = data?.url as string | undefined;

      if (url && onUrlReceivedRef.current) {
        onUrlReceivedRef.current(url);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return {
    registerDevice,
    isRegistering: registerDeviceMutation.isPending || isDeviceIdLoading,
    registrationError: registerDeviceMutation.error,
    deviceIdentifier,
  };
};
