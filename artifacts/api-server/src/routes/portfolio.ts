import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { db, portfolioHoldingsTable, portfolioSnapshotsTable, isCollectibleCategory } from "@workspace/db";
import { eq, and, asc, count } from "drizzle-orm";
import { CreatePortfolioHoldingBody, UpdatePortfolioHoldingBody, ListPortfolioHoldingsResponseItem, GetPortfolioHistoryResponse } from "@workspace/api-zod";
import { limitsForTier } from "@workspace/entitlements";
import { requireAuth } from "../middlewares/requireAuth";
import { resolveEntitlements } from "../lib/entitlements";

const router: IRouter = Router();

function toResponse(row: typeof portfolioHoldingsTable.$inferSelect) {
  const gain = row.value - row.cost;
  const gainPct = row.cost > 0 ? (gain / row.cost) * 100 : 0;
  return ListPortfolioHoldingsResponseItem.parse({
    id: row.id,
    card: row.card,
    grade: row.grade,
    cost: row.cost,
    value: row.value,
    gain,
    gainPct: Math.round(gainPct * 10) / 10,
    purchaseDate: row.purchaseDate ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

router.get("/portfolio", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  const rows = await db
    .select()
    .from(portfolioHoldingsTable)
    .where(eq(portfolioHoldingsTable.clerkUserId, userId!))
    .orderBy(portfolioHoldingsTable.createdAt);

  res.json(rows.map(toResponse));
});

// POST /portfolio — free tier capped at limits.portfolioHoldings (50).
// Returns 402 Payment Required so clients can branch on it for upgrade UX
// distinct from a 403 Forbidden.
router.post("/portfolio", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const body = CreatePortfolioHoldingBody.parse(req.body);

  const ent = await resolveEntitlements(userId!);
  const cap = limitsForTier(ent.tier).portfolioHoldings;
  if (isFinite(cap)) {
    const [{ value: current }] = await db
      .select({ value: count() })
      .from(portfolioHoldingsTable)
      .where(eq(portfolioHoldingsTable.clerkUserId, userId!));
    if (current >= cap) {
      res.status(402).json({
        error: "limit_reached",
        message: `Free plan is limited to ${cap} holdings. Upgrade to Pro for unlimited.`,
        feature: "portfolio.write",
        currentTier: ent.tier,
        limit: cap,
      });
      return;
    }
  }

  const [row] = await db
    .insert(portfolioHoldingsTable)
    .values({
      clerkUserId: userId!,
      card: body.card,
      grade: body.grade,
      cost: body.cost,
      value: body.value,
      purchaseDate: body.purchaseDate ?? null,
      category: isCollectibleCategory(req.body?.category) ? req.body.category : "sports",
      subcategory: typeof req.body?.subcategory === "string" ? req.body.subcategory : null,
    })
    .returning();

  res.status(201).json(toResponse(row));
});

router.put("/portfolio/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);
  const body = UpdatePortfolioHoldingBody.parse(req.body);

  const updateValues: Partial<typeof portfolioHoldingsTable.$inferSelect> = {};
  if (body.grade !== undefined) updateValues.grade = body.grade;
  if (body.value !== undefined) updateValues.value = body.value;
  if (body.cost !== undefined) updateValues.cost = body.cost;

  if (Object.keys(updateValues).length === 0) {
    res.status(400).json({ error: "At least one field (grade, value, or cost) must be provided" });
    return;
  }

  const updated = await db
    .update(portfolioHoldingsTable)
    .set(updateValues)
    .where(and(eq(portfolioHoldingsTable.id, id), eq(portfolioHoldingsTable.clerkUserId, userId!)))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const holdings = await db
    .select()
    .from(portfolioHoldingsTable)
    .where(eq(portfolioHoldingsTable.clerkUserId, userId!));
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  await db
    .insert(portfolioSnapshotsTable)
    .values({ clerkUserId: userId!, totalValue, snapshotDate: today })
    .onConflictDoUpdate({
      target: [portfolioSnapshotsTable.clerkUserId, portfolioSnapshotsTable.snapshotDate],
      set: { totalValue },
    });

  res.json(toResponse(updated[0]));
});

router.get("/portfolio/history", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  const holdings = await db
    .select()
    .from(portfolioHoldingsTable)
    .where(eq(portfolioHoldingsTable.clerkUserId, userId!));

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const today = new Date().toISOString().split("T")[0];

  await db
    .insert(portfolioSnapshotsTable)
    .values({ clerkUserId: userId!, totalValue, snapshotDate: today })
    .onConflictDoUpdate({
      target: [portfolioSnapshotsTable.clerkUserId, portfolioSnapshotsTable.snapshotDate],
      set: { totalValue },
    });

  const rows = await db
    .select()
    .from(portfolioSnapshotsTable)
    .where(eq(portfolioSnapshotsTable.clerkUserId, userId!))
    .orderBy(asc(portfolioSnapshotsTable.snapshotDate));

  res.json(
    GetPortfolioHistoryResponse.parse(
      rows.map((r) => ({
        id: r.id,
        snapshotDate: r.snapshotDate,
        totalValue: r.totalValue,
        createdAt: r.createdAt.toISOString(),
      }))
    )
  );
});

router.delete("/portfolio/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);

  const deleted = await db
    .delete(portfolioHoldingsTable)
    .where(and(eq(portfolioHoldingsTable.id, id), eq(portfolioHoldingsTable.clerkUserId, userId!)))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(204).send();
});

export default router;
