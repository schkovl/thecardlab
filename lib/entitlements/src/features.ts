import type { Tier } from "./tiers";

/**
 * Every gated capability in the product. Add to this list before adding
 * a `requireFeature()` call or a `<Gate>` — it's the schema-of-truth.
 *
 * Naming convention: `<page_or_module>.<verb_or_noun>`. Use `*` only for
 * blanket reads (`portfolio.*` etc.) and resolve to specific actions on
 * write paths.
 */
export const FEATURES = {
  // ---- Free tier ----
  "profile.read": { tier: "free", label: "View your profile" },
  "profile.write": { tier: "free", label: "Edit your profile" },
  "portfolio.read": { tier: "free", label: "View your portfolio" },
  "portfolio.write": { tier: "free", label: "Add and edit holdings" },
  "sales.recent": {
    tier: "free",
    label: "Recent sales (30-day window)",
  },

  // ---- Pro tier ----
  "sales.full_history": {
    tier: "pro",
    label: "Full historical comps and pricing",
  },
  "deal_screener": { tier: "pro", label: "AI Deal Screener" },
  "grade_lab": { tier: "pro", label: "AI Grade Lab" },
  "research": { tier: "pro", label: "Research workspace" },
  "marketplace": { tier: "pro", label: "Marketplace listings" },
  "vault": { tier: "pro", label: "Vault" },
  "shows": { tier: "pro", label: "Shows calendar" },
  "restoration": { tier: "pro", label: "Restoration workspace" },
  "grading_tracker": { tier: "pro", label: "Grading tracker" },
  "wantlist": { tier: "pro", label: "Wantlist alerts" },
  "mobile.full": { tier: "pro", label: "Full mobile app access" },
  "exports": { tier: "pro", label: "CSV / Excel exports" },
  "api_access": { tier: "pro", label: "Public API access" },
} as const satisfies Record<string, { tier: Tier; label: string }>;

export type Feature = keyof typeof FEATURES;

export const ALL_FEATURES = Object.keys(FEATURES) as Feature[];

export function featureTier(feature: Feature): Tier {
  return FEATURES[feature].tier;
}

export function featureLabel(feature: Feature): string {
  return FEATURES[feature].label;
}
