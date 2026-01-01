import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { Monitor, Smartphone, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { authClient } from "~auth/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "~components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~components/ui/alert-dialog";
import { queryClient, trpc } from "~lib/trpc";

import "~style.css";

const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier";

// MV2 uses callback-based APIs
const storageGet = (key: string): Promise<Record<string, unknown>> =>
  new Promise((resolve) => chrome.storage.local.get(key, resolve));

const storageSet = (items: Record<string, unknown>): Promise<void> =>
  new Promise((resolve) => chrome.storage.local.set(items, resolve));

const tabsQuery = (query: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> =>
  new Promise((resolve) => chrome.tabs.query(query, resolve));

const getDeviceIdentifier = async (): Promise<string> => {
  const stored = await storageGet(DEVICE_IDENTIFIER_KEY);

  if (stored[DEVICE_IDENTIFIER_KEY]) {
    return stored[DEVICE_IDENTIFIER_KEY] as string;
  }

  const newId = `extension-${crypto.randomUUID()}`;
  await storageSet({ [DEVICE_IDENTIFIER_KEY]: newId });
  return newId;
};

function AuthenticatedView({
  userName,
  userImage,
}: {
  userName: string;
  userImage: string | null | undefined;
}) {
  const devices = useQuery(trpc.device.list.queryOptions());
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [deviceIdentifier, setDeviceIdentifier] = useState<string>("");
  const [deviceToRemove, setDeviceToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Get initials from name for avatar fallback
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sendTabMutation = useMutation(trpc.tab.send.mutationOptions());
  const registerDeviceMutation = useMutation(
    trpc.device.register.mutationOptions({
      onSuccess: () => {
        // Refresh the devices list after registration
        devices.refetch();
      },
    }),
  );

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

  useEffect(() => {
    tabsQuery({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        setCurrentTab(tabs[0]);
      }
    });

    getDeviceIdentifier().then(setDeviceIdentifier);
  }, []);

  // Register device when authenticated if not already in the devices list
  useEffect(() => {
    if (!deviceIdentifier || !devices.data || registerDeviceMutation.isPending) return;

    // Check if this device is already registered
    const isAlreadyRegistered = devices.data.some(
      (device) => device.deviceIdentifier === deviceIdentifier,
    );

    if (!isAlreadyRegistered) {
      registerDeviceMutation.mutate({
        deviceType: "browser_extension",
        deviceName: "Chrome Extension",
        deviceIdentifier,
      });
    }
  }, [deviceIdentifier, devices.data, registerDeviceMutation]);

  const handleSendTab = useCallback(() => {
    if (!currentTab?.url || !deviceIdentifier) return;

    sendTabMutation.mutate({
      url: currentTab.url,
      title: currentTab.title,
      sourceDeviceIdentifier: deviceIdentifier,
    });
  }, [currentTab, deviceIdentifier, sendTabMutation]);

  return (
    <div className="p-6 w-80 bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Avatar className="size-5">
            {userImage && <AvatarImage src={userImage} alt={userName} />}
            <AvatarFallback className="text-[9px] bg-neutral-800 text-neutral-400">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-neutral-300">{userName}</span>
        </div>
        <button
          onClick={() => authClient.signOut()}
          className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          sign out
        </button>
      </div>

      {/* Send Tab Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-neutral-600 uppercase tracking-wider">current tab</p>
          <p className="text-sm text-neutral-300 truncate">{currentTab?.title ?? "..."}</p>
        </div>

        <button
          onClick={handleSendTab}
          disabled={!currentTab?.url || sendTabMutation.isPending}
          className="w-full py-3 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sendTabMutation.isPending ? "Sending..." : "Send to Devices"}
        </button>

        {sendTabMutation.isSuccess && (
          <p className="text-sm text-emerald-400 text-center">
            Sent to {sendTabMutation.data.sentToMobile + sendTabMutation.data.sentToExtensions}{" "}
            device(s)
          </p>
        )}

        {sendTabMutation.isError && (
          <p className="text-sm text-red-400 text-center">{sendTabMutation.error.message}</p>
        )}

        {/* Devices Section */}
        <div className="space-y-2 pt-4 border-t border-neutral-900">
          <p className="text-xs text-neutral-600 uppercase tracking-wider">devices</p>
          {devices.isPending ? (
            <p className="text-sm text-neutral-500">...</p>
          ) : devices.error ? (
            <p className="text-sm text-red-400">{devices.error.message}</p>
          ) : (
            <div className="space-y-0.5">
              {devices.data?.map((device) => {
                const isCurrentDevice = device.deviceIdentifier === deviceIdentifier;
                return (
                  <div
                    key={device.id}
                    className="flex items-center gap-2 group text-neutral-300 py-1"
                  >
                    {device.deviceType === "mobile" ? (
                      <Smartphone
                        className={`w-4 h-4 flex-shrink-0 ${isCurrentDevice ? "text-emerald-400" : ""}`}
                      />
                    ) : (
                      <Monitor
                        className={`w-4 h-4 flex-shrink-0 ${isCurrentDevice ? "text-emerald-400" : ""}`}
                      />
                    )}
                    <span className="text-sm flex-1 truncate">
                      {device.deviceName ?? device.deviceType}
                    </span>
                    <button
                      onClick={() =>
                        setDeviceToRemove({
                          id: device.id,
                          name: device.deviceName ?? device.deviceType,
                        })
                      }
                      disabled={removeDeviceMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 transition-all disabled:opacity-50"
                      title="Remove device"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {devices.data?.length === 0 && (
                <p className="text-sm text-neutral-500">No devices registered</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Branding */}
      <div className="mt-6 pt-4 border-t border-neutral-900">
        <p className="text-xs text-neutral-700 tracking-widest uppercase text-center">opentab</p>
      </div>

      {/* Remove Device Dialog */}
      <AlertDialog
        open={deviceToRemove !== null}
        onOpenChange={(open) => !open && setDeviceToRemove(null)}
      >
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-100">Remove device</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Remove "{deviceToRemove?.name}" from your devices? You can re-register it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={removeDeviceMutation.isPending}
              className="bg-red-900 text-red-200 hover:bg-red-800"
            >
              {removeDeviceMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IndexPopup() {
  const { data, isPending, error } = authClient.useSession();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSocialSignIn(provider: "github" | "apple") {
    setIsLoading(true);

    const result = await authClient.signIn.social({
      provider,
      callbackURL: "/auth/success",
    });

    if (result.data?.url) {
      chrome.tabs.create({ url: result.data.url }, () => {});

      const pollInterval = setInterval(async () => {
        const session = await authClient.getSession();
        if (session.data?.user) {
          clearInterval(pollInterval);
          setIsLoading(false);
          window.location.reload();
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(pollInterval);
        setIsLoading(false);
      }, 120000);
    } else {
      setIsLoading(false);
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-8 w-80 bg-neutral-950">
        <p className="text-neutral-500 text-sm">...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 w-80 bg-neutral-950 gap-2">
        <p className="text-red-400 text-sm">{error.message}</p>
      </div>
    );
  }

  if (data?.user) {
    return <AuthenticatedView userName={data.user.name} userImage={data.user.image} />;
  }

  return (
    <div className="p-8 w-80 bg-neutral-950 text-neutral-100 flex flex-col items-center gap-6">
      {/* Logo/Title */}
      <div className="text-center space-y-2">
        <h1 className="text-lg font-medium">opentab</h1>
        <p className="text-neutral-500 text-sm">sign in to continue</p>
      </div>

      {/* Sign in buttons */}
      <div className="w-full space-y-2">
        <button
          onClick={() => handleSocialSignIn("apple")}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-neutral-300 rounded text-sm border border-neutral-800 hover:border-neutral-700 hover:text-neutral-100 transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          {isLoading ? "..." : "apple"}
        </button>

        <button
          onClick={() => handleSocialSignIn("github")}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-neutral-300 rounded text-sm border border-neutral-800 hover:border-neutral-700 hover:text-neutral-100 transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          {isLoading ? "..." : "github"}
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <IndexPopup />
    </QueryClientProvider>
  );
}

export default App;
