import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

import { user, session, account } from "./auth";

export const device = sqliteTable(
  "device",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceType: text("device_type", { enum: ["mobile", "browser_extension"] }).notNull(),
    deviceName: text("device_name"),
    // For mobile: Expo push token, For extension: unique identifier
    pushToken: text("push_token"),
    // Unique identifier for the device (helps avoid duplicate registrations)
    deviceIdentifier: text("device_identifier").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("device_userId_idx").on(table.userId),
    index("device_identifier_idx").on(table.deviceIdentifier),
  ],
);

export const deviceRelations = relations(device, ({ one }) => ({
  user: one(user, {
    fields: [device.userId],
    references: [user.id],
  }),
}));

// Extended user relations including devices
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  devices: many(device),
}));
