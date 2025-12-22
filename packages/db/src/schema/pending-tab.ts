import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { device } from "./device";

export const pendingTab = sqliteTable(
  "pending_tab",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The device that should receive this tab (for extensions)
    targetDeviceId: text("target_device_id")
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    // The device that sent this tab
    sourceDeviceId: text("source_device_id")
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    encryptedData: text("encrypted_data").notNull(), // Encrypted {url, title} blob
    senderPublicKey: text("sender_public_key").notNull(), // For decryption
    // Whether this tab has been delivered/opened
    delivered: integer("delivered", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("pending_tab_userId_idx").on(table.userId),
    index("pending_tab_targetDeviceId_idx").on(table.targetDeviceId),
    index("pending_tab_delivered_idx").on(table.delivered),
  ],
);

export const pendingTabRelations = relations(pendingTab, ({ one }) => ({
  user: one(user, {
    fields: [pendingTab.userId],
    references: [user.id],
  }),
  targetDevice: one(device, {
    fields: [pendingTab.targetDeviceId],
    references: [device.id],
    relationName: "targetDevice",
  }),
  sourceDevice: one(device, {
    fields: [pendingTab.sourceDeviceId],
    references: [device.id],
    relationName: "sourceDevice",
  }),
}));
