import { useState } from "react";
import { useUser, useClerk, useAuth } from "@/lib/auth";
import { Crown, CreditCard, LogOut, User, Palette, ExternalLink } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { openModal } from "@/lib/modal-bus";
import { openCustomerPortal } from "@/lib/checkout";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const subscription = useSubscription();
  const { isCad, toggle } = useCurrency();
  const [portalLoading, setPortalLoading] = useState(false);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Member"
    : "—";

  const handleManageSubscription = async () => {
    if (!subscription.isPro) { openModal("pricing"); return; }
    setPortalLoading(true);
    const result = await openCustomerPortal(`${window.location.origin}${basePath}/settings`, getToken);
    setPortalLoading(false);
    if (result.ok) {
      window.location.assign(result.url);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      {/* Account */}
      <section className="rounded-2xl border border-border bg-[#0d1a31]/60 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-white/2">
          <User size={14} className="text-muted-foreground" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Account</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Name</span>
            <span className="text-sm font-bold">{displayName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="text-sm font-bold truncate max-w-[220px]">
              {user?.primaryEmailAddress?.emailAddress ?? "—"}
            </span>
          </div>
        </div>
      </section>

      {/* Plan */}
      <section className="rounded-2xl border border-border bg-[#0d1a31]/60 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-white/2">
          <Crown size={14} className="text-muted-foreground" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Plan</span>
        </div>
        <div className="px-5 py-4">
          {subscription.loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : subscription.isPro ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-[#03111c] bg-gradient-to-r from-primary to-secondary px-2.5 py-1 rounded-full">
                    <Crown size={10} /> Pro
                  </span>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className="text-xs text-muted-foreground mt-1.5">
                    Renews {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                <CreditCard size={13} />
                {portalLoading ? "Opening…" : "Manage billing"}
                <ExternalLink size={11} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-muted-foreground">Free</span>
                <div className="text-xs text-muted-foreground mt-0.5">Limited access to features</div>
              </div>
              <button
                onClick={() => openModal("pricing")}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-[#03111c] text-xs font-black hover:brightness-110 transition-all"
              >
                <Crown size={12} /> Upgrade to Pro
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-2xl border border-border bg-[#0d1a31]/60 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-white/2">
          <Palette size={14} className="text-muted-foreground" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Preferences</span>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Currency</div>
              <div className="text-xs text-muted-foreground">Prices displayed across the app</div>
            </div>
            <button
              onClick={toggle}
              className="flex items-center gap-1 h-9 px-4 rounded-xl border border-border bg-white/5 hover:bg-white/10 transition-colors text-xs font-black"
            >
              <span className={isCad ? "text-primary" : "text-muted-foreground"}>CAD</span>
              <span className="text-muted-foreground/40 mx-0.5">/</span>
              <span className={!isCad ? "text-primary" : "text-muted-foreground"}>USD</span>
            </button>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-500/20 bg-[#0d1a31]/60 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-red-500/20 bg-white/2">
          <LogOut size={14} className="text-red-400" />
          <span className="text-xs font-black uppercase tracking-widest text-red-400">Session</span>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Sign out</div>
              <div className="text-xs text-muted-foreground">End your current session</div>
            </div>
            <button
              onClick={() => signOut({ redirectUrl: `${basePath}/` })}
              className="h-9 px-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
