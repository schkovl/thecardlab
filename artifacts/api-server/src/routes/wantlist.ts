import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, wantlistItemsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import {
  CreateWantlistItemBody,
  UpdateWantlistItemBody,
  ListWantlistItemsResponseItem,
  UpdateWantlistItemResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toResponse(row: typeof wantlistItemsTable.$inferSelect) {
  return ListWantlistItemsResponseItem.parse({
    id: row.id,
    cardName: row.cardName,
    targetGrade: row.targetGrade,
    maxPrice: row.maxPrice,
    priority: row.priority,
    notes: row.notes ?? null,
    acquired: row.acquired,
    createdAt: row.createdAt.toISOString(),
  });
}

router.get("/wantlist", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);

  const rows = await db
    .select()
    .from(wantlistItemsTable)
    .where(eq(wantlistItemsTable.clerkUserId, userId!))
    .orderBy(asc(wantlistItemsTable.createdAt));

  res.json(rows.map(toResponse));
});

router.post("/wantlist", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const body = CreateWantlistItemBody.parse(req.body);

  const [row] = await db
    .insert(wantlistItemsTable)
    .values({
      clerkUserId: userId!,
      cardName: body.cardName,
      targetGrade: body.targetGrade,
      maxPrice: body.maxPrice,
      priority: body.priority ?? "medium",
      notes: body.notes ?? null,
    })
    .returning();

  res.status(201).json(toResponse(row));
});

router.put("/wantlist/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);
  const body = UpdateWantlistItemBody.parse(req.body);

  if (Object.keys(body).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [row] = await db
    .update(wantlistItemsTable)
    .set({
      ...(body.cardName !== undefined && { cardName: body.cardName }),
      ...(body.targetGrade !== undefined && { targetGrade: body.targetGrade }),
      ...(body.maxPrice !== undefined && { maxPrice: body.maxPrice }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.acquired !== undefined && { acquired: body.acquired }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(wantlistItemsTable.id, id),
        eq(wantlistItemsTable.clerkUserId, userId!)
      )
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(UpdateWantlistItemResponse.parse(toResponse(row)));
});

router.delete("/wantlist/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);

  const deleted = await db
    .delete(wantlistItemsTable)
    .where(
      and(
        eq(wantlistItemsTable.id, id),
        eq(wantlistItemsTable.clerkUserId, userId!)
      )
    )
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(204).send();
});

export default router;
