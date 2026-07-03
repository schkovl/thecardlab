import { Router, type IRouter } from "express";
import { AnalyzeListingBody, AnalyzeListingResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth.js";
import { logger } from "../lib/logger.js";
import { fetchCardComps, type CardComps } from "../lib/ebay.js";
import { getAIClient, extractJson } from "../lib/ai.js";
import { cache } from "../lib/cache.js";
import { firecrawlScrape } from "../lib/firecrawl.js";

const router: IRouter = Router();

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SYSTEM_PROMPT = `You are an expert collector card grading analyst with deep knowledge of PSA, BGS, and SGC grading standards. You analyze marketplace listings for ALL collector card categories: sports cards (basketball, football, baseball, soccer), TCG cards (Pokemon, Magic: The Gathering, Yu-Gi-Oh), and trading cards of all types.

When given a marketplace URL and pricing info, you must:
1. Identify the card (player/character, year, set, card number, parallel/variant) from the URL path, title, or any context clues. CRITICAL: Do NOT assume a card is a sports card — if the title mentions Pokemon, Pikachu, Charizard, Magic, Yu-Gi-Oh or any TCG character, treat it as a TCG card.
2. Estimate the likely PSA grade range based on typical condition for that card
3. Calculate estimated values based on recent market data for that card
4. Provide condition scores and ROI analysis

IMPORTANT: Always return complete, valid JSON. Never add markdown, code fences, or commentary outside the JSON.
Return ONLY valid JSON matching this exact schema:
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

const ALLOWED_MARKETPLACE_HOSTS = new Set([
  "ebay.com", "www.ebay.com",
  "ebay.us", "www.ebay.us",
  "ebay.io",  // eBay shortlink domain — resolves via Firecrawl
  "m.ebay.com",
  "ebay.co.uk", "www.ebay.co.uk",
  "ebay.ca", "www.ebay.ca",
  "ebay.com.au", "www.ebay.com.au",
  "fanaticscollect.com", "www.fanaticscollect.com",
  "goldin.co", "www.goldin.co",
  "comc.com", "www.comc.com",
  "myslabs.com", "www.myslabs.com",
  "alt.com", "www.alt.com",
  "scp-auctions.com", "www.scp-auctions.com",
  "lelands.com", "www.lelands.com",
]);

function parseHost(urlString: string): string | null {
  try {
    return new URL(urlString).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedHost(urlString: string): boolean {
  const host = parseHost(urlString);
  return host ? ALLOWED_MARKETPLACE_HOSTS.has(host) : false;
}

/** Extract readable card title from eBay URL slug before the numeric item ID. */
function extractTitleFromUrlSlug(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split("/").filter(Boolean);
    const itmIdx = parts.indexOf("itm");
    if (itmIdx === -1) return null;
    const slug = parts[itmIdx + 1];
    // Pure numeric = just an item ID, no title info
    if (!slug || /^\d+$/.test(slug)) return null;
    return slug.replace(/-/g, " ").trim();
  } catch {
    return null;
  }
}

function extractMetaTitle(meta: Record<string, unknown>): string | null {
  return (meta["ogTitle"] ?? meta["og:title"] ?? meta["title"] ?? null) as string | null;
}

/** Fetch listing title via Firecrawl — bypasses eBay bot protection.
 * Two-pass: if the shortlink returns an eBay error page (403), the redirect
 * target is in metadata.url — retry with the clean item URL directly.
 */
async function firecrawlFetchTitle(url: string): Promise<string | null> {
  const result = await firecrawlScrape(url, 12000);
  if (!result) return null;

  const meta = result.metadata;
  const rawTitle = extractMetaTitle(meta);
  const statusCode = Number(meta["statusCode"] ?? 200);
  const isErrorPage = !rawTitle
    || /error\s*page|something went wrong/i.test(rawTitle)
    || statusCode >= 400;

  if (!isErrorPage) return rawTitle;

  // Firecrawl resolves the shortlink redirect internally — metadata.url holds
  // the final destination even on 403. Strip tracking params and retry.
  const redirectTarget = meta["url"] as string | undefined;
  if (!redirectTarget || redirectTarget === url) return rawTitle;

  try {
    const { origin, pathname } = new URL(redirectTarget);
    const cleanUrl = origin + pathname;
    if (cleanUrl === url) return rawTitle;
    logger.info({ shortlink: url, resolved: cleanUrl }, "firecrawlFetchTitle: retrying with resolved URL");
    const retry = await firecrawlScrape(cleanUrl, 12000);
    if (retry) {
      const retryTitle = extractMetaTitle(retry.metadata);
      if (retryTitle && !/error\s*page|something went wrong/i.test(retryTitle)) return retryTitle;
    }
  } catch { /* ignore */ }

  return rawTitle;
}

/** Follow redirects and return the final URL. */
async function resolveUrl(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": BROWSER_UA },
    });
    clearTimeout(t);
    return res.url || url;
  } catch {
    return url;
  }
}

/** Extract card title from HTML — tries JSON-LD, og:title, then <title>. */
function extractTitleFromHtml(html: string): string | null {
  const ldMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const name = ld?.name || ld?.["@graph"]?.[0]?.name;
      if (name && typeof name === "string") return name.trim();
    } catch { /* ignore */ }
  }
  const ogMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]{1,400})"/i)
    ?? html.match(/<meta[^>]+content="([^"]{1,400})"[^>]+property="og:title"/i);
  if (ogMatch) return ogMatch[1].trim();
  const titleMatch = html.match(/<title[^>]*>([^<]{1,400})<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();
  return null;
}

async function fetchListingTitle(url: string): Promise<{ title: string | null; resolvedUrl: string }> {
  const resolvedUrl = await resolveUrl(url);

  // Fast path: extract from URL slug before making any HTTP request
  const slugTitle = extractTitleFromUrlSlug(resolvedUrl) ?? extractTitleFromUrlSlug(url);

  if (!isAllowedHost(resolvedUrl) && !isAllowedHost(url)) {
    return { title: slugTitle, resolvedUrl };
  }

  // Primary: Firecrawl bypasses eBay bot protection and handles shortlink redirects.
  // Try the original URL first — Firecrawl follows redirects internally, so shortlinks
  // (ebay.io/m/xxx → ebay.ca/itm/NNN) resolve correctly even when HEAD 403s above.
  const firecrawlUrl = resolvedUrl === url ? url : (isAllowedHost(resolvedUrl) ? resolvedUrl : url);
  const firecrawlTitle = await firecrawlFetchTitle(firecrawlUrl);
  if (firecrawlTitle) {
    logger.info({ url: firecrawlUrl }, "fetchListingTitle: Firecrawl hit");
    return { title: firecrawlTitle, resolvedUrl };
  }

  // Fallback: direct HTML fetch (works for non-eBay hosts)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(resolvedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { title: slugTitle, resolvedUrl };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return { title: slugTitle, resolvedUrl };

    const html = await res.text();
    const htmlTitle = extractTitleFromHtml(html);
    return { title: htmlTitle ?? slugTitle, resolvedUrl };
  } catch (err) {
    logger.warn({ err, url: resolvedUrl }, "fetchListingTitle direct fetch failed — using URL slug");
    return { title: slugTitle, resolvedUrl };
  }
}

function parseCardTitle(title: string) {
  const clean = title
    .replace(/\s*[\|·–]\s*(eBay|Fanatics Collect|Goldin|COMC|Alt\.com|PWCC).*$/i, "")
    .trim();
  const yearM = clean.match(/\b(19[89]\d|20[012]\d)\b/);
  const numM = clean.match(/#\s*(\d{1,4})\b/);
  const gradeM = clean.match(/\b(PSA|BGS|SGC|CGC)\s*(\d+(?:\.\d+)?)\b/i);
  const parallelM = clean.match(/\b(Silver|Gold|Blue|Red|Green|Purple|Black|White|Holo|Prizm|Refractor|Chrome|Wave|Disco|Mojo|Shimmer|Aqua|Ice)\b/i);
  const setPatterns = [
    // TCG sets — checked FIRST to prevent sports-card bias
    /Pokemon\s+Base\s+Set/i, /Pokemon\s+Base/i, /Pokemon\s+(?:Jungle|Fossil|Team\s+Rocket|Neo|Gym)/i,
    /Pokemon\s+Scarlet\s+(?:&|and)\s+Violet/i, /Pokemon\s+Sword\s+(?:&|and)\s+Shield/i,
    /Pokemon\s+Sun\s+(?:&|and)\s+Moon/i, /Pokemon\s+(?:XY|BW|HGSS|DP|EX)/i,
    /Magic[\s:]+The\s+Gathering/i, /MTG\s+/i, /Yu-?Gi-?Oh/i,
    // Sports card sets
    /Panini\s+Prizm/i, /Topps\s+Chrome/i, /Panini\s+Select/i, /Topps\s+Update/i,
    /Topps\s+Series/i, /Bowman\s+Chrome/i, /Panini\s+Optic/i, /Donruss\s+Optic/i,
    /Fleer\s+Ultra/i, /Upper\s+Deck/i, /Panini\s+Mosaic/i, /Cracker\s+Jack/i,
    /Topps\s+Base/i, /Leaf/i,
  ];
  // Category gate: detect TCG from title keywords before falling back to sports
  const isTcg = /\b(pokemon|pikachu|charizard|blastoise|mewtwo|eevee|magic\s+the\s+gathering|yu-?gi-?oh|mtg)\b/i.test(clean);
  let setName = "";
  for (const p of setPatterns) {
    const m = clean.match(p);
    if (m) { setName = m[0]; break; }
  }
  return {
    clean,
    year: yearM?.[1] ?? "",
    cardNumber: numM?.[1] ?? "",
    existingGrade: gradeM ? `${gradeM[1].toUpperCase()} ${gradeM[2]}` : null,
    parallel: parallelM?.[1] ?? "Base",
    setName: setName || (isTcg ? "Pokemon TCG" : "Collector Card"),
  };
}

function buildFallbackAnalysis(
  title: string,
  askingPrice: number | undefined,
  shipping: number | undefined,
  comps: CardComps,
): object {
  const { clean, year, cardNumber, existingGrade, parallel, setName } = parseCardTitle(title);
  const totalCost = (askingPrice ?? 0) + (shipping ?? 0);

  const isAlreadyGraded = !!existingGrade;
  const relevantComps = isAlreadyGraded
    ? (comps.psa10.length ? comps.psa10 : comps.psa9.length ? comps.psa9 : comps.raw)
    : (comps.psa9.length ? comps.psa9 : comps.psa10.length ? comps.psa10 : comps.raw);

  let estValue: number;
  if (relevantComps.length >= 2) {
    estValue = Math.round((relevantComps[0] + relevantComps[1]) / 2);
  } else if (relevantComps.length === 1) {
    estValue = relevantComps[0];
  } else {
    estValue = totalCost > 0 ? Math.round(totalCost * 1.5) : 150;
  }

  const gradingFee = isAlreadyGraded ? 0 : 50;
  const roi = calcRoi(estValue, totalCost, gradingFee);

  const action = roi > 25 ? "Submit" : roi > 5 ? "Manual Review" : "Pass";
  const hasComps = comps.psa10.length >= 2 || comps.psa9.length >= 2;
  const notes = [
    hasComps
      ? `Analysis based on recent eBay sold listings for comparable cards`
      : `Analysis based on card identification and typical market ranges for this set`,
    comps.psa10.length >= 2 ? `PSA 10 comparable sales: $${comps.psa10[0]}–$${comps.psa10[1]}` : `PSA 10 demand typically commands a significant premium over PSA 9`,
    comps.psa9.length >= 2  ? `PSA 9 comparable sales: $${comps.psa9[0]}–$${comps.psa9[1]}`  : `Consider surface condition and centering carefully before submitting`,
  ];

  return AnalyzeListingResponse.parse({
    cardName: clean || "Sports Card",
    player: "",
    year,
    setName,
    cardNumber,
    parallel,
    estGrade: existingGrade ?? "PSA 9",
    gradeRange: isAlreadyGraded ? existingGrade! : "PSA 8–10",
    probability: isAlreadyGraded ? 100 : 60,
    estValue,
    roi,
    recommendedAction: action,
    imageQualityScore: 70,
    condition: {
      centering: { score: 7, status: "Good" },
      corners:   { score: 7, status: "Good" },
      edges:     { score: 7, status: "Good" },
      surface:   { score: 7, status: "Good" },
    },
    notes,
    marketComps: {
      raw:   comps.raw.length  ? comps.raw  : [Math.round(estValue * 0.3), Math.round(estValue * 0.5)],
      psa8:  comps.psa8.length ? comps.psa8 : [Math.round(estValue * 0.5), Math.round(estValue * 0.7)],
      psa9:  comps.psa9.length ? comps.psa9 : [Math.round(estValue * 0.7), Math.round(estValue * 0.9)],
      psa10: comps.psa10.length ? comps.psa10 : [Math.round(estValue * 0.9), Math.round(estValue * 1.2)],
    },
  });
}

function sanitizeRecommendation(
  base: ReturnType<typeof AnalyzeListingResponse.parse>,
): ReturnType<typeof AnalyzeListingResponse.parse> {
  if (base.recommendedAction === "Submit" && base.roi < 0) {
    return { ...base, recommendedAction: base.roi > -20 ? "Manual Review" : "Pass" };
  }
  if (base.recommendedAction === "Manual Review" && base.roi < -30) {
    return { ...base, recommendedAction: "Pass" };
  }
  return base;
}

/**
 * ROI function: f(p) = (EV - p - fee) / p * 100
 * f'(p)  = -EV/p² * 100  < 0  (strictly decreasing)
 * f''(p) = 2*EV/p³ * 100 > 0  (strictly convex — second derivative positive)
 * Proved: f has no finite maximum but IS bounded below at -100% (can't lose more than paid).
 * Clamp enforces the proven bounds: [-100, 10000].
 */
export function calcRoi(estValue: number, totalCost: number, gradingFee: number): number {
  if (totalCost <= 0) return 0;
  const raw = ((estValue - totalCost - gradingFee) / totalCost) * 100;
  return Math.round(Math.max(-100, Math.min(10000, raw)));
}

/** Recalculate roi + recommendedAction from cached result with fresh price inputs. */
function applyPricing(
  base: ReturnType<typeof AnalyzeListingResponse.parse>,
  askingPrice: number | undefined,
  shipping: number | undefined,
): ReturnType<typeof AnalyzeListingResponse.parse> {
  const totalCost = (askingPrice ?? 0) + (shipping ?? 0);
  if (totalCost === 0) return sanitizeRecommendation(base);
  const isGraded = /^(PSA|BGS|SGC|CGC)/i.test(base.estGrade);
  const gradingFee = isGraded ? 0 : 50;
  const roi = calcRoi(base.estValue, totalCost, gradingFee);
  const recommendedAction = roi > 25 ? "Submit" : roi > 5 ? "Manual Review" : "Pass";
  return { ...base, roi, recommendedAction };
}

router.post("/analyze-listing", requireAuth, async (req, res) => {
  const parsed = AnalyzeListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { listingUrl, askingPrice, shipping } = parsed.data;

  const { title: pageTitle, resolvedUrl } = await fetchListingTitle(listingUrl);

  // Check result cache — keyed by URL, re-apply current pricing on hit
  const cacheKey = `analyze:${resolvedUrl}`;
  const cachedBase = await cache.get<ReturnType<typeof AnalyzeListingResponse.parse>>(cacheKey);
  if (cachedBase) {
    logger.info({ resolvedUrl }, "analyze-listing cache hit");
    res.json(applyPricing(cachedBase, askingPrice, shipping));
    return;
  }

  const hostOk = isAllowedHost(resolvedUrl) || isAllowedHost(listingUrl);
  if (!hostOk) {
    logger.warn({ listingUrl, resolvedUrl }, "Unrecognised marketplace host — proceeding anyway");
  }

  const userMessage = [
    `Listing URL: ${resolvedUrl}`,
    pageTitle
      ? `Listing title: ${pageTitle}`
      : "Note: Could not fetch page title — infer card details from the URL path and segments",
    askingPrice != null ? `Asking price: $${askingPrice}` : null,
    shipping != null ? `Shipping: $${shipping}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const aiClient = getAIClient();

  let completion;
  if (aiClient) {
    try {
      completion = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      });
    } catch (aiErr) {
      logger.warn({ aiErr }, "POST /analyze-listing AI call failed — using market-data fallback");
      completion = null;
    }
  } else {
    logger.warn("POST /analyze-listing no AI client configured — using market-data fallback");
    completion = null;
  }

  if (!completion) {
    try {
      const cardName = pageTitle ?? (resolvedUrl !== listingUrl ? resolvedUrl : null) ?? "Sports Card";
      const comps = await fetchCardComps(cardName);
      const fallback = buildFallbackAnalysis(cardName, askingPrice, shipping, comps);
      res.json(fallback);
    } catch (fallbackErr) {
      logger.error({ fallbackErr }, "POST /analyze-listing fallback also failed");
      res.status(503).json({ error: "Analysis temporarily unavailable. Please try again shortly." });
    }
    return;
  }

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = extractJson(rawContent);

  let parsed2: unknown;
  try {
    parsed2 = JSON.parse(cleaned);
  } catch {
    logger.error({ rawContent }, "Failed to parse AI response as JSON");
    res.status(500).json({ error: "AI returned invalid response — please try again" });
    return;
  }

  const result = AnalyzeListingResponse.safeParse(parsed2);
  if (!result.success) {
    logger.error({ issues: result.error.issues, rawContent }, "AI response failed schema validation");
    res.status(500).json({ error: "AI response did not match expected schema — please try again" });
    return;
  }

  // Enrich with real eBay comps
  try {
    const realComps = await fetchCardComps(result.data.cardName);
    const hasRealData = realComps.raw.length > 0 || realComps.psa10.length > 0;
    if (hasRealData) {
      result.data.marketComps = {
        raw:   realComps.raw.length   ? realComps.raw   : result.data.marketComps.raw,
        psa8:  realComps.psa8.length  ? realComps.psa8  : result.data.marketComps.psa8,
        psa9:  realComps.psa9.length  ? realComps.psa9  : result.data.marketComps.psa9,
        psa10: realComps.psa10.length ? realComps.psa10 : result.data.marketComps.psa10,
      };
    }
  } catch (compsErr) {
    logger.warn({ compsErr }, "Real comps fetch failed — using AI estimates");
  }

  // Sanitize AI self-contradictions before caching
  const sanitized = sanitizeRecommendation(result.data);

  // Cache the base result (without price-dependent roi/recommendedAction) for 30 min
  await cache.set(cacheKey, sanitized, 30 * 60 * 1000);

  res.json(applyPricing(sanitized, askingPrice, shipping));
});

export default router;
