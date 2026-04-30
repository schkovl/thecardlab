import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { useState } from "react";
import { Search, Zap, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import wembyImg from "@/assets/cards/wemby.png";

export default function DealScreener() {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }
    
    setIsScanning(true);
    setResult(null);
    
    setTimeout(() => {
      setIsScanning(false);
      setResult({
        card: "2023 Prizm Victor Wembanyama Silver",
        image: wembyImg,
        askingPrice: 1500,
        shipping: 15,
        estValue: 1850,
        estGrade: "PSA 10",
        probability: 78,
        roi: 22.3,
        condition: {
          centering: { score: 9.5, status: "Excellent" },
          corners: { score: 9.0, status: "Good" },
          edges: { score: 9.5, status: "Excellent" },
          surface: { score: 9.0, status: "Good" }
        },
        notes: [
          "Slight left-to-right centering shift (~55/45)",
          "Surface appears clean, typical Prizm dimple near bottom border",
          "Bottom right corner shows minor whitening under magnification"
        ]
      });
      toast.success("Scan complete");
    }, 1800);
  };

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">AI Analysis</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Deal Screener</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Instantly analyze eBay, PWCC, or Goldin listings for grading potential and ROI.</p>
        </div>
      </div>

      <HoloCard className="mb-8">
        <form onSubmit={handleScan} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Listing URL</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste eBay, PWCC, or Goldin URL..." 
                className="w-full h-12 bg-white/5 border border-border rounded-xl pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button 
              type="submit" 
              disabled={isScanning}
              className="h-12 px-8 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center gap-2 shadow-[0_10px_30px_rgba(0,229,255,0.2)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:hover:translate-y-0 w-full md:w-auto justify-center"
            >
              {isScanning ? (
                <><span className="animate-spin">🌀</span> Scanning...</>
              ) : (
                <><Zap size={18} /> Analyze Listing</>
              )}
            </button>
          </div>
        </form>
      </HoloCard>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-1 space-y-6">
            <HoloCard className="flex flex-col items-center text-center p-6">
              <div className="w-48 h-64 rounded-xl overflow-hidden bg-muted/20 mb-6 shadow-2xl relative group">
                <img src={result.image} alt={result.card} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-sm font-bold">View Hi-Res</button>
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">{result.card}</h2>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6">
                <div>Asking: <span className="font-bold text-foreground">${result.askingPrice}</span></div>
                <div>Shipping: <span className="font-bold text-foreground">${result.shipping}</span></div>
              </div>
              <div className="w-full space-y-3">
                <button onClick={() => toast.success("Added to portfolio")} className="w-full h-11 rounded-xl bg-gradient-to-br from-primary to-secondary text-[#03111c] font-bold flex items-center justify-center gap-2">
                  Add to Portfolio
                </button>
                <button onClick={() => toast.success("Alert created")} className="w-full h-11 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors">
                  Watch for Price Drop
                </button>
              </div>
            </HoloCard>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <HoloCard>
                <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Est. Grade</div>
                <div className="text-[28px] font-black text-primary mt-1">{result.estGrade}</div>
                <Pill variant="teal" className="mt-2">{result.probability}% Confidence</Pill>
              </HoloCard>
              <HoloCard>
                <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Est. Value</div>
                <div className="text-[28px] font-black mt-1">${result.estValue}</div>
                <div className="text-xs text-muted-foreground mt-2">Post-grading</div>
              </HoloCard>
              <HoloCard>
                <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Total Cost</div>
                <div className="text-[28px] font-black mt-1">${result.askingPrice + result.shipping + 50}</div>
                <div className="text-xs text-muted-foreground mt-2">Incl. grading fees</div>
              </HoloCard>
              <HoloCard>
                <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Expected ROI</div>
                <div className="text-[28px] font-black text-secondary mt-1">+{result.roi}%</div>
                <div className="text-xs text-muted-foreground mt-2">Strong buy</div>
              </HoloCard>
            </div>

            <HoloCard>
              <h3 className="text-sm font-black uppercase tracking-wider mb-6">Condition Analysis</h3>
              <div className="space-y-5">
                {Object.entries(result.condition).map(([key, data]: [string, any]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="capitalize font-bold">{key}</span>
                      <span className="text-muted-foreground">{data.score}/10 • {data.status}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" 
                        style={{ width: `${(data.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </HoloCard>

            <HoloCard>
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-accent" /> AI Analyst Notes
              </h3>
              <ul className="space-y-3">
                {result.notes.map((note: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <AlertCircle size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{note}</span>
                  </li>
                ))}
              </ul>
            </HoloCard>
          </div>
        </div>
      )}
    </Shell>
  );
}
