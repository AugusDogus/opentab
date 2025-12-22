import type { AppRouter } from "@opentab/api/routers"
import { createTRPCClient, httpBatchLink } from "@trpc/client"

import { env } from "~env"

const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier"
const POLL_INTERVAL_MS = 5000 // 5 seconds

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.PLASMO_PUBLIC_SERVER_URL}/api/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include"
        })
      }
    })
  ]
})

const getDeviceIdentifier = async (): Promise<string> => {
  const stored = await chrome.storage.local.get(DEVICE_IDENTIFIER_KEY)

  if (stored[DEVICE_IDENTIFIER_KEY]) {
    return stored[DEVICE_IDENTIFIER_KEY] as string
  }

  const newId = `extension-${crypto.randomUUID()}`
  await chrome.storage.local.set({ [DEVICE_IDENTIFIER_KEY]: newId })
  return newId
}

const registerDevice = async (): Promise<void> => {
  try {
    const deviceIdentifier = await getDeviceIdentifier()
    await trpcClient.device.register.mutate({
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
    await trpcClient.tab.send.mutate({
      url,
      title,
      sourceDeviceIdentifier: deviceIdentifier
    })
  } catch (error) {
    console.error("Failed to send tab:", error)
  }
}

const openAndMarkTab = async (tabId: string, url: string): Promise<void> => {
  const createdTab = await chrome.tabs.create({ url, active: true })

  try {
    await trpcClient.tab.markDelivered.mutate({ tabId })
  } catch {
    if (createdTab?.id) {
      await chrome.tabs.remove(createdTab.id)
    }
  }
}

const pollForTabs = async (): Promise<void> => {
  try {
    const deviceIdentifier = await getDeviceIdentifier()
    const pendingTabs = await trpcClient.tab.getPending.query({
      deviceIdentifier
    })

    for (const tab of pendingTabs) {
      await openAndMarkTab(tab.id, tab.url)
    }
  } catch {
    // Not authenticated or network error
  }
}

const startPolling = () => {
  pollForTabs()
  setInterval(pollForTabs, POLL_INTERVAL_MS)
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "opentab-action",
    title: "Send to your devices",
    contexts: ["all", "action"]
  })

  registerDevice().then(() => startPolling())
})

chrome.runtime.onStartup.addListener(() => {
  registerDevice().then(() => startPolling())
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "opentab-action" && tab?.url) {
    await sendTabToDevices(tab.url, tab.title)
  }
})
