import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const restorationRequestsTable = pgTable("restoration_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  card: text("card").notNull(),
  issueDescription: text("issue_description").notNull(),
  desiredOutcome: text("desired_outcome"),
  photos: jsonb("photos"),
  status: text("status").notNull().default("submitted"),
  quotedAmount: integer("quoted_amount"),
  finalAmount: integer("final_amount"),
  estimatedCompletion: text("estimated_completion"),
  completedAt: timestamp("completed_at"),
  technicianNotes: text("technician_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type RestorationRequest = typeof restorationRequestsTable.$inferSelect;
export type InsertRestorationRequest = typeof restorationRequestsTable.$inferInsert;
