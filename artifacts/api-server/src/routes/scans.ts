import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, scanResultsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateScanResultBody, ListScanResultsResponseItem } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

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

router.get("/scans", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rows = await db
    .select()
    .from(scanResultsTable)
    .where(eq(scanResultsTable.clerkUserId, userId))
    .orderBy(desc(scanResultsTable.createdAt))
    .limit(50);

  res.json(rows.map(toResponse));
});

router.post("/scans", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = CreateScanResultBody.parse(req.body);

  const [row] = await db
    .insert(scanResultsTable)
    .values({
      clerkUserId: userId,
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
