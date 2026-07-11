import { pgTable, text, integer, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const researchAlertsTable = pgTable("research_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  cardName: text("card_name").notNull(),
  direction: text("direction").notNull(),
  threshold: integer("threshold").notNull(),
  active: boolean("active").notNull().default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ResearchAlert = typeof researchAlertsTable.$inferSelect;
export type InsertResearchAlert = typeof researchAlertsTable.$inferInsert;
