import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { CardDetailModal, type CardDetail } from "@/components/cards/CardDetailModal";
import { TrendingUp, BellRing, Users, Activity, X, TrendingDown, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useQueryClient } from "@tanstack/react-query";
import { useMarketPulse, useMarketTrending, type MarketSignal } from "@/hooks/useMarketData";
import {
  useListAlerts,
  getListAlertsQueryKey,
  useCreateAlert,
  useDeleteAlert,
} from "@workspace/api-client-react";

type AlertFilter = "all" | "price_drop" | "pop_update";

function getAlertIcon(type: string) {
  switch (type) {
    case "price_drop": return <TrendingDown className="text-secondary" size={18} />;
    case "pop_update": return <Users className="text-primary" size={18} />;
    case "market_trend": return <Activity className="text-accent" size={18} />;
    default: return <BellRing className="text-muted-foreground" size={18} />;
  }
}

function getSignalIcon(type: string) {
  switch (type) {
    case "price_drop": return <TrendingDown className="text-destructive" size={18} />;
    case "pop_update": return <Users className="text-primary" size={18} />;
    default: return <Activity className="text-accent" size={18} />;
  }
}

export default function Research() {
  usePageMeta("Research & Alerts — TheCardLab", "Real-time market signals, population report updates, and price action alerts for sports cards and Pokémon TCG.");
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [alertForm, setAlertForm] = useState<{
    card: string;
    type: "price_drop" | "pop_update" | "market_trend";
    threshold: string;
  }>({ card: "", type: "price_drop", threshold: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const card = params.get("card");
    const openAlert = params.get("openAlert");
    if (card && openAlert === "1") {
      setAlertForm((f) => ({ ...f, card }));
      setShowNewAlert(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);

  const qc = useQueryClient();
  const { data: pulse } = useMarketPulse();
  const { data: trending, isLoading: trendingLoading, isError: trendingError } = useMarketTrending();
  const { data: userAlerts = [] } = useListAlerts({
    query: { queryKey: getListAlertsQueryKey() },
  });

  const createAlert = useCreateAlert({
    mutation: {
      onSuccess: () => {
        toast.success(`Alert created for "${alertForm.card}"`);
        setAlertForm({ card: "", type: "price_drop", threshold: "" });
        setShowNewAlert(false);
        qc.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      },
      onError: () => toast.error("Failed to create alert"),
    },
  });

  const deleteAlert = useDeleteAlert({
    mutation: {
      onSuccess: () => {
        toast.success("Alert dismissed");
        qc.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      },
      onError: () => toast.error("Failed to dismiss alert"),
    },
  });

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.card.trim()) { toast.error("Enter a card name"); return; }
    createAlert.mutate({
      data: {
        cardName: alertForm.card.trim(),
        alertType: alertForm.type,
        thresholdPrice: alertForm.threshold ? Number(alertForm.threshold) : undefined,
      },
    });
  };

  // Merge market signals + user-created alerts into one feed
  const marketSignals: MarketSignal[] = pulse?.signals ?? [];
  const combinedAlerts: Array<{
    id: string;
    type: string;
    card: string;
    message: string;
    time: string;
    isUserAlert?: boolean;
  }> = [
    ...userAlerts.map((a) => ({
      id: a.id,
      type: a.alertType,
      card: a.cardName,
      message: a.thresholdPrice
        ? `Alert: ${a.cardName} below $${a.thresholdPrice}`
        : `Watching ${a.cardName} for ${a.alertType.replace("_", " ")} signals`,
      time: new Date(a.createdAt).toLocaleDateString(),
      isUserAlert: true,
    })),
    ...marketSignals.map((s, i) => ({
      id: `signal-${i}`,
      type: s.type,
      card: s.card,
      message: s.message,
      time: s.time,
      isUserAlert: false,
    })),
  ];

  const filteredAlerts = combinedAlerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "pop_update") return a.type === "pop_update";
    if (filter === "price_drop") return a.type === "price_drop";
    return true;
  });

  return (
    <Shell>
      {showNewAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1a31] border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Create Alert</h2>
              <button onClick={() => setShowNewAlert(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Card Name *</label>
                <input
                  value={alertForm.card}
                  onChange={(e) => setAlertForm((f) => ({ ...f, card: e.target.value }))}
                  placeholder="e.g. 2023 Prizm Wembanyama Silver RC"
                  className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Alert Type</label>
                <select
                  value={alertForm.type}
                  onChange={(e) => setAlertForm((f) => ({ ...f, type: e.target.value as typeof alertForm.type }))}
                  className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="price_drop" className="bg-[#0d1a31]">Price Drop</option>
                  <option value="pop_update" className="bg-[#0d1a31]">Pop Report Update</option>
                  <option value="market_trend" className="bg-[#0d1a31]">Market Trend</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Price Threshold ($)</label>
                <input
                  type="number"
                  min="0"
                  value={alertForm.threshold}
                  onChange={(e) => setAlertForm((f) => ({ ...f, threshold: e.target.value }))}
                  placeholder="Alert me when price drops below…"
                  className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={createAlert.isPending}
                className="w-full h-10 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createAlert.isPending ? "Creating…" : "Create Alert"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Market Intel</div>
          <h1 className="text-2xl lg:text-4xl font-display font-bold tracking-tight mb-2">Research & Alerts</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Real-time market signals, population report updates, and price action.</p>
        </div>
        <button
          onClick={() => setShowNewAlert(true)}
          className="shrink-0 h-10 px-4 lg:px-5 rounded-xl bg-primary text-[#03111c] font-bold hover:brightness-110 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /><span className="hidden sm:inline">New Alert</span><span className="sm:hidden">Alert</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <HoloCard>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-sm font-black uppercase tracking-wider">Active Alerts & Signals</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFilter("all")}>
                  <Pill variant="cyan" className={filter !== "all" ? "opacity-40 hover:opacity-70" : ""}>All</Pill>
                </button>
                <button onClick={() => setFilter("price_drop")}>
                  <Pill variant="teal" className={filter !== "price_drop" ? "opacity-40 hover:opacity-70" : ""}>Price Drops</Pill>
                </button>
                <button onClick={() => setFilter("pop_update")}>
                  <Pill variant="gold" className={filter !== "pop_update" ? "opacity-40 hover:opacity-70" : ""}>Pop Reports</Pill>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredAlerts.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {filter !== "all" ? "No alerts match this filter." : pulse === undefined ? "Loading signals…" : "No signals at this time. Create an alert to get started."}
                </div>
              )}
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => setSelectedCard({ title: alert.card, subtitle: alert.message, recommendation: alert.type === "price_drop" ? "Submit" : "Manual Review" })}
                  className="flex gap-4 p-4 rounded-xl bg-white/5 border border-border hover:border-primary/30 transition-colors group cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${alert.isUserAlert ? "bg-primary/10 border border-primary/20" : "bg-black/40"}`}>
                    {alert.isUserAlert ? getAlertIcon(alert.type) : getSignalIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      {alert.isUserAlert && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 shrink-0">MY ALERT</span>
                      )}
                      <div className="text-sm text-foreground/90 font-medium leading-relaxed">{alert.message}</div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-primary font-bold truncate">{alert.card}</span>
                      <span className="text-muted-foreground shrink-0">• {alert.time}</span>
                    </div>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {alert.isUserAlert ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAlert.mutate({ id: alert.id }); }}
                        className="text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Dismiss
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">Live</span>
                    )}
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
                  {trendingLoading ? "Loading…" : trendingError ? "Data unavailable" : "No trending players"}
                </div>
              )}
              {(trending?.players ?? []).map((player, i) => (
                <div
                  key={player.name}
                  onClick={() => setSelectedCard({ title: player.name, subtitle: player.reason, recommendation: player.trend === "-" ? "Pass" : "Submit" })}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                >
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
                  {trendingLoading ? "Loading…" : trendingError ? "Data unavailable" : "No trending sets"}
                </div>
              )}
              {(trending?.sets ?? []).map((set, i) => (
                <div
                  key={set.name}
                  onClick={() => setSelectedCard({ title: `${set.year} ${set.name}`, subtitle: "Trending Set", recommendation: set.trend === "-" ? "Pass" : "Submit" })}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                >
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

      <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
    </Shell>
  );
}
