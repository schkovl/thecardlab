import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Crown, Check, Loader2, ShieldCheck, Tag, X } from "lucide-react";
import { startCheckout, type PlanId } from "@/lib/checkout";
import { invalidateSubscriptionCache } from "@/hooks/useSubscription";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PLANS: Array<{
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  badge?: string;
  highlight?: boolean;
}> = [
  { id: "pro_monthly", name: "Pro Monthly", price: "$19", cadence: "/mo" },
  { id: "pro_annual", name: "Pro Annual", price: "$190", cadence: "/yr", badge: "Save 17%", highlight: true },
];

const FEATURES = [
  "Unlimited Grade Lab scans (front + back analysis)",
  "Unlimited Deal Screener scans",
  "Grading Tracker",
  "Research & Alerts — real-time price drop notifications",
  "Unlimited Wantlist",
  "Priority support",
];

export function PricingModal({ open, onOpenChange }: Props) {
  const [selected, setSelected] = useState<PlanId>("pro_annual");
  const [loading, setLoading] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [location] = useLocation();
  const { getToken } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      invalidateSubscriptionCache();
      toast.success("Welcome to Pro!", {
        description: "Your subscription is now active. Enjoy unlimited access.",
        duration: 6000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    } else if (checkout === "cancelled") {
      toast.info("Checkout cancelled", {
        description: "You can upgrade any time from the sidebar.",
        duration: 4000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    }
  }, [location]);

  const onCheckout = async () => {
    setLoading(true);
    const couponId = couponCode.trim() || undefined;
    const result = await startCheckout(selected, couponId, getToken);
    setLoading(false);
    if (result.ok) {
      window.location.assign(result.url);
      return;
    }
    if (result.reason === "auth") {
      toast.info("Sign in required", {
        description: result.message,
        duration: 4000,
      });
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 gap-0 border-border bg-gradient-to-br from-[#101f3add] to-[#071225] overflow-hidden"
        data-testid="modal-pricing"
      >
        <div className="p-6 pb-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_40px_rgba(0,229,255,0.25)]">
            <Crown className="text-accent" size={26} />
          </div>
          <DialogTitle className="text-2xl font-black mt-4 tracking-tight">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1.5 text-sm">
            Unlimited scans, market alerts, grading tracker, and priority support.
          </DialogDescription>
        </div>

        <div className="px-6 space-y-2.5">
          {PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                data-testid={`button-plan-${plan.id}`}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "border-secondary bg-secondary/10 shadow-[0_0_0_1px_rgba(34,211,166,0.4)]"
                    : "border-border hover:border-white/20 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      isSelected ? "border-secondary bg-secondary" : "border-white/30"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} className="text-[#03111c]" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{plan.name}</div>
                    {plan.badge && (
                      <div className="text-[10px] font-black text-secondary mt-0.5 tracking-wider">{plan.badge}</div>
                    )}
                  </div>
                </div>
                <div className="font-black text-base">
                  {plan.price}
                  <span className="text-xs text-muted-foreground font-medium">{plan.cadence}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 pt-5 pb-2 grid gap-1.5">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check size={13} className="text-secondary flex-shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="px-6 pt-3 pb-1">
          {!couponOpen ? (
            <button
              onClick={() => setCouponOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition"
            >
              <Tag size={12} />
              Have a promo code?
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO CODE"
                autoFocus
                className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-border text-xs font-mono tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition"
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

        <div className="p-6 pt-4 space-y-2">
          <button
            onClick={onCheckout}
            disabled={loading}
            data-testid="button-checkout"
            className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-br from-primary to-secondary text-[#03111c] shadow-[0_14px_36px_rgba(0,229,255,0.3)] hover:shadow-[0_20px_50px_rgba(0,229,255,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Redirecting to checkout…
              </>
            ) : (
              <>Get Started</>
            )}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-2 text-xs text-muted-foreground hover:text-white transition"
            data-testid="button-cancel-pricing"
          >
            Maybe later
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70 pt-1">
            <ShieldCheck size={11} />
            <span>Secure checkout powered by Stripe • Cancel anytime</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
