import { Link, useLocation } from "wouter";
import { Home, ScanLine, LayoutGrid, Activity, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/deal-screener", label: "Screener", icon: ScanLine },
  { href: "/grade-lab", label: "Grade", icon: FlaskConical },
  { href: "/portfolio", label: "Portfolio", icon: LayoutGrid },
  { href: "/research", label: "Research", icon: Activity },
];

export function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#050914]/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 relative flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
