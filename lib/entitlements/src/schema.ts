import { z } from "zod/v4";
import { TIERS } from "./tiers";
import { ALL_FEATURES } from "./features";

/**
 * Wire format for `GET /api/entitlements/me`. Use this schema both
 * server-side (to validate before returning) and client-side (to parse
 * the response into a strongly-typed object).
 *
 * Limit fields accept `number | null` because JSON has no Infinity —
 * `JSON.stringify(Infinity) === "null"` automatically, so unbounded
 * caps come over the wire as null. The `limitsForTier()` helper
 * returns Infinity in-process; the boundary translation is implicit.
 */
const limitField = z.union([z.number(), z.null()]);

export const entitlementsPayloadSchema = z.object({
  tier: z.enum(TIERS),
  features: z.array(z.enum(ALL_FEATURES as [string, ...string[]])),
  limits: z.object({
    portfolioHoldings: limitField,
    salesRecentWindowDays: limitField,
    salesQueriesPerDay: limitField,
    apiRequestsPerMinute: limitField,
  }),
  subscription: z
    .object({
      status: z.string(),
      currentPeriodEnd: z.number().nullable(),
      cancelAtPeriodEnd: z.boolean().default(false),
    })
    .nullable(),
});

export type EntitlementsPayload = z.infer<typeof entitlementsPayloadSchema>;
