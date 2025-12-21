import { useMutation } from "@tanstack/react-query";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { trpc } from "@/utils/trpc";

const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier";

const getDeviceIdentifier = async (): Promise<string> => {
  // Try to get stored identifier first
  const stored = await SecureStore.getItemAsync(DEVICE_IDENTIFIER_KEY);
  if (stored) {
    return stored;
  }

  // Generate a new identifier based on platform
  const baseId =
    Platform.OS === "android"
      ? (Application.getAndroidId() ?? crypto.randomUUID())
      : crypto.randomUUID();

  const deviceName = Constants.deviceName ?? "unknown";
  const newId = `mobile-${Platform.OS}-${baseId}-${deviceName}`;

  // Persist the identifier
  await SecureStore.setItemAsync(DEVICE_IDENTIFIER_KEY, newId);
  return newId;
};

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const extractUrlFromText = (text: string): string | null => {
  // Try to extract a URL from shared text
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
};

type UseShareIntentResult = {
  sharedUrl: string | null;
  sendToDevices: () => void;
  isSending: boolean;
  sendResult: { sentToMobile: number; sentToExtensions: number } | null;
  sendError: { message: string } | null;
  clearSharedUrl: () => void;
};

export const useShareIntent = (): UseShareIntentResult => {
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [deviceIdentifier, setDeviceIdentifier] = useState<string>("");

  // Initialize device identifier
  useEffect(() => {
    getDeviceIdentifier().then(setDeviceIdentifier);
  }, []);

  const sendTabMutation = useMutation(
    trpc.tab.send.mutationOptions({
      onSuccess: () => {
        // Clear the shared URL after successful send
        setSharedUrl(null);
      },
    }),
  );

  const handleUrl = useCallback((url: string) => {
    // Check if the URL is a share intent or a valid URL to share
    if (isValidUrl(url)) {
      setSharedUrl(url);
    } else {
      // Try to extract URL from text
      const extracted = extractUrlFromText(url);
      if (extracted) {
        setSharedUrl(extracted);
      }
    }
  }, []);

  useEffect(() => {
    // Handle URL that launched the app
    const checkInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && isValidUrl(initialUrl)) {
        // Check if this is not our own deep link scheme
        const parsed = Linking.parse(initialUrl);
        if (parsed.scheme !== "opentab" && parsed.scheme !== "exp") {
          handleUrl(initialUrl);
        }
      }
    };

    checkInitialUrl();

    // Handle URLs while app is running
    const subscription = Linking.addEventListener("url", (event) => {
      const parsed = Linking.parse(event.url);
      // Only handle external URLs, not our own deep links
      if (parsed.scheme !== "opentab" && parsed.scheme !== "exp") {
        handleUrl(event.url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);

  const sendToDevices = useCallback(() => {
    if (!sharedUrl || !deviceIdentifier) return;

    sendTabMutation.mutate({
      url: sharedUrl,
      title: undefined,
      sourceDeviceIdentifier: deviceIdentifier,
    });
  }, [sharedUrl, sendTabMutation, deviceIdentifier]);

  const clearSharedUrl = useCallback(() => {
    setSharedUrl(null);
  }, []);

  return {
    sharedUrl,
    sendToDevices,
    isSending: sendTabMutation.isPending,
    sendResult: sendTabMutation.data ?? null,
    sendError: sendTabMutation.error,
    clearSharedUrl,
  };
};
