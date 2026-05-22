import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { fetchCardComps, fetchActiveListings, fetchRecentSoldPrices } from "../lib/ebay.js";
import { cache } from "../lib/cache.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const TODAY = () => new Date().toISOString().split("T")[0];

// ─── ESPN Live RSS ────────────────────────────────────────────────────────────

const PLAYER_CARD_MAP: Record<string, { name: string; card: string; sport: string }> = {
  "Wembanyama": { name: "Victor Wembanyama", card: "2023 Panini Prizm Wembanyama Silver #136", sport: "NBA" },
  "Gilgeous-Alexander": { name: "Shai Gilgeous-Alexander", card: "2019 Panini Prizm SGA Rookie RC", sport: "NBA" },
  "Flagg": { name: "Cooper Flagg", card: "2025 Panini Prizm Cooper Flagg RC", sport: "NBA" },
  "Knueppel": { name: "Kon Knueppel", card: "2025 Panini Prizm Kon Knueppel RC", sport: "NBA" },
  "LeBron": { name: "LeBron James", card: "2003 Topps Chrome LeBron James RC", sport: "NBA" },
  "Curry": { name: "Stephen Curry", card: "2009 Topps Stephen Curry RC", sport: "NBA" },
  "Mahomes": { name: "Patrick Mahomes", card: "2017 Panini Prizm Patrick Mahomes RC", sport: "NFL" },
  "Ohtani": { name: "Shohei Ohtani", card: "2018 Topps Chrome Shohei Ohtani RC", sport: "MLB" },
  "Clark": { name: "Caitlin Clark", card: "2024 Panini Prizm WNBA Caitlin Clark RC", sport: "WNBA" },
  "Judge": { name: "Aaron Judge", card: "2013 Topps Update Aaron Judge RC", sport: "MLB" },
  "Harper": { name: "Bryce Harper", card: "2012 Topps Update Bryce Harper RC", sport: "MLB" },
};

async function fetchEspnTitles(sport: "nba" | "nfl" | "mlb"): Promise<string[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`https://www.espn.com/espn/rss/${sport}/news`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "TheCardLabBot/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const xml = await res.text();
    const titles: string[] = [];
    const re = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) titles.push(m[1]);
    return titles.slice(1, 20);
  } catch {
    clearTimeout(t);
    return [];
  }
}

async function buildLivePulse(): Promise<object | null> {
  const [nba, nfl, mlb] = await Promise.all([
    fetchEspnTitles("nba"),
    fetchEspnTitles("nfl"),
    fetchEspnTitles("mlb"),
  ]);
  const all = [...nba, ...nfl, ...mlb];
  if (all.length < 3) return null;

  const signals: Array<{ type: string; card: string; message: string; time: string }> = [];
  const bullishPlayers: string[] = [];
  const bearishPlayers: string[] = [];

  for (const [key, info] of Object.entries(PLAYER_CARD_MAP)) {
    const matches = all.filter(h => h.includes(key));
    if (!matches.length) continue;
    const headline = matches[0];
    const negative = /injur|injury|loses?|fired|suspend|hamstring|out for/i.test(headline);
    signals.push({
      type: negative ? "price_drop" : "market_trend",
      card: info.card,
      message: headline.length > 90 ? headline.slice(0, 90) + "…" : headline,
      time: "Live · ESPN",
    });
    if (negative) bearishPlayers.push(info.name);
    else bullishPlayers.push(info.name);
    if (signals.length >= 3) break;
  }

  if (signals.length === 0) return null;

  const isPlayoffs = all.some(h => /playoff|finals|series|championship|conference/i.test(h));
  const sentiment = bearishPlayers.length > bullishPlayers.length ? "BEARISH" : isPlayoffs ? "BULLISH" : "NEUTRAL";
  const topMover = bullishPlayers[0] ?? bearishPlayers[0] ?? "Victor Wembanyama";
  const change7d = sentiment === "BULLISH" ? 3.2 : sentiment === "BEARISH" ? -1.4 : 0.8;

  return {
    index: 1520 + signals.length * 15,
    change7d,
    sentiment,
    volume24h: `$${(4.1 + signals.length * 0.2).toFixed(1)}M`,
    topMover,
    topMoverChange: change7d >= 0 ? `+${(change7d + 8).toFixed(0)}%` : `${(change7d - 3).toFixed(0)}%`,
    signals,
    _source: "espn-live",
  };
}

async function buildLiveTrending(): Promise<object | null> {
  const [nba, nfl, mlb] = await Promise.all([
    fetchEspnTitles("nba"),
    fetchEspnTitles("nfl"),
    fetchEspnTitles("mlb"),
  ]);
  const all = [...nba, ...nfl, ...mlb];
  if (all.length < 3) return null;

  const players: Array<{ name: string; sport: string; trend: string; reason: string }> = [];

  for (const [key, info] of Object.entries(PLAYER_CARD_MAP)) {
    const matches = all.filter(h => h.includes(key));
    if (!matches.length) continue;
    const headline = matches[0];
    const negative = /injur|injury|suspend|hamstring/i.test(headline);
    const reason = headline.length > 40 ? headline.slice(0, 40) + "…" : headline;
    players.push({ name: info.name, sport: info.sport, trend: negative ? "-" : "+", reason });
    if (players.length >= 5) break;
  }

  if (players.length < 2) return null;

  const isPlayoffs = all.some(h => /playoff|finals|championship/i.test(h));
  return {
    players,
    sets: [
      { name: "Prizm Basketball", year: "2025", sport: "NBA", trend: isPlayoffs ? "+" : "→" },
      { name: "Topps Chrome Baseball", year: "2025", sport: "MLB", trend: "→" },
      { name: "Panini Prizm WNBA", year: "2025", sport: "WNBA", trend: "+" },
    ],
    _source: "espn-live",
  };
}

function buildFallbackPulse(wembyAvg: number | null, edwardsAvg: number | null): object {
  const seed = new Date().getDate();
  const index = 1480 + (seed % 7) * 30;
  const change7d = parseFloat(((seed % 5) - 2).toFixed(1));
  const sentiment = change7d > 0.5 ? "BULLISH" : change7d < -0.5 ? "BEARISH" : "NEUTRAL";
  return {
    index,
    change7d,
    sentiment,
    volume24h: `$${(3.8 + (seed % 3) * 0.4).toFixed(1)}M`,
    topMover: wembyAvg && wembyAvg > 1500 ? "Victor Wembanyama" : "Anthony Edwards",
    topMoverChange: change7d >= 0 ? `+${(change7d + 5).toFixed(0)}%` : `${(change7d - 3).toFixed(0)}%`,
    signals: [
      { type: "market_trend", card: "2023 Prizm Wembanyama Silver", message: wembyAvg ? `Recent PSA 10 avg: $${wembyAvg}` : "Wembanyama RC demand remains elevated heading into the playoffs.", time: "1 hour ago" },
      { type: "price_drop", card: "2021 Prizm Patrick Mahomes", message: "Post-Super Bowl dip creating buy opportunity for long-term holders.", time: "3 hours ago" },
      { type: "pop_update", card: "1998 Topps Chrome Peyton Manning RC", message: "Pop report crossed 500 PSA 10s — supply increasing.", time: "6 hours ago" },
    ],
  };
}

const FALLBACK_TRENDING = {
  players: [
    { name: "Victor Wembanyama", sport: "NBA", trend: "+", reason: "Playoff run driving PSA 10 demand" },
    { name: "Anthony Edwards", sport: "NBA", trend: "+", reason: "Wolves deep playoff push" },
    { name: "Caitlin Clark", sport: "WNBA", trend: "+", reason: "Record-setting rookie season" },
    { name: "Shohei Ohtani", sport: "MLB", trend: "→", reason: "Dodgers midseason consistency" },
    { name: "Patrick Mahomes", sport: "NFL", trend: "→", reason: "Post-Super Bowl normalization" },
  ],
  sets: [
    { name: "Prizm Basketball", year: "2023", sport: "NBA", trend: "+" },
    { name: "Topps Chrome Baseball", year: "2024", sport: "MLB", trend: "→" },
    { name: "Panini Prizm WNBA", year: "2024", sport: "WNBA", trend: "+" },
  ],
};

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
    try { data = JSON.parse(raw); } catch { data = buildFallbackPulse(wembyAvg, edwardsAvg); }
    await cache.set(cacheKey, data, 10 * 60 * 1000);
    res.json(data);
  } catch (err) {
    logger.warn({ err }, "GET /market/pulse AI unavailable, trying ESPN live data");
    const live = await buildLivePulse();
    if (live) {
      await cache.set(cacheKey, live, 10 * 60 * 1000);
      res.json(live);
      return;
    }
    const fallback = buildFallbackPulse(wembyAvg, edwardsAvg);
    await cache.set(cacheKey, fallback, 10 * 60 * 1000);
    res.json(fallback);
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
    try { data = JSON.parse(raw); } catch { data = FALLBACK_TRENDING; }
    await cache.set(cacheKey, data, 30 * 60 * 1000);
    res.json(data);
  } catch (err) {
    logger.warn({ err }, "GET /market/trending AI unavailable, trying ESPN live data");
    const live = await buildLiveTrending();
    if (live) {
      await cache.set(cacheKey, live, 30 * 60 * 1000);
      res.json(live);
      return;
    }
    await cache.set(cacheKey, FALLBACK_TRENDING, 30 * 60 * 1000);
    res.json(FALLBACK_TRENDING);
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
