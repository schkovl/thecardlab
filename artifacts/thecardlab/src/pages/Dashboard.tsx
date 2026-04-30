import { Shell } from "@/components/layout/Shell";
import { KpiCard } from "@/components/cards/KpiCard";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { mockScans } from "@/data/scans";
import { Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Dashboard() {
  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Phase 1 • Core Platform</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">TheCardLab Dashboard</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Your complete AI-powered command center for sports card research, grading, and portfolio management.</p>
        </div>
        <button onClick={() => toast("Starting Quick Scan...")} className="h-10 px-5 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center gap-2 shadow-[0_10px_30px_rgba(0,229,255,0.2)] hover:-translate-y-0.5 transition-transform">
          <Zap size={16} /> Quick Scan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard 
          title="TOTAL PORTFOLIO VALUE" 
          value="$278,420" 
          trend="12.4%" trendUp 
          subtitle="vs last 30 days • $32,840 unrealized" 
        />
        <KpiCard 
          title="RAW OPPORTUNITIES" 
          value="127" 
          subtitle="+18 this week" 
          valueColor="text-foreground"
        />
        <KpiCard 
          title="GRADING ROI" 
          value="38.6%" 
          valueColor="text-accent"
          subtitle="Avg. ROI per submission • Top 18% of Pro users" 
        />
        <KpiCard 
          title="AI ACCURACY" 
          value="92.7%" 
          valueColor="text-primary"
          subtitle="Based on 1,420 graded items matching prediction" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <HoloCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#edf6ff]">Recent AI Scans</h2>
              <Link href="/deal-screener" className="text-xs text-primary hover:underline flex items-center gap-1 font-bold">View All <ArrowRight size={12}/></Link>
            </div>
            <div className="space-y-3">
              {mockScans.slice(0, 4).map((scan) => (
                <div key={scan.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-border cursor-pointer group">
                  <div className="w-12 h-16 rounded overflow-hidden bg-muted/20 shrink-0">
                    <img src={scan.image} alt={scan.card} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate mb-1 text-foreground/90">{scan.card}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{scan.date}</span>
                      <span>•</span>
                      <span className="text-foreground">{scan.condition}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Pill variant="cyan" className="mb-1">{scan.expectedGrade}</Pill>
                    <div className="text-xs font-bold text-secondary">{scan.expectedValue} Est.</div>
                  </div>
                </div>
              ))}
            </div>
          </HoloCard>
        </div>

        <div className="space-y-6">
           <HoloCard>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#edf6ff] mb-4">Market Pulse</h2>
            <div className="bg-white/5 rounded-xl p-4 border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-muted-foreground">TCL INDEX (BASKETBALL)</span>
                <Pill variant="teal">BULLISH</Pill>
              </div>
              <div className="text-2xl font-black mb-4">1,482.40 <span className="text-sm text-secondary ml-2">▲ 2.4%</span></div>
              
              <div className="space-y-3 mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Volume (24h)</span>
                  <span className="font-bold">$4.2M</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Top Mover</span>
                  <span className="font-bold text-accent">Ant. Edwards</span>
                </div>
              </div>
            </div>
          </HoloCard>
        </div>
      </div>
    </Shell>
  );
}
