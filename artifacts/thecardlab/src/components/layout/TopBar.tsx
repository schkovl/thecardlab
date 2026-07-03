import { Search, Sparkles, Bell, Download, Check, LogIn, Menu, Settings, Crown, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { openModal } from "@/lib/modal-bus";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useUser, useClerk } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { useCurrency } from "@/hooks/useCurrency";
import { useSubscription } from "@/hooks/useSubscription";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { installed } = usePwaInstall();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const { isCad, toggle } = useCurrency();
  const [, navigate] = useLocation();
  const [searchQ, setSearchQ] = useState("");
  const subscription = useSubscription();

  useEffect(() => {
    if (!avatarOpen) return;
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [avatarOpen]);

  const initials = user
    ? (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? user.username?.[0] ?? "")
    : "AC";

  const displayInitials = initials.toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 lg:gap-4 bg-gradient-to-b from-[#050914f7] to-[#050914c7] backdrop-blur-md px-4 lg:px-6 py-3 lg:py-4 -mx-4 lg:-mx-6 mb-4">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-white/5 hover:bg-white/10 transition-colors shrink-0"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Search bar */}
      <div className="flex-1 flex items-center gap-2 px-3 h-10 lg:h-12 bg-[#0d1a31b8] border border-border rounded-xl lg:rounded-2xl min-w-0">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQ.trim()) {
              navigate(`/deal-screener`);
              setSearchQ("");
            }
          }}
          placeholder="Search cards, players, sets…"
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground min-w-0"
          data-testid="input-global-search"
        />
      </div>

      <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
        {/* AI Assistant — navigates to Deal Screener */}
        <button
          onClick={() => navigate("/deal-screener")}
          className="h-10 lg:h-[42px] px-2 lg:px-4 flex items-center gap-2 rounded-xl border border-border bg-white/5 hover:bg-primary/10 hover:border-primary/40 transition-colors text-sm font-medium"
          data-testid="button-ai-assistant"
        >
          <Sparkles size={16} className="text-primary" />
          <span className="hidden lg:inline">AI Scan</span>
        </button>

        {/* CAD/USD currency toggle */}
        <button
          onClick={toggle}
          title={isCad ? "Showing CAD (≈1.36× USD) — click to switch to USD" : "Showing USD — click to switch to CAD"}
          className="h-10 lg:h-[42px] px-2 lg:px-3 flex items-center gap-0.5 rounded-xl border border-border bg-white/5 hover:bg-white/10 transition-colors text-xs font-black"
        >
          <span className={isCad ? "text-primary" : "text-muted-foreground"}>CAD</span>
          <span className="text-muted-foreground/40 mx-0.5">/</span>
          <span className={!isCad ? "text-primary" : "text-muted-foreground"}>USD</span>
        </button>

        {/* Notifications — navigates to Research/Alerts */}
        <button
          onClick={() => navigate("/research")}
          className="w-10 h-10 lg:w-[42px] lg:h-[42px] flex items-center justify-center rounded-xl border border-border bg-white/5 hover:bg-primary/10 hover:border-primary/40 transition-colors relative"
          data-testid="button-notifications"
          title="View price alerts"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 lg:top-2.5 lg:right-2.5 w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_hsl(var(--secondary))]" />
        </button>

        {/* Install — desktop only */}
        <button
          onClick={() => openModal("install")}
          className="hidden lg:flex h-[42px] px-3.5 items-center gap-2 rounded-xl border border-border bg-white/5 hover:bg-primary/10 hover:border-primary/40 transition-colors text-xs font-bold"
          data-testid="button-install-app"
          title={installed ? "Already installed" : "Install TheCardLab on this device"}
        >
          {installed ? <Check size={16} className="text-secondary" /> : <Download size={16} />}
          <span>{installed ? "Installed" : "Install App"}</span>
        </button>

        {/* Sign in */}
        {isLoaded && !user && (
          <Link href="/sign-in">
            <button
              className="h-10 lg:h-[42px] px-3 lg:px-4 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-bold text-primary"
              data-testid="button-sign-in"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          </Link>
        )}

        {/* Avatar */}
        {isLoaded && user && (
          <div className="relative" ref={avatarRef}>
            <button
              onClick={() => setAvatarOpen((v) => !v)}
              className="focus:outline-none ml-1"
              aria-label="Account menu"
              aria-expanded={avatarOpen}
            >
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.firstName ?? "User"}
                  className={`w-9 h-9 rounded-full cursor-pointer ring-2 transition-all ${avatarOpen ? "ring-primary/50" : "ring-transparent hover:ring-primary/50"}`}
                  data-testid="avatar-user"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[#03111c] font-black text-sm cursor-pointer"
                  data-testid="avatar-user"
                >
                  {displayInitials}
                </div>
              )}
            </button>
            {avatarOpen && (
              <div className="absolute right-0 top-12 flex flex-col bg-[#0d1a31] border border-border rounded-2xl shadow-2xl p-2 min-w-[200px] z-50">
                {/* User info + tier */}
                <div className="px-3 py-2.5 border-b border-border mb-1">
                  <div className="text-xs text-muted-foreground truncate">
                    {user.primaryEmailAddress?.emailAddress ?? user.username}
                  </div>
                  <div className="mt-1.5">
                    {subscription.loading ? (
                      <span className="text-[10px] text-muted-foreground">Loading…</span>
                    ) : subscription.isPro ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#03111c] bg-gradient-to-r from-primary to-secondary px-2 py-0.5 rounded-full">
                        <Crown size={9} /> Pro
                      </span>
                    ) : (
                      <button
                        onClick={() => { setAvatarOpen(false); openModal("pricing"); }}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-white/8 hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/40 px-2 py-0.5 rounded-full transition-colors"
                      >
                        Free · Upgrade
                      </button>
                    )}
                  </div>
                </div>

                {/* Settings */}
                <button
                  onClick={() => { setAvatarOpen(false); navigate("/settings"); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-left text-foreground hover:bg-white/5 rounded-xl transition-colors font-medium"
                >
                  <Settings size={14} className="text-muted-foreground" />
                  Settings
                </button>

                {/* Sign out */}
                <button
                  onClick={() => { setAvatarOpen(false); signOut({ redirectUrl: `${basePath}/` }); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-left text-red-400 hover:bg-white/5 rounded-xl transition-colors font-medium"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}

        {!isLoaded && (
          <div
            className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[#03111c] font-black text-sm cursor-pointer ml-1"
            data-testid="avatar-user"
          >
            AC
          </div>
        )}
      </div>
    </header>
  );
}
