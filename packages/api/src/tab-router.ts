import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@opentab/db";
import { device } from "@opentab/db/schema/device";
import { pendingTab } from "@opentab/db/schema/pending-tab";

import { protectedProcedure, router } from "./index";
import { emitTabEvent } from "./redis";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ExpoPushMessage = {
  readonly to: string;
  readonly title: string;
  readonly body: string;
  readonly data: Record<string, unknown>;
  readonly sound?: "default";
  readonly priority?: "high" | "normal" | "default";
};

const sendExpoPushNotification = async (messages: readonly ExpoPushMessage[]): Promise<void> => {
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

const sendEncryptedInput = z.object({
  sourceDeviceIdentifier: z.string(),
  senderPublicKey: z.string(),
  encryptedPayloads: z.array(
    z.object({
      targetDeviceId: z.string(),
      encryptedData: z.string(), // Serialized EncryptedPayload
    }),
  ),
});

const getPendingTabsInput = z.object({
  deviceIdentifier: z.string(),
});

const markTabDeliveredInput = z.object({
  tabId: z.string(),
});

export const tabRouter = router({
  sendEncrypted: protectedProcedure.input(sendEncryptedInput).mutation(async ({ ctx, input }) => {
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

    // Validate all target devices belong to the user
    const targetDeviceIds = input.encryptedPayloads.map((p) => p.targetDeviceId);
    const targetDevices = await db.query.device.findMany({
      where: and(eq(device.userId, userId)),
    });

    const userDeviceIds = new Set(targetDevices.map((d) => d.id));
    const invalidDeviceIds = targetDeviceIds.filter((id) => !userDeviceIds.has(id));
    if (invalidDeviceIds.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Some target devices do not belong to this user",
      });
    }

    const mobilePayloads = input.encryptedPayloads.filter((p) => {
      const targetDevice = targetDevices.find((d) => d.id === p.targetDeviceId);
      return targetDevice?.deviceType === "mobile" && targetDevice?.pushToken;
    });

    const extensionPayloads = input.encryptedPayloads.filter((p) => {
      const targetDevice = targetDevices.find((d) => d.id === p.targetDeviceId);
      return targetDevice?.deviceType === "browser_extension";
    });

    // Send push notifications to mobile devices with encrypted data
    const pushMessages: ExpoPushMessage[] = mobilePayloads.map((p) => {
      const targetDevice = targetDevices.find((d) => d.id === p.targetDeviceId)!;
      return {
        to: targetDevice.pushToken!,
        title: "opentab",
        body: "New tab shared",
        data: {
          encryptedData: p.encryptedData,
          senderPublicKey: input.senderPublicKey,
        },
        sound: "default" as const,
        priority: "high" as const,
      };
    });

    await sendExpoPushNotification(pushMessages);

    // Store encrypted tabs for browser extensions
    const pendingTabs = extensionPayloads.map((p) => ({
      id: crypto.randomUUID(),
      userId,
      targetDeviceId: p.targetDeviceId,
      sourceDeviceId: sourceDevice.id,
      encryptedData: p.encryptedData,
      senderPublicKey: input.senderPublicKey,
    }));

    if (pendingTabs.length > 0) {
      await db.insert(pendingTab).values(pendingTabs);

      await Promise.all(
        pendingTabs.map((tab) =>
          emitTabEvent(tab.targetDeviceId, {
            id: tab.id,
            encryptedData: tab.encryptedData,
            senderPublicKey: tab.senderPublicKey,
          }),
        ),
      );
    }

    return {
      sentToMobile: mobilePayloads.length,
      sentToExtensions: extensionPayloads.length,
    };
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

    return tabs.map((tab) => ({
      id: tab.id,
      encryptedData: tab.encryptedData,
      senderPublicKey: tab.senderPublicKey,
    }));
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
