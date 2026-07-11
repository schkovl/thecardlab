import { sql, eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  type EntitlementsPayload,
  featuresForTier,
  limitsForTier,
  type Tier,
  TIERS,
} from "@workspace/entitlements";
import { logger } from "./logger";

async function loadDevTier(userId: string): Promise<Tier | null> {
  try {
    const rows = await db
      .select({ devTier: usersTable.devTier })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const t = rows[0]?.devTier;
    if (t && (TIERS as readonly string[]).includes(t)) return t as Tier;
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves a Clerk user's billing tier by joining their stored stripe
 * subscription against the stripe-replit-sync mirror tables.
 *
 * Source of truth: Stripe Product `metadata.tier`. Set this to "pro" on
 * any product whose price grants Pro access. Anything else (including
 * absence of a subscription) → "free".
 *
 * Statuses that grant access: `active`, `trialing`, `past_due` (we keep
 * a grace window so a transient card decline doesn't yank features).
 */
const ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const;

type SubscriptionRow = {
  id: string;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: boolean | null;
  product_id: string | null;
  product_metadata: Record<string, unknown> | null;
};

async function loadActiveSubscription(
  userId: string,
): Promise<SubscriptionRow | null> {
  // The users table tracks the current subscription id; stripe-replit-sync
  // keeps the row fresh. We left-join to the product so we can read
  // metadata.tier without a second round-trip.
  const result = await db.execute<SubscriptionRow>(sql`
    SELECT
      s.id,
      s.status,
      s.current_period_end,
      s.cancel_at_period_end,
      pr.product AS product_id,
      p.metadata AS product_metadata
    FROM users u
    LEFT JOIN stripe.subscriptions s
      ON s.id = u.stripe_subscription_id
    LEFT JOIN stripe.subscription_items si
      ON si.subscription = s.id
    LEFT JOIN stripe.prices pr
      ON pr.id = si.price
    LEFT JOIN stripe.products p
      ON p.id = pr.product
    WHERE u.id = ${userId}
    ORDER BY si.created DESC NULLS LAST
    LIMIT 1
  `);

  const row = result.rows[0];
  if (!row || !row.id) return null;
  return row;
}

function tierFromSubscription(row: SubscriptionRow | null): Tier {
  if (!row) return "free";
  if (!ACTIVE_STATUSES.includes(row.status as (typeof ACTIVE_STATUSES)[number])) {
    return "free";
  }
  const metaTier = (row.product_metadata?.tier as string | undefined)?.toLowerCase();
  if (metaTier && (TIERS as readonly string[]).includes(metaTier)) {
    return metaTier as Tier;
  }
  // Subscription exists and is active but product isn't tagged. Fail closed
  // to avoid handing out Pro on a misconfigured product.
  logger.warn(
    { subscriptionId: row.id, productId: row.product_id },
    "Active subscription has no metadata.tier — defaulting to free",
  );
  return "free";
}

export async function resolveEntitlements(
  userId: string,
): Promise<EntitlementsPayload> {
  const devTier = await loadDevTier(userId);
  if (devTier) {
    return {
      tier: devTier,
      features: featuresForTier(devTier),
      limits: limitsForTier(devTier),
      subscription:
        devTier === "pro"
          ? {
              status: "active",
              currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
              cancelAtPeriodEnd: false,
            }
          : null,
    };
  }

  let sub: SubscriptionRow | null = null;
  try {
    sub = await loadActiveSubscription(userId);
  } catch (err) {
    logger.warn({ err }, "loadActiveSubscription failed — defaulting to free");
  }
  const tier = tierFromSubscription(sub);

  return {
    tier,
    features: featuresForTier(tier),
    limits: limitsForTier(tier),
    subscription: sub
      ? {
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        }
      : null,
  };
}
