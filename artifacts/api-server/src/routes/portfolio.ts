import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "@clerk/express";
import { db, portfolioHoldingsTable, portfolioSnapshotsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { CreatePortfolioHoldingBody, UpdatePortfolioHoldingBody, ListPortfolioHoldingsResponseItem, GetPortfolioHistoryResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger.js";
import { getAIClient, extractJson } from "../lib/ai.js";
import { generateReadUrl } from "../lib/storage.js";

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
  try {
    const rows = await db
      .select()
      .from(portfolioHoldingsTable)
      .where(eq(portfolioHoldingsTable.clerkUserId, userId!))
      .orderBy(portfolioHoldingsTable.createdAt);
    res.json(rows.map(toResponse));
  } catch (err) {
    logger.error({ err }, "GET /portfolio db error");
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

router.post("/portfolio", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const bodyParsed = CreatePortfolioHoldingBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const body = bodyParsed.data;
  try {
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
  } catch (err) {
    logger.error({ err }, "POST /portfolio db error");
    res.status(500).json({ error: "Failed to create holding" });
  }
});

router.put("/portfolio/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);
  const bodyParsed = UpdatePortfolioHoldingBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const body = bodyParsed.data;

  const updateValues: Partial<typeof portfolioHoldingsTable.$inferSelect> = {};
  if (body.grade !== undefined) updateValues.grade = body.grade;
  if (body.value !== undefined) updateValues.value = body.value;
  if (body.cost !== undefined) updateValues.cost = body.cost;

  if (Object.keys(updateValues).length === 0) {
    res.status(400).json({ error: "At least one field (grade, value, or cost) must be provided" });
    return;
  }

  try {
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
  } catch (err) {
    logger.error({ err }, "PUT /portfolio/:id db error");
    res.status(500).json({ error: "Failed to update holding" });
  }
});

router.get("/portfolio/history", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
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
  } catch (err) {
    logger.error({ err }, "GET /portfolio/history db error");
    res.status(500).json({ error: "Failed to fetch portfolio history" });
  }
});

const IdentifyCardBody = z.object({
  imageBase64: z.string().min(100).optional(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  backImageBase64: z.string().min(100).optional(),
  backMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  frontObjectPath: z.string().min(1).optional(),
  backObjectPath: z.string().min(1).optional(),
}).refine(
  data => !!(data.imageBase64 || data.frontObjectPath),
  { message: "Either imageBase64 or frontObjectPath is required" },
);

const CardIdentificationResponse = z.object({
  name: z.string(),
  set: z.string(),
  year: z.string(),
  cardNumber: z.string(),
  player: z.string(),
  sport: z.string(),
  gradePotential: z.string(),
  details: z.string(),
  confidence: z.number().min(0).max(100),
});

const IDENTIFY_SYSTEM_PROMPT = `You are an expert sports card authenticator and identifier with encyclopedic knowledge of trading cards across all major sports and eras.

Analyze the card image(s) and return a JSON object with this exact schema — no markdown, no explanation:
{
  "name": "<full card name e.g. '2021 Topps Chrome Patrick Mahomes #1'>",
  "set": "<set name e.g. 'Topps Chrome'>",
  "year": "<year e.g. '2021'>",
  "cardNumber": "<card number e.g. '#1' or 'PSA 10' if graded>",
  "player": "<player or subject name>",
  "sport": "<sport e.g. 'Football', 'Baseball', 'Basketball'>",
  "gradePotential": "<estimated grade range e.g. 'PSA 8-9' or 'BGS 9.5'>",
  "details": "<brief notable details: rookie card, parallel, short print, autograph, etc.>",
  "confidence": <integer 0-100 reflecting identification confidence>
}`;

const FALLBACK_IDENTIFICATION = {
  name: "Sports Card",
  set: "Unknown Set",
  year: new Date().getFullYear().toString(),
  cardNumber: "#?",
  player: "Unknown Player",
  sport: "Unknown",
  gradePotential: "PSA 7-9",
  details: "Unable to identify card — AI service unavailable. Please edit the details manually.",
  confidence: 0,
};

router.post("/portfolio/identify-card", requireAuth, async (req, res) => {
  const parsed = IdentifyCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }

  const { imageBase64, mimeType, backImageBase64, backMimeType, frontObjectPath, backObjectPath } = parsed.data;

  const aiClient = getAIClient();
  if (!aiClient) {
    logger.warn("POST /portfolio/identify-card no AI client — returning fallback");
    res.json(FALLBACK_IDENTIFICATION);
    return;
  }

  let frontImageUrl: string;
  let backImageUrl: string | null = null;

  if (frontObjectPath) {
    const url = await generateReadUrl(frontObjectPath);
    if (!url) {
      res.status(500).json({ error: "Failed to generate read URL for front image" });
      return;
    }
    frontImageUrl = url;
  } else {
    frontImageUrl = `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}`;
  }

  if (backObjectPath) {
    backImageUrl = await generateReadUrl(backObjectPath);
  } else if (backImageBase64) {
    backImageUrl = `data:${backMimeType ?? mimeType ?? "image/jpeg"};base64,${backImageBase64}`;
  }

  let completion;
  try {
    completion = await aiClient.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: IDENTIFY_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text" as const,
              text: `Identify this sports card. The first image is the FRONT${backImageUrl ? ", the second image is the BACK." : "."}`,
            },
            { type: "image_url" as const, image_url: { url: frontImageUrl, detail: "high" as const } },
            ...(backImageUrl ? [{ type: "image_url" as const, image_url: { url: backImageUrl, detail: "high" as const } }] : []),
          ],
        },
      ],
    });
  } catch (err) {
    logger.warn({ err }, "POST /portfolio/identify-card AI failed — returning fallback");
    res.json(FALLBACK_IDENTIFICATION);
    return;
  }

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let rawParsed: unknown;
  try { rawParsed = JSON.parse(raw); } catch {
    res.json(FALLBACK_IDENTIFICATION);
    return;
  }

  const result = CardIdentificationResponse.safeParse(rawParsed);
  if (!result.success) {
    logger.warn({ issues: result.error.issues }, "POST /portfolio/identify-card schema mismatch — fallback");
    res.json(FALLBACK_IDENTIFICATION);
    return;
  }

  res.json(result.data);
});

router.delete("/portfolio/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = String(req.params.id);
  try {
    const deleted = await db
      .delete(portfolioHoldingsTable)
      .where(and(eq(portfolioHoldingsTable.id, id), eq(portfolioHoldingsTable.clerkUserId, userId!)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "DELETE /portfolio/:id db error");
    res.status(500).json({ error: "Failed to delete holding" });
  }
});

export default router;
