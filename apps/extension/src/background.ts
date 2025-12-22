import type { AppRouter } from "@opentab/api/routers"
import { createTRPCClient, httpBatchLink } from "@trpc/client"

import { env } from "~env"

const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier"
const DEVICE_ID_KEY = "opentab_device_id"

// MV2 uses callback-based APIs, wrap in promises
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

const log = (message: string, ...args: unknown[]) => {
  console.log(`[opentab ${new Date().toISOString()}]`, message, ...args)
}

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

    // Get the device ID for realtime subscription
    const result = await trpcClient.tab.getDeviceId.query({ deviceIdentifier })
    await setDeviceId(result.deviceId)
    log("Device registered with ID:", result.deviceId)
    return result.deviceId
  } catch {
    // Not authenticated
    return null
  }
}

const sendTabToDevices = async (url: string, title?: string): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier()

  try {
    await trpcClient.tab.send.mutate({
      url,
      title,
      sourceDeviceIdentifier: deviceIdentifier
    })
  } catch (error) {
    console.error("Failed to send tab:", error)
  }
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

// Process any pending tabs from the database
const processPendingTabs = async (): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier()

  try {
    const pendingTabs = await trpcClient.tab.getPending.query({
      deviceIdentifier
    })

    for (const tab of pendingTabs) {
      log("Processing pending tab:", tab.url)
      openAndMarkTab(tab.id, tab.url)
    }
  } catch {
    // Not authenticated or error
  }
}

let eventSource: EventSource | null = null

const subscribeToRealtime = async (): Promise<void> => {
  const deviceId = await getDeviceId()

  if (!deviceId) {
    log("No device ID, skipping realtime subscription")
    return
  }

  // Close existing connection
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }

  const url = `${env.PLASMO_PUBLIC_SERVER_URL}/api/realtime?channel=device-${deviceId}`
  log("Connecting to realtime:", url)

  eventSource = new EventSource(url, { withCredentials: true })

  eventSource.onopen = () => {
    log("Realtime connected")
  }

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      log("Realtime message:", data)

      // Handle tab.new events
      if (data.event === "tab.new" && data.data) {
        const tab = data.data as {
          id: string
          url: string
          title: string | null
        }
        log("Received tab:", tab.url)
        openAndMarkTab(tab.id, tab.url)
      }
    } catch (error) {
      log("Failed to parse realtime message:", error)
    }
  }

  eventSource.onerror = (error) => {
    log("Realtime error:", error)
    eventSource?.close()
    eventSource = null
    // Reconnect after 5 seconds
    setTimeout(subscribeToRealtime, 5000)
  }
}

const initialize = async (): Promise<void> => {
  const deviceId = await registerDevice()

  if (deviceId) {
    // Process any pending tabs first
    await processPendingTabs()
    // Then subscribe to realtime
    await subscribeToRealtime()
  }
}

setInterval(() => {
  log("Background alive")
}, 60000)

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

// Start immediately when background script loads
initialize()
