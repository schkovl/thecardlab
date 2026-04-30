import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { mockRestoration } from "@/data/restoration";
import { Wrench, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Restoration() {
  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Expert Services</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Restoration Lab</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Professional cleaning, pressing, and re-holdering to maximize grading potential.</p>
        </div>
        <button onClick={() => toast("Service request started")} className="h-10 px-5 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center gap-2 shadow-[0_10px_30px_rgba(0,229,255,0.2)]">
          <Wrench size={16} /> Request Service
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <HoloCard>
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-4">
            <Sparkles size={20} />
          </div>
          <h3 className="font-bold mb-2">Ultrasonic Cleaning</h3>
          <p className="text-sm text-muted-foreground mb-4">Removes surface wax, fingerprints, and minor blemishes without damaging the gloss.</p>
          <div className="text-lg font-black text-primary">$15 <span className="text-xs font-normal text-muted-foreground">/card</span></div>
        </HoloCard>
        <HoloCard>
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent mb-4">
             <div className="font-black text-xl">P</div>
          </div>
          <h3 className="font-bold mb-2">Micro-Pressing</h3>
          <p className="text-sm text-muted-foreground mb-4">Flattens minor indentations, edge waves, and restores overall structural integrity.</p>
          <div className="text-lg font-black text-accent">$25 <span className="text-xs font-normal text-muted-foreground">/card</span></div>
        </HoloCard>
        <HoloCard>
          <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary mb-4">
             <div className="font-black text-xl">R</div>
          </div>
          <h3 className="font-bold mb-2">Re-holdering</h3>
          <p className="text-sm text-muted-foreground mb-4">Cracking out of old cases and prep for modern grading submissions.</p>
          <div className="text-lg font-black text-secondary">$10 <span className="text-xs font-normal text-muted-foreground">/card</span></div>
        </HoloCard>
      </div>

      <h2 className="text-lg font-bold mb-4">Active Projects</h2>
      <div className="grid grid-cols-1 gap-4">
        {mockRestoration.map(item => (
          <HoloCard key={item.id} className="p-4 flex flex-col md:flex-row gap-6 items-center">
            <div className="w-16 h-24 rounded-lg overflow-hidden bg-black/40 shrink-0">
              <img src={item.image} alt={item.card} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 w-full">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">ID: {item.id}</div>
                  <h3 className="font-bold">{item.card}</h3>
                </div>
                <Pill variant="gold">{item.status}</Pill>
              </div>
              <div className="text-sm mb-4">Service: <span className="font-medium text-foreground/90">{item.service}</span></div>
              
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-accent rounded-full w-[60%] animate-pulse"></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Received</span>
                <span>Est. {item.estCompletion}</span>
              </div>
            </div>
          </HoloCard>
        ))}
      </div>
    </Shell>
  );
}
