import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { DialogBlurBackdrop } from "~/components/dialog-blur-backdrop";
import { useDeviceRegistration } from "~/hooks/use-device-registration";
import { useShareIntent } from "~/hooks/use-share-intent";
import { authClient } from "~/lib/auth-client";
import { queryClient, trpc } from "~/utils/trpc";

const StyledIonicons = withUniwind(Ionicons);
const StyledSafeAreaView = withUniwind(SafeAreaView);

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
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const removeDeviceMutation = useMutation(
    trpc.device.remove.mutationOptions({
      onSuccess: () => {
        devices.refetch();
        setDeviceToRemove(null);
      },
    }),
  );

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    try {
      await authClient.deleteUser();
      queryClient.clear();
    } catch (error) {
      console.error("Failed to delete account:", error);
      setIsDeleting(false);
      setShowDeleteAccount(false);
    }
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (deviceToRemove) {
      removeDeviceMutation.mutate({ deviceId: deviceToRemove.id });
    }
  }, [deviceToRemove, removeDeviceMutation]);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="flex-1 p-6">
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
          isIconOnly
          className="rounded-lg"
          onPress={() => setShowSettings(true)}
        >
          <StyledIonicons name="settings-outline" size={18} className="text-muted" />
        </Button>
      </View>

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

      <View className="absolute bottom-8 left-0 right-0 items-center">
        <Text className="text-xs tracking-widest uppercase text-muted opacity-50">opentab</Text>
      </View>

      <Dialog isOpen={showSettings} onOpenChange={(open: boolean) => setShowSettings(open)}>
        <Dialog.Portal>
          <DialogBlurBackdrop />
          <Dialog.Content>
            <Dialog.Close className="self-end -mb-2 z-50" />
            <View className="mb-3 gap-1.5">
              <Dialog.Title>Settings</Dialog.Title>
            </View>
            <View className="gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg justify-start"
                onPress={() => {
                  authClient.signOut();
                  queryClient.invalidateQueries();
                  setShowSettings(false);
                }}
              >
                <StyledIonicons name="log-out-outline" size={18} className="text-foreground" />
                <Button.Label>Sign Out</Button.Label>
              </Button>
              <View className="h-px bg-border my-1" />
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg justify-start"
                onPress={() => {
                  setShowSettings(false);
                  setShowDeleteAccount(true);
                }}
              >
                <StyledIonicons name="trash-outline" size={18} className="text-danger" />
                <Button.Label className="text-danger">Delete Account</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      <Dialog
        isOpen={showDeleteAccount}
        onOpenChange={(open: boolean) => {
          if (!open && !isDeleting) setShowDeleteAccount(false);
        }}
      >
        <Dialog.Portal>
          <DialogBlurBackdrop />
          <Dialog.Content>
            <Dialog.Close className="self-end -mb-2 z-50" disabled={isDeleting} />
            <View className="mb-5 gap-1.5">
              <Dialog.Title>Delete Account</Dialog.Title>
              <Dialog.Description>
                Are you sure you want to delete your account? This action cannot be undone. All your
                data, including registered devices, will be permanently removed.
              </Dialog.Description>
            </View>
            <View className="flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  isDisabled={isDeleting}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                variant="danger"
                size="sm"
                className="rounded-lg"
                onPress={handleDeleteAccount}
                isDisabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

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

type Provider = "apple" | "google" | "github";

export default function Home() {
  const { data, isPending, error } = authClient.useSession();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const backgroundColor = useThemeColor("background");

  const { registerDevice, deviceIdentifier } = useDeviceRegistration();

  useShareIntent();

  useEffect(() => {
    if (data?.user) {
      registerDevice();
    }
  }, [data?.user, registerDevice]);

  const handleSignIn = useCallback(async (provider: Provider) => {
    setLoadingProvider(provider);
    await authClient.signIn.social({
      provider,
      callbackURL: "/", // Root path - expo plugin converts to deep link (exp://...)
    });
    setLoadingProvider(null);
  }, []);

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
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 items-center justify-center bg-background px-8">
      <View className="items-center gap-2 mb-8">
        <Text className="text-2xl font-medium text-foreground tracking-tight">opentab</Text>
        <Text className="text-sm text-muted">sign in to continue</Text>
      </View>

      <View className="gap-3 min-w-52">
        <Button
          variant="secondary"
          onPress={() => handleSignIn("apple")}
          isDisabled={loadingProvider !== null}
          className="rounded-lg bg-foreground"
        >
          {loadingProvider === "apple" ? (
            <Spinner size="sm" color={backgroundColor} />
          ) : (
            <>
              <StyledIonicons name="logo-apple" size={20} className="text-background" />
              <Button.Label className="text-background">Continue with Apple</Button.Label>
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          onPress={() => handleSignIn("google")}
          isDisabled={loadingProvider !== null}
          className="rounded-lg bg-foreground"
        >
          {loadingProvider === "google" ? (
            <Spinner size="sm" color={backgroundColor} />
          ) : (
            <>
              <StyledIonicons name="logo-google" size={20} className="text-background" />
              <Button.Label className="text-background">Continue with Google</Button.Label>
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          onPress={() => handleSignIn("github")}
          isDisabled={loadingProvider !== null}
          className="rounded-lg bg-foreground"
        >
          {loadingProvider === "github" ? (
            <Spinner size="sm" color={backgroundColor} />
          ) : (
            <>
              <StyledIonicons name="logo-github" size={20} className="text-background" />
              <Button.Label className="text-background">Continue with GitHub</Button.Label>
            </>
          )}
        </Button>
      </View>

      <View className="absolute bottom-8">
        <Text className="text-xs tracking-widest uppercase text-muted opacity-50">opentab</Text>
      </View>
    </StyledSafeAreaView>
  );
}
