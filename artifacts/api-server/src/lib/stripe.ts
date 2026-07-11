import Stripe from "stripe";

const IS_PROD = process.env.NODE_ENV === "production";

if (IS_PROD && !process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY must be set in production");
}
if (IS_PROD && !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET must be set in production");
}

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  return cached;
}

export function isStripeLive(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function priceIdForPlan(plan: "pro_monthly" | "pro_annual"): string | null {
  if (plan === "pro_monthly") return process.env.STRIPE_PRICE_ID_PRO_MONTHLY ?? null;
  if (plan === "pro_annual") return process.env.STRIPE_PRICE_ID_PRO_ANNUAL ?? null;
  return null;
}
