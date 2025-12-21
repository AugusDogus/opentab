import { TRPCError } from "@trpc/server";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@opentab/db";
import { device } from "@opentab/db/schema/device";
import { pendingTab } from "@opentab/db/schema/pending-tab";

import { protectedProcedure, router } from "./index";

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
  }
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
});
