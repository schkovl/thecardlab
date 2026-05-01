import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, portfolioHoldingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreatePortfolioHoldingBody, ListPortfolioHoldingsResponseItem } from "@workspace/api-zod";

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

router.get("/portfolio", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rows = await db
    .select()
    .from(portfolioHoldingsTable)
    .where(eq(portfolioHoldingsTable.clerkUserId, userId))
    .orderBy(portfolioHoldingsTable.createdAt);

  res.json(rows.map(toResponse));
});

router.post("/portfolio", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = CreatePortfolioHoldingBody.parse(req.body);

  const [row] = await db
    .insert(portfolioHoldingsTable)
    .values({
      clerkUserId: userId,
      card: body.card,
      grade: body.grade,
      cost: body.cost,
      value: body.value,
      purchaseDate: body.purchaseDate ?? null,
    })
    .returning();

  res.status(201).json(toResponse(row));
});

router.delete("/portfolio/:id", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;

  const deleted = await db
    .delete(portfolioHoldingsTable)
    .where(and(eq(portfolioHoldingsTable.id, id), eq(portfolioHoldingsTable.clerkUserId, userId)))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(204).send();
});

export default router;
