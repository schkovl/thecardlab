export type PlanId = "pro_monthly" | "pro_annual";
/** Kept for call-site compatibility; sessions ride the httpOnly cookie now. */
export type TokenGetter = () => Promise<string | null>;

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "auth" | "network" | "server"; message: string };

const base =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export async function startCheckout(
  plan: PlanId,
  couponId?: string,
  _getToken?: TokenGetter,
): Promise<CheckoutResult> {
  try {
    const res = await fetch(`${base}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        plan,
        successUrl: `${window.location.origin}/?checkout=success`,
        cancelUrl: `${window.location.origin}/?checkout=cancelled`,
        ...(couponId ? { couponId } : {}),
      }),
    });

    if (res.status === 401 || res.status === 302) {
      return { ok: false, reason: "auth", message: "Please sign in to start a subscription." };
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, reason: "server", message: data.error ?? `Checkout failed (${res.status}).` };
    }

    const data = (await res.json()) as { url?: string };
    if (!data.url) {
      return { ok: false, reason: "server", message: "Checkout response missing URL." };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, reason: "network", message: "Couldn't reach checkout. Try again." };
  }
}

export async function openCustomerPortal(
  returnUrl?: string,
  _getToken?: TokenGetter,
): Promise<CheckoutResult> {
  try {
    const res = await fetch(`${base}/api/portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ returnUrl: returnUrl ?? window.location.href }),
    });

    if (res.status === 401 || res.status === 302) {
      return { ok: false, reason: "auth", message: "Please sign in to manage your subscription." };
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, reason: "server", message: data.error ?? `Portal failed (${res.status}).` };
    }

    const data = (await res.json()) as { url?: string };
    if (!data.url) {
      return { ok: false, reason: "server", message: "Portal response missing URL." };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, reason: "network", message: "Couldn't reach portal. Try again." };
  }
}
