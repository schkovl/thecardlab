import { Link, useLocation } from "wouter";
import { Home, ScanLine, FlaskConical, LayoutGrid, Activity, ShoppingCart, ShieldCheck, Calendar, Wrench, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { openModal } from "@/lib/modal-bus";

export function Sidebar() {
  const [location] = useLocation();

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
  ];

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
        <div className="border border-border bg-gradient-to-br from-[#101f3add] to-[#071225cc] rounded-[18px] p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#17417e] to-[#112452] flex items-center justify-center font-black text-sm">AC</div>
          <div>
            <div className="font-semibold text-sm">Alex Carter</div>
            <div className="text-[11px] text-secondary font-medium">Pro Member • 14-day streak</div>
          </div>
        </div>

        <div className="border border-border bg-gradient-to-br from-[#101f3add] to-[#071225cc] rounded-[18px] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold tracking-wider">CURRENT PLAN</div>
              <div className="font-bold text-accent text-sm">Pro • $9.99/mo</div>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-black">ACTIVE</div>
          </div>
          <button
            onClick={() => openModal("pricing")}
            data-testid="button-manage-subscription"
            className="w-full mt-2 py-1.5 text-xs font-bold border border-white/10 rounded-lg hover:bg-white/5 transition"
          >
            Manage Subscription
          </button>
        </div>
      </div>
    </aside>
  );
}
