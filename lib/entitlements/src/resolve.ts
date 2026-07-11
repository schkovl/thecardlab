import { ALL_FEATURES, FEATURES, type Feature } from "./features";
import { TIER_LIMITS, TIER_RANK, type Tier, type TierLimits } from "./tiers";

/**
 * Returns true iff the given tier grants access to `feature`.
 * Used by server middleware AND client gates — keep it pure.
 */
export function isFeatureAllowed(tier: Tier, feature: Feature): boolean {
  const required = FEATURES[feature].tier;
  return TIER_RANK[tier] >= TIER_RANK[required];
}

/**
 * Computes the full feature set granted by a tier. Used by the server
 * to populate the entitlements payload returned to the client, so the
 * client never has to know the tier→feature mapping.
 */
export function featuresForTier(tier: Tier): Feature[] {
  return ALL_FEATURES.filter((f) => isFeatureAllowed(tier, f));
}

export function limitsForTier(tier: Tier): TierLimits {
  return TIER_LIMITS[tier];
}
