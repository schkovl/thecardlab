import { Link, useLocation } from "wouter";
import { Home, ScanLine, FlaskConical, LayoutGrid, Activity, ShoppingCart, ShieldCheck, LogIn, Crown, ClipboardList, BookmarkPlus, X, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { openModal } from "@/lib/modal-bus";
import { useUser, useClerk, useAuth } from "@clerk/react";
import { useSubscription } from "@/hooks/useSubscription";
import { openCustomerPortal } from "@/lib/checkout";
import { toast } from "sonner";
import { useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
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
    { href: "/dashboard", label: "Dashboard", icon: Home, badge: "Live" as const },
    { href: "/deal-screener", label: "Deal Screener", icon: ScanLine, badge: "Live" as const },
    { href: "/grade-lab", label: "Grade Lab", icon: FlaskConical, badge: "Live" as const },
    { href: "/portfolio", label: "Portfolio & Comps", icon: LayoutGrid, badge: "Live" as const },
    { href: "/research", label: "Research & Alerts", icon: Activity, badge: "Live" as const },
    { href: "/marketplace", label: "Marketplace", icon: ShoppingCart, badge: "Live" as const },
    { href: "/vault", label: "Global Vault", icon: ShieldCheck, badge: "Beta" as const },
    { href: "/grading-tracker", label: "Grading Tracker", icon: ClipboardList, badge: "Live" as const },
    { href: "/wantlist", label: "Wantlist", icon: BookmarkPlus, badge: "Live" as const },
  ];

  const handleManageSubscription = async () => {
    if (!user) { openModal("pricing"); return; }
    if (!subscription.isPro) { openModal("pricing"); return; }
    setPortalLoading(true);
    const result = await openCustomerPortal(`${window.location.origin}${basePath}/`, getToken);
    setPortalLoading(false);
    if (result.ok) {
      window.location.assign(result.url);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <aside className="w-[260px] h-screen sticky top-0 border-r border-border bg-gradient-to-b from-[#081020ee] to-[#050914f2] backdrop-blur-xl flex flex-col p-4 overflow-y-auto z-50">
      <div className="flex items-center gap-3 px-2 pb-6 pt-1">
        <div className="w-12 h-12 rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_32px_rgba(0,229,255,0.2)] flex items-center justify-center text-primary">
          <FlaskConical size={24} strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="text-[25px] font-black tracking-tight leading-none">
            TheCard<span className="text-primary">Lab</span>
          </div>
          <span className="block mt-1 text-[10px] text-muted-foreground uppercase tracking-widest">v8 Optimized</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 text-[#cbd5e1]",
                isActive
                  ? "bg-gradient-to-r from-primary/15 to-white/5 shadow-[inset_3px_0_0_hsl(var(--primary))] text-white"
                  : "hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={18} />
              <span className="font-medium text-sm flex-1">{item.label}</span>
              {item.badge === "Beta" && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] shrink-0">Beta</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex flex-col gap-2.5">
        {/* User identity row */}
        {isLoaded && !user ? (
          <Link href="/sign-in" onClick={onClose}>
            <div className="border border-primary/30 bg-primary/5 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-colors">
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <LogIn size={16} className="text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm text-primary">Sign in</div>
                <div className="text-[11px] text-muted-foreground">Google · Microsoft</div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="border border-border/60 bg-white/[0.03] rounded-2xl px-3.5 py-3 flex items-center gap-3">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#17417e] to-[#112452] flex items-center justify-center font-black text-xs shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate leading-tight">{displayName}</div>
              <div className={cn(
                "text-[11px] flex items-center gap-1 mt-0.5",
                subscription.isPro ? "text-secondary font-semibold" : "text-muted-foreground"
              )}>
                {subscription.isPro ? <><Crown size={9} /> Pro Member</> : "Free"}
              </div>
            </div>
            {user && (
              <button
                onClick={() => signOut({ redirectUrl: `${basePath}/` })}
                className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors shrink-0 ml-1"
                title="Sign out"
              >
                Out
              </button>
            )}
          </div>
        )}

        {/* Plan action block */}
        {!subscription.loading && subscription.isPro ? (
          /* Pro: minimal manage link */
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            data-testid="button-manage-subscription"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-muted-foreground hover:text-secondary transition-colors disabled:opacity-50"
          >
            <Crown size={11} />
            {portalLoading ? "Opening…" : "Manage subscription"}
          </button>
        ) : !subscription.loading && !subscription.isPro && user ? (
          /* Free: high-conversion upgrade card */
          <button
            onClick={handleManageSubscription}
            data-testid="button-manage-subscription"
            className="group relative w-full text-left rounded-2xl border border-primary/20 bg-gradient-to-br from-[#00e5ff08] to-[#071225] p-4 overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_24px_rgba(0,229,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {/* Ambient glow blob */}
            <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                <Zap size={11} className="text-primary" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-primary/80">Upgrade to Pro</span>
              <span className="ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground tracking-wider">FREE</span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3.5">
              Unlock <span className="text-foreground font-semibold">unlimited scans</span>, Grade Lab AI, Global Vault, and deal alerts.
            </p>

            <div className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#22d3a6] text-[#03111c] text-xs font-black shadow-[0_0_20px_rgba(0,229,255,0.3)] group-hover:shadow-[0_0_28px_rgba(0,229,255,0.45)] transition-shadow duration-200">
              Get Pro — $19<span className="font-semibold opacity-70">/mo</span>
              <ChevronRight size={13} strokeWidth={2.5} />
            </div>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
