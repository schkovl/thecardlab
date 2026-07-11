import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { ShieldCheck, MapPin, Truck, Loader2, Lock, Crown, Info } from "lucide-react";
import { useUser } from "@/lib/auth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useListPortfolioHoldings, getListPortfolioHoldingsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { openModal } from "@/lib/modal-bus";
import { useSubscription } from "@/hooks/useSubscription";
import { useCurrency } from "@/hooks/useCurrency";

const VAULT_LOCATION = "Singapore Free Trade Zone";
const VAULT_SINCE = "2025";

export default function Vault() {
  usePageMeta("Global Vault — TheCardLab", "Secure premium storage for your graded assets. Avoid sales tax, reduce risk, and access your collection globally.");
  const { isSignedIn, isLoaded } = useUser();
  const { fmt, fmtSub } = useCurrency();
  const { isPro, loading: subLoading } = useSubscription();
  const isWhale = isPro; // Whale plan is a superset — backend sets isPro for all paid tiers

  const { data: holdings = [], isLoading } = useListPortfolioHoldings({
    query: { enabled: isLoaded && !!isSignedIn, queryKey: getListPortfolioHoldingsQueryKey() },
  });

  const gradedHoldings = holdings.filter(h =>
    h.grade && (h.grade.includes("PSA") || h.grade.includes("BGS") || h.grade.includes("SGC"))
  );

  const totalValue = gradedHoldings.reduce((acc, h) => acc + h.value, 0);
  const itemCount = gradedHoldings.length;

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Secure Storage</div>
          <h1 className="text-2xl lg:text-4xl font-display font-bold tracking-tight mb-2">Global Vault</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Secure storage for your premium graded assets. Contact us to get started.</p>
        </div>
        <Link href="/support">
          <button className="h-10 px-5 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center gap-2 shadow-[0_10px_30px_rgba(0,229,255,0.2)]">
            <Truck size={16} /> Request Vault Access
          </button>
        </Link>
      </div>

      {!subLoading && !isWhale && isSignedIn && (
        <div className="mb-6 rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Crown size={24} className="text-[#a78bfa] shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-sm text-white mb-0.5">Global Vault requires the Whale plan</div>
            <div className="text-xs text-muted-foreground">Physical secure storage, climate-controlled, and insured. Available to Whale subscribers only.</div>
          </div>
          <button
            onClick={() => openModal("pricing")}
            className="shrink-0 h-9 px-5 rounded-xl bg-[#7c3aed] text-white font-bold text-sm hover:bg-[#6d28d9] transition-colors flex items-center gap-2"
          >
            <Crown size={14} /> Upgrade to Whale
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <HoloCard>
          <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Vaulted Value</div>
          <div className="text-[32px] font-black mt-1">
            {isLoaded && isSignedIn ? (
              <>
                {fmt(totalValue)}
                {fmtSub(totalValue) && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">{fmtSub(totalValue)}</span>
                )}
              </>
            ) : "—"}
          </div>
          <div className="text-xs text-secondary mt-2 flex items-center gap-1">
            <ShieldCheck size={14} /> Secure Storage
          </div>
        </HoloCard>
        <HoloCard>
          <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Items Stored</div>
          <div className="text-[32px] font-black mt-1">
            {isLoaded && isSignedIn ? itemCount : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {itemCount > 0 ? "Graded slabs eligible for vault" : "Graded slabs in your portfolio"}
          </div>
        </HoloCard>
        <HoloCard className="border-primary/30 bg-primary/5">
          <div className="flex items-center gap-1.5">
            <div className="text-xs font-black text-primary tracking-[0.5px] uppercase">Est. Tax Savings</div>
            <div className="group relative">
              <Info size={12} className="text-primary/50 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl bg-[#0d1a31] border border-border p-3 text-xs text-muted-foreground shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Holding slabs in a Free Trade Zone may defer sales tax on resale. Estimated at 8% of vaulted value. Not tax advice.
              </div>
            </div>
          </div>
          <div className="text-[32px] font-black text-primary mt-1">
            {isLoaded && isSignedIn ? fmt(Math.round(totalValue * 0.08)) : "—"}
          </div>
          <div className="text-xs text-primary/80 mt-2">Based on portfolio graded value</div>
        </HoloCard>
      </div>

      <h2 className="text-lg font-bold mb-4">Your Vaulted Assets</h2>

      {!isLoaded || isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : !isSignedIn ? (
        <HoloCard className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <Lock size={36} className="text-primary/40" />
          <p className="text-muted-foreground font-bold">Sign in to view your vault</p>
          <p className="text-sm text-muted-foreground/60 max-w-xs">
            Your graded slabs from your portfolio appear here as vault-eligible assets.
          </p>
          <Link href="/sign-in">
            <button className="mt-2 text-primary hover:underline font-bold text-sm">Sign in</button>
          </Link>
        </HoloCard>
      ) : gradedHoldings.length === 0 ? (
        <HoloCard className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <ShieldCheck size={36} className="text-primary/40" />
          <p className="text-muted-foreground font-bold">No graded assets in your portfolio yet</p>
          <p className="text-sm text-muted-foreground/60 max-w-xs">
            Add PSA, BGS, or SGC graded cards to your portfolio — they'll appear here as vault-eligible.
          </p>
          <Link href="/portfolio">
            <button className="mt-2 text-primary hover:underline font-bold text-sm">Go to Portfolio</button>
          </Link>
        </HoloCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gradedHoldings.map(item => (
            <HoloCard key={item.id} className="flex gap-4 p-4">
              <div className="w-20 h-28 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-black/60 shrink-0 flex items-center justify-center">
                <div className="text-3xl">🃏</div>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm leading-tight pr-4">{item.card}</h3>
                    <Pill variant="cyan" className="shrink-0">{item.grade}</Pill>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={12} /> {VAULT_LOCATION} • Since {VAULT_SINCE}
                  </div>
                </div>
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Current Value</div>
                    <div className="font-bold">{fmt(item.value)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/support">
                      <button className="text-xs font-bold text-foreground hover:text-primary transition-colors">
                        Contact Support
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </HoloCard>
          ))}
        </div>
      )}
    </Shell>
  );
}
