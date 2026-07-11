import { Router, type IRouter } from "express";
import { db, vaultItemsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireFeature } from "../middlewares/requireFeature";
import { getAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/vault", requireAuth, requireFeature("vault"), async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(vaultItemsTable)
    .where(eq(vaultItemsTable.clerkUserId, userId!))
    .orderBy(desc(vaultItemsTable.createdAt));
  res.json(rows);
});

router.post("/vault", requireAuth, requireFeature("vault"), async (req, res) => {
  const { userId } = getAuth(req);
  const { card, storageProvider, locationLabel, insuredValue, status, photoUrl, notes } = req.body ?? {};
  if (!card || !storageProvider || typeof insuredValue !== "number") {
    res.status(400).json({ error: "card, storageProvider, insuredValue required" });
    return;
  }
  const [row] = await db
    .insert(vaultItemsTable)
    .values({
      clerkUserId: userId!,
      card,
      storageProvider,
      locationLabel: locationLabel ?? null,
      insuredValue,
      status: status ?? "stored",
      photoUrl: photoUrl ?? null,
      notes: notes ?? null,
    })
    .returning();
  res.json(row);
});

router.put("/vault/:id", requireAuth, requireFeature("vault"), async (req, res) => {
  const { userId } = getAuth(req);
  const id = req.params.id as string;
  const updates: Record<string, unknown> = {};
  for (const k of ["card", "storageProvider", "locationLabel", "insuredValue", "status", "photoUrl", "notes"] as const) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  updates.updatedAt = new Date();
  const [row] = await db
    .update(vaultItemsTable)
    .set(updates)
    .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.clerkUserId, userId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/vault/:id", requireAuth, requireFeature("vault"), async (req, res) => {
  const { userId } = getAuth(req);
  const id = req.params.id as string;
  const result = await db
    .delete(vaultItemsTable)
    .where(and(eq(vaultItemsTable.id, id), eq(vaultItemsTable.clerkUserId, userId!)))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
