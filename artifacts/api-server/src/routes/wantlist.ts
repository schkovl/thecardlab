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
import { logger } from "../lib/logger.js";

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
  try {
    const rows = await db
      .select()
      .from(wantlistItemsTable)
      .where(eq(wantlistItemsTable.clerkUserId, userId!))
      .orderBy(asc(wantlistItemsTable.createdAt));
    res.json(rows.map(toResponse));
  } catch (err) {
    logger.error({ err }, "GET /wantlist db error");
    res.status(500).json({ error: "Failed to fetch wantlist" });
  }
});

router.post("/wantlist", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const bodyParsed = CreateWantlistItemBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const body = bodyParsed.data;
  try {
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
  } catch (err) {
    logger.error({ err }, "POST /wantlist db error");
    res.status(500).json({ error: "Failed to create wantlist item" });
  }
});

router.put("/wantlist/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);
  const bodyParsed = UpdateWantlistItemBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const body = bodyParsed.data;

  if (Object.keys(body).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  try {
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
      .where(and(eq(wantlistItemsTable.id, id), eq(wantlistItemsTable.clerkUserId, userId!)))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(UpdateWantlistItemResponse.parse(toResponse(row)));
  } catch (err) {
    logger.error({ err }, "PUT /wantlist/:id db error");
    res.status(500).json({ error: "Failed to update wantlist item" });
  }
});

router.delete("/wantlist/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);
  try {
    const deleted = await db
      .delete(wantlistItemsTable)
      .where(and(eq(wantlistItemsTable.id, id), eq(wantlistItemsTable.clerkUserId, userId!)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "DELETE /wantlist/:id db error");
    res.status(500).json({ error: "Failed to delete wantlist item" });
  }
});

export default router;
