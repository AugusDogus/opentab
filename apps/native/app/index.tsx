import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import {
  Avatar,
  Button,
  cn,
  Dialog,
  Skeleton,
  Spinner,
  Surface,
  useThemeColor,
} from "heroui-native";
import { useCallback, useEffect, useState } from "react";
import { Modal, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { DialogBlurBackdrop } from "@/components/dialog-blur-backdrop";
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
  sendError: { message: string } | null;
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
        <Surface className="w-full max-w-sm gap-4">
          <Text className="text-lg font-medium text-foreground text-center">Send to Devices</Text>

          <Text className="text-sm text-muted text-center" numberOfLines={2}>
            {url}
          </Text>

          {sendResult && (
            <Text className="text-sm text-success text-center">
              Sent to {sendResult.sentToMobile} mobile and {sendResult.sentToExtensions} extension
              devices
            </Text>
          )}

          {sendError && (
            <Text className="text-sm text-danger text-center">{sendError.message}</Text>
          )}

          <View className="flex-row gap-3 mt-2">
            <Button variant="ghost" onPress={onCancel} className="flex-1 rounded-lg">
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={onSend}
              isDisabled={isSending || sendResult !== null}
              className="flex-1 rounded-lg"
            >
              {isSending ? "Sending..." : sendResult ? "Sent!" : "Send"}
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

type AuthenticatedViewProps = {
  userName: string;
  userImage: string | null | undefined;
  deviceIdentifier: string | null;
};

function AuthenticatedView({ userName, userImage, deviceIdentifier }: AuthenticatedViewProps) {
  const devices = useQuery(trpc.device.list.queryOptions());
  const [deviceToRemove, setDeviceToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const removeDeviceMutation = useMutation(
    trpc.device.remove.mutationOptions({
      onSuccess: () => {
        devices.refetch();
        setDeviceToRemove(null);
      },
    }),
  );

  const handleConfirmRemove = useCallback(() => {
    if (deviceToRemove) {
      removeDeviceMutation.mutate({ deviceId: deviceToRemove.id });
    }
  }, [deviceToRemove, removeDeviceMutation]);

  // Get initials from name for avatar fallback
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="flex-1 p-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-8">
        <View className="flex-row items-center gap-3">
          <Avatar size="sm" alt={userName} className="size-6">
            {userImage ? <Avatar.Image source={{ uri: userImage }} /> : null}
            <Avatar.Fallback className="text-[10px]">{initials}</Avatar.Fallback>
          </Avatar>
          <Text className="text-sm text-foreground">{userName}</Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg"
          onPress={() => {
            authClient.signOut();
            queryClient.invalidateQueries();
          }}
        >
          sign out
        </Button>
      </View>

      {/* Registered Devices */}
      <Surface variant="secondary" className="gap-3">
        <Text className="text-xs tracking-wider uppercase text-muted">devices</Text>
        {devices.error ? (
          <Text className="text-sm text-danger">{devices.error.message}</Text>
        ) : devices.isPending ? (
          <View className="gap-1">
            {[1, 2].map((i) => (
              <View key={i} className="flex-row items-center gap-3 py-1.5 h-12">
                <Skeleton className="size-[18px] rounded" />
                <View className="flex-1">
                  <Skeleton className={cn("h-5 rounded", i === 1 ? "w-32" : "w-24")} />
                </View>
                <View className="size-9 rounded-lg items-center justify-center">
                  <Skeleton className="size-[18px] rounded-lg" />
                </View>
              </View>
            ))}
          </View>
        ) : devices.data?.length === 0 ? (
          <Text className="text-sm text-muted">No devices registered</Text>
        ) : (
          <View className="gap-1">
            {devices.data?.map((device) => {
              const isCurrentDevice = device.deviceIdentifier === deviceIdentifier;
              return (
                <View key={device.id} className="flex-row items-center gap-3 py-1.5 h-12">
                  <StyledIonicons
                    name={
                      device.deviceType === "mobile" ? "phone-portrait-outline" : "desktop-outline"
                    }
                    size={18}
                    className={isCurrentDevice ? "text-success" : "text-foreground"}
                  />
                  <Text className="text-sm flex-1 text-foreground">
                    {device.deviceName ?? device.deviceType}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    className="rounded-lg"
                    onPress={() =>
                      setDeviceToRemove({
                        id: device.id,
                        name: device.deviceName ?? device.deviceType,
                      })
                    }
                    isDisabled={removeDeviceMutation.isPending}
                  >
                    <StyledIonicons name="trash-outline" size={16} className="text-muted" />
                  </Button>
                </View>
              );
            })}
          </View>
        )}
      </Surface>

      {/* Branding */}
      <View className="absolute bottom-8 left-0 right-0 items-center">
        <Text className="text-xs tracking-widest uppercase text-muted opacity-50">opentab</Text>
      </View>

      {/* Remove Device Dialog */}
      <Dialog
        isOpen={deviceToRemove !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeviceToRemove(null);
        }}
      >
        <Dialog.Portal>
          <DialogBlurBackdrop />
          <Dialog.Content>
            <Dialog.Close className="self-end -mb-2 z-50" />
            <View className="mb-5 gap-1.5">
              <Dialog.Title>Remove device</Dialog.Title>
              <Dialog.Description>
                Remove "{deviceToRemove?.name}" from your devices? You can re-register it later.
              </Dialog.Description>
            </View>
            <View className="flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" className="rounded-lg">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                variant="danger"
                size="sm"
                className="rounded-lg"
                onPress={handleConfirmRemove}
                isDisabled={removeDeviceMutation.isPending}
              >
                {removeDeviceMutation.isPending ? "Removing..." : "Remove"}
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}

export default function Home() {
  const { data, isPending, error } = authClient.useSession();
  const [isLoading, setIsLoading] = useState(false);
  const backgroundColor = useThemeColor("background");

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

  // Splash screen handles the loading state, return null while pending
  if (isPending) {
    return null;
  }

  if (error) {
    return (
      <StyledSafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <Surface className="w-full gap-4 items-center">
          <StyledIonicons name="alert-circle-outline" size={32} className="text-danger" />
          <Text className="text-sm text-danger text-center">{error.message}</Text>
          <Button
            variant="secondary"
            className="rounded-lg"
            onPress={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Surface>
      </StyledSafeAreaView>
    );
  }

  if (data?.user) {
    return (
      <StyledSafeAreaView className="flex-1 bg-background">
        <AuthenticatedView
          userName={data.user.name}
          userImage={data.user.image}
          deviceIdentifier={deviceIdentifier}
        />
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
        <Text className="text-2xl font-medium text-foreground tracking-tight">opentab</Text>
        <Text className="text-sm text-muted">sign in to continue</Text>
      </View>

      {/* Sign in button */}
      <Button
        variant="secondary"
        onPress={handleGitHubSignIn}
        isDisabled={isLoading}
        className="rounded-lg bg-foreground min-w-52"
      >
        {isLoading ? (
          <Spinner size="sm" color={backgroundColor} />
        ) : (
          <>
            <StyledIonicons name="logo-github" size={20} className="text-background" />
            <Button.Label className="text-background">Continue with GitHub</Button.Label>
          </>
        )}
      </Button>

      {/* Branding */}
      <View className="absolute bottom-8">
        <Text className="text-xs tracking-widest uppercase text-muted opacity-50">opentab</Text>
      </View>
    </StyledSafeAreaView>
  );
}
