/**
 * Checkout integration shim.
 *
 * The UI is wired and ready. To go live with real subscriptions:
 *   1. Connect Stripe in the Replit Integrations pane (requires a paid plan).
 *   2. Implement POST /api/checkout on the API server. It should accept
 *      { priceId: string, successUrl: string, cancelUrl: string } and return
 *      { url: string } — the Stripe Checkout Session URL to redirect to.
 *   3. Set the STRIPE_PRICE_PRO_MONTHLY and STRIPE_PRICE_PRO_ANNUAL price IDs
 *      after running the seed-products script in scripts/.
 *
 * Until then this function returns { ok: false } and the UI shows a
 * "Stripe not yet configured" message instead of crashing.
 */

export type PlanId = "pro_monthly" | "pro_annual";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not-configured" | "network" | "server"; message: string };

const PRICE_IDS: Record<PlanId, string | undefined> = {
  pro_monthly: undefined,
  pro_annual: undefined,
};

export async function startCheckout(plan: PlanId): Promise<CheckoutResult> {
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return {
      ok: false,
      reason: "not-configured",
      message:
        "Stripe isn't connected yet. Connect it from the Integrations pane and add the price IDs to start charging.",
    };
  }

  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        successUrl: `${window.location.origin}${base}/?checkout=success`,
        cancelUrl: `${window.location.origin}${base}/?checkout=cancelled`,
      }),
    });
    if (!res.ok) {
      return { ok: false, reason: "server", message: `Checkout failed (${res.status}).` };
    }
    const data = (await res.json()) as { url?: string };
    if (!data.url) return { ok: false, reason: "server", message: "Checkout response missing URL." };
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, reason: "network", message: "Couldn't reach checkout. Try again." };
  }
}
