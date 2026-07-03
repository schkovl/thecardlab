import { useState, useEffect } from "react";
import { Check, ShieldCheck, Tag, X } from "lucide-react";
import { Link } from "wouter";
import { startCheckout } from "@/lib/checkout";
import { toast } from "sonner";
import { useUser, useAuth } from "@clerk/react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { MarketingNav } from "@/components/layout/MarketingNav";

type Cycle = "monthly" | "yearly";

const tiers = [
  {
    name: "Free",
    monthly: 0,
    yearly: 0,
    blurb: "Get started. No card required.",
    features: ["3 Grade Lab scans / month", "5 Deal Screener scans / month", "Unlimited portfolio tracking", "Marketplace search", "Wantlist (3 cards)"],
    cta: "Start free",
    action: "free",
  },
  {
    name: "Pro",
    monthly: 19,
    yearly: 190,
    blurb: "For collectors and dealers.",
    features: ["Unlimited Grade Lab", "Deal Screener", "Grading Tracker", "Wantlist (unlimited)", "Priority support"],
    cta: "Get Started — $19/mo",
    highlight: true,
    action: "pro",
  },
  {
    name: "Whale",
    monthly: 99,
    yearly: 990,
    blurb: "For investors and breakers.",
    features: ["Everything in Pro", "Global Vault access", "API access", "Concierge submissions", "Dedicated support"],
    cta: "Talk to sales",
    action: "whale",
  },
] as const;

export default function Pricing() {
  usePageMeta("Pricing — TheCardLab", "Free to start. Pro at $19/mo. Whale at $99/mo. Upgrade any time, cancel any time.");
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [loading, setLoading] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();

  // Auto-trigger checkout after sign-up/sign-in redirect
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("checkout_plan") as "pro_monthly" | "pro_annual" | null;
    if (!plan) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout_plan");
    window.history.replaceState({}, "", url.toString());
    setLoading(true);
    startCheckout(plan, undefined, getToken).then((result) => {
      setLoading(false);
      if (result.ok) window.location.assign(result.url);
      else toast.error(result.message);
    });
  }, [isLoaded, isSignedIn, getToken]);

  const handleCta = async (action: string) => {
    if (action === "free") return;
    if (action === "whale") {
      window.location.href = "/support";
      return;
    }
    const planId = cycle === "monthly" ? "pro_monthly" : "pro_annual";
    if (!isLoaded || !isSignedIn) {
      const returnUrl = `/pricing?checkout_plan=${planId}`;
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`;
      return;
    }
    setLoading(true);
    const couponId = couponCode.trim() || undefined;
    const result = await startCheckout(planId, couponId, getToken);
    setLoading(false);
    if (result.ok) {
      window.location.assign(result.url);
    } else if (result.reason === "auth") {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(`/pricing?checkout_plan=${planId}`)}`;
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl font-black mb-2">Pricing Made Efficient</h1>
        <p className="text-sm text-muted-foreground">Free to start. Upgrade any time. Cancel anytime.</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <ShieldCheck size={14} className="text-primary/60" />
          <span className="text-xs text-muted-foreground">14-day refund window · Email support@thecardlab.app · Cancel from settings</span>
        </div>

        <div className="inline-flex items-center gap-1 mt-6 rounded-full bg-[#0d1a31] border border-border p-1">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`h-9 px-4 rounded-full text-xs font-bold transition-colors ${cycle === c ? "bg-primary text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {c === "monthly" ? "Monthly" : "Yearly · save 17%"}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          {!couponOpen ? (
            <button
              onClick={() => setCouponOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition"
            >
              <Tag size={12} />
              Have a promo code?
            </button>
          ) : (
            <div className="flex items-center gap-2 w-56">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO CODE"
                autoFocus
                className="flex-1 h-9 px-3 rounded-xl bg-[#0d1a31] border border-border text-xs font-mono tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition text-center"
              />
              <button
                onClick={() => { setCouponOpen(false); setCouponCode(""); }}
                className="text-muted-foreground hover:text-white transition"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((t) => {
          const price = cycle === "monthly" ? t.monthly : t.yearly;
          const per = cycle === "monthly" ? "/mo" : "/yr";
          const isFree = t.action === "free";
          return (
            <div
              key={t.name}
              className={`rounded-2xl border bg-[#0d1a31] p-6 ${('highlight' in t && t.highlight) ? "border-primary/60 ring-1 ring-primary/30" : "border-border"}`}
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">{t.name}</div>
              <div className="text-4xl font-display font-black mb-1">${price}<span className="text-base text-muted-foreground font-normal">{price > 0 ? per : ""}</span></div>
              <p className="text-xs text-muted-foreground mb-5">{t.blurb}</p>
              {isFree ? (
                <Link href="/sign-up">
                  <button className="w-full h-10 rounded-xl text-xs font-bold mb-5 bg-white/5 border border-border hover:bg-white/10 transition-colors">
                    {t.cta}
                  </button>
                </Link>
              ) : (
                <button
                  onClick={() => handleCta(t.action)}
                  disabled={loading && t.action === "pro"}
                  className={`w-full h-10 rounded-xl text-xs font-bold mb-5 transition-colors disabled:opacity-60 ${('highlight' in t && t.highlight) ? "bg-primary text-background hover:bg-primary/90" : "bg-white/5 border border-border hover:bg-white/10"}`}
                >
                  {loading && t.action === "pro" ? "Redirecting…" : t.cta}
                </button>
              )}
              <ul className="space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check size={14} className="text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
