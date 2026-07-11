import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { AnalyzeListingBody, AnalyzeListingResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireFeature } from "../middlewares/requireFeature";
import { rateLimit } from "../middlewares/rateLimit";
import { fetchEbayComps, ebayCompsConfigured, type EbayComps } from "../lib/ebayComps";
import { logger } from "../lib/logger.js";

const AI_STUB = process.env.AI_STUB === "1" || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL === "http://localhost:9999";

function stubAnalysis(listingUrl: string, askingPrice?: number | null) {
  const seed = Array.from(listingUrl).reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  const grade = 8 + Math.floor(r(1) * 3);
  const ask = askingPrice ?? Math.floor(50 + r(2) * 200);
  const grades = ["Excellent", "Good", "Fair", "Poor"] as const;
  void grades;
  const pickStatus = (s: number) => (s >= 9 ? "Excellent" : s >= 7 ? "Good" : s >= 5 ? "Fair" : "Poor");
  const centeringScore = 6 + Math.floor(r(4) * 5);
  const cornerScore = 6 + Math.floor(r(5) * 5);
  const edgeScore = 6 + Math.floor(r(6) * 5);
  const surfaceScore = 6 + Math.floor(r(7) * 5);
  return {
    cardName: "[STUB] Sample analysis — not real data",
    player: "Stub Player",
    year: "2023",
    setName: "Stub Set",
    cardNumber: "0",
    parallel: "Base",
    estGrade: `PSA ${grade}`,
    gradeRange: `PSA ${grade - 1}-${grade}`,
    probability: 60 + Math.floor(r(8) * 35),
    estValue: 0,
    roi: 0,
    recommendedAction: "Manual Review",
    imageQualityScore: 70 + Math.floor(r(9) * 25),
    condition: {
      centering: { score: centeringScore, status: pickStatus(centeringScore) },
      corners: { score: cornerScore, status: pickStatus(cornerScore) },
      edges: { score: edgeScore, status: pickStatus(edgeScore) },
      surface: { score: surfaceScore, status: pickStatus(surfaceScore) },
    },
    notes: ["Stub mode active (AI_STUB=1) — every number on this screen is placeholder data for local dev."],
    marketComps: { raw: [], psa8: [], psa9: [], psa10: [] },
  };
}

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are an expert sports card and TCG analyst. You identify cards from marketplace listing titles and assess grading potential.

STRICT ACCURACY RULES — violating any of these is a critical failure:
1. Identify the card ONLY from the listing title/URL provided. If a field is not determinable from the input, use "Unknown" — never guess a specific parallel, card number, or year you cannot see.
2. NEVER invent market prices. If the user message includes a "REAL MARKET COMPS" block, copy those exact ranges into marketComps and base estValue on them. If NO comps block is provided, return empty arrays for every marketComps bucket and set estValue to 0.
3. You cannot see the card's physical condition (no image is provided). Condition scores must reflect that uncertainty: score 5 with status "Fair" for every category, and say in notes that condition is unverified without photos.
4. probability is your confidence in the grade estimate; without an image it must not exceed 40.
5. recommendedAction: "Submit" only when real comps show clear post-grading upside vs the asking price; "Pass" when comps show none; otherwise "Manual Review". Without comps, always "Manual Review".

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "cardName": "full card description from the title",
  "player": "Player/Character Name or Unknown",
  "year": "YYYY or Unknown",
  "setName": "Set Name or Unknown",
  "cardNumber": "card number or Unknown",
  "parallel": "parallel/variant or Unknown",
  "estGrade": "e.g. PSA 9 (or Unknown)",
  "gradeRange": "e.g. PSA 8-9 (or Unknown)",
  "probability": <integer 0-40 without image>,
  "estValue": <integer USD from real comps, or 0 when none provided>,
  "roi": <number, percent, from real comps minus $50 grading fee, or 0 when none provided>,
  "recommendedAction": "Submit" | "Manual Review" | "Pass",
  "imageQualityScore": 0,
  "condition": {
    "centering": { "score": <1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" },
    "corners": { "score": <1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" },
    "edges": { "score": <1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" },
    "surface": { "score": <1-10>, "status": "Excellent" | "Good" | "Fair" | "Poor" }
  },
  "notes": ["observation 1", "observation 2", "observation 3"],
  "marketComps": {
    "raw": [<min>, <max>] or [],
    "psa8": [<min>, <max>] or [],
    "psa9": [<min>, <max>] or [],
    "psa10": [<min>, <max>] or []
  }
}`;

const ALLOWED_MARKETPLACE_HOSTS = new Set([
  "ebay.com", "www.ebay.com",
  "pwcc.com", "www.pwcc.com",
  "goldin.co", "www.goldin.co",
  "comc.com", "www.comc.com",
  "myslabs.com", "www.myslabs.com",
  "alt.com", "www.alt.com",
  "scp-auctions.com", "www.scp-auctions.com",
  "lelands.com", "www.lelands.com",
]);

function isAllowedListingUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return ALLOWED_MARKETPLACE_HOSTS.has(host);
}

async function fetchListingTitle(url: string): Promise<string | null> {
  if (!isAllowedListingUrl(url)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      headers: {
        "User-Agent": "TheCardLabBot/1.0",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function compsBlock(comps: EbayComps): string {
  const fmt = (b: { range: [number, number]; sampleSize: number } | null) =>
    b ? `$${b.range[0]}–$${b.range[1]} (n=${b.sampleSize})` : "no data";
  return [
    "REAL MARKET COMPS (eBay active listings, use these exact ranges):",
    `raw: ${fmt(comps.raw)}`,
    `psa8: ${fmt(comps.psa8)}`,
    `psa9: ${fmt(comps.psa9)}`,
    `psa10: ${fmt(comps.psa10)}`,
  ].join("\n");
}

router.post(
  "/analyze-listing",
  requireAuth,
  requireFeature("deal_screener"),
  rateLimit({ name: "analyze-listing", max: 10, windowMs: 60_000 }),
  async (req, res) => {
    const parsed = AnalyzeListingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const { listingUrl, askingPrice, shipping } = parsed.data;

    if (AI_STUB) {
      const stub = stubAnalysis(listingUrl, askingPrice);
      const result = AnalyzeListingResponse.safeParse(stub);
      if (!result.success) {
        logger.error({ issues: result.error.issues }, "stub analysis failed schema");
        res.status(500).json({ error: "stub schema mismatch" });
        return;
      }
      res.json({ ...result.data, compsSource: "stub", analysisSource: "stub" });
      return;
    }

    const pageTitle = await fetchListingTitle(listingUrl);
    if (!pageTitle) {
      res.status(422).json({
        error:
          "Could not read the listing title. Check the URL is a public https listing on a supported marketplace (eBay, PWCC, Goldin, COMC, MySlabs, Alt, SCP, Lelands).",
      });
      return;
    }

    const comps = await fetchEbayComps(pageTitle);

    const userMessage = [
      `Listing URL: ${listingUrl}`,
      `Page title: ${pageTitle}`,
      askingPrice != null ? `Asking price: $${askingPrice}` : null,
      shipping != null ? `Shipping: $${shipping}` : null,
      comps ? compsBlock(comps) : "REAL MARKET COMPS: none available — follow rule 2 (empty arrays, estValue 0).",
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

    res.json({
      ...result.data,
      compsSource: comps ? comps.source : ebayCompsConfigured() ? "no_results" : "not_configured",
      compsFetchedAt: comps?.fetchedAt ?? null,
      analysisSource: "llm_title_only",
      disclaimer:
        "Card identified from listing title only — condition not verified from photos. Comps are eBay active-listing asking prices, not sold prices.",
    });
  },
);

export default router;
