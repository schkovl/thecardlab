const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchEbayHtml(query: string, sold: boolean): Promise<string | null> {
  const params = new URLSearchParams({ _nkw: query, _sop: "13" });
  if (sold) { params.set("LH_Complete", "1"); params.set("LH_Sold", "1"); }
  const url = `https://www.ebay.com/sch/i.html?${params.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: FETCH_HEADERS });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(t);
    return null;
  }
}

function extractPrices(html: string): number[] {
  const out: number[] = [];
  const re = /s-item__price[^>]*>\s*\$([0-9,]+\.?\d*)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const v = parseFloat(m[1].replace(/,/g, ""));
    if (!isNaN(v) && v > 0) out.push(v);
  }
  return out;
}

function trimmedRange(prices: number[]): number[] {
  if (prices.length === 0) return [];
  const s = [...prices].sort((a, b) => a - b);
  const cut = Math.max(1, Math.floor(s.length * 0.1));
  const trimmed = s.length > 2 ? s.slice(cut, s.length - cut) : s;
  return [Math.round(trimmed[0]), Math.round(trimmed[trimmed.length - 1])];
}

export interface CardComps {
  raw: number[];
  psa8: number[];
  psa9: number[];
  psa10: number[];
}

export async function fetchCardComps(cardName: string): Promise<CardComps> {
  const [rawHtml, psa8Html, psa9Html, psa10Html] = await Promise.all([
    fetchEbayHtml(`${cardName}`, true),
    fetchEbayHtml(`${cardName} PSA 8`, true),
    fetchEbayHtml(`${cardName} PSA 9`, true),
    fetchEbayHtml(`${cardName} PSA 10`, true),
  ]);
  return {
    raw: trimmedRange(rawHtml ? extractPrices(rawHtml) : []),
    psa8: trimmedRange(psa8Html ? extractPrices(psa8Html) : []),
    psa9: trimmedRange(psa9Html ? extractPrices(psa9Html) : []),
    psa10: trimmedRange(psa10Html ? extractPrices(psa10Html) : []),
  };
}

export interface EbayListing {
  title: string;
  price: number;
  bids: number;
  timeLeft: string;
  url: string;
}

export async function fetchActiveListings(query: string, limit = 8): Promise<EbayListing[]> {
  const html = await fetchEbayHtml(query, false);
  if (!html) return [];
  return parseListings(html, limit);
}

function parseListings(html: string, limit: number): EbayListing[] {
  const results: EbayListing[] = [];
  // Match item blocks between <li class="s-item ..."> ... </li>
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

// Simple price-level for a key card — used for pulse baseline
export async function fetchRecentSoldPrices(query: string): Promise<number[]> {
  const html = await fetchEbayHtml(query, true);
  return html ? extractPrices(html).slice(0, 10) : [];
}
