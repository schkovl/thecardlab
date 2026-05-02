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

  const rows = await db
    .select()
    .from(gradingSubmissionsTable)
    .where(eq(gradingSubmissionsTable.clerkUserId, userId!))
    .orderBy(desc(gradingSubmissionsTable.createdAt));

  res.json(rows.map(toResponse));
});

router.post("/grading-submissions", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const body = CreateGradingSubmissionBody.parse(req.body);

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
});

router.put("/grading-submissions/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);
  const body = UpdateGradingSubmissionBody.parse(req.body);

  if (Object.keys(body).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

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
    .where(
      and(
        eq(gradingSubmissionsTable.id, id),
        eq(gradingSubmissionsTable.clerkUserId, userId!)
      )
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(UpdateGradingSubmissionResponse.parse(toResponse(row)));
});

router.delete("/grading-submissions/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);

  const deleted = await db
    .delete(gradingSubmissionsTable)
    .where(
      and(
        eq(gradingSubmissionsTable.id, id),
        eq(gradingSubmissionsTable.clerkUserId, userId!)
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
