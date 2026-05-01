import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const portfolioHoldingsTable = pgTable("portfolio_holdings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  card: text("card").notNull(),
  grade: text("grade").notNull(),
  cost: integer("cost").notNull(),
  value: integer("value").notNull(),
  purchaseDate: text("purchase_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PortfolioHolding = typeof portfolioHoldingsTable.$inferSelect;
export type InsertPortfolioHolding = typeof portfolioHoldingsTable.$inferInsert;
