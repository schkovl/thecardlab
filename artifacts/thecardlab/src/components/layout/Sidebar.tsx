import { Link, useLocation } from "wouter";
import { Home, ScanLine, FlaskConical, LayoutGrid, Activity, ShoppingCart, ShieldCheck, Calendar, Wrench, Smartphone, LogIn, Crown, ClipboardList, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { openModal } from "@/lib/modal-bus";
import { useUser, useClerk } from "@clerk/react";
import { useSubscription } from "@/hooks/useSubscription";
import { openCustomerPortal } from "@/lib/checkout";
import { toast } from "sonner";
import { useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Sidebar() {
  const [location] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const subscription = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const displayName = user
    ? (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName ?? user.username ?? "Member")
    : "Alex Carter";

  const initials = user
    ? ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? user.username?.[0] ?? "")).toUpperCase() || "?"
    : "AC";

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/deal-screener", label: "Deal Screener", icon: ScanLine },
    { href: "/grade-lab", label: "Grade Lab", icon: FlaskConical },
    { href: "/portfolio", label: "Portfolio & Comps", icon: LayoutGrid },
    { href: "/research", label: "Research & Alerts", icon: Activity },
    { href: "/marketplace", label: "Marketplace", icon: ShoppingCart },
    { href: "/vault", label: "Global Vault", icon: ShieldCheck },
    { href: "/shows", label: "Card Shows", icon: Calendar },
    { href: "/restoration", label: "Restoration Lab", icon: Wrench },
    { href: "/mobile-app", label: "Mobile App", icon: Smartphone, badge: "NEW" },
    { href: "/grading-tracker", label: "Grading Tracker", icon: ClipboardList },
    { href: "/wantlist", label: "Wantlist", icon: BookmarkPlus },
  ];

  const handleManageSubscription = async () => {
    if (!user) {
      openModal("pricing");
      return;
    }
    if (!subscription.isPro) {
      openModal("pricing");
      return;
    }
    setPortalLoading(true);
    const result = await openCustomerPortal(`${window.location.origin}${basePath}/`);
    setPortalLoading(false);
    if (result.ok) {
      window.location.assign(result.url);
    } else {
      toast.error(result.message);
    }
  };

  const planLabel = subscription.isPro ? "Pro • Active" : "Free Plan";
  const planBadge = subscription.isPro ? "ACTIVE" : "FREE";

  return (
    <aside className="w-[260px] h-screen sticky top-0 border-r border-border bg-gradient-to-b from-[#081020ee] to-[#050914f2] backdrop-blur-xl flex flex-col p-4 overflow-y-auto z-50">
      <div className="flex items-center gap-3 px-2 pb-6 pt-1">
        <div className="w-12 h-12 rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_32px_rgba(0,229,255,0.2)] flex items-center justify-center text-primary">
          <FlaskConical size={24} strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-[25px] font-black tracking-tight leading-none">
            TheCard<span className="text-primary">Lab</span>
          </div>
          <span className="block mt-1 text-[10px] text-muted-foreground uppercase tracking-widest">v8 Optimized</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 text-[#cbd5e1]",
              isActive ? "bg-gradient-to-r from-primary/15 to-white/5 shadow-[inset_3px_0_0_hsl(var(--primary))] text-white" : "hover:bg-white/5 hover:text-white"
            )}>
              <item.icon size={18} />
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-gradient-to-br from-accent to-[#f59e0b] text-[#111827] px-2 py-0.5 rounded-full text-[10px] font-black">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 flex flex-col gap-3">
        {isLoaded && !user ? (
          <Link href="/sign-in">
            <div className="border border-primary/30 bg-primary/5 rounded-[18px] p-3.5 flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <LogIn size={18} className="text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm text-primary">Sign in</div>
                <div className="text-[11px] text-muted-foreground">Google · Apple · GitHub</div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="border border-border bg-gradient-to-br from-[#101f3add] to-[#071225cc] rounded-[18px] p-3.5 flex items-center gap-3">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#17417e] to-[#112452] flex items-center justify-center font-black text-sm">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{displayName}</div>
              <div className={cn(
                "text-[11px] font-medium flex items-center gap-1",
                subscription.isPro ? "text-secondary" : "text-muted-foreground"
              )}>
                {subscription.isPro && <Crown size={10} />}
                {subscription.loading ? "Loading…" : (subscription.isPro ? "Pro Member" : "Free Plan")}
              </div>
            </div>
            {user && (
              <button
                onClick={() => signOut({ redirectUrl: `${basePath}/` })}
                className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                title="Sign out"
              >
                Out
              </button>
            )}
          </div>
        )}

        <div className="border border-border bg-gradient-to-br from-[#101f3add] to-[#071225cc] rounded-[18px] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold tracking-wider">CURRENT PLAN</div>
              <div className={cn("font-bold text-sm", subscription.isPro ? "text-accent" : "text-muted-foreground")}>
                {subscription.loading ? "Loading…" : planLabel}
              </div>
            </div>
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-black",
              subscription.isPro ? "bg-secondary/10 text-secondary" : "bg-white/5 text-muted-foreground"
            )}>
              {subscription.loading ? "…" : planBadge}
            </div>
          </div>
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            data-testid="button-manage-subscription"
            className="w-full mt-2 py-1.5 text-xs font-bold border border-white/10 rounded-lg hover:bg-white/5 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {portalLoading ? "Opening…" : (subscription.isPro ? "Manage Subscription" : "Upgrade to Pro")}
          </button>
        </div>
      </div>
    </aside>
  );
}
