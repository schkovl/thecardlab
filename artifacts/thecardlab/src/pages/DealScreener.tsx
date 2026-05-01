import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { useState } from "react";
import { Search, Zap, AlertTriangle, AlertCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import wembyImg from "@/assets/cards/wemby.png";
import { useUser } from "@clerk/react";
import {
  useCreateScanResult,
  useCreatePortfolioHolding,
  useListScanResults,
  getListScanResultsQueryKey,
  getListPortfolioHoldingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type ScanData = {
  card: string;
  image: string;
  askingPrice: number;
  shipping: number;
  estValue: number;
  estGrade: string;
  probability: number;
  roi: number;
  condition: Record<string, { score: number; status: string }>;
  notes: string[];
};

export default function DealScreener() {
  const { isSignedIn } = useUser();
  const qc = useQueryClient();

  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanData | null>(null);
  const [addedToPortfolio, setAddedToPortfolio] = useState(false);

  const { data: scanHistory = [] } = useListScanResults({
    query: { enabled: !!isSignedIn, queryKey: getListScanResultsQueryKey() },
  });

  const saveScanMutation = useCreateScanResult({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListScanResultsQueryKey() });
      },
    },
  });

  const addToPortfolioMutation = useCreatePortfolioHolding({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPortfolioHoldingsQueryKey() });
        toast.success("Added to portfolio");
        setAddedToPortfolio(true);
      },
      onError: () => toast.error("Failed to add to portfolio"),
    },
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsScanning(true);
    setResult(null);
    setAddedToPortfolio(false);

    setTimeout(() => {
      const scanResult: ScanData = {
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
      };

      setIsScanning(false);
      setResult(scanResult);
      toast.success("Scan complete");

      if (isSignedIn) {
        saveScanMutation.mutate({
          data: {
            cardName: scanResult.card,
            askingPrice: scanResult.askingPrice,
            shipping: scanResult.shipping,
            estValue: scanResult.estValue,
            estGrade: scanResult.estGrade,
            probability: scanResult.probability,
            roi: scanResult.roi,
          },
        });
      }
    }, 1800);
  };

  const handleAddToPortfolio = () => {
    if (!result) return;
    if (!isSignedIn) {
      toast.error("Sign in to add to your portfolio");
      return;
    }
    addToPortfolioMutation.mutate({
      data: {
        card: result.card,
        grade: result.estGrade,
        cost: result.askingPrice + result.shipping,
        value: result.estValue,
      },
    });
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
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
                <button
                  onClick={handleAddToPortfolio}
                  disabled={addToPortfolioMutation.isPending || addedToPortfolio}
                  className="w-full h-11 rounded-xl bg-gradient-to-br from-primary to-secondary text-[#03111c] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {addToPortfolioMutation.isPending ? (
                    <><Loader2 size={16} className="animate-spin" /> Adding...</>
                  ) : addedToPortfolio ? (
                    "✓ Added to Portfolio"
                  ) : (
                    "Add to Portfolio"
                  )}
                </button>
                <button
                  onClick={() => toast.success("Alert created")}
                  className="w-full h-11 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors"
                >
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
                {Object.entries(result.condition).map(([key, data]) => (
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
                {result.notes.map((note, i) => (
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

      {/* Scan History */}
      {isSignedIn && scanHistory.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock size={18} className="text-primary" /> Scan History
          </h2>
          <HoloCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-white/5">
                    <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Card</th>
                    <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Grade</th>
                    <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Est. Value</th>
                    <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">ROI</th>
                    <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Scanned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scanHistory.map((scan) => (
                    <tr key={scan.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-medium">{scan.cardName}</td>
                      <td className="py-3 px-4">
                        {scan.estGrade ? (
                          <Pill variant={scan.estGrade.includes('10') ? 'teal' : 'cyan'}>{scan.estGrade}</Pill>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {scan.estValue ? `$${scan.estValue.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-secondary font-bold">
                        {scan.roi != null ? `+${scan.roi}%` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </HoloCard>
        </div>
      )}
    </Shell>
  );
}
