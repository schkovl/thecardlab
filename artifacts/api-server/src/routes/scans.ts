import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { db, scanResultsTable } from "@workspace/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { CreateScanResultBody, ListScanResultsResponseItem } from "@workspace/api-zod";
import { limitsForTier } from "@workspace/entitlements";
import { requireAuth } from "../middlewares/requireAuth";
import { requireFeature } from "../middlewares/requireFeature";
import { resolveEntitlements } from "../lib/entitlements";

const router: IRouter = Router();

function toResponse(row: typeof scanResultsTable.$inferSelect) {
  return ListScanResultsResponseItem.parse({
    id: row.id,
    cardName: row.cardName,
    year: row.year ?? null,
    setName: row.setName ?? null,
    parallel: row.parallel ?? null,
    askingPrice: row.askingPrice ?? null,
    shipping: row.shipping ?? null,
    estValue: row.estValue ?? null,
    estGrade: row.estGrade ?? null,
    gradeRange: row.gradeRange ?? null,
    probability: row.probability ?? null,
    roi: row.roi ?? null,
    recommendedAction: row.recommendedAction ?? null,
    imageQualityScore: row.imageQualityScore ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

// GET /scans — free tier: server clips the date range to the per-tier window.
// Pro tier: full history, no clip. The clip is enforced server-side so a
// hand-crafted client request can't widen the window.
router.get("/scans", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const ent = await resolveEntitlements(userId!);
  const windowDays = limitsForTier(ent.tier).salesRecentWindowDays;
  const since = isFinite(windowDays)
    ? new Date(Date.now() - windowDays * 86_400_000)
    : null;

  const rows = await db
    .select()
    .from(scanResultsTable)
    .where(
      since
        ? and(
            eq(scanResultsTable.clerkUserId, userId!),
            gte(scanResultsTable.createdAt, since),
          )
        : eq(scanResultsTable.clerkUserId, userId!),
    )
    .orderBy(desc(scanResultsTable.createdAt))
    .limit(50);

  res.json(rows.map(toResponse));
});

// POST /scans — running a new AI grade scan is Pro-only.
router.post("/scans", requireAuth, requireFeature("grade_lab"), async (req, res) => {
  const { userId } = getAuth(req);
  const body = CreateScanResultBody.parse(req.body);

  const [row] = await db
    .insert(scanResultsTable)
    .values({
      clerkUserId: userId!,
      cardName: body.cardName,
      year: body.year ?? null,
      setName: body.setName ?? null,
      parallel: body.parallel ?? null,
      askingPrice: body.askingPrice ?? null,
      shipping: body.shipping ?? null,
      estValue: body.estValue ?? null,
      estGrade: body.estGrade ?? null,
      gradeRange: body.gradeRange ?? null,
      probability: body.probability ?? null,
      roi: body.roi ?? null,
      recommendedAction: body.recommendedAction ?? null,
      imageQualityScore: body.imageQualityScore ?? null,
    })
    .returning();

  res.status(201).json(toResponse(row));
});

export default router;
