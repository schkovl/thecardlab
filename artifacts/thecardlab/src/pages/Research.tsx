import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { mockAlerts } from "@/data/alerts";
import { TrendingUp, BellRing, Users, Activity } from "lucide-react";
import { toast } from "sonner";

export default function Research() {
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
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Market Intel</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Research & Alerts</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Real-time market signals, population report updates, and price action.</p>
        </div>
        <button onClick={() => toast("Create Alert dialog opened")} className="h-10 px-5 rounded-xl bg-primary text-[#03111c] font-bold hover:brightness-110 transition-colors flex items-center gap-2">
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
              {mockAlerts.map(alert => (
                <div key={alert.id} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-border hover:border-primary/30 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center shrink-0">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-foreground/90 font-medium leading-relaxed">{alert.message}</div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-primary font-bold">{alert.card}</span>
                      <span className="text-muted-foreground">• {alert.time}</span>
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
              {['Victor Wembanyama', 'Anthony Edwards', 'CJ Stroud', 'Elly De La Cruz', 'Shohei Ohtani'].map((player, i) => (
                <div key={player} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs font-bold w-4">{i + 1}</span>
                    <span className="text-sm font-bold">{player}</span>
                  </div>
                  <TrendingUp size={14} className="text-secondary" />
                </div>
              ))}
            </div>
          </HoloCard>
          
          <HoloCard>
            <h2 className="text-sm font-black uppercase tracking-wider mb-4">Trending Sets</h2>
            <div className="space-y-3">
              {['2023 Prizm Basketball', '2023 Select Football', '2024 Bowman Baseball'].map((set, i) => (
                <div key={set} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs font-bold w-4">{i + 1}</span>
                    <span className="text-sm font-bold truncate max-w-[150px]">{set}</span>
                  </div>
                  <Activity size={14} className="text-accent" />
                </div>
              ))}
            </div>
          </HoloCard>
        </div>
      </div>
    </Shell>
  );
}
