import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { db } from "@opentab/db";
import { device } from "@opentab/db/schema/device";

import { protectedProcedure, router } from "./index";

const deviceTypeSchema = z.enum(["mobile", "browser_extension"]);

const registerDeviceInput = z.object({
  deviceType: deviceTypeSchema,
  deviceName: z.string().optional(),
  pushToken: z.string().optional(),
  deviceIdentifier: z.string(),
});

const removeDeviceInput = z.object({
  deviceId: z.string(),
});

export const deviceRouter = router({
  register: protectedProcedure.input(registerDeviceInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // Check if device with this identifier already exists for this user
    const existingDevice = await db.query.device.findFirst({
      where: and(eq(device.userId, userId), eq(device.deviceIdentifier, input.deviceIdentifier)),
    });

    if (existingDevice) {
      // Update existing device
      const [updatedDevice] = await db
        .update(device)
        .set({
          deviceName: input.deviceName ?? existingDevice.deviceName,
          pushToken: input.pushToken ?? existingDevice.pushToken,
          deviceType: input.deviceType,
        })
        .where(eq(device.id, existingDevice.id))
        .returning();

      return updatedDevice;
    }

    // Create new device
    const deviceId = crypto.randomUUID();
    const [newDevice] = await db
      .insert(device)
      .values({
        id: deviceId,
        userId,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
        pushToken: input.pushToken,
        deviceIdentifier: input.deviceIdentifier,
      })
      .returning();

    return newDevice;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const devices = await db.query.device.findMany({
      where: eq(device.userId, userId),
      orderBy: (device, { desc }) => [desc(device.createdAt)],
    });

    return devices;
  }),

  remove: protectedProcedure.input(removeDeviceInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // Verify the device belongs to the user
    const existingDevice = await db.query.device.findFirst({
      where: and(eq(device.id, input.deviceId), eq(device.userId, userId)),
    });

    if (!existingDevice) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Device not found",
      });
    }

    await db.delete(device).where(eq(device.id, input.deviceId));

    return { success: true };
  }),
});
