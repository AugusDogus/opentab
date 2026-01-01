import type { AppRouter } from "@opentab/api/routers"
import { createTRPCClient, httpBatchLink } from "@trpc/client"

import { env } from "~env"
import { RealtimeClient } from "~lib/realtime-client"

const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier"
const DEVICE_ID_KEY = "opentab_device_id"

const storageGet = (key: string): Promise<Record<string, unknown>> =>
  new Promise((resolve) => chrome.storage.local.get(key, resolve))

const storageSet = (items: Record<string, unknown>): Promise<void> =>
  new Promise((resolve) => chrome.storage.local.set(items, resolve))

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.PLASMO_PUBLIC_SERVER_URL}/api/trpc`,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" })
      }
    })
  ]
})

// Realtime client with proper connection management
let realtimeClient: RealtimeClient | null = null
let unsubscribe: (() => void) | null = null

const getDeviceIdentifier = async (): Promise<string> => {
  const stored = await storageGet(DEVICE_IDENTIFIER_KEY)

  if (stored[DEVICE_IDENTIFIER_KEY]) {
    return stored[DEVICE_IDENTIFIER_KEY] as string
  }

  const newId = `extension-${crypto.randomUUID()}`
  await storageSet({ [DEVICE_IDENTIFIER_KEY]: newId })
  return newId
}

const getDeviceId = async (): Promise<string | null> => {
  const stored = await storageGet(DEVICE_ID_KEY)
  return (stored[DEVICE_ID_KEY] as string) || null
}

const setDeviceId = async (deviceId: string): Promise<void> => {
  await storageSet({ [DEVICE_ID_KEY]: deviceId })
}

const registerDevice = async (): Promise<string | null> => {
  try {
    const deviceIdentifier = await getDeviceIdentifier()
    await trpcClient.device.register.mutate({
      deviceType: "browser_extension",
      deviceName: "Chrome Extension",
      deviceIdentifier
    })

    const result = await trpcClient.tab.getDeviceId.query({ deviceIdentifier })
    await setDeviceId(result.deviceId)
    return result.deviceId
  } catch {
    return null
  }
}

const sendTabToDevices = async (url: string, title?: string): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier()
  await trpcClient.tab.send.mutate({
    url,
    title,
    sourceDeviceIdentifier: deviceIdentifier
  })
}

const openAndMarkTab = (tabId: string, url: string): void => {
  chrome.tabs.create({ url, active: true }, (createdTab) => {
    trpcClient.tab.markDelivered.mutate({ tabId }).catch(() => {
      if (createdTab?.id) {
        chrome.tabs.remove(createdTab.id)
      }
    })
  })
}

const processPendingTabs = async (): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier()

  try {
    const pendingTabs = await trpcClient.tab.getPending.query({
      deviceIdentifier
    })

    for (const tab of pendingTabs) {
      openAndMarkTab(tab.id, tab.url)
    }
  } catch {
    // Not authenticated
  }
}

const subscribeToRealtime = async (): Promise<void> => {
  const deviceId = await getDeviceId()
  if (!deviceId) return

  // Clean up existing subscription
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }

  // Create client if needed
  if (!realtimeClient) {
    realtimeClient = new RealtimeClient({
      url: `${env.PLASMO_PUBLIC_SERVER_URL}/api/realtime`,
      withCredentials: true,
      maxReconnectAttempts: 5,
      onStatusChange: (status) => {
        console.log(`[OpenTab] Realtime connection: ${status}`)
      }
    })
  }

  // Subscribe to device-specific channel
  unsubscribe = realtimeClient.subscribe({
    channels: [`device-${deviceId}`],
    events: ["tab.new"],
    onData: (payload) => {
      console.log("[OpenTab] Received tab:", payload)
      const data = payload.data as { id: string; url: string }
      if (data?.id && data?.url) {
        openAndMarkTab(data.id, data.url)
      }
    }
  })
}

const initialize = async (): Promise<void> => {
  const deviceId = await registerDevice()
  if (!deviceId) return

  await processPendingTabs()
  await subscribeToRealtime()
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "opentab-action",
    title: "Send to your devices",
    contexts: ["all", "browser_action"]
  })

  initialize()
})

chrome.runtime.onStartup.addListener(() => {
  initialize()
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "opentab-action" && tab?.url) {
    sendTabToDevices(tab.url, tab.title)
  }
})

initialize()
