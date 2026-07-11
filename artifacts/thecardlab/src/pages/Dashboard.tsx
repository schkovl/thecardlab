import { Shell } from "@/components/layout/Shell";
import { KpiCard } from "@/components/cards/KpiCard";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { Zap, ArrowRight, ScanLine, LayoutGrid, FlaskConical, Plus } from "lucide-react";
import { Link } from "wouter";
import { useUser } from "@/lib/auth";
import { useListPortfolioHoldings, getListPortfolioHoldingsQueryKey } from "@workspace/api-client-react";
import { useMarketPulse } from "@/hooks/useMarketData";
import { useCurrency } from "@/hooks/useCurrency";
import { usePageMeta } from "@/hooks/usePageMeta";

function EmptyDashboard({ firstName }: { firstName?: string | null }) {
  return (
    <div className="space-y-6">
      <HoloCard className="p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
          <FlaskConical size={28} className="text-primary" />
        </div>
        <h2 className="text-2xl font-display font-black mb-2">
          Welcome{firstName ? `, ${firstName}` : ""} — let's build your collection
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
          Your dashboard will populate as you scan deals, add cards, and track submissions. Start with any of the tools below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <Link href="/deal-screener">
            <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group">
              <ScanLine size={22} className="text-primary mb-3" />
              <div className="font-bold text-sm mb-1">Scan a Deal</div>
              <div className="text-xs text-muted-foreground">Paste an eBay listing for instant AI grade and ROI analysis.</div>
              <div className="flex items-center gap-1 text-xs text-primary font-bold mt-3 group-hover:gap-2 transition-all">
                Open Deal Screener <ArrowRight size={12} />
              </div>
            </div>
          </Link>
          <Link href="/portfolio">
            <div className="p-5 rounded-xl border border-secondary/20 bg-secondary/5 hover:bg-secondary/10 transition-colors cursor-pointer group">
              <LayoutGrid size={22} className="text-secondary mb-3" />
              <div className="font-bold text-sm mb-1">Add Your First Card</div>
              <div className="text-xs text-muted-foreground">Track cards you own with live market valuations and gain/loss.</div>
              <div className="flex items-center gap-1 text-xs text-secondary font-bold mt-3 group-hover:gap-2 transition-all">
                Open Portfolio <ArrowRight size={12} />
              </div>
            </div>
          </Link>
          <Link href="/grade-lab">
            <div className="p-5 rounded-xl border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer group">
              <FlaskConical size={22} className="text-accent mb-3" />
              <div className="font-bold text-sm mb-1">Grade a Card</div>
              <div className="text-xs text-muted-foreground">Upload front and back photos to check centering, defects, and live comp ranges.</div>
              <div className="flex items-center gap-1 text-xs text-accent font-bold mt-3 group-hover:gap-2 transition-all">
                Open Grade Lab <ArrowRight size={12} />
              </div>
            </div>
          </Link>
        </div>
      </HoloCard>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { data: pulse } = useMarketPulse();
  const { fmt, fmtK } = useCurrency();

  const { data: holdings = [], isLoading } = useListPortfolioHoldings({
    query: {
      enabled: isLoaded && !!user,
      queryKey: getListPortfolioHoldingsQueryKey(),
    },
  });

  const isNewUser = isLoaded && !isLoading && holdings.length === 0;

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.cost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(1) : null;

  const gradedHoldings = holdings.filter(h => h.grade !== "Raw");
  const avgGradingRoi =
    gradedHoldings.length > 0
      ? (gradedHoldings.reduce((sum, h) => sum + h.gainPct, 0) / gradedHoldings.length).toFixed(1)
      : null;

  const recentHoldings = [...holdings].reverse().slice(0, 4);

  usePageMeta(
    "Dashboard — TheCardLab",
    "Your AI-powered command center for sports card research, grading, and portfolio management."
  );

  const firstName = user?.firstName ?? null;
  const displayName = firstName ?? user?.username ?? "Member";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">
            {isLoaded && user ? `${greeting}, ${displayName}` : "TheCardLab"}
          </div>
          <h1 className="text-2xl lg:text-4xl font-display font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Your AI-powered command center for sports card research, grading, and portfolio management.
          </p>
        </div>
        <Link href="/deal-screener">
          <button className="h-10 px-5 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center gap-2 shadow-[0_10px_30px_rgba(0,229,255,0.2)] hover:-translate-y-0.5 transition-transform">
            <Zap size={16} /> Quick Scan
          </button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white/5 border border-border animate-pulse" />
          ))}
        </div>
      ) : isNewUser ? null : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="TOTAL PORTFOLIO VALUE"
            value={totalValue > 0 ? fmt(totalValue) : fmt(0)}
            trend={totalGainPct ? `${totalGainPct}%` : undefined}
            trendUp={totalGain >= 0}
            subtitle={totalGain !== 0 ? `${totalGain >= 0 ? "+" : "-"}${fmtK(Math.abs(totalGain))} unrealized` : "Add cards to track value"}
          />
          <KpiCard
            title="CARDS TRACKED"
            value={String(holdings.length)}
            subtitle={`${gradedHoldings.length} graded · ${holdings.length - gradedHoldings.length} raw`}
            valueColor="text-foreground"
          />
          <KpiCard
            title="GRADING ROI"
            value={avgGradingRoi ? `${avgGradingRoi}%` : "—"}
            valueColor="text-accent"
            subtitle={gradedHoldings.length > 0 ? `Avg across ${gradedHoldings.length} graded card${gradedHoldings.length > 1 ? "s" : ""}` : "No graded cards yet"}
          />
          <KpiCard
            title="TOTAL GAIN / LOSS"
            value={totalCost > 0 ? `${totalGain >= 0 ? "+" : "-"}${fmt(Math.abs(totalGain))}` : "—"}
            valueColor={totalGain >= 0 ? "text-secondary" : "text-destructive"}
            subtitle={totalCost > 0 ? `Cost basis ${fmt(totalCost)}` : "Track cost to see gains"}
          />
        </div>
      )}

      {isNewUser ? (
        <EmptyDashboard firstName={firstName} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <HoloCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-[#edf6ff]">Recent Holdings</h2>
                <Link href="/portfolio" className="text-xs text-primary hover:underline flex items-center gap-1 font-bold">
                  View All <ArrowRight size={12} />
                </Link>
              </div>

              {recentHoldings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">No cards added yet.</p>
                  <Link href="/portfolio">
                    <button className="h-9 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-sm hover:bg-primary/20 transition-colors flex items-center gap-2 mx-auto">
                      <Plus size={14} /> Add First Card
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentHoldings.map(h => (
                    <div key={h.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-border cursor-pointer group">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <LayoutGrid size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate mb-0.5 text-foreground/90">{h.card}</div>
                        <div className="text-xs text-muted-foreground">{h.grade}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm">{fmt(h.value)}</div>
                        <div className={`text-xs font-bold ${h.gain >= 0 ? "text-secondary" : "text-destructive"}`}>
                          {h.gain >= 0 ? "+" : "-"}{fmt(Math.abs(h.gain))} ({h.gainPct}%)
                        </div>
                      </div>
                      <Pill variant={h.grade.startsWith("PSA 10") ? "teal" : h.grade === "Raw" ? "gold" : "cyan"} className="ml-2">
                        {h.grade}
                      </Pill>
                    </div>
                  ))}
                </div>
              )}
            </HoloCard>
          </div>

          <div className="space-y-6">
            <HoloCard>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#edf6ff] mb-4">Market Pulse</h2>
              <div className="bg-white/5 rounded-xl p-4 border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-muted-foreground">TCL INDEX</span>
                  <Pill variant={pulse?.sentiment === "BEARISH" ? "red" : pulse?.sentiment === "BULLISH" ? "teal" : "gold"}>
                    {pulse?.sentiment ?? "—"}
                  </Pill>
                </div>
                <div className="text-2xl font-black mb-4">
                  {pulse?.index != null ? pulse.index.toLocaleString() : "—"}
                  {pulse?.change7d != null && (
                    <span className={`text-sm ml-2 ${pulse.change7d >= 0 ? "text-secondary" : "text-destructive"}`}>
                      {pulse.change7d >= 0 ? "▲" : "▼"} {Math.abs(pulse.change7d)}%
                    </span>
                  )}
                </div>
                <div className="space-y-3 mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Volume (24h)</span>
                    <span className="font-bold">{pulse?.volume24h ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Top Mover</span>
                    <span className="font-bold text-accent">
                      {pulse?.topMover ? `${pulse.topMover} ${pulse.topMoverChange ?? ""}` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </HoloCard>
          </div>
        </div>
      )}
    </Shell>
  );
}
