import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getAuth } from "../lib/auth";

/**
 * In-memory sliding-window rate limiter, keyed per user (or IP for
 * unauthenticated requests). Suitable for a single autoscale instance;
 * swap for @upstash/ratelimit (Redis) when running multiple instances —
 * see limitsForTier(tier).apiRequestsPerMinute in @workspace/entitlements
 * for the tier-aware follow-up.
 */

type Window = { timestamps: number[] };

const buckets = new Map<string, Window>();

// Periodically drop stale buckets so the map doesn't grow unbounded.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - SWEEP_INTERVAL_MS;
  for (const [key, win] of buckets) {
    if (win.timestamps.length === 0 || win.timestamps[win.timestamps.length - 1] < cutoff) {
      buckets.delete(key);
    }
  }
}, SWEEP_INTERVAL_MS).unref();

export function rateLimit(opts: { name: string; max: number; windowMs: number }): RequestHandler {
  const { name, max, windowMs } = opts;
  return (req: Request, res: Response, next: NextFunction) => {
    let subject: string;
    try {
      subject = getAuth(req).userId ?? req.ip ?? "anon";
    } catch {
      subject = req.ip ?? "anon";
    }
    const key = `${name}:${subject}`;
    const now = Date.now();
    const win = buckets.get(key) ?? { timestamps: [] };
    win.timestamps = win.timestamps.filter((t) => now - t < windowMs);
    if (win.timestamps.length >= max) {
      const retryAfterSec = Math.ceil((win.timestamps[0] + windowMs - now) / 1000);
      res.setHeader("Retry-After", String(Math.max(retryAfterSec, 1)));
      res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
      return;
    }
    win.timestamps.push(now);
    buckets.set(key, win);
    next();
  };
}
