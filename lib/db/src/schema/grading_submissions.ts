import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const gradingSubmissionsTable = pgTable("grading_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  cardName: text("card_name").notNull(),
  grader: text("grader").notNull(),
  serviceLevel: text("service_level").notNull(),
  declaredValue: integer("declared_value"),
  submittedDate: text("submitted_date"),
  returnedDate: text("returned_date"),
  certNumber: text("cert_number"),
  status: text("status").notNull().default("pending"),
  gradeReceived: text("grade_received"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GradingSubmission = typeof gradingSubmissionsTable.$inferSelect;
export type InsertGradingSubmission = typeof gradingSubmissionsTable.$inferInsert;
