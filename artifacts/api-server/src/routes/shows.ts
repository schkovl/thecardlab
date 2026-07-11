import { Router, type IRouter } from "express";
import { db, showsTable, showAttendancesTable } from "@workspace/db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireFeature } from "../middlewares/requireFeature";
import { getAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/shows", async (_req, res) => {
  const rows = await db
    .select({
      id: showsTable.id,
      name: showsTable.name,
      city: showsTable.city,
      state: showsTable.state,
      venue: showsTable.venue,
      startDate: showsTable.startDate,
      endDate: showsTable.endDate,
      description: showsTable.description,
      website: showsTable.website,
      expectedAttendees: showsTable.expectedAttendees,
      isOfficial: showsTable.isOfficial,
      tier: showsTable.tier,
      country: showsTable.country,
      attendeeCount: sql<number>`(SELECT count(*)::int FROM ${showAttendancesTable} WHERE ${showAttendancesTable.showId} = ${showsTable.id})`,
    })
    .from(showsTable)
    .orderBy(asc(showsTable.startDate));
  res.json(rows);
});

router.post("/shows", requireAuth, requireFeature("shows"), async (req, res) => {
  const { userId } = getAuth(req);
  const { name, city, state, venue, startDate, endDate, description, website, expectedAttendees } = req.body ?? {};
  if (!name || !city || !startDate) {
    res.status(400).json({ error: "name, city, startDate required" });
    return;
  }
  const [row] = await db
    .insert(showsTable)
    .values({
      name,
      city,
      state: state ?? null,
      venue: venue ?? null,
      startDate,
      endDate: endDate ?? null,
      description: description ?? null,
      website: website ?? null,
      expectedAttendees: expectedAttendees ?? null,
      isOfficial: false,
      submittedBy: userId!,
    })
    .returning();
  res.json(row);
});

router.get("/shows/:id/attendees", requireAuth, requireFeature("shows"), async (req, res) => {
  const rows = await db
    .select()
    .from(showAttendancesTable)
    .where(eq(showAttendancesTable.showId, req.params.id as string))
    .orderBy(desc(showAttendancesTable.createdAt));
  res.json(rows);
});

router.post("/shows/:id/rsvp", requireAuth, requireFeature("shows"), async (req, res) => {
  const { userId } = getAuth(req);
  const id = req.params.id as string;
  const { status, notes } = req.body ?? {};
  const next = status ?? "interested";
  const existing = await db
    .select()
    .from(showAttendancesTable)
    .where(and(eq(showAttendancesTable.showId, id), eq(showAttendancesTable.clerkUserId, userId!)))
    .limit(1);
  let row;
  if (existing[0]) {
    [row] = await db
      .update(showAttendancesTable)
      .set({ status: next, notes: notes ?? existing[0].notes })
      .where(eq(showAttendancesTable.id, existing[0].id))
      .returning();
  } else {
    [row] = await db
      .insert(showAttendancesTable)
      .values({ showId: id, clerkUserId: userId!, status: next, notes: notes ?? null })
      .returning();
  }
  res.json(row);
});

router.get("/my/show-rsvps", requireAuth, requireFeature("shows"), async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(showAttendancesTable)
    .where(eq(showAttendancesTable.clerkUserId, userId!));
  res.json(rows);
});

export default router;
