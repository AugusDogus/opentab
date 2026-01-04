import { useMutation } from "@tanstack/react-query";
import { useShareIntent as useExpoShareIntent } from "expo-share-intent";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Platform } from "react-native";

import { useDeviceIdentifier } from "~/hooks/use-device-identifier";
import { trpc } from "~/utils/trpc";

const extractUrlFromText = (text: string): string | null => {
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
};

export const useShareIntent = () => {
  const { deviceIdentifier } = useDeviceIdentifier();
  const { hasShareIntent, shareIntent, resetShareIntent } = useExpoShareIntent();
  const processedIntentRef = useRef<string | null>(null);
  const [showIOSSuccess, setShowIOSSuccess] = useState(false);

  const sendTabMutation = useMutation(
    trpc.tab.send.mutationOptions({
      onSuccess: () => {
        resetShareIntent();
        if (Platform.OS === "android") {
          BackHandler.exitApp();
        } else {
          // On iOS, there's no API to return to the previous app.
          // Show a success screen so users know to tap the back button.
          setShowIOSSuccess(true);
        }
      },
    }),
  );

  useEffect(() => {
    if (!hasShareIntent || !shareIntent || !deviceIdentifier) return;

    let url: string | null = null;
    let title: string | null = null;

    if (shareIntent.webUrl) {
      url = shareIntent.webUrl;
      title = shareIntent.meta?.title ?? null;
    } else if (shareIntent.text) {
      url = extractUrlFromText(shareIntent.text);
      title = shareIntent.meta?.title ?? null;
    }

    if (!url) return;
    if (processedIntentRef.current === url) return;
    processedIntentRef.current = url;

    sendTabMutation.mutate({
      url,
      title: title ?? undefined,
      sourceDeviceIdentifier: deviceIdentifier,
    });
  }, [hasShareIntent, shareIntent, deviceIdentifier, sendTabMutation]);

  return {
    isSending: sendTabMutation.isPending,
    sendResult: sendTabMutation.data ?? null,
    sendError: sendTabMutation.error,
    showIOSSuccess,
  };
};
