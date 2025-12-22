/// <reference lib="webworker" />

import type { AppRouter } from "@opentab/api/routers"
import { createTRPCClient, httpBatchLink } from "@trpc/client"

import { env } from "~env"

// Declare service worker global scope
declare const self: ServiceWorkerGlobalScope

// Storage keys
const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier"

// Create tRPC client for background script
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

// Generate or retrieve device identifier
const getDeviceIdentifier = async (): Promise<string> => {
  const stored = await chrome.storage.local.get(DEVICE_IDENTIFIER_KEY)

  if (stored[DEVICE_IDENTIFIER_KEY]) {
    return stored[DEVICE_IDENTIFIER_KEY] as string
  }

  const newId = `extension-${crypto.randomUUID()}`
  await chrome.storage.local.set({ [DEVICE_IDENTIFIER_KEY]: newId })
  return newId
}

const subscribeToWebPush = async (): Promise<PushSubscription | null> => {
  try {
    const registration = await self.registration
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: false,
        applicationServerKey: Uint8Array.fromBase64(
          env.PLASMO_PUBLIC_VAPID_PUBLIC_KEY,
          {
            alphabet: "base64url"
          }
        )
      })
    }

    return subscription
  } catch (error) {
    console.error("Failed to subscribe to Web Push:", error)
    return null
  }
}

const registerDevice = async (): Promise<void> => {
  try {
    const deviceIdentifier = await getDeviceIdentifier()
    const pushSubscription = await subscribeToWebPush()

    await trpcClient.device.register.mutate({
      deviceType: "browser_extension",
      deviceName: "Chrome Extension",
      deviceIdentifier,
      webPushSubscription: pushSubscription
        ? {
            endpoint: pushSubscription.endpoint,
            keys: {
              p256dh: btoa(
                String.fromCharCode(
                  ...new Uint8Array(pushSubscription.getKey("p256dh")!)
                )
              ),
              auth: btoa(
                String.fromCharCode(
                  ...new Uint8Array(pushSubscription.getKey("auth")!)
                )
              )
            }
          }
        : undefined
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
    // If marking failed, close the tab to prevent duplicates on reconnect
    if (createdTab?.id) {
      await chrome.tabs.remove(createdTab.id)
    }
  }
}

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return

  const data = event.data.json() as {
    type: string
    tabId: string
    url: string
    title: string | null
  }

  if (data.type === "new_tab") {
    event.waitUntil(openAndMarkTab(data.tabId, data.url))
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "opentab-action",
    title: "Send to your devices",
    contexts: ["all", "action"]
  })

  registerDevice().catch((err) => console.error("Registration failed:", err))
})

chrome.runtime.onStartup.addListener(() => {
  registerDevice().catch((err) => console.error("Registration failed:", err))
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "opentab-action" && tab?.url) {
    await sendTabToDevices(tab.url, tab.title)
  }
})
