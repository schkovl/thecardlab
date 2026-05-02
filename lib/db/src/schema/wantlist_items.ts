import { pgTable, text, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";

export const wantlistItemsTable = pgTable("wantlist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  cardName: text("card_name").notNull(),
  targetGrade: text("target_grade").notNull(),
  maxPrice: integer("max_price").notNull(),
  priority: text("priority").notNull().default("medium"),
  notes: text("notes"),
  acquired: boolean("acquired").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WantlistItem = typeof wantlistItemsTable.$inferSelect;
export type InsertWantlistItem = typeof wantlistItemsTable.$inferInsert;
