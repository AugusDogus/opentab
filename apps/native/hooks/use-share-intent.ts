import { useMutation, useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useShareIntent as useExpoShareIntent } from "expo-share-intent";
import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

import { useDeviceIdentifier } from "@/hooks/use-device-identifier";
import { useEncryptionKeys } from "@/hooks/use-encryption-keys";
import { trpc } from "@/utils/trpc";

const extractUrlFromText = (text: string): string | null => {
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
};

export const useShareIntent = () => {
  const { deviceIdentifier } = useDeviceIdentifier();
  const { publicKey, encryptForTargetDevices, isLoading: isKeysLoading } = useEncryptionKeys();
  const { hasShareIntent, shareIntent, resetShareIntent } = useExpoShareIntent();
  const processedIntentRef = useRef<string | null>(null);

  // Fetch target devices with their public keys
  const targetDevicesQuery = useQuery(
    trpc.device.getTargetDevices.queryOptions(
      { sourceDeviceIdentifier: deviceIdentifier ?? "" },
      { enabled: !!deviceIdentifier },
    ),
  );

  const sendTabMutation = useMutation(
    trpc.tab.sendEncrypted.mutationOptions({
      onSuccess: () => {
        resetShareIntent();
        if (Platform.OS === "android") {
          BackHandler.exitApp();
        } else {
          Linking.openURL("about:blank").catch(() => {});
        }
      },
    }),
  );

  useEffect(() => {
    if (!hasShareIntent || !shareIntent || !deviceIdentifier) return;
    if (!publicKey || isKeysLoading) return;
    if (!targetDevicesQuery.data || targetDevicesQuery.data.length === 0) return;

    const url =
      shareIntent.webUrl ?? (shareIntent.text ? extractUrlFromText(shareIntent.text) : null);
    const title = shareIntent.meta?.title ?? undefined;

    if (!url) return;
    if (processedIntentRef.current === url) return;
    processedIntentRef.current = url;

    // Encrypt the tab data for each target device
    const encryptedPayloads = encryptForTargetDevices({ url, title }, targetDevicesQuery.data);

    sendTabMutation.mutate({
      sourceDeviceIdentifier: deviceIdentifier,
      senderPublicKey: publicKey,
      encryptedPayloads,
    });
  }, [
    hasShareIntent,
    shareIntent,
    deviceIdentifier,
    publicKey,
    isKeysLoading,
    targetDevicesQuery.data,
    encryptForTargetDevices,
    sendTabMutation,
  ]);

  return {
    isSending: sendTabMutation.isPending || targetDevicesQuery.isLoading,
    sendResult: sendTabMutation.data ?? null,
    sendError: sendTabMutation.error,
  };
};
