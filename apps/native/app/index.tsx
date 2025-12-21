import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { useDeviceRegistration } from "@/hooks/use-device-registration";
import { useShareIntent } from "@/hooks/use-share-intent";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

const StyledIonicons = withUniwind(Ionicons);
const StyledSafeAreaView = withUniwind(SafeAreaView);

type ShareModalProps = {
  visible: boolean;
  url: string | null;
  onSend: () => void;
  onCancel: () => void;
  isSending: boolean;
  sendResult: { sentToMobile: number; sentToExtensions: number } | null;
  sendError: Error | null;
};

function ShareModal({
  visible,
  url,
  onSend,
  onCancel,
  isSending,
  sendResult,
  sendError,
}: ShareModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm rounded-xl bg-surface p-6 gap-4">
          <Text className="text-lg font-medium text-foreground text-center">Send to Devices</Text>

          <Text className="text-sm text-muted text-center" numberOfLines={2}>
            {url}
          </Text>

          {sendResult && (
            <Text className="text-sm text-emerald-400 text-center">
              Sent to {sendResult.sentToMobile} mobile and {sendResult.sentToExtensions} extension
              devices
            </Text>
          )}

          {sendError && (
            <Text className="text-sm text-danger text-center">{sendError.message}</Text>
          )}

          <View className="flex-row gap-3 mt-2">
            <Pressable
              onPress={onCancel}
              className="flex-1 py-3 rounded-lg border border-divider active:opacity-70"
            >
              <Text className="text-sm text-muted text-center">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSend}
              disabled={isSending || sendResult !== null}
              className="flex-1 py-3 rounded-lg bg-emerald-600 active:opacity-70 disabled:opacity-50"
            >
              <Text className="text-sm text-white text-center">
                {isSending ? "Sending..." : sendResult ? "Sent!" : "Send"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type AuthenticatedViewProps = {
  userName: string;
  deviceIdentifier: string;
};

function AuthenticatedView({ userName, deviceIdentifier }: AuthenticatedViewProps) {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const devices = useQuery(trpc.device.list.queryOptions());
  const sendTabMutation = useMutation(trpc.tab.send.mutationOptions());

  const handleSendTestTab = useCallback(() => {
    sendTabMutation.mutate({
      url: "https://example.com",
      title: "Test Tab",
      sourceDeviceIdentifier: deviceIdentifier,
    });
  }, [sendTabMutation, deviceIdentifier]);

  return (
    <View className="flex-1 p-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-8">
        <View className="flex-row items-center gap-2">
          <Text className="text-emerald-400">✓</Text>
          <Text className="text-sm text-muted">{userName}</Text>
        </View>
        <Pressable
          onPress={() => {
            authClient.signOut();
            queryClient.invalidateQueries();
          }}
          className="active:opacity-50"
        >
          <Text className="text-xs text-muted">sign out</Text>
        </Pressable>
      </View>

      {/* Data sections */}
      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-xs tracking-wider uppercase text-muted">health check</Text>
          {healthCheck.isPending ? (
            <Text className="text-sm text-muted">...</Text>
          ) : healthCheck.error ? (
            <Text className="text-sm text-danger">{healthCheck.error.message}</Text>
          ) : (
            <Text className="text-sm text-emerald-400">{healthCheck.data}</Text>
          )}
        </View>

        <View className="gap-2">
          <Text className="text-xs tracking-wider uppercase text-muted">registered devices</Text>
          {devices.isPending ? (
            <Text className="text-sm text-muted">...</Text>
          ) : devices.error ? (
            <Text className="text-sm text-danger">{devices.error.message}</Text>
          ) : (
            <View className="gap-1">
              {devices.data?.map((device) => (
                <Text key={device.id} className="text-sm text-foreground">
                  {device.deviceName ?? device.deviceType} ({device.deviceType})
                </Text>
              ))}
              {devices.data?.length === 0 && (
                <Text className="text-sm text-muted">No devices registered</Text>
              )}
            </View>
          )}
        </View>

        <Pressable
          onPress={handleSendTestTab}
          disabled={sendTabMutation.isPending}
          className="px-4 py-3 rounded-lg bg-surface border border-divider active:opacity-70 disabled:opacity-50"
        >
          <Text className="text-sm text-foreground text-center">
            {sendTabMutation.isPending ? "Sending..." : "Send Test Tab to Devices"}
          </Text>
        </Pressable>

        {sendTabMutation.isSuccess && (
          <Text className="text-sm text-emerald-400">
            Sent to {sendTabMutation.data.sentToMobile} mobile and{" "}
            {sendTabMutation.data.sentToExtensions} extension devices
          </Text>
        )}

        {sendTabMutation.isError && (
          <Text className="text-sm text-danger">{sendTabMutation.error.message}</Text>
        )}
      </View>

      {/* Branding */}
      <View className="absolute bottom-8 left-0 right-0 items-center">
        <Text className="text-xs tracking-widest uppercase text-muted opacity-50">opentab</Text>
      </View>
    </View>
  );
}

export default function Home() {
  const { data, isPending, error } = authClient.useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleUrlReceived = useCallback((url: string) => {
    // Open the URL in the default browser
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open URL:", err);
    });
  }, []);

  const { registerDevice, deviceIdentifier } = useDeviceRegistration({
    onUrlReceived: handleUrlReceived,
  });

  const { sharedUrl, sendToDevices, isSending, sendResult, sendError, clearSharedUrl } =
    useShareIntent();

  // Register device when user is authenticated
  useEffect(() => {
    if (data?.user) {
      registerDevice();
    }
  }, [data?.user, registerDevice]);

  const handleGitHubSignIn = useCallback(async () => {
    setIsLoading(true);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/", // Root path - expo plugin converts to deep link (exp://...)
    });
    setIsLoading(false);
  }, []);

  if (isPending) {
    return (
      <StyledSafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-muted">...</Text>
      </StyledSafeAreaView>
    );
  }

  if (error) {
    return (
      <StyledSafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-danger">{error.message}</Text>
      </StyledSafeAreaView>
    );
  }

  if (data?.user) {
    return (
      <StyledSafeAreaView className="flex-1 bg-background">
        <AuthenticatedView userName={data.user.name} deviceIdentifier={deviceIdentifier} />
        <ShareModal
          visible={sharedUrl !== null}
          url={sharedUrl}
          onSend={sendToDevices}
          onCancel={clearSharedUrl}
          isSending={isSending}
          sendResult={sendResult}
          sendError={sendError}
        />
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 items-center justify-center bg-background px-8">
      {/* Logo/Title */}
      <View className="items-center gap-2 mb-8">
        <Text className="text-lg font-medium text-foreground">opentab</Text>
        <Text className="text-sm text-muted">sign in to continue</Text>
      </View>

      {/* Sign in button */}
      <Pressable
        onPress={handleGitHubSignIn}
        disabled={isLoading}
        className="w-full flex-row items-center justify-center gap-2 px-4 py-4 rounded-lg bg-surface border border-divider active:opacity-70 disabled:opacity-50"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#a3a3a3" />
        ) : (
          <>
            <StyledIonicons name="logo-github" size={18} className="text-foreground" />
            <Text className="text-sm text-foreground">github</Text>
          </>
        )}
      </Pressable>

      {/* Branding */}
      <View className="absolute bottom-8">
        <Text className="text-xs tracking-widest uppercase text-muted opacity-50">opentab</Text>
      </View>
    </StyledSafeAreaView>
  );
}
