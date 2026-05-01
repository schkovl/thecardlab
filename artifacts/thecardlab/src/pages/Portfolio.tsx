import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRight, Loader2, Trash2, X, Plus } from "lucide-react";
import { useState } from "react";
import { useUser } from "@clerk/react";
import { toast } from "sonner";
import {
  useListPortfolioHoldings,
  useCreatePortfolioHolding,
  useDeletePortfolioHolding,
  getListPortfolioHoldingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { portfolioHistory } from "@/data/portfolio";

const GRADES = ["Raw", "PSA 7", "PSA 8", "PSA 9", "PSA 10", "BGS 9", "BGS 9.5", "SGC 10"];

export default function Portfolio() {
  const { isSignedIn, isLoaded } = useUser();
  const qc = useQueryClient();

  const { data: holdings = [], isLoading, error } = useListPortfolioHoldings({
    query: { enabled: isLoaded && !!isSignedIn, queryKey: getListPortfolioHoldingsQueryKey() },
  });

  const createMutation = useCreatePortfolioHolding({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPortfolioHoldingsQueryKey() });
        toast.success("Card added to portfolio");
        setShowAdd(false);
        setForm({ card: "", grade: "PSA 9", cost: "", value: "" });
      },
      onError: () => toast.error("Failed to add card"),
    },
  });

  const deleteMutation = useDeletePortfolioHolding({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPortfolioHoldingsQueryKey() });
        toast.success("Card removed from portfolio");
      },
      onError: () => toast.error("Failed to remove card"),
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ card: "", grade: "PSA 9", cost: "", value: "" });

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalCost = holdings.reduce((s, h) => s + h.cost, 0);
  const totalGain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.card || !form.cost || !form.value) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      data: {
        card: form.card,
        grade: form.grade,
        cost: parseInt(form.cost, 10),
        value: parseInt(form.value, 10),
      },
    });
  };

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Analytics</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Portfolio & Comps</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Track your holdings, unrealized gains, and market comparables.</p>
        </div>
        {isSignedIn && (
          <button
            onClick={() => setShowAdd(true)}
            className="h-10 px-5 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Add Item
          </button>
        )}
      </div>

      {/* Add Item modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1a31] border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add to Portfolio</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Card Name *</label>
                <input
                  value={form.card}
                  onChange={(e) => setForm((f) => ({ ...f, card: e.target.value }))}
                  placeholder="e.g. 2023 Prizm Wembanyama Silver RC"
                  className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Grade</label>
                <select
                  value={form.grade}
                  onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                  className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g} className="bg-[#0d1a31]">{g}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Cost Basis ($) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cost}
                    onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                    placeholder="0"
                    className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Value ($) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    placeholder="0"
                    className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full h-10 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                Add to Portfolio
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <HoloCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Portfolio Value</div>
              <div className="text-[32px] font-black mt-1">
                ${totalValue.toLocaleString()}
                {totalCost > 0 && (
                  <span className={`text-base ml-3 ${totalGain >= 0 ? "text-secondary" : "text-destructive"}`}>
                    {totalGain >= 0 ? "+" : ""}{gainPct.toFixed(1)}% All Time
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
              {['1W', '1M', '3M', 'YTD', 'ALL'].map((tf, i) => (
                <button key={tf} className={`px-3 py-1 text-xs font-bold rounded-md ${i === 1 ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioHistory} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={['dataMin - 10000', 'dataMax + 10000']} hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1a31', borderColor: 'rgba(142,164,192,0.12)', borderRadius: '12px' }}
                  itemStyle={{ color: '#00e5ff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </HoloCard>

        <HoloCard>
          <h2 className="text-sm font-black uppercase tracking-wider mb-4">Top Movers</h2>
          {holdings.length > 0 ? (
            <div className="space-y-4">
              {[...holdings].sort((a, b) => b.gainPct - a.gainPct).slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="font-bold text-sm truncate">{item.card}</div>
                    <div className="text-xs text-muted-foreground">{item.grade}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm">${item.value.toLocaleString()}</div>
                    <div className="text-xs text-secondary flex items-center justify-end gap-0.5"><ArrowUpRight size={12}/> {item.gainPct.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No holdings yet.</p>
          )}
        </HoloCard>
      </div>

      <HoloCard className="p-0 overflow-hidden">
        {!isLoaded || isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : !isSignedIn ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Sign in to view your portfolio
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-destructive text-sm">
            Failed to load portfolio
          </div>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
            <p>No cards in your portfolio yet.</p>
            <button onClick={() => setShowAdd(true)} className="text-primary hover:underline font-bold">Add your first card</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border bg-white/5">
                  <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Asset</th>
                  <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Grade</th>
                  <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Cost Basis</th>
                  <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Current Value</th>
                  <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Total Return</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {holdings.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                    <td className="py-3 px-4 font-medium">{item.card}</td>
                    <td className="py-3 px-4">
                      <Pill variant={item.grade.includes('10') ? 'teal' : item.grade === 'Raw' ? 'violet' : 'cyan'}>{item.grade}</Pill>
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">${item.cost.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold">${item.value.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className={`font-bold ${item.gain >= 0 ? "text-secondary" : "text-destructive"}`}>
                        {item.gain >= 0 ? "+" : ""}${item.gain.toLocaleString()}
                      </div>
                      <div className={`text-xs ${item.gain >= 0 ? "text-secondary" : "text-destructive"}`}>{item.gainPct.toFixed(1)}%</div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => deleteMutation.mutate({ id: item.id })}
                        disabled={deleteMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HoloCard>
    </Shell>
  );
}
