import { logger } from "./logger.js";

export interface FirecrawlResult {
  markdown: string;
  metadata: Record<string, unknown>;
}

export async function firecrawlScrape(url: string, timeoutMs = 12000): Promise<FirecrawlResult | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    clearTimeout(t);
    if (!res.ok) {
      logger.warn({ status: res.status, url }, "Firecrawl non-OK");
      return null;
    }
    const data = await res.json() as {
      success?: boolean;
      data?: { markdown?: string; metadata?: Record<string, string> };
    };
    if (!data.success || !data.data) return null;
    return {
      markdown: data.data.markdown ?? "",
      metadata: data.data.metadata ?? {},
    };
  } catch (err) {
    logger.warn({ err, url }, "Firecrawl scrape failed");
    return null;
  }
}

/** Extract dollar prices from markdown/text. Filters out obviously wrong values. */
export function extractPricesFromText(text: string, min = 1, max = 500_000): number[] {
  const out: number[] = [];
  const re = /\$([0-9,]+\.?\d*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const v = parseFloat(m[1].replace(/,/g, ""));
    if (!isNaN(v) && v >= min && v <= max) out.push(v);
  }
  return out;
}
