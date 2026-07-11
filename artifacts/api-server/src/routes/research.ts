import { Router, type IRouter } from "express";
import { db, researchAlertsTable, portfolioHoldingsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireFeature } from "../middlewares/requireFeature";
import { getAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/research/alerts", requireAuth, requireFeature("research"), async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(researchAlertsTable)
    .where(eq(researchAlertsTable.clerkUserId, userId!))
    .orderBy(desc(researchAlertsTable.createdAt));
  res.json(rows);
});

router.post("/research/alerts", requireAuth, requireFeature("research"), async (req, res) => {
  const { userId } = getAuth(req);
  const { cardName, direction, threshold } = req.body ?? {};
  if (!cardName || !direction || typeof threshold !== "number") {
    res.status(400).json({ error: "cardName, direction (up|down), threshold required" });
    return;
  }
  const [row] = await db
    .insert(researchAlertsTable)
    .values({ clerkUserId: userId!, cardName, direction, threshold, active: true })
    .returning();
  res.json(row);
});

router.put("/research/alerts/:id", requireAuth, requireFeature("research"), async (req, res) => {
  const { userId } = getAuth(req);
  const updates: Record<string, unknown> = {};
  for (const k of ["cardName", "direction", "threshold", "active"] as const) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [row] = await db
    .update(researchAlertsTable)
    .set(updates)
    .where(and(eq(researchAlertsTable.id, req.params.id as string), eq(researchAlertsTable.clerkUserId, userId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/research/alerts/:id", requireAuth, requireFeature("research"), async (req, res) => {
  const { userId } = getAuth(req);
  const result = await db
    .delete(researchAlertsTable)
    .where(and(eq(researchAlertsTable.id, req.params.id as string), eq(researchAlertsTable.clerkUserId, userId!)))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({ ok: true });
});

router.get("/research/feed", requireAuth, requireFeature("research"), async (req, res) => {
  const { userId } = getAuth(req);
  const holdings = await db
    .select({ card: portfolioHoldingsTable.card })
    .from(portfolioHoldingsTable)
    .where(eq(portfolioHoldingsTable.clerkUserId, userId!))
    .limit(10);

  // No live market-signal pipeline exists yet. Never fabricate price
  // movements — return watchlist placeholders that say exactly what they are.
  const items = holdings.map((h, idx) => ({
    id: `watch-${idx}`,
    type: "watching" as const,
    card: h.card,
    delta: 0,
    message: `Watching ${h.card} — live price signals coming soon`,
    timestamp: new Date().toISOString(),
  }));
  res.json(items);
});

// ---------------------------------------------------------------------------
// Trending Players — Phase 1 (curated dataset, sport-tagged)
//
// Live marketplace pulls (eBay / Fanatics / Goldin) land in Phase 2. Until
// that pipeline exists we serve a curated editorial list and say so via
// dataSource: "curated" — never fabricated prices or volume numbers.
// ---------------------------------------------------------------------------

export type TrendingSport = "nba" | "nfl" | "mlb" | "wnba" | "soccer" | "tcg";

export type TrendingPlayer = {
  id: string;
  rank: number;
  name: string;
  sport: TrendingSport;
  direction: "up" | "down";
  context: string;
  scarcity: "high-pop" | "scarce" | null;
};

const CURATED_UPDATED_AT = "2026-07-10T12:00:00.000Z";

function entry(
  sport: TrendingSport,
  rank: number,
  name: string,
  direction: "up" | "down",
  context: string,
  scarcity: TrendingPlayer["scarcity"] = null,
): TrendingPlayer {
  return { id: `${sport}-${rank}`, rank, name, sport, direction, context, scarcity };
}

const TRENDING_CURATED: Record<TrendingSport, TrendingPlayer[]> = {
  nba: [
    entry("nba", 1, "Victor Wembanyama", "up", "Face of the league trajectory keeps PSA 10 rookie demand hot", "scarce"),
    entry("nba", 2, "Anthony Edwards", "up", "Deep playoff run carrying premium parallel prices into offseason"),
    entry("nba", 3, "Cooper Flagg", "up", "Rookie-year flagship releases still setting the market pace", "scarce"),
    entry("nba", 4, "Chet Holmgren", "up", "Contender core piece; graded rookies moving on title odds"),
    entry("nba", 5, "Luka Dončić", "down", "High POP base rookies cooling after spring spike", "high-pop"),
    entry("nba", 6, "Paolo Banchero", "up", "Breakout playoff series renewing interest in RPA comps"),
  ],
  nfl: [
    entry("nfl", 1, "CJ Stroud", "up", "Camp buzz plus new weapons driving PSA 10 rookie velocity"),
    entry("nfl", 2, "Jayden Daniels", "up", "Sophomore-leap narrative heating graded rookie market", "scarce"),
    entry("nfl", 3, "Caleb Williams", "up", "Offseason hype cycle lifting flagship rookie autos"),
    entry("nfl", 4, "Brock Bowers", "up", "Record TE rookie season keeps low-pop parallels scarce", "scarce"),
    entry("nfl", 5, "Bryce Young", "down", "Volatile comps; sellers outnumbering buyers on base rookies", "high-pop"),
  ],
  mlb: [
    entry("mlb", 1, "Shohei Ohtani", "up", "Two-way return season — every milestone moves the market"),
    entry("mlb", 2, "Elly De La Cruz", "up", "All-Star tools showcase pushing chrome rookie demand"),
    entry("mlb", 3, "Paul Skenes", "up", "Ace-tier dominance; graded rookies thin on supply", "scarce"),
    entry("mlb", 4, "Gunnar Henderson", "up", "MVP-pace first half lifting refractor comps"),
    entry("mlb", 5, "Jackson Holliday", "down", "High POP flagship rookies drifting despite steady play", "high-pop"),
    entry("mlb", 6, "Roki Sasaki", "up", "Rookie-eligible cards riding strikeout headlines", "scarce"),
  ],
  wnba: [
    entry("wnba", 1, "Caitlin Clark", "up", "Season-ticket effect intact — PSA 10 rookies remain the market bellwether", "scarce"),
    entry("wnba", 2, "Angel Reese", "up", "Double-double streaks keeping rookie parallels liquid"),
    entry("wnba", 3, "Paige Bueckers", "up", "Rookie-class flagship pulls driving break demand", "scarce"),
    entry("wnba", 4, "A'ja Wilson", "up", "MVP-track season lifting scarce early-career refractors", "scarce"),
    entry("wnba", 5, "JuJu Watkins", "up", "Pre-draft speculation building on college issues"),
  ],
  soccer: [
    entry("soccer", 1, "Lamine Yamal", "up", "World Cup knockout heroics — hottest name in the hobby right now", "scarce"),
    entry("soccer", 2, "Kylian Mbappé", "up", "Deep World Cup run compounding club-season momentum"),
    entry("soccer", 3, "Jude Bellingham", "up", "Tournament spotlight lifting Topps chrome comps"),
    entry("soccer", 4, "Endrick", "up", "Breakout World Cup minutes pushing rookie-era cards", "scarce"),
    entry("soccer", 5, "Lionel Messi", "up", "Farewell-tournament narrative reviving vintage and modern alike"),
  ],
  tcg: [
    entry("tcg", 1, "Pikachu (Van Gogh / promo)", "up", "Promo chase intact; sealed and graded copies both moving", "scarce"),
    entry("tcg", 2, "Charizard (151 / vintage holo)", "up", "Evergreen anchor — set reprints keep feeding graded demand"),
    entry("tcg", 3, "Umbreon (Moonbreon VMAX)", "up", "Alt-art grail status holding; PSA 10 supply thin", "scarce"),
    entry("tcg", 4, "Mew ex (151 SIR)", "up", "Set nostalgia cycle pushing special illustration rares"),
    entry("tcg", 5, "Lugia (Neo Genesis)", "down", "Vintage holo comps soft after spring run-up", "high-pop"),
  ],
};

// Global top 8: interleave each sport's #1s, then #2s, keeping curated order.
function buildAllSports(): TrendingPlayer[] {
  const sports = Object.keys(TRENDING_CURATED) as TrendingSport[];
  const merged: TrendingPlayer[] = [];
  for (let depth = 0; merged.length < 8; depth++) {
    let added = false;
    for (const s of sports) {
      const p = TRENDING_CURATED[s][depth];
      if (p && merged.length < 8) {
        merged.push(p);
        added = true;
      }
    }
    if (!added) break;
  }
  return merged.map((p, i) => ({ ...p, id: `all-${i + 1}`, rank: i + 1 }));
}

router.get("/research/trending", requireAuth, requireFeature("research"), async (_req, res) => {
  res.json({
    dataSource: "curated" as const,
    updatedAt: CURATED_UPDATED_AT,
    sports: TRENDING_CURATED,
    all: buildAllSports(),
  });
});

export default router;
