import type { AppRouter } from "@opentab/api/routers"
import {
  createTRPCClient,
  httpBatchLink,
  httpSubscriptionLink
} from "@trpc/client"

import { env } from "~env"

const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier"

// MV2 uses callback-based APIs, wrap in promises
const storageGet = (key: string): Promise<Record<string, unknown>> =>
  new Promise((resolve) => chrome.storage.local.get(key, resolve))

const storageSet = (items: Record<string, unknown>): Promise<void> =>
  new Promise((resolve) => chrome.storage.local.set(items, resolve))

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpSubscriptionLink({
      url: `${env.PLASMO_PUBLIC_SERVER_URL}/api/trpc`,
      eventSourceOptions: () => ({ withCredentials: true })
    })
  ]
})

const trpcMutationClient = createTRPCClient<AppRouter>({
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

const registerDevice = async (): Promise<void> => {
  try {
    const deviceIdentifier = await getDeviceIdentifier()
    await trpcMutationClient.device.register.mutate({
      deviceType: "browser_extension",
      deviceName: "Chrome Extension",
      deviceIdentifier
    })
  } catch {
    // Not authenticated
  }
}

const sendTabToDevices = async (url: string, title?: string): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier()

  try {
    await trpcMutationClient.tab.send.mutate({
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
    trpcMutationClient.tab.markDelivered.mutate({ tabId }).catch(() => {
      if (createdTab?.id) {
        chrome.tabs.remove(createdTab.id)
      }
    })
  })
}

let currentSubscription: { unsubscribe: () => void } | null = null

const subscribeToTabs = async (): Promise<void> => {
  const deviceIdentifier = await getDeviceIdentifier()

  if (currentSubscription) {
    currentSubscription.unsubscribe()
    currentSubscription = null
  }

  currentSubscription = trpcClient.tab.onNewTab.subscribe(
    { deviceIdentifier },
    {
      onData: (tab) => {
        openAndMarkTab(tab.id, tab.url)
      },
      onError: () => {
        currentSubscription = null
        setTimeout(subscribeToTabs, 5000)
      },
      onComplete: () => {
        currentSubscription = null
        setTimeout(subscribeToTabs, 1000)
      }
    }
  )
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "opentab-action",
    title: "Send to your devices",
    contexts: ["all", "browser_action"]
  })

  registerDevice().then(() => subscribeToTabs())
})

chrome.runtime.onStartup.addListener(() => {
  registerDevice().then(() => subscribeToTabs())
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "opentab-action" && tab?.url) {
    sendTabToDevices(tab.url, tab.title)
  }
})
