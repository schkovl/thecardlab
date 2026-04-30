import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { mockPortfolio, portfolioHistory } from "@/data/portfolio";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRight } from "lucide-react";

export default function Portfolio() {
  const totalValue = mockPortfolio.reduce((sum, item) => sum + item.value, 0);
  const totalCost = mockPortfolio.reduce((sum, item) => sum + item.cost, 0);
  const totalGain = totalValue - totalCost;
  const gainPct = (totalGain / totalCost) * 100;

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Analytics</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Portfolio & Comps</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Track your holdings, unrealized gains, and market comparables.</p>
        </div>
        <button className="h-10 px-5 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors">Add Item</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <HoloCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Portfolio Value</div>
              <div className="text-[32px] font-black mt-1">
                ${totalValue.toLocaleString()} 
                <span className="text-secondary text-base ml-3">+{gainPct.toFixed(1)}% All Time</span>
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
          <div className="space-y-4">
            {mockPortfolio.sort((a, b) => b.gainPct - a.gainPct).slice(0, 4).map(item => (
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
        </HoloCard>
      </div>

      <HoloCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border bg-white/5">
                <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Asset</th>
                <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Grade</th>
                <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Cost Basis</th>
                <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Current Value</th>
                <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Total Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockPortfolio.map(item => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="py-3 px-4 font-medium">{item.card}</td>
                  <td className="py-3 px-4">
                    <Pill variant={item.grade.includes('10') ? 'teal' : item.grade === 'Raw' ? 'violet' : 'cyan'}>{item.grade}</Pill>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">${item.cost.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-bold">${item.value.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="text-secondary font-bold">+${item.gain.toLocaleString()}</div>
                    <div className="text-xs text-secondary">{item.gainPct.toFixed(1)}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HoloCard>
    </Shell>
  );
}
