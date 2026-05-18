import { useState } from "react";
import { Check } from "lucide-react";

type Cycle = "monthly" | "yearly";

const tiers = [
  {
    name: "Free",
    monthly: 0,
    yearly: 0,
    blurb: "Get started. No card required.",
    features: ["3 Grade Lab scans / month", "Unlimited portfolio tracking", "Marketplace search", "Wantlist (3 cards)"],
    cta: "Start free",
  },
  {
    name: "Pro",
    monthly: 19,
    yearly: 190,
    blurb: "For collectors and dealers.",
    features: ["Unlimited Grade Lab", "Deal Screener", "Grading Tracker", "Wantlist (unlimited)", "Priority support"],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    name: "Whale",
    monthly: 99,
    yearly: 990,
    blurb: "For investors and breakers.",
    features: ["Everything in Pro", "Vault access ($25M insurance)", "API access", "Concierge submissions", "Dedicated support"],
    cta: "Talk to sales",
  },
] as const;

export default function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl font-black mb-2">Simple pricing</h1>
        <p className="text-sm text-muted-foreground">Free to start. Upgrade any time. Cancel anytime.</p>

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
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((t) => {
          const price = cycle === "monthly" ? t.monthly : t.yearly;
          const per = cycle === "monthly" ? "/mo" : "/yr";
          return (
            <div
              key={t.name}
              className={`rounded-2xl border bg-[#0d1a31] p-6 ${t.highlight ? "border-primary/60 ring-1 ring-primary/30" : "border-border"}`}
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">{t.name}</div>
              <div className="text-4xl font-display font-black mb-1">${price}<span className="text-base text-muted-foreground font-normal">{price > 0 ? per : ""}</span></div>
              <p className="text-xs text-muted-foreground mb-5">{t.blurb}</p>
              <button className={`w-full h-10 rounded-xl text-xs font-bold mb-5 ${t.highlight ? "bg-primary text-background hover:bg-primary/90" : "bg-white/5 border border-border hover:bg-white/10"}`}>
                {t.cta}
              </button>
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
  );
}
