import { Router, type IRouter } from "express";
import { db, restorationRequestsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireFeature } from "../middlewares/requireFeature";
import { getAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/restoration", requireAuth, requireFeature("restoration"), async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(restorationRequestsTable)
    .where(eq(restorationRequestsTable.clerkUserId, userId!))
    .orderBy(desc(restorationRequestsTable.createdAt));
  res.json(rows);
});

router.post("/restoration", requireAuth, requireFeature("restoration"), async (req, res) => {
  const { userId } = getAuth(req);
  const { card, issueDescription, desiredOutcome, photos } = req.body ?? {};
  if (!card || !issueDescription) {
    res.status(400).json({ error: "card, issueDescription required" });
    return;
  }
  const seed = (card + issueDescription).length;
  const quotedAmount = 75 + (seed % 11) * 25;
  const days = 14 + (seed % 21);
  const eta = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [row] = await db
    .insert(restorationRequestsTable)
    .values({
      clerkUserId: userId!,
      card,
      issueDescription,
      desiredOutcome: desiredOutcome ?? null,
      photos: photos ?? null,
      status: "submitted",
      quotedAmount,
      estimatedCompletion: eta,
    })
    .returning();
  res.json(row);
});

router.put("/restoration/:id", requireAuth, requireFeature("restoration"), async (req, res) => {
  const { userId } = getAuth(req);
  const updates: Record<string, unknown> = {};
  for (const k of ["card", "issueDescription", "desiredOutcome", "photos", "status", "technicianNotes"] as const) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  updates.updatedAt = new Date();
  const [row] = await db
    .update(restorationRequestsTable)
    .set(updates)
    .where(and(eq(restorationRequestsTable.id, req.params.id as string), eq(restorationRequestsTable.clerkUserId, userId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/restoration/:id", requireAuth, requireFeature("restoration"), async (req, res) => {
  const { userId } = getAuth(req);
  const result = await db
    .delete(restorationRequestsTable)
    .where(and(eq(restorationRequestsTable.id, req.params.id as string), eq(restorationRequestsTable.clerkUserId, userId!)))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
