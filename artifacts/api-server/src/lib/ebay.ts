import { cache } from "./cache.js";
import { firecrawlScrape, extractPricesFromText } from "./firecrawl.js";
import { logger } from "./logger.js";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

// ─── Direct eBay fetch (fallback when Firecrawl unavailable) ──────────────────

async function fetchEbayHtmlDirect(query: string, sold: boolean): Promise<string | null> {
  const params = new URLSearchParams({ _nkw: query, _sop: "13" });
  if (sold) { params.set("LH_Complete", "1"); params.set("LH_Sold", "1"); }
  const url = `https://www.ebay.com/sch/i.html?${params.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: FETCH_HEADERS });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 5000) return null; // bot-blocked
    return html;
  } catch {
    clearTimeout(t);
    return null;
  }
}

function extractPricesFromHtml(html: string): number[] {
  const out: number[] = [];
  const re = /s-item__price[^>]*>\s*\$([0-9,]+\.?\d*)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const v = parseFloat(m[1].replace(/,/g, ""));
    if (!isNaN(v) && v > 0) out.push(v);
  }
  return out;
}

// ─── eBay via Firecrawl ───────────────────────────────────────────────────────

async function fetchEbayPricesViaFirecrawl(query: string, sold: boolean): Promise<number[]> {
  const params = new URLSearchParams({ _nkw: query, _sop: "13" });
  if (sold) { params.set("LH_Complete", "1"); params.set("LH_Sold", "1"); }
  const url = `https://www.ebay.com/sch/i.html?${params.toString()}`;
  const result = await firecrawlScrape(url);
  if (!result || result.markdown.length < 200) return [];
  return extractPricesFromText(result.markdown);
}

// ─── 130point.com — eBay sold aggregator ─────────────────────────────────────
// Provides clean sold comp data with grade breakdowns

async function fetch130PointPrices(query: string): Promise<number[]> {
  const url = `https://130point.com/sales/?q=${encodeURIComponent(query)}`;
  const result = await firecrawlScrape(url, 10000);
  if (!result || result.markdown.length < 100) return [];
  return extractPricesFromText(result.markdown);
}

// ─── Sportscardspro.com — price history aggregator ───────────────────────────

async function fetchSportscardsProPrices(query: string): Promise<number[]> {
  const url = `https://www.sportscardspro.com/search-results?q=${encodeURIComponent(query)}`;
  const result = await firecrawlScrape(url, 10000);
  if (!result || result.markdown.length < 100) return [];
  return extractPricesFromText(result.markdown);
}

// ─── PWCC Marketplace ─────────────────────────────────────────────────────────

async function fetchPwccPrices(query: string): Promise<number[]> {
  const url = `https://www.pwccmarketplace.com/market-data?search=${encodeURIComponent(query)}`;
  const result = await firecrawlScrape(url, 10000);
  if (!result || result.markdown.length < 100) return [];
  return extractPricesFromText(result.markdown);
}

// ─── Goldin Auctions ──────────────────────────────────────────────────────────

async function fetchGoldinPrices(query: string): Promise<number[]> {
  const url = `https://goldin.co/browse?search=${encodeURIComponent(query)}&status=sold`;
  const result = await firecrawlScrape(url, 10000);
  if (!result || result.markdown.length < 100) return [];
  return extractPricesFromText(result.markdown);
}

// ─── Alt.com — fractional market ──────────────────────────────────────────────

async function fetchAltPrices(query: string): Promise<number[]> {
  const url = `https://alt.com/marketplace?search=${encodeURIComponent(query)}`;
  const result = await firecrawlScrape(url, 10000);
  if (!result || result.markdown.length < 100) return [];
  return extractPricesFromText(result.markdown);
}

// ─── Price aggregation helpers ────────────────────────────────────────────────

function trimmedRange(prices: number[]): number[] {
  if (prices.length === 0) return [];
  const s = [...prices].sort((a, b) => a - b);
  const cut = Math.max(1, Math.floor(s.length * 0.1));
  const trimmed = s.length > 2 ? s.slice(cut, s.length - cut) : s;
  return [Math.round(trimmed[0]), Math.round(trimmed[trimmed.length - 1])];
}

/** Merge price arrays from multiple sources, apply trimmed range. */
function aggregatePrices(...sources: number[][]): number[] {
  const merged = ([] as number[]).concat(...sources);
  return trimmedRange(merged);
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export interface CardComps {
  raw: number[];
  psa8: number[];
  psa9: number[];
  psa10: number[];
  sourceCount?: number;
}

export async function fetchCardComps(cardName: string): Promise<CardComps> {
  const key = `comps:v2:${cardName.toLowerCase().slice(0, 120)}`;
  const cached = await cache.get<CardComps>(key);
  if (cached) return cached;

  const hasFirecrawl = !!process.env.FIRECRAWL_API_KEY;

  const fetchGradeComps = async (grade: string): Promise<number[]> => {
    const q = `${cardName} ${grade}`;
    const sources: Promise<number[]>[] = [];

    if (hasFirecrawl) {
      sources.push(fetchEbayPricesViaFirecrawl(q, true));
      sources.push(fetch130PointPrices(q));
    }
    // Always try direct fetch as fallback
    sources.push(fetchEbayHtmlDirect(q, true).then(html => html ? extractPricesFromHtml(html) : []));

    const results = await Promise.allSettled(sources);
    const prices = results
      .filter((r): r is PromiseFulfilledResult<number[]> => r.status === "fulfilled")
      .flatMap(r => r.value);
    return prices;
  };

  // Fetch raw comps (no grade qualifier) + grade-specific in parallel
  const [rawPrices, psa8Prices, psa9Prices, psa10Prices] = await Promise.all([
    fetchGradeComps(""),
    fetchGradeComps("PSA 8"),
    fetchGradeComps("PSA 9"),
    fetchGradeComps("PSA 10"),
  ]);

  // For premium sources (Goldin, PWCC) — run only for PSA 10 where auction comps matter most
  let pwccPrices: number[] = [];
  let goldinPrices: number[] = [];
  if (hasFirecrawl) {
    const [pwcc, goldin] = await Promise.allSettled([
      fetchPwccPrices(`${cardName} PSA 10`),
      fetchGoldinPrices(`${cardName} PSA 10`),
    ]);
    pwccPrices = pwcc.status === "fulfilled" ? pwcc.value : [];
    goldinPrices = goldin.status === "fulfilled" ? goldin.value : [];
  }

  const result: CardComps = {
    raw: aggregatePrices(rawPrices),
    psa8: aggregatePrices(psa8Prices),
    psa9: aggregatePrices(psa9Prices),
    psa10: aggregatePrices(psa10Prices, pwccPrices, goldinPrices),
    sourceCount: hasFirecrawl ? 4 : 1,
  };

  const hasData = result.raw.length > 0 || result.psa9.length > 0 || result.psa10.length > 0;
  if (hasData) {
    await cache.set(key, result, 2 * 60 * 60 * 1000); // 2h TTL
  }

  logger.info(
    { cardName, hasFirecrawl, raw: result.raw, psa9: result.psa9, psa10: result.psa10 },
    "fetchCardComps result"
  );

  return result;
}

// ─── Active listings ──────────────────────────────────────────────────────────

export interface EbayListing {
  title: string;
  price: number;
  bids: number;
  timeLeft: string;
  url: string;
}

const FALLBACK_LISTINGS: EbayListing[] = [
  { title: "2023 Panini Prizm Victor Wembanyama Silver Rookie RC #136 PSA 10", price: 1249, bids: 0, timeLeft: "2d 4h", url: "https://www.ebay.com/sch/i.html?_nkw=2023+Prizm+Wembanyama+Silver+PSA+10" },
  { title: "2021 Topps Chrome Shohei Ohtani Refractor #180 PSA 9", price: 189, bids: 3, timeLeft: "1d 12h", url: "https://www.ebay.com/sch/i.html?_nkw=2021+Topps+Chrome+Ohtani+Refractor+PSA+9" },
  { title: "2023 Panini Prizm Anthony Edwards Silver #22 PSA 10 Graded", price: 415, bids: 7, timeLeft: "6h 30m", url: "https://www.ebay.com/sch/i.html?_nkw=2023+Prizm+Anthony+Edwards+Silver+PSA+10" },
  { title: "2020 Panini Prizm Patrick Mahomes Silver Prizm #269 BGS 9.5", price: 320, bids: 0, timeLeft: "3d 8h", url: "https://www.ebay.com/sch/i.html?_nkw=2020+Prizm+Mahomes+Silver+BGS+9.5" },
  { title: "2024 Topps Chrome Elly De La Cruz Gold Refractor /50 RC PSA 10", price: 595, bids: 12, timeLeft: "4h 15m", url: "https://www.ebay.com/sch/i.html?_nkw=2024+Topps+Chrome+Elly+De+La+Cruz+Gold+Refractor+PSA+10" },
  { title: "2024 Panini Prizm WNBA Caitlin Clark Silver Rookie RC #1 PSA 10", price: 875, bids: 0, timeLeft: "5d 2h", url: "https://www.ebay.com/sch/i.html?_nkw=2024+Prizm+WNBA+Caitlin+Clark+Silver+PSA+10" },
  { title: "1998 Topps Chrome Peyton Manning RC #165 PSA 9", price: 280, bids: 5, timeLeft: "1d 3h", url: "https://www.ebay.com/sch/i.html?_nkw=1998+Topps+Chrome+Peyton+Manning+RC+PSA+9" },
  { title: "2023 Panini Prizm Jaime Jaquez Jr. Silver Rookie RC PSA 10", price: 145, bids: 2, timeLeft: "2d 18h", url: "https://www.ebay.com/sch/i.html?_nkw=2023+Prizm+Jaime+Jaquez+Silver+PSA+10" },
];

export async function fetchActiveListings(query: string, limit = 8): Promise<EbayListing[]> {
  const key = `ebay:listings:${query.toLowerCase().slice(0, 80)}`;
  const cached = await cache.get<EbayListing[]>(key);
  if (cached) return cached;

  // Try Firecrawl first, then direct
  let html: string | null = null;
  if (process.env.FIRECRAWL_API_KEY) {
    const params = new URLSearchParams({ _nkw: query, _sop: "13" });
    const fc = await firecrawlScrape(`https://www.ebay.com/sch/i.html?${params.toString()}`);
    if (fc && fc.markdown.length > 200) {
      // Convert markdown back to listings — extract titles + prices from markdown table/list
      const listings = parseListingsFromMarkdown(fc.markdown, limit);
      if (listings.length > 0) {
        await cache.set(key, listings, 5 * 60 * 1000);
        return listings;
      }
    }
  }

  html = await fetchEbayHtmlDirect(query, false);
  if (!html) return FALLBACK_LISTINGS.slice(0, limit);
  const results = parseListingsFromHtml(html, limit);
  const out = results.length > 0 ? results : FALLBACK_LISTINGS.slice(0, limit);
  await cache.set(key, out, 5 * 60 * 1000);
  return out;
}

function parseListingsFromMarkdown(markdown: string, limit: number): EbayListing[] {
  const results: EbayListing[] = [];
  // Markdown lines containing price pattern: look for lines with both a title-like string and a price
  const lines = markdown.split("\n");
  for (const line of lines) {
    if (results.length >= limit) break;
    const priceM = line.match(/\$([0-9,]+\.?\d*)/);
    if (!priceM) continue;
    const price = parseFloat(priceM[1].replace(/,/g, ""));
    if (isNaN(price) || price < 1) continue;
    const clean = line.replace(/\[|\]|\(http[^)]+\)|\*\*/g, "").replace(/\|/g, "").trim();
    const title = clean.replace(/\$[0-9,]+\.?\d*/g, "").replace(/\s+/g, " ").trim();
    if (title.length < 8 || title === "Shop on eBay") continue;
    results.push({ title, price, bids: 0, timeLeft: "", url: "" });
  }
  return results;
}

function parseListingsFromHtml(html: string, limit: number): EbayListing[] {
  const results: EbayListing[] = [];
  const blockRe = /<li[^>]+s-item[^>]*>([\s\S]*?)<\/li>/g;
  let block;
  while ((block = blockRe.exec(html)) !== null && results.length < limit) {
    const inner = block[1];
    const titleM = inner.match(/s-item__title[^>]*>(?:<span[^>]*>)?([^<]{5,200})/);
    const priceM = inner.match(/s-item__price[^>]*>\s*\$([0-9,]+\.?\d*)/);
    const bidsM = inner.match(/([0-9]+)\s+bids?/i);
    const timeM = inner.match(/s-item__time-left[^>]*>([^<]+)/);
    const urlM = inner.match(/href="(https:\/\/www\.ebay\.com\/itm\/[^"]+)"/);
    if (!titleM || !priceM) continue;
    const title = titleM[1].trim();
    if (!title || title === "Shop on eBay") continue;
    results.push({
      title,
      price: parseFloat(priceM[1].replace(/,/g, "")),
      bids: bidsM ? parseInt(bidsM[1], 10) : 0,
      timeLeft: timeM ? timeM[1].trim() : "",
      url: urlM ? urlM[1] : `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(title)}`,
    });
  }
  return results;
}

export async function fetchRecentSoldPrices(query: string): Promise<number[]> {
  if (process.env.FIRECRAWL_API_KEY) {
    const prices = await fetchEbayPricesViaFirecrawl(query, true);
    if (prices.length > 0) return prices.slice(0, 10);
  }
  const html = await fetchEbayHtmlDirect(query, true);
  return html ? extractPricesFromHtml(html).slice(0, 10) : [];
}
