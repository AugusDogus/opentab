import type { AppRouter } from "@opentab/api/routers";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import { env } from "~env";

// Create tRPC client for background script
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

// Storage keys
const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier";

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

    // Show notification of success
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon.png"),
      title: "Tab Sent",
      message: `Sent to ${result.sentToMobile + result.sentToExtensions} device(s)`,
    });
  } catch (error) {
    console.error("Failed to send tab:", error);

    // Show error notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon.png"),
      title: "Failed to Send Tab",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Poll for pending tabs and open them
const pollForPendingTabs = async (): Promise<void> => {
  try {
    const deviceIdentifier = await getDeviceIdentifier();
    const pendingTabs = await trpcClient.tab.getPending.query({ deviceIdentifier });

    // Open each pending tab
    for (const tab of pendingTabs) {
      await chrome.tabs.create({ url: tab.url, active: false });
      await trpcClient.tab.markDelivered.mutate({ tabId: tab.id });
      console.log("Opened pending tab:", tab.url);
    }
  } catch (error) {
    // Silently fail if not authenticated or other error
    console.log("Polling for pending tabs failed:", error);
  }
};

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "opentab-action",
    title: "Send to your devices",
    contexts: ["all", "action"],
  });

  // Create alarm for polling (every 30 seconds)
  chrome.alarms.create("poll-pending-tabs", { periodInMinutes: 0.5 });

  // Register device
  registerDevice();
});

// Also register on startup
chrome.runtime.onStartup.addListener(() => {
  registerDevice();
  pollForPendingTabs();
});

// Handle alarm for polling
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "poll-pending-tabs") {
    pollForPendingTabs();
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "opentab-action" && tab?.url) {
    await sendTabToDevices(tab.url, tab.title);
  }
});

// Handle extension action click (popup icon click when no popup is shown)
// This allows right-clicking the extension icon to send current tab
chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.url) {
    await sendTabToDevices(tab.url, tab.title);
  }
});
