import { TRPCError } from "@trpc/server";
import { eq, and, ne } from "drizzle-orm";
import webpush from "web-push";
import { z } from "zod";

import { db } from "@opentab/db";
import { device } from "@opentab/db/schema/device";
import { pendingTab } from "@opentab/db/schema/pending-tab";

import { protectedProcedure, router } from "./index";

// Simple event emitter for notifying subscribers of new tabs
type TabEventListener = (tab: { id: string; url: string; title: string | null }) => void;
const tabEventListeners = new Map<string, Set<TabEventListener>>();

const emitNewTab = (
  targetDeviceId: string,
  tab: { id: string; url: string; title: string | null },
): void => {
  const listeners = tabEventListeners.get(targetDeviceId);
  if (listeners) {
    listeners.forEach((listener) => listener(tab));
  }
};

const addTabListener = (deviceId: string, listener: TabEventListener): (() => void) => {
  const listeners = tabEventListeners.get(deviceId) ?? new Set();
  listeners.add(listener);
  tabEventListeners.set(deviceId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      tabEventListeners.delete(deviceId);
    }
  };
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound?: "default";
  priority?: "high" | "normal" | "default";
};

const sendExpoPushNotification = async (messages: ExpoPushMessage[]): Promise<void> => {
  if (messages.length === 0) return;

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error("Failed to send push notification:", await response.text());
    return;
  }

  // Check individual message results
  try {
    const result = (await response.json()) as {
      data?: Array<{ status: string; message?: string; details?: unknown }>;
    };
    for (const ticket of result.data ?? []) {
      if (ticket.status === "error") {
        console.error("Push notification error:", ticket.message, ticket.details);
      }
    }
  } catch (e) {
    console.error("Failed to parse push notification response:", e);
  }
};

type WebPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const sendWebPushNotification = async (
  subscriptions: Array<{ subscription: WebPushSubscription; tabId: string }>,
  payload: { url: string; title: string | null },
): Promise<void> => {
  if (subscriptions.length === 0) return;

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) return;

  webpush.setVapidDetails("mailto:opentab@example.com", vapidPublicKey, vapidPrivateKey);

  await Promise.allSettled(
    subscriptions.map(({ subscription, tabId }) =>
      webpush.sendNotification(
        subscription,
        JSON.stringify({
          type: "new_tab",
          tabId,
          url: payload.url,
          title: payload.title,
        }),
      ),
    ),
  );
};

const sendTabInput = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  sourceDeviceIdentifier: z.string(),
});

const getPendingTabsInput = z.object({
  deviceIdentifier: z.string(),
});

const markTabDeliveredInput = z.object({
  tabId: z.string(),
});

export const tabRouter = router({
  send: protectedProcedure.input(sendTabInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // Find the source device
    const sourceDevice = await db.query.device.findFirst({
      where: and(
        eq(device.userId, userId),
        eq(device.deviceIdentifier, input.sourceDeviceIdentifier),
      ),
    });

    if (!sourceDevice) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Source device not found. Please register your device first.",
      });
    }

    // Get all other devices for this user (excluding the source)
    const targetDevices = await db.query.device.findMany({
      where: and(eq(device.userId, userId), ne(device.id, sourceDevice.id)),
    });

    if (targetDevices.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No other devices found. Please register at least one other device.",
      });
    }

    // Separate devices by type
    const mobileDevices = targetDevices.filter((d) => d.deviceType === "mobile" && d.pushToken);
    const extensionDevices = targetDevices.filter((d) => d.deviceType === "browser_extension");

    // Send push notifications to mobile devices
    const pushMessages: ExpoPushMessage[] = mobileDevices.map((d) => ({
      to: d.pushToken!,
      title: "Open Tab",
      body: input.title ?? input.url,
      data: {
        url: input.url,
        title: input.title,
        sourceDeviceId: sourceDevice.id,
      },
      sound: "default" as const,
      priority: "high" as const,
    }));

    await sendExpoPushNotification(pushMessages);

    // Create pending tabs for browser extensions
    const pendingTabs = extensionDevices.map((d) => ({
      id: crypto.randomUUID(),
      userId,
      targetDeviceId: d.id,
      sourceDeviceId: sourceDevice.id,
      url: input.url,
      title: input.title ?? null,
    }));

    if (pendingTabs.length > 0) {
      await db.insert(pendingTab).values(pendingTabs);

      const webPushSubscriptions: Array<{
        subscription: WebPushSubscription;
        tabId: string;
      }> = [];

      for (const tab of pendingTabs) {
        const targetDevice = extensionDevices.find((d) => d.id === tab.targetDeviceId);
        if (targetDevice?.webPushSubscription) {
          try {
            const subscription = JSON.parse(
              targetDevice.webPushSubscription,
            ) as WebPushSubscription;
            webPushSubscriptions.push({ subscription, tabId: tab.id });
          } catch {
            // Invalid subscription JSON
          }
        }
      }

      if (webPushSubscriptions.length > 0) {
        await sendWebPushNotification(webPushSubscriptions, {
          url: input.url,
          title: input.title ?? null,
        });
      }

      // Emit events for SSE subscribers (fallback)
      pendingTabs.forEach((tab) => {
        emitNewTab(tab.targetDeviceId, {
          id: tab.id,
          url: tab.url,
          title: tab.title,
        });
      });
    }

    return {
      sentToMobile: mobileDevices.length,
      sentToExtensions: extensionDevices.length,
    };
  }),

  getPending: protectedProcedure.input(getPendingTabsInput).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // Find the device
    const targetDevice = await db.query.device.findFirst({
      where: and(eq(device.userId, userId), eq(device.deviceIdentifier, input.deviceIdentifier)),
    });

    if (!targetDevice) {
      return [];
    }

    // Get pending tabs for this device
    const tabs = await db.query.pendingTab.findMany({
      where: and(eq(pendingTab.targetDeviceId, targetDevice.id), eq(pendingTab.delivered, false)),
      orderBy: (tab, { asc }) => [asc(tab.createdAt)],
    });

    return tabs;
  }),

  markDelivered: protectedProcedure
    .input(markTabDeliveredInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the tab belongs to the user
      const tab = await db.query.pendingTab.findFirst({
        where: and(eq(pendingTab.id, input.tabId), eq(pendingTab.userId, userId)),
      });

      if (!tab) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tab not found",
        });
      }

      await db
        .update(pendingTab)
        .set({
          delivered: true,
          deliveredAt: new Date(),
        })
        .where(eq(pendingTab.id, input.tabId));

      return { success: true };
    }),

  // SSE subscription for receiving tabs in real-time
  onNewTab: protectedProcedure
    .input(
      z.object({
        deviceIdentifier: z.string(),
        lastEventId: z.string().optional(),
      }),
    )
    .subscription(async function* ({ ctx, input, signal }) {
      const userId = ctx.session.user.id;

      // Find the device
      const targetDevice = await db.query.device.findFirst({
        where: and(eq(device.userId, userId), eq(device.deviceIdentifier, input.deviceIdentifier)),
      });

      if (!targetDevice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found. Please register your device first.",
        });
      }

      // First, yield any existing pending tabs
      const existingTabs = await db.query.pendingTab.findMany({
        where: and(eq(pendingTab.targetDeviceId, targetDevice.id), eq(pendingTab.delivered, false)),
        orderBy: (tab, { asc }) => [asc(tab.createdAt)],
      });

      for (const tab of existingTabs) {
        yield {
          id: tab.id,
          url: tab.url,
          title: tab.title,
        };
      }

      // Then listen for new tabs
      const tabQueue: Array<{ id: string; url: string; title: string | null }> = [];
      let resolveWait: (() => void) | null = null;

      const cleanup = addTabListener(targetDevice.id, (tab) => {
        tabQueue.push(tab);
        if (resolveWait) {
          resolveWait();
          resolveWait = null;
        }
      });

      try {
        // Guard against undefined signal to prevent infinite loop
        if (!signal) {
          console.warn("No abort signal provided for subscription");
          return;
        }

        while (!signal.aborted) {
          // Wait for new tabs if queue is empty
          if (tabQueue.length === 0) {
            await new Promise<void>((resolve) => {
              resolveWait = resolve;
              // Also resolve if signal is aborted
              const abortHandler = () => resolve();
              signal.addEventListener("abort", abortHandler, { once: true });
            });
          }

          // Yield all queued tabs
          while (tabQueue.length > 0) {
            const tab = tabQueue.shift()!;
            yield tab;
          }
        }
      } finally {
        cleanup();
      }
    }),
});
