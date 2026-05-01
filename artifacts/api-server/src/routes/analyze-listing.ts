import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { AnalyzeListingBody, AnalyzeListingResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are an expert sports card grading analyst with deep knowledge of PSA, BGS, and SGC grading standards. You analyze sports card marketplace listings and provide detailed assessments.

When given a marketplace URL and pricing info, you must:
1. Identify the card (player, year, set, card number, parallel/variant)
2. Estimate the likely PSA grade range based on typical condition for that card
3. Calculate estimated values based on recent market data for that card
4. Provide condition scores and ROI analysis

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "cardName": "full card description e.g. 2023 Panini Prizm Victor Wembanyama Silver #136",
  "player": "Player Name",
  "year": "YYYY",
  "setName": "Set Name e.g. Panini Prizm",
  "cardNumber": "card number e.g. 136",
  "parallel": "parallel variant e.g. Silver Prizm or Base",
  "estGrade": "single best grade estimate e.g. PSA 9",
  "gradeRange": "grade range e.g. PSA 8-9",
  "probability": <integer 0-100, confidence in best grade>,
  "estValue": <integer, post-grade estimated value in USD>,
  "roi": <number, ROI percentage after factoring in grading cost of $50>,
  "recommendedAction": "Submit" | "Manual Review" | "Pass",
  "imageQualityScore": <integer 0-100, estimated image/scan quality>,
  "condition": {
    "centering": { "score": <number 1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" },
    "corners": { "score": <number 1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" },
    "edges": { "score": <number 1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" },
    "surface": { "score": <number 1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" }
  },
  "notes": ["observation 1", "observation 2", "observation 3"],
  "marketComps": {
    "raw": [<min>, <max>],
    "psa8": [<min>, <max>],
    "psa9": [<min>, <max>],
    "psa10": [<min>, <max>]
  }
}`;

async function fetchListingTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TheCardLabBot/1.0; +https://thecardlab.com)",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

router.post("/analyze-listing", requireAuth, async (req, res) => {
  const parsed = AnalyzeListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { listingUrl, askingPrice, shipping } = parsed.data;

  const pageTitle = await fetchListingTitle(listingUrl);

  const userMessage = [
    `Listing URL: ${listingUrl}`,
    pageTitle ? `Page title: ${pageTitle}` : null,
    askingPrice != null ? `Asking price: $${askingPrice}` : null,
    shipping != null ? `Shipping: $${shipping}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  let parsed2: unknown;
  try {
    parsed2 = JSON.parse(raw);
  } catch {
    logger.error({ raw }, "Failed to parse AI response as JSON");
    res.status(500).json({ error: "AI returned invalid JSON" });
    return;
  }

  const result = AnalyzeListingResponse.safeParse(parsed2);
  if (!result.success) {
    logger.error({ issues: result.error.issues, raw }, "AI response failed schema validation");
    res.status(500).json({ error: "AI response did not match expected schema" });
    return;
  }

  res.json(result.data);
});

export default router;
