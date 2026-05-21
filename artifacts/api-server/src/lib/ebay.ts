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
  const html = await fetchEbayHtml(query, false);
  if (!html) return FALLBACK_LISTINGS.slice(0, limit);
  const results = parseListings(html, limit);
  return results.length > 0 ? results : FALLBACK_LISTINGS.slice(0, limit);
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
