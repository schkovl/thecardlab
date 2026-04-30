import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import wembyImg from "@/assets/cards/wemby.png";
import { CheckCircle2, Crosshair, AlertTriangle } from "lucide-react";

export default function GradeLab() {
  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Pre-Submission</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Grade Lab</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">High-resolution centering overlays and surface defect detection.</p>
        </div>
        <div className="flex gap-3">
          <button className="h-10 px-5 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors">Upload Scans</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <HoloCard className="p-0 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-border bg-white/5 flex justify-between items-center">
              <div className="font-bold text-sm">Front Scan Analysis</div>
              <div className="flex gap-2">
                <button className="p-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30"><Crosshair size={16}/></button>
              </div>
            </div>
            <div className="flex-1 bg-black/50 relative flex items-center justify-center p-8 overflow-hidden group">
              <img src={wembyImg} alt="Card" className="h-full object-contain shadow-2xl relative z-10" />
              
              {/* Centering Overlay Simulation */}
              <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="w-full border-t-2 border-primary/50 border-dashed absolute top-[10%] left-0"></div>
                 <div className="w-full border-b-2 border-primary/50 border-dashed absolute bottom-[10%] left-0"></div>
                 <div className="h-full border-l-2 border-primary/50 border-dashed absolute left-[10%] top-0"></div>
                 <div className="h-full border-r-2 border-primary/50 border-dashed absolute right-[10%] top-0"></div>
                 
                 <div className="absolute top-[5%] left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs font-mono text-primary">55% / 45%</div>
              </div>
            </div>
          </HoloCard>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <HoloCard>
             <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1">2023 Prizm Victor Wembanyama Silver</h2>
                <div className="text-sm text-muted-foreground">Analysis completed 2 mins ago</div>
              </div>
              <Pill variant="teal" className="text-sm px-3 py-1.5">PSA 10 Likely</Pill>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-xl bg-white/5 border border-border">
                <div className="text-[32px] font-black text-primary mb-1">78%</div>
                <div className="text-xs font-bold text-muted-foreground uppercase">PSA 10 Prob.</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5 border border-border">
                <div className="text-[32px] font-black text-foreground mb-1">20%</div>
                <div className="text-xs font-bold text-muted-foreground uppercase">PSA 9 Prob.</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5 border border-border">
                <div className="text-[32px] font-black text-muted-foreground mb-1">2%</div>
                <div className="text-xs font-bold text-muted-foreground uppercase">PSA 8 Prob.</div>
              </div>
            </div>

            <h3 className="text-sm font-black uppercase tracking-wider mb-4">Defect Log</h3>
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-border">
                <AlertTriangle size={18} className="text-accent shrink-0" />
                <div className="flex-1 text-sm">Minor print line on refractor surface (Right edge, mid)</div>
                <Pill variant="gold">-0.5 Surf</Pill>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-border">
                <CheckCircle2 size={18} className="text-secondary shrink-0" />
                <div className="flex-1 text-sm">Corners are sharp under 10x magnification</div>
                <Pill variant="teal">10.0 Corn</Pill>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
              <h4 className="font-bold text-primary mb-2">Recommendation: Submit to PSA</h4>
              <p className="text-sm text-foreground/80 mb-4">High probability of gem mint. Expected value increase of $1,200 post-grading. Processing time is currently estimated at 45 days for standard tier.</p>
              <button className="h-10 px-6 rounded-lg bg-primary text-[#03111c] font-bold text-sm hover:brightness-110 transition-all">Start PSA Submission</button>
            </div>
          </HoloCard>
        </div>
      </div>
    </Shell>
  );
}
