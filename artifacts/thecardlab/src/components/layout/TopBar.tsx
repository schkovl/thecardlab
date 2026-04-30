import { Search, Sparkles, Bell, Download, Check } from "lucide-react";
import { toast } from "sonner";
import { openModal } from "@/lib/modal-bus";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function TopBar() {
  const { installed } = usePwaInstall();

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

        <div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[#03111c] font-black text-sm cursor-pointer ml-2"
          data-testid="avatar-user"
        >
          AC
        </div>
      </div>
    </header>
  );
}
