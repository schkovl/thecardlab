import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { resolveEntitlements } from "../lib/entitlements";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * GET /api/entitlements/me
 *
 * Single endpoint the client polls on app boot (and after a checkout
 * redirect) to know what to render. Cache key on the client should be
 * `["entitlements", userId]`; invalidate after `/stripe/checkout`
 * success and on focus.
 *
 * Always returns 200 with a free-tier payload when nothing matches —
 * the client never has to special-case missing subscriptions.
 */
router.get("/entitlements/me", requireAuth, async (req: any, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  try {
    const userId = req.auth.userId as string;
    const entitlements = await resolveEntitlements(userId);
    res.json(entitlements);
  } catch (err) {
    logger.error({ err }, "GET /entitlements/me failed");
    res.status(500).json({ error: "Failed to resolve entitlements" });
  }
});

export default router;
