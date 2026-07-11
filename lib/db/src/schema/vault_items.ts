import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const vaultItemsTable = pgTable("vault_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  card: text("card").notNull(),
  storageProvider: text("storage_provider").notNull(),
  locationLabel: text("location_label"),
  insuredValue: integer("insured_value").notNull(),
  status: text("status").notNull().default("stored"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type VaultItem = typeof vaultItemsTable.$inferSelect;
export type InsertVaultItem = typeof vaultItemsTable.$inferInsert;
