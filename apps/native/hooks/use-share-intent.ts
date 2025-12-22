import { useMutation } from "@tanstack/react-query";
import { useShareIntent as useExpoShareIntent } from "expo-share-intent";
import { useCallback, useEffect, useState } from "react";

import { useDeviceIdentifier } from "@/hooks/use-device-identifier";
import { trpc } from "@/utils/trpc";

const extractUrlFromText = (text: string): string | null => {
  // Try to extract a URL from shared text
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
};

type UseShareIntentResult = {
  sharedUrl: string | null;
  sharedTitle: string | null;
  sendToDevices: () => void;
  isSending: boolean;
  sendResult: { sentToMobile: number; sentToExtensions: number } | null;
  sendError: { message: string } | null;
  clearSharedUrl: () => void;
};

export const useShareIntent = (): UseShareIntentResult => {
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [sharedTitle, setSharedTitle] = useState<string | null>(null);
  const { deviceIdentifier } = useDeviceIdentifier();

  // Use expo-share-intent hook for native share intent handling
  const { hasShareIntent, shareIntent, resetShareIntent } = useExpoShareIntent();

  const sendTabMutation = useMutation(
    trpc.tab.send.mutationOptions({
      onSuccess: () => {
        // Clear the shared URL after successful send
        setSharedUrl(null);
        setSharedTitle(null);
        resetShareIntent();
      },
    }),
  );

  // Process share intent when received
  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      // First check for webUrl (extracted URL from share intent)
      if (shareIntent.webUrl) {
        setSharedUrl(shareIntent.webUrl);
        setSharedTitle(shareIntent.meta?.title ?? null);
      }
      // If no webUrl, try to extract from text
      else if (shareIntent.text) {
        const extracted = extractUrlFromText(shareIntent.text);
        if (extracted) {
          setSharedUrl(extracted);
          setSharedTitle(shareIntent.meta?.title ?? null);
        }
      }
    }
  }, [hasShareIntent, shareIntent]);

  const sendToDevices = useCallback(() => {
    if (!sharedUrl || !deviceIdentifier) return;

    sendTabMutation.mutate({
      url: sharedUrl,
      title: sharedTitle ?? undefined,
      sourceDeviceIdentifier: deviceIdentifier,
    });
  }, [sharedUrl, sharedTitle, sendTabMutation, deviceIdentifier]);

  const clearSharedUrl = useCallback(() => {
    setSharedUrl(null);
    setSharedTitle(null);
    resetShareIntent();
  }, [resetShareIntent]);

  return {
    sharedUrl,
    sharedTitle,
    sendToDevices,
    isSending: sendTabMutation.isPending,
    sendResult: sendTabMutation.data ?? null,
    sendError: sendTabMutation.error,
    clearSharedUrl,
  };
};
