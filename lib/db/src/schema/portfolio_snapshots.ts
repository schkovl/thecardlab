import { pgTable, text, integer, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const portfolioSnapshotsTable = pgTable(
  "portfolio_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    totalValue: integer("total_value").notNull(),
    snapshotDate: text("snapshot_date").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("portfolio_snapshots_user_date_unique").on(t.clerkUserId, t.snapshotDate)]
);

export type PortfolioSnapshot = typeof portfolioSnapshotsTable.$inferSelect;
export type InsertPortfolioSnapshot = typeof portfolioSnapshotsTable.$inferInsert;
