import type { AppRouter } from "@opentab/api/routers";
import {
  decryptFromDevice,
  deserializeEncryptedPayload,
  encryptForDevices,
  generateKeyPair,
  serializeEncryptedPayload,
  type KeyPair,
} from "@opentab/crypto";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import { env } from "~env";

const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier";
const DEVICE_ID_KEY = "opentab_device_id";

// Security note: Keys are stored in chrome.storage.local (not session) because:
// 1. Keys must persist across browser sessions for E2E encryption to function
// 2. chrome.storage.local is isolated per-extension and inaccessible to other extensions/websites
// 3. An attacker with filesystem access could already steal cookies/session tokens
// This matches the security model of other E2E encrypted desktop apps (Signal, etc.)
const SECRET_KEY_STORAGE_KEY = "opentab_secret_key";
const PUBLIC_KEY_STORAGE_KEY = "opentab_public_key";

const storageGet = (keys: string | string[]): Promise<Record<string, unknown>> =>
  new Promise((resolve) => chrome.storage.local.get(keys, resolve));

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

/**
 * Get or generate encryption key pair
 */
const getOrCreateKeyPair = async (): Promise<KeyPair> => {
  const stored = await storageGet([SECRET_KEY_STORAGE_KEY, PUBLIC_KEY_STORAGE_KEY]);

  const existingSecretKey = stored[SECRET_KEY_STORAGE_KEY] as string | undefined;
  const existingPublicKey = stored[PUBLIC_KEY_STORAGE_KEY] as string | undefined;

  if (existingSecretKey && existingPublicKey) {
    return {
      secretKey: existingSecretKey,
      publicKey: existingPublicKey,
    };
  }

  // Generate new key pair
  const keyPair = generateKeyPair();

  await storageSet({
    [SECRET_KEY_STORAGE_KEY]: keyPair.secretKey,
    [PUBLIC_KEY_STORAGE_KEY]: keyPair.publicKey,
  });

  return keyPair;
};

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
    const keyPair = await getOrCreateKeyPair();

    await trpcClient.device.register.mutate({
      deviceType: "browser_extension",
      deviceName: "Chrome Extension",
      deviceIdentifier,
      publicKey: keyPair.publicKey,
    });

    const result = await trpcClient.tab.getDeviceId.query({ deviceIdentifier });
    await setDeviceId(result.deviceId);
    return result.deviceId;
  } catch {
    return null;
  }
};

/**
 * Send encrypted tab to all devices
 */
const sendTabToDevices = async (url: string, title?: string): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier();
  const keyPair = await getOrCreateKeyPair();

  // Fetch target devices with their public keys
  const targetDevices = await trpcClient.device.getTargetDevices.query({
    sourceDeviceIdentifier: deviceIdentifier,
  });

  if (targetDevices.length === 0) {
    console.log("No target devices found");
    return;
  }

  // Encrypt for each target device
  const encryptedPayloads = encryptForDevices(
    { url, title },
    targetDevices,
    keyPair.secretKey,
    keyPair.publicKey,
  ).map((payload) => ({
    targetDeviceId: payload.deviceId,
    encryptedData: serializeEncryptedPayload(payload.encrypted),
  }));

  await trpcClient.tab.sendEncrypted.mutate({
    sourceDeviceIdentifier: deviceIdentifier,
    senderPublicKey: keyPair.publicKey,
    encryptedPayloads,
  });
};

/**
 * Decrypt tab data and open in new tab
 */
const openEncryptedTab = async (
  tabId: string,
  encryptedData: string,
  _senderPublicKey: string,
): Promise<void> => {
  try {
    const keyPair = await getOrCreateKeyPair();
    const encryptedPayload = deserializeEncryptedPayload(encryptedData);
    const decryptedData = decryptFromDevice(encryptedPayload, keyPair.secretKey);

    chrome.tabs.create({ url: decryptedData.url, active: true }, (createdTab) => {
      trpcClient.tab.markDelivered.mutate({ tabId }).catch(() => {
        if (createdTab?.id) {
          chrome.tabs.remove(createdTab.id);
        }
      });
    });
  } catch (error) {
    console.error("Failed to decrypt tab:", error);
  }
};

const processPendingTabs = async (): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier();

  try {
    const pendingTabs = await trpcClient.tab.getPending.query({
      deviceIdentifier,
    });

    for (const tab of pendingTabs) {
      await openEncryptedTab(tab.id, tab.encryptedData, tab.senderPublicKey);
    }
  } catch {
    // Not authenticated
  }
};

let eventSource: EventSource | null = null;

const subscribeToRealtime = async (): Promise<void> => {
  const deviceId = await getDeviceId();
  if (!deviceId) return;

  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  const url = `${env.PLASMO_PUBLIC_SERVER_URL}/api/realtime?channel=device-${deviceId}`;
  eventSource = new EventSource(url, { withCredentials: true });

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data) as {
      event?: string;
      data?: { id: string; encryptedData: string; senderPublicKey: string };
    };
    if (data.event === "tab.new" && data.data) {
      openEncryptedTab(data.data.id, data.data.encryptedData, data.data.senderPublicKey);
    }
  };

  eventSource.onerror = () => {
    eventSource?.close();
    eventSource = null;
    setTimeout(subscribeToRealtime, 5000);
  };
};

const initialize = async (): Promise<void> => {
  const deviceId = await registerDevice();
  if (!deviceId) return;

  await processPendingTabs();
  await subscribeToRealtime();
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "opentab-action",
    title: "Send to your devices",
    contexts: ["all", "browser_action"],
  });

  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  initialize();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "opentab-action" && tab?.url) {
    sendTabToDevices(tab.url, tab.title);
  }
});

initialize();
