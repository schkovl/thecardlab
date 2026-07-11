import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middlewares/requireAuth";
import { requireFeature } from "../middlewares/requireFeature";
import { rateLimit } from "../middlewares/rateLimit";
import { logger } from "../lib/logger.js";

const AI_STUB = process.env.AI_STUB === "1" || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL === "http://localhost:9999";

// ~8MB decoded image cap (base64 inflates ~4/3)
const MAX_DATA_URI_CHARS = 11_000_000;

const router: IRouter = Router();

const conditionEntry = z.object({
  score: z.number().min(1).max(10),
  status: z.enum(["Excellent", "Good", "Fair", "Poor"]),
});

const VisionAnalysis = z.object({
  cardName: z.string(),
  estGrade: z.string(),
  gradeRange: z.string(),
  probability: z.number().min(0).max(100),
  composite: z.number().min(1).max(10),
  condition: z.object({
    centering: conditionEntry,
    corners: conditionEntry,
    edges: conditionEntry,
    surface: conditionEntry,
  }),
  notes: z.array(z.string()).min(1),
  imageQuality: z.enum(["good", "usable", "poor"]),
});

const VISION_PROMPT = `You are a professional card grader (PSA standards). Analyze the card photo(s) provided and grade what you can ACTUALLY SEE.

STRICT ACCURACY RULES:
1. Grade only from visible evidence in the image. Every note must reference something observable (e.g. "left border visibly wider than right", "whitening on top-right corner").
2. If the image is blurry, low-resolution, cropped, glared, or shows a slabbed/sleeved card, lower your confidence and say so in notes. Set imageQuality accordingly.
3. Centering: estimate border ratios from the image. Corners/edges/surface: report only defects you can see; if resolution is too low to judge a category, score it 5 and note "cannot assess at this resolution".
4. probability = confidence that the card achieves estGrade, honestly reflecting image quality. A phone photo can rarely justify >75.
5. If only the front is provided, note that the back is ungraded and cap probability at 60 (backs commonly cap grades).
6. Identify the card from what is printed on it. If you cannot read it, use "Unidentified card".

Return ONLY valid JSON, no markdown:
{
  "cardName": "what you can read off the card, or the user-provided name if consistent",
  "estGrade": "PSA <n>",
  "gradeRange": "PSA <n>-<m>",
  "probability": <integer 0-100>,
  "composite": <number 1-10, one decimal>,
  "condition": {
    "centering": { "score": <1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" },
    "corners":   { "score": <1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" },
    "edges":     { "score": <1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" },
    "surface":   { "score": <1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" }
  },
  "notes": ["visible observation 1", "visible observation 2", "..."],
  "imageQuality": "good" | "usable" | "poor"
}`;

function isImageDataUri(s: unknown): s is string {
  return typeof s === "string" && /^data:image\/(png|jpe?g|webp|heic);base64,/.test(s);
}

function pickStatus(s: number): "Excellent" | "Good" | "Fair" | "Poor" {
  if (s >= 9) return "Excellent";
  if (s >= 7) return "Good";
  if (s >= 5) return "Fair";
  return "Poor";
}

function stubAnalysis(cardName?: string) {
  const seed = Array.from((cardName ?? "") + Date.now().toString()).reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  const scores = [1, 2, 3, 4].map((n) => 5 + Math.floor(r(n) * 6));
  const composite = scores.reduce((a, b) => a + b, 0) / 4;
  const grade = composite >= 9 ? 10 : composite >= 8 ? 9 : composite >= 7 ? 8 : composite >= 6 ? 7 : 6;
  return {
    cardName: `[STUB] ${cardName ?? "Sample card"}`,
    estGrade: `PSA ${grade}`,
    gradeRange: `PSA ${Math.max(1, grade - 1)}-${Math.min(10, grade + 1)}`,
    probability: 50 + Math.floor(r(5) * 45),
    composite: Math.round(composite * 10) / 10,
    condition: {
      centering: { score: scores[0], status: pickStatus(scores[0]) },
      corners: { score: scores[1], status: pickStatus(scores[1]) },
      edges: { score: scores[2], status: pickStatus(scores[2]) },
      surface: { score: scores[3], status: pickStatus(scores[3]) },
    },
    notes: ["Stub mode active (AI_STUB=1) — placeholder numbers for local dev, not a real analysis."],
    imageQuality: "usable" as const,
  };
}

router.post(
  "/grade-lab/analyze",
  requireAuth,
  requireFeature("grade_lab"),
  rateLimit({ name: "grade-lab", max: 6, windowMs: 60_000 }),
  async (req, res) => {
    const { imageDataUri, backImageDataUri, cardName, notes } = req.body ?? {};

    if (AI_STUB) {
      res.json({ ...stubAnalysis(cardName), analysisSource: "stub", submittedAt: new Date().toISOString() });
      return;
    }

    if (!isImageDataUri(imageDataUri)) {
      res.status(400).json({
        error: "imageDataUri (base64 data:image/... URI of the card front) is required — grading is only performed on actual photos.",
      });
      return;
    }
    if (imageDataUri.length > MAX_DATA_URI_CHARS || (typeof backImageDataUri === "string" && backImageDataUri.length > MAX_DATA_URI_CHARS)) {
      res.status(413).json({ error: "Image too large (max ~8MB). Resize and retry." });
      return;
    }
    const hasBack = isImageDataUri(backImageDataUri);

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: "high" } }
    > = [
      {
        type: "text",
        text: [
          cardName ? `User says this card is: ${cardName}` : null,
          notes ? `User notes: ${notes}` : null,
          hasBack ? "Front and back photos follow (front first)." : "Only the FRONT photo is provided.",
        ]
          .filter(Boolean)
          .join("\n") || "Analyze this card.",
      },
      { type: "image_url", image_url: { url: imageDataUri, detail: "high" } },
    ];
    if (hasBack) {
      userContent.push({ type: "image_url", image_url: { url: backImageDataUri as string, detail: "high" } });
    }

    let raw: string;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 4096,
        messages: [
          { role: "system", content: VISION_PROMPT },
          { role: "user", content: userContent },
        ],
      });
      raw = completion.choices[0]?.message?.content ?? "{}";
    } catch (err) {
      logger.error({ err }, "grade-lab vision call failed");
      res.status(502).json({ error: "Vision analysis unavailable. Try again shortly." });
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      logger.error({ raw }, "grade-lab vision returned invalid JSON");
      res.status(500).json({ error: "AI returned invalid JSON" });
      return;
    }

    const result = VisionAnalysis.safeParse(parsedJson);
    if (!result.success) {
      logger.error({ issues: result.error.issues, raw }, "grade-lab vision response failed schema");
      res.status(500).json({ error: "AI response did not match expected schema" });
      return;
    }

    res.json({
      ...result.data,
      analysisSource: "vision",
      sidesAnalyzed: hasBack ? "front_back" : "front_only",
      disclaimer:
        "AI estimate from user photos — not a professional grade. Final grades are determined by the grading company.",
      submittedAt: new Date().toISOString(),
    });
  },
);

export default router;
