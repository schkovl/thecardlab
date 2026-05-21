import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { TrendingUp, BellRing, Users, Activity, X, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useMarketPulse, useMarketTrending, type MarketSignal } from "@/hooks/useMarketData";

export default function Research() {
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [alertForm, setAlertForm] = useState({ card: "", type: "price_drop", threshold: "" });
  const { data: pulse } = useMarketPulse();
  const { data: trending } = useMarketTrending();

  const signals: MarketSignal[] = pulse?.signals ?? [];

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.card) { toast.error("Enter a card name"); return; }
    toast.success(`Alert created for "${alertForm.card}"`);
    setAlertForm({ card: "", type: "price_drop", threshold: "" });
    setShowNewAlert(false);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price_drop': return <TrendingUp className="rotate-180 text-secondary" size={18} />;
      case 'pop_update': return <Users className="text-primary" size={18} />;
      case 'market_trend': return <Activity className="text-accent" size={18} />;
      default: return <BellRing className="text-muted-foreground" size={18} />;
    }
  };

  return (
    <Shell>
      {showNewAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1a31] border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Create Alert</h2>
              <button onClick={() => setShowNewAlert(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Card Name *</label>
                <input value={alertForm.card} onChange={(e) => setAlertForm((f) => ({ ...f, card: e.target.value }))} placeholder="e.g. 2023 Prizm Wembanyama Silver RC" className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Alert Type</label>
                <select value={alertForm.type} onChange={(e) => setAlertForm((f) => ({ ...f, type: e.target.value }))} className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors">
                  <option value="price_drop" className="bg-[#0d1a31]">Price Drop</option>
                  <option value="pop_update" className="bg-[#0d1a31]">Pop Report Update</option>
                  <option value="market_trend" className="bg-[#0d1a31]">Market Trend</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Price Threshold ($)</label>
                <input type="number" min="0" value={alertForm.threshold} onChange={(e) => setAlertForm((f) => ({ ...f, threshold: e.target.value }))} placeholder="Alert me when price drops below…" className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors" />
              </div>
              <button type="submit" className="w-full h-10 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold hover:-translate-y-0.5 transition-transform">Create Alert</button>
            </form>
          </div>
        </div>
      )}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Market Intel</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Research & Alerts</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Real-time market signals, population report updates, and price action.</p>
        </div>
        <button onClick={() => setShowNewAlert(true)} className="h-10 px-5 rounded-xl bg-primary text-[#03111c] font-bold hover:brightness-110 transition-colors flex items-center gap-2">
          <BellRing size={16} /> New Alert
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <HoloCard>
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-sm font-black uppercase tracking-wider">Active Alerts & Signals</h2>
               <div className="flex gap-2">
                 <Pill variant="cyan" className="cursor-pointer">All</Pill>
                 <Pill variant="teal" className="opacity-50 cursor-pointer hover:opacity-100">Price Drops</Pill>
                 <Pill variant="gold" className="opacity-50 cursor-pointer hover:opacity-100">Pop Reports</Pill>
               </div>
            </div>

            <div className="space-y-4">
              {signals.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {pulse === undefined ? "Loading signals…" : "No signals at this time."}
                </div>
              )}
              {signals.map((signal, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-border hover:border-primary/30 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center shrink-0">
                    {getAlertIcon(signal.type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-foreground/90 font-medium leading-relaxed">{signal.message}</div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-primary font-bold">{signal.card}</span>
                      <span className="text-muted-foreground">• {signal.time}</span>
                    </div>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-xs font-bold text-muted-foreground hover:text-foreground">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </HoloCard>
        </div>

        <div className="space-y-6">
          <HoloCard>
            <h2 className="text-sm font-black uppercase tracking-wider mb-4">Trending Players</h2>
            <div className="space-y-3">
              {(trending?.players ?? []).length === 0 && (
                <div className="text-muted-foreground text-xs py-4 text-center">
                  {trending === undefined ? "Loading…" : "No data"}
                </div>
              )}
              {(trending?.players ?? []).map((player, i) => (
                <div key={player.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs font-bold w-4">{i + 1}</span>
                    <div>
                      <span className="text-sm font-bold">{player.name}</span>
                      <div className="text-xs text-muted-foreground">{player.reason}</div>
                    </div>
                  </div>
                  {player.trend === "+" ? (
                    <TrendingUp size={14} className="text-secondary shrink-0" />
                  ) : player.trend === "-" ? (
                    <TrendingDown size={14} className="text-destructive shrink-0" />
                  ) : (
                    <Minus size={14} className="text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </HoloCard>

          <HoloCard>
            <h2 className="text-sm font-black uppercase tracking-wider mb-4">Trending Sets</h2>
            <div className="space-y-3">
              {(trending?.sets ?? []).length === 0 && (
                <div className="text-muted-foreground text-xs py-4 text-center">
                  {trending === undefined ? "Loading…" : "No data"}
                </div>
              )}
              {(trending?.sets ?? []).map((set, i) => (
                <div key={set.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs font-bold w-4">{i + 1}</span>
                    <span className="text-sm font-bold truncate max-w-[150px]">{set.year} {set.name}</span>
                  </div>
                  {set.trend === "+" ? (
                    <TrendingUp size={14} className="text-secondary shrink-0" />
                  ) : set.trend === "-" ? (
                    <TrendingDown size={14} className="text-destructive shrink-0" />
                  ) : (
                    <Activity size={14} className="text-accent shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </HoloCard>
        </div>
      </div>
    </Shell>
  );
}
