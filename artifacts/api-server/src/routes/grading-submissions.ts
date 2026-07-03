import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, gradingSubmissionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateGradingSubmissionBody,
  UpdateGradingSubmissionBody,
  ListGradingSubmissionsResponseItem,
  UpdateGradingSubmissionResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function toResponse(row: typeof gradingSubmissionsTable.$inferSelect) {
  return ListGradingSubmissionsResponseItem.parse({
    id: row.id,
    cardName: row.cardName,
    grader: row.grader,
    serviceLevel: row.serviceLevel,
    declaredValue: row.declaredValue ?? null,
    submittedDate: row.submittedDate ?? null,
    returnedDate: row.returnedDate ?? null,
    certNumber: row.certNumber ?? null,
    status: row.status,
    gradeReceived: row.gradeReceived ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

router.get("/grading-submissions", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const rows = await db
      .select()
      .from(gradingSubmissionsTable)
      .where(eq(gradingSubmissionsTable.clerkUserId, userId!))
      .orderBy(desc(gradingSubmissionsTable.createdAt));
    res.json(rows.map(toResponse));
  } catch (err) {
    logger.error({ err }, "GET /grading-submissions db error");
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.post("/grading-submissions", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const bodyParsed = CreateGradingSubmissionBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const body = bodyParsed.data;
  try {
    const [row] = await db
      .insert(gradingSubmissionsTable)
      .values({
        clerkUserId: userId!,
        cardName: body.cardName,
        grader: body.grader,
        serviceLevel: body.serviceLevel,
        declaredValue: body.declaredValue ?? null,
        submittedDate: body.submittedDate ?? null,
        notes: body.notes ?? null,
      })
      .returning();
    res.status(201).json(toResponse(row));
  } catch (err) {
    logger.error({ err }, "POST /grading-submissions db error");
    res.status(500).json({ error: "Failed to create submission" });
  }
});

router.put("/grading-submissions/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);
  const bodyParsed = UpdateGradingSubmissionBody.safeParse(req.body);
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
      .update(gradingSubmissionsTable)
      .set({
        ...(body.status !== undefined && { status: body.status }),
        ...(body.gradeReceived !== undefined && { gradeReceived: body.gradeReceived }),
        ...(body.certNumber !== undefined && { certNumber: body.certNumber }),
        ...(body.returnedDate !== undefined && { returnedDate: body.returnedDate }),
        ...(body.declaredValue !== undefined && { declaredValue: body.declaredValue }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.serviceLevel !== undefined && { serviceLevel: body.serviceLevel }),
        updatedAt: new Date(),
      })
      .where(and(eq(gradingSubmissionsTable.id, id), eq(gradingSubmissionsTable.clerkUserId, userId!)))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(UpdateGradingSubmissionResponse.parse(toResponse(row)));
  } catch (err) {
    logger.error({ err }, "PUT /grading-submissions/:id db error");
    res.status(500).json({ error: "Failed to update submission" });
  }
});

router.delete("/grading-submissions/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);
  try {
    const deleted = await db
      .delete(gradingSubmissionsTable)
      .where(and(eq(gradingSubmissionsTable.id, id), eq(gradingSubmissionsTable.clerkUserId, userId!)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "DELETE /grading-submissions/:id db error");
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

export default router;
