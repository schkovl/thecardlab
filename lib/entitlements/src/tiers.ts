/**
 * Tiers are coarse-grained billing levels. Features (see ./features) are the
 * fine-grained capabilities that map onto tiers.
 *
 * Stripe Product `metadata.tier` MUST match one of these strings; that is
 * how the server resolver maps a subscription back to a tier.
 */

export const TIERS = ["free", "pro"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  pro: 1,
};

export function tierAtLeast(actual: Tier, required: Tier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required];
}

/**
 * Hard caps that change per tier. Server middleware enforces; UI uses these
 * to render usage meters and "X of Y used" affordances.
 */
export const TIER_LIMITS = {
  free: {
    portfolioHoldings: 50,
    salesRecentWindowDays: 30,
    salesQueriesPerDay: 100,
    apiRequestsPerMinute: 60,
  },
  pro: {
    portfolioHoldings: Number.POSITIVE_INFINITY,
    salesRecentWindowDays: Number.POSITIVE_INFINITY,
    salesQueriesPerDay: Number.POSITIVE_INFINITY,
    apiRequestsPerMinute: 600,
  },
} as const satisfies Record<Tier, Record<string, number>>;

export type TierLimits = (typeof TIER_LIMITS)[Tier];
