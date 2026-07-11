import { pgTable, text, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";

export const userAlertsTable = pgTable("user_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  cardName: text("card_name").notNull(),
  alertType: text("alert_type").notNull().$type<"price_drop" | "pop_update" | "market_trend">(),
  thresholdPrice: integer("threshold_price"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserAlert = typeof userAlertsTable.$inferSelect;
export type InsertUserAlert = typeof userAlertsTable.$inferInsert;
