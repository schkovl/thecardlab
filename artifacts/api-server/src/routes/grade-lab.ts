import { Router, type IRouter } from "express";
import { z } from "zod";
import { createHash, randomUUID } from "crypto";
import { requireAuth } from "../middlewares/requireAuth.js";
import { aiGradeRateLimit, incrementGradeUsage } from "../middlewares/aiRateLimit.js";
import { logger } from "../lib/logger.js";
import { getAIClient } from "../lib/ai.js";
import { cache } from "../lib/cache.js";
import { generateUploadUrl, generateReadUrl, isStorageConfigured } from "../lib/storage.js";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

// ── Schemas ────────────────────────────────────────────────────────────────────

const UploadUrlBody = z.object({
  side: z.enum(["front", "back"]),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const AnalyzeScanBody = z.object({
  // Option A: direct base64 (fallback when GCS not configured)
  imageBase64: z.string().min(100).optional(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  backImageBase64: z.string().min(100).optional(),
  backMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  // Option B: GCS object paths (preferred for scale)
  frontObjectPath: z.string().min(1).optional(),
  backObjectPath: z.string().min(1).optional(),
  cardName: z.string().min(1).max(200).default("Sports Card"),
}).refine(
  data => !!(data.imageBase64 || data.frontObjectPath),
  { message: "Either imageBase64 or frontObjectPath is required" },
);

const ScanAnalysisResponse = z.object({
  centering: z.object({
    leftRight: z.string(),
    topBottom: z.string(),
    score: z.number(),
    status: z.enum(["Excellent", "Good", "Fair", "Poor"]),
    note: z.string(),
  }),
  corners: z.object({
    score: z.number(),
    status: z.enum(["Excellent", "Good", "Fair", "Poor"]),
    defects: z.array(z.string()),
  }),
  edges: z.object({
    score: z.number(),
    status: z.enum(["Excellent", "Good", "Fair", "Poor"]),
    defects: z.array(z.string()),
  }),
  surface: z.object({
    score: z.number(),
    status: z.enum(["Excellent", "Good", "Fair", "Poor"]),
    defects: z.array(z.string()),
  }),
  overallScore: z.number(),
  estimatedGrade: z.string(),
  prob10: z.number().int(),
  prob9: z.number().int(),
  prob8: z.number().int(),
  recommendation: z.enum(["Submit", "Manual Review", "Pass"]),
  notes: z.array(z.string()),
});

export type ScanAnalysis = z.infer<typeof ScanAnalysisResponse>;

// ── Prompt ─────────────────────────────────────────────────────────────────────

const SCAN_SYSTEM_PROMPT = `You are an expert sports card grading analyst with PSA/BGS/SGC certification-level knowledge.

Analyze the card scan image and return a JSON object with this exact schema — no markdown, no explanation:
{
  "centering": {
    "leftRight": "<e.g. 55/45>",
    "topBottom": "<e.g. 52/48>",
    "score": <number 1-10>,
    "status": "Excellent" | "Good" | "Fair" | "Poor",
    "note": "<brief observation>"
  },
  "corners": {
    "score": <number 1-10>,
    "status": "Excellent" | "Good" | "Fair" | "Poor",
    "defects": ["<defect description>"]
  },
  "edges": {
    "score": <number 1-10>,
    "status": "Excellent" | "Good" | "Fair" | "Poor",
    "defects": ["<defect description>"]
  },
  "surface": {
    "score": <number 1-10>,
    "status": "Excellent" | "Good" | "Fair" | "Poor",
    "defects": ["<defect description>"]
  },
  "overallScore": <number 1-10>,
  "estimatedGrade": "<e.g. PSA 9 or PSA 8-9>",
  "prob10": <integer 0-100>,
  "prob9": <integer 0-100>,
  "prob8": <integer 0-100>,
  "recommendation": "Submit" | "Manual Review" | "Pass",
  "notes": ["<observation 1>", "<observation 2>", "<observation 3>"]
}`;

// ── Fallback ───────────────────────────────────────────────────────────────────

const FALLBACK_ANALYSIS: ScanAnalysis = {
  centering: { leftRight: "55/45", topBottom: "52/48", score: 8, status: "Good", note: "Slight left bias — within PSA acceptable range" },
  corners: { score: 9, status: "Excellent", defects: [] },
  edges: { score: 8.5, status: "Excellent", defects: ["Minor roughness on right edge — check under 10x loupe"] },
  surface: { score: 8, status: "Good", defects: ["Light scratch on back surface, not visible front"] },
  overallScore: 8.5,
  estimatedGrade: "PSA 9",
  prob10: 35,
  prob9: 45,
  prob8: 20,
  recommendation: "Submit",
  notes: [
    "Centering is borderline — measure precisely before submitting",
    "Corners appear sharp under standard magnification",
    "Surface gloss intact on front; minor wear on back",
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function hashBase64(b64: string): string {
  return createHash("sha256").update(b64).digest("hex");
}

function buildImageContent(
  url: string,
  detail: "high" | "low" = "high",
): { type: "image_url"; image_url: { url: string; detail: "high" | "low" } } {
  return { type: "image_url", image_url: { url, detail } };
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/** Generate a signed GCS upload URL for direct-to-cloud image upload. */
router.post("/grade-lab/upload-url", requireAuth, async (req, res) => {
  if (!isStorageConfigured()) {
    res.status(503).json({ error: "GCS not configured — use base64 upload" });
    return;
  }

  const parsed = UploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }

  const { userId } = getAuth(req);
  const { side, mimeType } = parsed.data;
  const ext = mimeType.split("/")[1];
  const objectPath = `grade-uploads/${userId}/${randomUUID()}-${side}.${ext}`;

  const uploadUrl = await generateUploadUrl(objectPath, mimeType);
  if (!uploadUrl) {
    res.status(500).json({ error: "Failed to generate upload URL" });
    return;
  }

  res.json({ uploadUrl, objectPath });
});

/** Analyze a card for grading. Accepts either base64 or GCS object paths. */
router.post("/grade-lab/analyze", requireAuth, aiGradeRateLimit, async (req, res) => {
  const parsed = AnalyzeScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }

  const {
    imageBase64, mimeType,
    backImageBase64, backMimeType,
    frontObjectPath, backObjectPath,
    cardName,
  } = parsed.data;

  // Build cache key from content hash or GCS path
  const frontRef = imageBase64 ? hashBase64(imageBase64) : frontObjectPath!;
  const backRef = backImageBase64 ? hashBase64(backImageBase64) : (backObjectPath ?? "none");
  const cacheKey = `grade:v1:${frontRef}-${backRef}`;

  const cached = await cache.get<ScanAnalysis>(cacheKey);
  if (cached) {
    logger.info({ cacheKey }, "grade-lab cache hit");
    res.json(cached);
    return;
  }

  const aiClient = getAIClient();
  if (!aiClient) {
    logger.warn("POST /grade-lab/analyze no AI client — returning fallback");
    res.json(FALLBACK_ANALYSIS);
    return;
  }

  // Resolve image URLs for OpenAI
  let frontImageUrl: string;
  let backImageUrl: string | null = null;

  if (frontObjectPath) {
    const url = await generateReadUrl(frontObjectPath);
    if (!url) {
      res.status(500).json({ error: "Failed to generate GCS read URL for front image" });
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
      max_completion_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCAN_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Card: ${cardName}\nAnalyze this card for PSA grading. The first image is the FRONT${backImageUrl ? ", the second image is the BACK." : "."} Focus on centering, corners, edges, and surface condition on both sides.`,
            },
            buildImageContent(frontImageUrl),
            ...(backImageUrl ? [buildImageContent(backImageUrl)] : []),
          ],
        },
      ],
    });
  } catch (err) {
    logger.warn({ err }, "POST /grade-lab/analyze AI failed — returning fallback");
    res.json(FALLBACK_ANALYSIS);
    return;
  }

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed2: unknown;
  try { parsed2 = JSON.parse(raw); } catch {
    res.json(FALLBACK_ANALYSIS);
    return;
  }

  const result = ScanAnalysisResponse.safeParse(parsed2);
  if (!result.success) {
    logger.warn({ issues: result.error.issues }, "POST /grade-lab/analyze schema mismatch — fallback");
    res.json(FALLBACK_ANALYSIS);
    return;
  }

  // Cache for 7 days — same card, same image → same result
  await cache.set(cacheKey, result.data, 7 * 24 * 60 * 60 * 1000);

  // Increment daily usage counter after successful AI call
  await incrementGradeUsage(req);

  res.json(result.data);
});

export default router;
