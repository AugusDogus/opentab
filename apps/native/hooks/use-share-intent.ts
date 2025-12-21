import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";

import { useDeviceIdentifier } from "@/hooks/use-device-identifier";
import { trpc } from "@/utils/trpc";

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
  const { deviceIdentifier } = useDeviceIdentifier();

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
