import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sellerId: text("seller_id").notNull(),
  card: text("card").notNull(),
  grade: text("grade"),
  price: integer("price").notNull(),
  shipping: integer("shipping").notNull().default(0),
  condition: text("condition"),
  description: text("description"),
  photos: jsonb("photos"),
  source: text("source").notNull().default("internal"),
  externalUrl: text("external_url"),
  status: text("status").notNull().default("active"),
  category: text("category").notNull().default("sports"),
  subcategory: text("subcategory"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListingsTable.$inferInsert;
