import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, userAlertsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateAlertBody, DeleteAlertParams, ListAlertsResponseItem } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function toResponse(row: typeof userAlertsTable.$inferSelect) {
  return ListAlertsResponseItem.parse({
    id: row.id,
    cardName: row.cardName,
    alertType: row.alertType,
    thresholdPrice: row.thresholdPrice ?? null,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  });
}

router.get("/alerts", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const rows = await db
      .select()
      .from(userAlertsTable)
      .where(and(eq(userAlertsTable.clerkUserId, userId!), eq(userAlertsTable.active, true)))
      .orderBy(desc(userAlertsTable.createdAt));
    res.json(rows.map(toResponse));
  } catch (err) {
    logger.error({ err }, "GET /alerts db error");
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.post("/alerts", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const bodyParsed = CreateAlertBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const body = bodyParsed.data;
  try {
    const [row] = await db
      .insert(userAlertsTable)
      .values({
        clerkUserId: userId!,
        cardName: body.cardName,
        alertType: body.alertType,
        thresholdPrice: body.thresholdPrice ?? null,
      })
      .returning();
    res.status(201).json(toResponse(row));
  } catch (err) {
    logger.error({ err }, "POST /alerts db error");
    res.status(500).json({ error: "Failed to create alert" });
  }
});

router.delete("/alerts/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const paramsParsed = DeleteAlertParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid alert id" });
    return;
  }
  const { id } = paramsParsed.data;
  try {
    const result = await db
      .update(userAlertsTable)
      .set({ active: false, updatedAt: new Date() })
      .where(and(eq(userAlertsTable.id, id), eq(userAlertsTable.clerkUserId, userId!)))
      .returning();

    if (result.length === 0) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "DELETE /alerts/:id db error");
    res.status(500).json({ error: "Failed to delete alert" });
  }
});

export default router;
