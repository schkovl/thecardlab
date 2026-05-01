import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, portfolioHoldingsTable, portfolioSnapshotsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { CreatePortfolioHoldingBody, UpdatePortfolioHoldingBody, ListPortfolioHoldingsResponseItem, GetPortfolioHistoryResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

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

router.post("/portfolio", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const body = CreatePortfolioHoldingBody.parse(req.body);

  const [row] = await db
    .insert(portfolioHoldingsTable)
    .values({
      clerkUserId: userId!,
      card: body.card,
      grade: body.grade,
      cost: body.cost,
      value: body.value,
      purchaseDate: body.purchaseDate ?? null,
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

  if (Object.keys(updateValues).length === 0) {
    res.status(400).json({ error: "At least one field (grade or value) must be provided" });
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
