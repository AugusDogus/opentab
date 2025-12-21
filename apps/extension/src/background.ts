import type { AppRouter } from "@opentab/api/routers";
import { createTRPCClient, httpBatchLink, unstable_httpSubscriptionLink } from "@trpc/client";

import { env } from "~env";

// Storage keys
const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier";

// Create tRPC client for background script (mutations and queries)
const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.PLASMO_PUBLIC_SERVER_URL}/api/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});

// Create subscription client with SSE link
const subscriptionClient = createTRPCClient<AppRouter>({
  links: [
    unstable_httpSubscriptionLink({
      url: `${env.PLASMO_PUBLIC_SERVER_URL}/api/trpc`,
      eventSourceOptions: () => ({
        withCredentials: true,
      }),
    }),
  ],
});

// Generate or retrieve device identifier
const getDeviceIdentifier = async (): Promise<string> => {
  const stored = await chrome.storage.local.get(DEVICE_IDENTIFIER_KEY);

  if (stored[DEVICE_IDENTIFIER_KEY]) {
    return stored[DEVICE_IDENTIFIER_KEY] as string;
  }

  const newId = `extension-${crypto.randomUUID()}`;
  await chrome.storage.local.set({ [DEVICE_IDENTIFIER_KEY]: newId });
  return newId;
};

// Register device with server
const registerDevice = async (): Promise<void> => {
  try {
    const deviceIdentifier = await getDeviceIdentifier();
    await trpcClient.device.register.mutate({
      deviceType: "browser_extension",
      deviceName: "Chrome Extension",
      deviceIdentifier,
    });
    console.log("Device registered successfully");
  } catch (error) {
    // Silently fail if not authenticated
    console.log("Device registration skipped (not authenticated):", error);
  }
};

// Send current tab to other devices
const sendTabToDevices = async (url: string, title?: string): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier();

  try {
    const result = await trpcClient.tab.send.mutate({
      url,
      title,
      sourceDeviceIdentifier: deviceIdentifier,
    });
    console.log(
      `Tab sent to ${result.sentToMobile} mobile and ${result.sentToExtensions} extension devices`,
    );
  } catch (error) {
    console.error("Failed to send tab:", error);
  }
};

// Subscribe to new tabs via SSE
const subscribeToTabs = async (): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier();

  const _unsubscribe = subscriptionClient.tab.onNewTab.subscribe(
    { deviceIdentifier },
    {
      onData: async (tab) => {
        // Open the tab in a new tab
        await chrome.tabs.create({ url: tab.url, active: false });

        // Mark as delivered
        await trpcClient.tab.markDelivered.mutate({ tabId: tab.id });
        console.log("Opened tab from subscription:", tab.url);
      },
      onError: (error) => {
        console.log("Tab subscription error:", error);
        // Retry subscription after a delay
        setTimeout(() => subscribeToTabs(), 5000);
      },
      onComplete: () => {
        console.log("Tab subscription completed, reconnecting...");
        // Reconnect on complete
        setTimeout(() => subscribeToTabs(), 1000);
      },
    },
  );

  // Store unsubscribe for cleanup if needed
  chrome.storage.local.set({ _subscriptionActive: true });
};

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "opentab-action",
    title: "Send to your devices",
    contexts: ["all", "action"],
  });

  // Register device and start subscription
  registerDevice().then(() => subscribeToTabs());
});

// Also register on startup
chrome.runtime.onStartup.addListener(() => {
  registerDevice().then(() => subscribeToTabs());
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "opentab-action" && tab?.url) {
    await sendTabToDevices(tab.url, tab.title);
  }
});
