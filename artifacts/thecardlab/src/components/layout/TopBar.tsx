import { Search, Sparkles, Bell, Download, Check, LogIn } from "lucide-react";
import { toast } from "sonner";
import { openModal } from "@/lib/modal-bus";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useUser, useClerk } from "@clerk/react";
import { Link } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function TopBar() {
  const { installed } = usePwaInstall();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const initials = user
    ? (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? user.username?.[0] ?? "")
    : "AC";

  const displayInitials = initials.toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 bg-gradient-to-b from-[#050914f7] to-[#050914c7] backdrop-blur-md px-6 py-4 -mx-6 mb-4">
      <div className="flex-1 max-w-[620px] flex items-center gap-2 px-4 h-12 bg-[#0d1a31b8] border border-border rounded-2xl">
        <Search size={18} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Search cards, players, sets, PSA certs, or paste eBay URL..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          data-testid="input-global-search"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => toast("AI Assistant activated", { icon: <Sparkles className="text-primary" size={16} /> })}
          className="h-[42px] px-4 flex items-center gap-2 rounded-xl border border-border bg-white/5 hover:bg-primary/10 hover:border-primary/40 transition-colors text-sm font-medium"
          data-testid="button-ai-assistant"
        >
          <Sparkles size={16} className="text-primary" />
          <span className="hidden md:inline">AI Assistant</span>
        </button>

        <button
          onClick={() => toast("You have 3 new price drop alerts", { icon: <Bell className="text-primary" size={16} /> })}
          className="w-[42px] h-[42px] flex items-center justify-center rounded-xl border border-border bg-white/5 hover:bg-primary/10 hover:border-primary/40 transition-colors relative"
          data-testid="button-notifications"
        >
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_hsl(var(--secondary))]" />
        </button>

        <button
          onClick={() => openModal("install")}
          className="hidden md:flex h-[42px] px-3.5 items-center gap-2 rounded-xl border border-border bg-white/5 hover:bg-primary/10 hover:border-primary/40 transition-colors text-xs font-bold"
          data-testid="button-install-app"
          title={installed ? "Already installed" : "Install TheCardLab on this device"}
        >
          {installed ? <Check size={16} className="text-secondary" /> : <Download size={16} />}
          <span>{installed ? "Installed" : "Install App"}</span>
        </button>

        {isLoaded && !user && (
          <Link href="/sign-in">
            <button
              className="h-[42px] px-4 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-bold text-primary"
              data-testid="button-sign-in"
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
          </Link>
        )}

        {isLoaded && user && (
          <div
            className="relative group"
          >
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.firstName ?? "User"}
                className="w-9 h-9 rounded-full cursor-pointer ring-2 ring-transparent group-hover:ring-primary/50 transition-all ml-2"
                data-testid="avatar-user"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[#03111c] font-black text-sm cursor-pointer ml-2"
                data-testid="avatar-user"
              >
                {displayInitials}
              </div>
            )}
            <div className="absolute right-0 top-12 hidden group-hover:flex flex-col bg-[#0d1a31] border border-border rounded-2xl shadow-2xl p-2 min-w-[160px] z-50">
              <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
                {user.primaryEmailAddress?.emailAddress ?? user.username}
              </div>
              <button
                onClick={() => signOut({ redirectUrl: `${basePath}/` })}
                className="px-3 py-2 text-sm text-left text-red-400 hover:bg-white/5 rounded-xl transition-colors font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        {!isLoaded && (
          <div
            className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[#03111c] font-black text-sm cursor-pointer ml-2"
            data-testid="avatar-user"
          >
            AC
          </div>
        )}
      </div>
    </header>
  );
}
