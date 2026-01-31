import type { AppRouter } from "@opentab/api/routers";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import { env } from "~/env";
import { RealtimeClient } from "~/lib/realtime-client";

const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier";
const DEVICE_ID_KEY = "opentab_device_id";

const storageGet = (key: string): Promise<Record<string, unknown>> =>
  new Promise((resolve) => chrome.storage.local.get(key, resolve));

const storageSet = (items: Record<string, unknown>): Promise<void> =>
  new Promise((resolve) => chrome.storage.local.set(items, resolve));

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.PLASMO_PUBLIC_SERVER_URL}/api/trpc`,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" });
      },
    }),
  ],
});

// Realtime client with proper connection management
let realtimeClient: RealtimeClient | null = null;
let unsubscribe: (() => void) | null = null;

const getDeviceIdentifier = async (): Promise<string> => {
  const stored = await storageGet(DEVICE_IDENTIFIER_KEY);

  if (stored[DEVICE_IDENTIFIER_KEY]) {
    return stored[DEVICE_IDENTIFIER_KEY] as string;
  }

  const newId = `extension-${crypto.randomUUID()}`;
  await storageSet({ [DEVICE_IDENTIFIER_KEY]: newId });
  return newId;
};

const getDeviceId = async (): Promise<string | null> => {
  const stored = await storageGet(DEVICE_ID_KEY);
  return (stored[DEVICE_ID_KEY] as string) || null;
};

const setDeviceId = async (deviceId: string): Promise<void> => {
  await storageSet({ [DEVICE_ID_KEY]: deviceId });
};

const registerDevice = async (): Promise<string | null> => {
  try {
    const deviceIdentifier = await getDeviceIdentifier();
    await trpcClient.device.register.mutate({
      deviceType: "browser_extension",
      deviceName: "Chrome Extension",
      deviceIdentifier,
    });

    const result = await trpcClient.tab.getDeviceId.query({ deviceIdentifier });
    await setDeviceId(result.deviceId);
    return result.deviceId;
  } catch {
    return null;
  }
};

const sendTabToDevices = async (url: string, title?: string): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier();
  await trpcClient.tab.send.mutate({
    url,
    title,
    sourceDeviceIdentifier: deviceIdentifier,
  });
};

const sendTabToDevice = async (
  url: string,
  targetDeviceId: string,
  title?: string,
): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier();
  await trpcClient.tab.sendToDevice.mutate({
    url,
    title,
    sourceDeviceIdentifier: deviceIdentifier,
    targetDeviceId,
  });
};

const openAndMarkTab = (tabId: string, url: string): void => {
  chrome.tabs.create({ url, active: true }, (createdTab) => {
    trpcClient.tab.markDelivered.mutate({ tabId }).catch(() => {
      if (createdTab?.id) {
        chrome.tabs.remove(createdTab.id);
      }
    });
  });
};

const processPendingTabs = async (): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier();

  try {
    const pendingTabs = await trpcClient.tab.getPending.query({
      deviceIdentifier,
    });

    for (const tab of pendingTabs) {
      openAndMarkTab(tab.id, tab.url);
    }
  } catch {
    // Not authenticated
  }
};

const subscribeToRealtime = async (): Promise<void> => {
  const deviceId = await getDeviceId();
  if (!deviceId) return;

  // Clean up existing subscription
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  // Create client if needed
  if (!realtimeClient) {
    realtimeClient = new RealtimeClient({
      url: `${env.PLASMO_PUBLIC_SERVER_URL}/api/realtime`,
      withCredentials: true,
      maxReconnectAttempts: 5,
      onStatusChange: (status) => {
        console.log(`[OpenTab] Realtime connection: ${status}`);
      },
    });
  }

  // Subscribe to device-specific channel
  unsubscribe = realtimeClient.subscribe({
    channels: [`device-${deviceId}`],
    events: ["tab.new"],
    onData: (payload) => {
      console.log("[OpenTab] Received tab:", payload);
      const data = payload.data as { id: string; url: string };
      if (data?.id && data?.url) {
        openAndMarkTab(data.id, data.url);
      }
    },
  });
};

const initialize = async (): Promise<void> => {
  const deviceId = await registerDevice();
  if (!deviceId) return;

  await processPendingTabs();
  await subscribeToRealtime();
  // Refresh device menu items after successful initialization
  await updateDeviceMenuItems();
};

// Listen for messages from popup to refresh device list
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REFRESH_DEVICE_MENU") {
    updateDeviceMenuItems().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for async response
  }
});

// Store device list for context menu handling
type Device = {
  id: string;
  deviceType: string;
  deviceName: string | null;
  deviceIdentifier: string;
  pushToken: string | null;
};

let cachedDevices: Device[] = [];

const MENU_ID_PREFIX = "opentab-device-";
const MENU_ID_ALL_DEVICES = "opentab-all-devices";
const MENU_ID_PARENT = "opentab-parent";

// Create context menu on every service worker startup
// This ensures the menu persists after Chrome unloads/reloads the service worker
const createContextMenu = () => {
  chrome.contextMenus.removeAll(() => {
    // Create parent menu
    chrome.contextMenus.create({
      id: MENU_ID_PARENT,
      title: "Send to your devices",
      contexts: ["all", "browser_action"],
    });

    // Create "All devices" option as first child
    chrome.contextMenus.create({
      id: MENU_ID_ALL_DEVICES,
      parentId: MENU_ID_PARENT,
      title: "All devices",
      contexts: ["all", "browser_action"],
    });

    // Add separator
    chrome.contextMenus.create({
      id: "opentab-separator",
      parentId: MENU_ID_PARENT,
      type: "separator",
      contexts: ["all", "browser_action"],
    });

    // Fetch devices and create individual menu items
    updateDeviceMenuItems();
  });
};

const updateDeviceMenuItems = async (): Promise<void> => {
  const currentDeviceIdentifier = await getDeviceIdentifier();

  // Remove existing dynamic menu items first (old devices, no-devices, not-signed-in, refresh-failed)
  const menuIdsToRemove = [
    ...cachedDevices.map((d) => `${MENU_ID_PREFIX}${d.id}`),
    "opentab-no-devices",
    "opentab-not-signed-in",
    "opentab-refresh-failed",
  ];

  for (const menuId of menuIdsToRemove) {
    try {
      chrome.contextMenus.remove(menuId);
    } catch {
      // Ignore if it doesn't exist
    }
  }

  try {
    const devices = await trpcClient.device.list.query();
    // Filter out the current device and mobile devices without push tokens
    cachedDevices = devices.filter((d) => {
      // Exclude the current device
      if (d.deviceIdentifier === currentDeviceIdentifier) return false;
      // Exclude mobile devices without push tokens (they can't receive tabs)
      if (d.deviceType === "mobile" && !d.pushToken) return false;
      return true;
    });

    // Create menu items for each device
    for (const device of cachedDevices) {
      const deviceLabel =
        device.deviceName ?? (device.deviceType === "mobile" ? "Mobile" : "Browser");
      const icon = device.deviceType === "mobile" ? "📱" : "💻";

      chrome.contextMenus.create({
        id: `${MENU_ID_PREFIX}${device.id}`,
        parentId: MENU_ID_PARENT,
        title: `${icon} ${deviceLabel}`,
        contexts: ["all", "browser_action"],
      });
    }

    if (cachedDevices.length === 0) {
      chrome.contextMenus.create({
        id: "opentab-no-devices",
        parentId: MENU_ID_PARENT,
        title: "No other devices registered",
        enabled: false,
        contexts: ["all", "browser_action"],
      });
    }
  } catch {
    // Avoid wiping the menu on transient failures
    if (cachedDevices.length === 0) {
      // No cached devices - likely not authenticated
      chrome.contextMenus.create({
        id: "opentab-not-signed-in",
        parentId: MENU_ID_PARENT,
        title: "Sign in to send tabs",
        enabled: false,
        contexts: ["all", "browser_action"],
      });
    } else {
      // Re-create menu items from cache and show refresh error
      for (const device of cachedDevices) {
        const deviceLabel =
          device.deviceName ?? (device.deviceType === "mobile" ? "Mobile" : "Browser");
        const icon = device.deviceType === "mobile" ? "📱" : "💻";

        chrome.contextMenus.create({
          id: `${MENU_ID_PREFIX}${device.id}`,
          parentId: MENU_ID_PARENT,
          title: `${icon} ${deviceLabel}`,
          contexts: ["all", "browser_action"],
        });
      }
      chrome.contextMenus.create({
        id: "opentab-refresh-failed",
        parentId: MENU_ID_PARENT,
        title: "Unable to refresh devices",
        enabled: false,
        contexts: ["all", "browser_action"],
      });
    }
  }
};

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
  initialize();
});

// Create context menu on service worker wake-up
createContextMenu();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.url) return;

  const menuId = info.menuItemId as string;

  if (menuId === MENU_ID_ALL_DEVICES) {
    sendTabToDevices(tab.url, tab.title);
    return;
  }

  if (menuId.startsWith(MENU_ID_PREFIX)) {
    const deviceId = menuId.replace(MENU_ID_PREFIX, "");
    sendTabToDevice(tab.url, deviceId, tab.title);
  }
});

initialize();
