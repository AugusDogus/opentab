import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@opentab/db";
import { device } from "@opentab/db/schema/device";
import { pendingTab } from "@opentab/db/schema/pending-tab";

import { protectedProcedure, router } from "./index";
import { emitTabEvent } from "./redis";

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

const sendToDeviceInput = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  sourceDeviceIdentifier: z.string(),
  targetDeviceId: z.string(),
});

export const tabRouter = router({
  send: protectedProcedure.input(sendTabInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

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

    const targetDevices = await db.query.device.findMany({
      where: and(eq(device.userId, userId), ne(device.id, sourceDevice.id)),
    });

    if (targetDevices.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No other devices found. Please register at least one other device.",
      });
    }

    const mobileDevices = targetDevices.filter((d) => d.deviceType === "mobile" && d.pushToken);
    const extensionDevices = targetDevices.filter((d) => d.deviceType === "browser_extension");

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

      await Promise.all(
        pendingTabs.map((tab) =>
          emitTabEvent(tab.targetDeviceId, {
            id: tab.id,
            url: tab.url,
            title: tab.title,
          }),
        ),
      );
    }

    return {
      sentToMobile: mobileDevices.length,
      sentToExtensions: extensionDevices.length,
    };
  }),

  sendToDevice: protectedProcedure.input(sendToDeviceInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

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

    const targetDevice = await db.query.device.findFirst({
      where: and(eq(device.userId, userId), eq(device.id, input.targetDeviceId)),
    });

    if (!targetDevice) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Target device not found.",
      });
    }

    if (targetDevice.id === sourceDevice.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot send tab to the same device.",
      });
    }

    if (targetDevice.deviceType === "mobile" && targetDevice.pushToken) {
      await sendExpoPushNotification([
        {
          to: targetDevice.pushToken,
          title: "Open Tab",
          body: input.title ?? input.url,
          data: {
            url: input.url,
            title: input.title,
            sourceDeviceId: sourceDevice.id,
          },
          sound: "default",
          priority: "high",
        },
      ]);
      return { sent: true, deviceType: "mobile" as const };
    }

    if (targetDevice.deviceType === "browser_extension") {
      const tabId = crypto.randomUUID();
      await db.insert(pendingTab).values({
        id: tabId,
        userId,
        targetDeviceId: targetDevice.id,
        sourceDeviceId: sourceDevice.id,
        url: input.url,
        title: input.title ?? null,
      });

      await emitTabEvent(targetDevice.id, {
        id: tabId,
        url: input.url,
        title: input.title ?? null,
      });

      return { sent: true, deviceType: "browser_extension" as const };
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unable to send to this device type.",
    });
  }),

  getPending: protectedProcedure.input(getPendingTabsInput).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    const targetDevice = await db.query.device.findFirst({
      where: and(eq(device.userId, userId), eq(device.deviceIdentifier, input.deviceIdentifier)),
    });

    if (!targetDevice) {
      return [];
    }

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

  getDeviceId: protectedProcedure
    .input(z.object({ deviceIdentifier: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const targetDevice = await db.query.device.findFirst({
        where: and(eq(device.userId, userId), eq(device.deviceIdentifier, input.deviceIdentifier)),
      });

      if (!targetDevice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found. Please register your device first.",
        });
      }

      return { deviceId: targetDevice.id };
    }),
});
