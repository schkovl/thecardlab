import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { fetchCardComps, fetchActiveListings, fetchRecentSoldPrices } from "../lib/ebay.js";
import { cache } from "../lib/cache.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const TODAY = () => new Date().toISOString().split("T")[0];

// ─── GET /api/market/pulse ────────────────────────────────────────────────────
// Market index, sentiment, top mover. Cached 10 min.
router.get("/market/pulse", async (_req, res) => {
  const cacheKey = `market:pulse:${TODAY()}`;
  const cached = await cache.get<object>(cacheKey);
  if (cached) { res.json(cached); return; }

  // Fetch real sold prices for key cards to ground the AI response
  const [wembyPrices, edwardsPrices] = await Promise.all([
    fetchRecentSoldPrices("2023 Prizm Wembanyama Silver PSA 10"),
    fetchRecentSoldPrices("2023 Prizm Anthony Edwards PSA 10"),
  ]);

  const wembyAvg = wembyPrices.length
    ? Math.round(wembyPrices.reduce((a, b) => a + b, 0) / wembyPrices.length)
    : null;
  const edwardsAvg = edwardsPrices.length
    ? Math.round(edwardsPrices.reduce((a, b) => a + b, 0) / edwardsPrices.length)
    : null;

  const marketContext = [
    wembyAvg ? `Wembanyama Silver PSA 10 recent avg sold: $${wembyAvg}` : null,
    edwardsAvg ? `Anthony Edwards Silver PSA 10 recent avg sold: $${edwardsAvg}` : null,
  ].filter(Boolean).join("\n");

  const prompt = `Today is ${TODAY()}. You are a sports card market analyst for TheCardLab.
${marketContext ? `\nRecent eBay sold data:\n${marketContext}\n` : ""}
Based on current sports news, player performance, and card market trends, return ONLY valid JSON:
{
  "index": <number 1200-1900, TCL index representing overall card market health>,
  "change7d": <number, 7-day % change, e.g. 2.4 or -1.8>,
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "volume24h": "<string like '$4.2M' representing estimated 24h eBay card sales volume>",
  "topMover": "<player first + last name, hottest card right now>",
  "topMoverChange": "<string like '+14%' or '-8%'>",
  "signals": [
    { "type": "price_drop" | "pop_update" | "market_trend", "card": "<card name>", "message": "<1 sentence insight>", "time": "<e.g. '2 hours ago'>" },
    { ... },
    { ... }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    let data: object;
    try { data = JSON.parse(raw); } catch { data = {}; }
    await cache.set(cacheKey, data, 10 * 60 * 1000);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "GET /market/pulse error");
    res.status(500).json({ error: "Failed to fetch market pulse" });
  }
});

// ─── GET /api/market/comps?card=NAME ─────────────────────────────────────────
// Real eBay sold comps for a card. Cached 30 min per card.
router.get("/market/comps", async (req, res) => {
  const card = String(req.query.card ?? "").trim();
  if (!card) { res.status(400).json({ error: "card query param required" }); return; }

  const cacheKey = `market:comps:${card.toLowerCase()}`;
  const cached = await cache.get<object>(cacheKey);
  if (cached) { res.json(cached); return; }

  try {
    const comps = await fetchCardComps(card);
    await cache.set(cacheKey, comps, 30 * 60 * 1000);
    res.json(comps);
  } catch (err) {
    logger.error({ err, card }, "GET /market/comps error");
    res.status(500).json({ error: "Failed to fetch comps" });
  }
});

// ─── GET /api/market/trending ─────────────────────────────────────────────────
// Trending players + sets. Cached 30 min.
router.get("/market/trending", async (_req, res) => {
  const cacheKey = `market:trending:${TODAY()}`;
  const cached = await cache.get<object>(cacheKey);
  if (cached) { res.json(cached); return; }

  const prompt = `Today is ${TODAY()}. You are a sports card market analyst.
Based on current sports season, recent game results, player news, and card market momentum, return ONLY valid JSON:
{
  "players": [
    { "name": "<First Last>", "sport": "<NBA|NFL|MLB|NHL|TCG>", "trend": "+"|"-"|"→", "reason": "<5-10 word reason>" },
    ... (exactly 5 players)
  ],
  "sets": [
    { "name": "<Set Name>", "year": "<YYYY>", "sport": "<sport>", "trend": "+"|"-"|"→" },
    ... (exactly 3 sets)
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    let data: object;
    try { data = JSON.parse(raw); } catch { data = { players: [], sets: [] }; }
    await cache.set(cacheKey, data, 30 * 60 * 1000);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "GET /market/trending error");
    res.status(500).json({ error: "Failed to fetch trending" });
  }
});

// ─── GET /api/market/listings?q=QUERY ────────────────────────────────────────
// Live eBay active listings. Cached 5 min.
router.get("/market/listings", async (req, res) => {
  const q = String(req.query.q ?? "sports cards graded PSA").trim();
  const cacheKey = `market:listings:${q}`;
  const cached = await cache.get<unknown[]>(cacheKey);
  if (cached) { res.json(cached); return; }

  try {
    const listings = await fetchActiveListings(q, 8);
    await cache.set(cacheKey, listings, 5 * 60 * 1000);
    res.json(listings);
  } catch (err) {
    logger.error({ err }, "GET /market/listings error");
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

export default router;
