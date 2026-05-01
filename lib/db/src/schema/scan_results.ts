import { pgTable, text, integer, real, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const scanResultsTable = pgTable("scan_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  cardName: text("card_name").notNull(),
  year: text("year"),
  setName: text("set_name"),
  parallel: text("parallel"),
  askingPrice: real("asking_price"),
  shipping: real("shipping"),
  estValue: integer("est_value"),
  estGrade: text("est_grade"),
  gradeRange: text("grade_range"),
  probability: integer("probability"),
  roi: real("roi"),
  recommendedAction: text("recommended_action"),
  imageQualityScore: integer("image_quality_score"),
  condition: jsonb("condition"),
  notes: jsonb("notes"),
  marketComps: jsonb("market_comps"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ScanResult = typeof scanResultsTable.$inferSelect;
export type InsertScanResult = typeof scanResultsTable.$inferInsert;
