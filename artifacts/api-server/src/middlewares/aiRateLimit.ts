import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { cache } from "../lib/cache.js";
import { logger } from "../lib/logger.js";

const FREE_DAILY_LIMIT = 3;

function todayKey(userId: string): string {
  const d = new Date();
  return `rate:grade:${userId}:${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export async function aiGradeRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) { next(); return; }

  try {
    const key = todayKey(userId);
    const count = (await cache.get<number>(key)) ?? 0;

    if (count >= FREE_DAILY_LIMIT) {
      res.status(429).json({
        error: `Daily limit of ${FREE_DAILY_LIMIT} analyses reached. Upgrade to Pro for unlimited.`,
        upgradeUrl: "/pricing",
        remaining: 0,
      });
      return;
    }

    (req as Request & { _gradeRateLimitKey: string; _gradeRateCount: number })._gradeRateLimitKey = key;
    (req as Request & { _gradeRateLimitKey: string; _gradeRateCount: number })._gradeRateCount = count;
  } catch (e) {
    logger.warn({ e }, "aiGradeRateLimit cache check failed — fail-open");
  }

  next();
}

export async function incrementGradeUsage(req: Request): Promise<void> {
  const key = (req as Request & { _gradeRateLimitKey?: string })._gradeRateLimitKey;
  const count = (req as Request & { _gradeRateCount?: number })._gradeRateCount ?? 0;
  if (!key) return;
  try {
    await cache.set(key, count + 1, 25 * 60 * 60 * 1000);
  } catch (e) {
    logger.warn({ e }, "incrementGradeUsage cache set failed");
  }
}
