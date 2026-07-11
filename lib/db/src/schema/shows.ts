import { pgTable, text, integer, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const showsTable = pgTable("shows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  venue: text("venue"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  description: text("description"),
  website: text("website"),
  expectedAttendees: integer("expected_attendees"),
  isOfficial: boolean("is_official").notNull().default(false),
  tier: text("tier").notNull().default("tier3"),
  country: text("country").notNull().default("US"),
  submittedBy: text("submitted_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const showAttendancesTable = pgTable("show_attendances", {
  id: uuid("id").primaryKey().defaultRandom(),
  showId: uuid("show_id").notNull(),
  clerkUserId: text("clerk_user_id").notNull(),
  status: text("status").notNull().default("interested"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Show = typeof showsTable.$inferSelect;
export type InsertShow = typeof showsTable.$inferInsert;
export type ShowAttendance = typeof showAttendancesTable.$inferSelect;
export type InsertShowAttendance = typeof showAttendancesTable.$inferInsert;
