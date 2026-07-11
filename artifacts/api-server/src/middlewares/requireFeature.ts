import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getAuth } from "../lib/auth";
import { type Feature, isFeatureAllowed } from "@workspace/entitlements";
import { resolveEntitlements } from "../lib/entitlements";
import { logger } from "../lib/logger";

/**
 * Express middleware factory that enforces a feature gate on a route.
 *
 * Usage:
 *   router.get("/deal-screener", requireAuth(), requireFeature("deal_screener"), handler)
 *
 * Order matters: `requireAuth()` first (so we have a userId), then
 * `requireFeature(...)`. The middleware fails closed — any error
 * resolving entitlements becomes a 403, never a 500-with-bypass.
 *
 * Per request, entitlements are cached on `res.locals` so the same handler
 * chain doesn't double-query. If you need the tier inside the handler
 * itself, read `res.locals.tier` instead of re-resolving.
 */
export function requireFeature(feature: Feature): RequestHandler {
  return async function requireFeatureMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const entitlements =
        res.locals.entitlements ?? (await resolveEntitlements(userId));
      res.locals.entitlements = entitlements;
      res.locals.tier = entitlements.tier;

      if (!isFeatureAllowed(entitlements.tier, feature)) {
        res.status(403).json({
          error: "upgrade_required",
          message: `This feature requires the Pro plan.`,
          feature,
          currentTier: entitlements.tier,
        });
        return;
      }
      next();
    } catch (err) {
      logger.error({ err, userId, feature }, "requireFeature failed");
      res.status(403).json({ error: "forbidden" });
    }
  };
}
