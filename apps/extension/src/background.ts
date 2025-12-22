import type { AppRouter } from "@opentab/api/routers"
import { createTRPCClient, httpBatchLink } from "@trpc/client"

import { env } from "~env"

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

let eventSource: EventSource | null = null

const subscribeToRealtime = async (): Promise<void> => {
  const deviceId = await getDeviceId()
  if (!deviceId) return

  if (eventSource) {
    eventSource.close()
    eventSource = null
  }

  const url = `${env.PLASMO_PUBLIC_SERVER_URL}/api/realtime?channel=device-${deviceId}`
  eventSource = new EventSource(url, { withCredentials: true })

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.event === "tab.new" && data.data) {
      openAndMarkTab(data.data.id, data.data.url)
    }
  }

  eventSource.onerror = () => {
    eventSource?.close()
    eventSource = null
    setTimeout(subscribeToRealtime, 5000)
  }
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
