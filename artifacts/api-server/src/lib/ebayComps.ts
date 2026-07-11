import { logger } from "./logger.js";

/**
 * Real market comps from the eBay Browse API.
 *
 * Auth (either works; client credentials preferred):
 * - EBAY_CLIENT_ID + EBAY_CLIENT_SECRET — app keyset from developer.ebay.com.
 *   This module mints and caches application access tokens itself via the
 *   client-credentials grant (eBay app tokens expire after ~2h).
 * - EBAY_OAUTH_TOKEN — a pre-minted token override, mainly for local testing.
 *
 * Without credentials this module returns null and callers MUST surface
 * "comps unavailable" — never fabricate prices.
 *
 * Note: the Browse API returns ACTIVE listings (asking prices). True sold
 * comps require the Marketplace Insights API (restricted access). The
 * `source` field distinguishes them so the UI can label data honestly.
 */

const EBAY_BROWSE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";

export type CompBucket = {
  /** min/max observed price, USD */
  range: [number, number];
  /** number of listings sampled */
  sampleSize: number;
};

export type EbayComps = {
  source: "ebay_active_listings";
  fetchedAt: string;
  query: string;
  raw: CompBucket | null;
  psa8: CompBucket | null;
  psa9: CompBucket | null;
  psa10: CompBucket | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export function ebayCompsConfigured(): boolean {
  return Boolean(
    process.env.EBAY_OAUTH_TOKEN ||
      (process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
  );
}

/**
 * Application access token: static override, else client-credentials grant
 * cached until ~5 minutes before expiry.
 */
export async function getEbayAppToken(): Promise<string | null> {
  if (process.env.EBAY_OAUTH_TOKEN) return process.env.EBAY_OAUTH_TOKEN;
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.value;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(EBAY_TOKEN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: EBAY_SCOPE,
      }).toString(),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.error({ status: res.status }, "eBay token mint failed");
      return null;
    }
    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) return null;
    cachedToken = {
      value: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 7200) * 1000,
    };
    return cachedToken.value;
  } catch (err) {
    logger.error({ err }, "eBay token mint errored");
    return null;
  }
}

async function searchBucket(query: string): Promise<CompBucket | null> {
  const tok = await getEbayAppToken();
  if (!tok) return null;
  const url = new URL(EBAY_BROWSE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "25");
  // 212: Sports Trading Cards; 183454: CCG Individual Cards
  url.searchParams.set("category_ids", "212,183454");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${tok}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.warn({ status: res.status, query }, "eBay Browse API non-OK");
      return null;
    }
    const body = (await res.json()) as {
      itemSummaries?: { price?: { value?: string; currency?: string } }[];
    };
    const prices = (body.itemSummaries ?? [])
      .map((i) => Number(i.price?.value))
      .filter((p) => Number.isFinite(p) && p > 0)
      .sort((a, b) => a - b);
    if (prices.length === 0) return null;
    // trim top/bottom 10% to reduce outlier noise
    const lo = Math.floor(prices.length * 0.1);
    const hi = Math.max(lo + 1, Math.ceil(prices.length * 0.9));
    const trimmed = prices.slice(lo, hi);
    return {
      range: [Math.floor(trimmed[0]), Math.ceil(trimmed[trimmed.length - 1])],
      sampleSize: trimmed.length,
    };
  } catch (err) {
    logger.warn({ err, query }, "eBay Browse API fetch failed");
    return null;
  }
}

/**
 * Fetch price buckets for a card query across raw + graded tiers.
 * Returns null when the integration is not configured or nothing was found.
 */
export async function fetchEbayComps(cardQuery: string): Promise<EbayComps | null> {
  if (!ebayCompsConfigured()) return null;
  const q = cardQuery.trim();
  if (!q) return null;
  const [raw, psa8, psa9, psa10] = await Promise.all([
    searchBucket(`${q} -PSA -BGS -SGC -CGC`),
    searchBucket(`${q} PSA 8`),
    searchBucket(`${q} PSA 9`),
    searchBucket(`${q} PSA 10`),
  ]);
  if (!raw && !psa8 && !psa9 && !psa10) return null;
  return {
    source: "ebay_active_listings",
    fetchedAt: new Date().toISOString(),
    query: q,
    raw,
    psa8,
    psa9,
    psa10,
  };
}
