import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { useState } from "react";
import { Search, Zap, AlertTriangle, AlertCircle, Clock, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/auth";
import { useLocation } from "wouter";
import { useCurrency } from "@/hooks/useCurrency";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useSubscription } from "@/hooks/useSubscription";
import { openModal } from "@/lib/modal-bus";
import { Crown } from "lucide-react";
import {
  useAnalyzeListing,
  useCreateScanResult,
  useCreatePortfolioHolding,
  useListScanResults,
  getListScanResultsQueryKey,
  getListPortfolioHoldingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type AnalysisResult = {
  cardName: string;
  player: string;
  year: string;
  setName: string;
  cardNumber: string;
  parallel: string;
  estGrade: string;
  gradeRange: string;
  probability: number;
  estValue: number;
  roi: number;
  recommendedAction: string;
  imageQualityScore: number;
  condition: Record<string, { score: number; status: string }>;
  notes: string[];
  marketComps: { raw: number[]; psa8: number[]; psa9: number[]; psa10: number[] };
};

function recommendedActionVariant(action: string): "teal" | "cyan" | "red" {
  if (action === "Submit") return "teal";
  if (action === "Pass") return "red";
  return "cyan";
}

export default function DealScreener() {
  const { isSignedIn } = useUser();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { fmt, isCad } = useCurrency();
  const { isPro, loading: subLoading } = useSubscription();
  usePageMeta(
    "Deal Screener — TheCardLab",
    "Paste any eBay listing URL. AI extracts card details, pulls live comps, estimates grade probability, and returns a Buy/Pass verdict in seconds."
  );

  const [url, setUrl] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [shipping, setShipping] = useState("15");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [addedToPortfolio, setAddedToPortfolio] = useState(false);
  const [scanStage, setScanStage] = useState("Analyzing…");
  const [correcting, setCorrecting] = useState(false);
  const [correctedCardName, setCorrectedCardName] = useState<string | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");

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

  const analyzeListingMutation = useAnalyzeListing({
    mutation: {
      onSuccess: (data) => {
        const r = data as AnalysisResult;
        setResult(r);
        toast.success("Analysis complete");

        if (isSignedIn) {
          saveScanMutation.mutate({
            data: {
              cardName: r.cardName,
              year: r.year,
              setName: r.setName,
              parallel: r.parallel,
              askingPrice: askingPrice ? parseFloat(askingPrice) : undefined,
              shipping: shipping ? parseFloat(shipping) : undefined,
              estValue: r.estValue,
              estGrade: r.estGrade,
              gradeRange: r.gradeRange,
              probability: r.probability,
              roi: r.roi,
              recommendedAction: r.recommendedAction,
              imageQualityScore: r.imageQualityScore,
            },
          });
        }
      },
      onError: (err: unknown) => {
        const apiErr = err as { message?: string; data?: { error?: string }; status?: number };
        const backendMsg = apiErr?.data?.error;
        const httpMsg = apiErr?.message ?? "";
        const status = apiErr?.status ?? 0;
        if (status === 503 || httpMsg.toLowerCase().includes("unavailable")) {
          toast.error("AI analysis temporarily unavailable — try again in a few minutes.");
        } else if (status === 401) {
          toast.error("Sign in required to use the Deal Screener.");
        } else if (backendMsg) {
          toast.error(backendMsg);
        } else {
          toast.error("Analysis failed. Ensure the URL is a valid card listing and try again.");
        }
      },
    },
  });

  const isScanning = analyzeListingMutation.isPending;

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter an eBay listing URL");
      return;
    }
    try {
      const parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        toast.error("Please enter a valid eBay listing URL — e.g. https://www.ebay.com/itm/...");
        return;
      }
    } catch {
      toast.error("That doesn't look like a URL — paste the full eBay listing link, e.g. https://www.ebay.com/itm/...");
      return;
    }
    setResult(null);
    setAddedToPortfolio(false);
    setCorrectedCardName(null);
    setCorrecting(false);
    setScanStage("Expanding URL…");
    setTimeout(() => setScanStage("Fetching listing…"), 1200);
    setTimeout(() => setScanStage("Running AI analysis…"), 3000);
    analyzeListingMutation.mutate({
      data: {
        listingUrl: url,
        askingPrice: askingPrice ? parseFloat(askingPrice) : undefined,
        shipping: shipping ? parseFloat(shipping) : undefined,
      },
    });
  };

  const handleAddToPortfolio = () => {
    if (!result) return;
    if (!isSignedIn) {
      toast.error("Sign in to add to your portfolio");
      return;
    }
    const cost = Math.round((askingPrice ? parseFloat(askingPrice) : 0) + (shipping ? parseFloat(shipping) : 0));
    addToPortfolioMutation.mutate({
      data: {
        card: result.cardName,
        grade: result.estGrade,
        cost: cost || result.estValue,
        value: result.estValue,
      },
    });
  };

  return (
    <Shell>
      {isSignedIn && !subLoading && !isPro && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">Free plan:</span> 5 deal scans included per month. Upgrade to Pro for unlimited.
          </div>
          <button
            onClick={() => openModal("pricing")}
            className="shrink-0 h-8 px-4 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all"
          >
            <Crown size={12} /> Upgrade
          </button>
        </div>
      )}

      <div className="text-center mb-8 lg:mb-10">
        <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-2">Deal Screener</div>
        <h1 className="text-2xl lg:text-4xl font-display font-bold tracking-tight mb-3">Spot a deal in 3 seconds flat</h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto">
          Paste any eBay listing URL. Our AI parses the card, pulls live comps, estimates grade probability, and returns a Grade It / Pass verdict instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        {/* Left column: steps — shown after input panel on mobile */}
        <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">
          {[
            {
              n: "01",
              title: "Paste an eBay listing URL",
              desc: "Grab the URL of any card listing — Buy It Now or auction — and drop it into the Deal Screener.",
            },
            {
              n: "02",
              title: "AI extracts card details",
              desc: "The model identifies year, set, player, parallel, condition clues, and asking price from the listing automatically.",
            },
            {
              n: "03",
              title: "Live comps + grade probability",
              desc: "Real eBay sold prices for Raw, PSA 8/9/10 are fetched. AI estimates your grade probability from the comp spread.",
            },
            {
              n: "04",
              title: "Get a Grade It / Pass verdict",
              desc: "A projected ROI is calculated. If the expected value after grading exceeds the ask, you get a GRADE IT verdict. Simple.",
            },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex gap-4">
              <div className="text-primary font-black text-xs mt-1 w-6 shrink-0">{n}</div>
              <div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right column: interactive panel — shown first on mobile */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div className="bg-white/[0.03] border border-border rounded-3xl p-6 lg:p-8">
            <form onSubmit={handleScan} className="space-y-4 mb-6">
              <div className="flex items-center gap-3 bg-black/30 border border-border rounded-2xl px-5 py-3">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste eBay, PWCC, or Goldin URL…"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={isScanning}
                  className="bg-white text-black px-6 py-2 rounded-2xl font-semibold text-sm shrink-0 hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {isScanning ? <Loader2 size={14} className="animate-spin inline" /> : "ANALYZE"}
                </button>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Asking Price ({isCad ? "CAD" : "USD"})</label>
                  <input
                    type="number"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full h-10 bg-black/30 border border-border rounded-xl px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Shipping ($)</label>
                  <input
                    type="number"
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full h-10 bg-black/30 border border-border rounded-xl px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
            </form>

            {isScanning && (
              <div className="py-10 flex flex-col items-center text-center">
                <Loader2 size={36} className="animate-spin text-primary mb-4" />
                <div className="font-bold mb-1">{scanStage}</div>
                <div className="text-sm text-muted-foreground">Assessing condition · Estimating grade · Calculating ROI</div>
              </div>
            )}

            {!isScanning && !result && (
              <div className="py-10 flex flex-col items-center text-center text-muted-foreground">
                <Zap size={32} className="mb-3 opacity-30" />
                <div className="text-sm">Paste a listing URL above to get started</div>
              </div>
            )}

            {result && !isScanning && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
                {/* Verdict banner */}
                <div className={`rounded-2xl px-5 py-4 flex items-center justify-between ${
                  result.recommendedAction === "Submit" ? "bg-emerald-500/10 border border-emerald-500/30" :
                  result.recommendedAction === "Pass" ? "bg-red-500/10 border border-red-500/30" :
                  "bg-primary/10 border border-primary/30"
                }`}>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-0.5">Verdict</div>
                    <div className={`text-2xl font-black ${
                      result.recommendedAction === "Submit" ? "text-emerald-400" :
                      result.recommendedAction === "Pass" ? "text-red-400" :
                      "text-primary"
                    }`}>{result.recommendedAction === "Submit" ? "GRADE IT" : result.recommendedAction === "Pass" ? "PASS" : result.recommendedAction}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-0.5">Expected ROI</div>
                    <div className={`text-2xl font-black ${result.roi >= 0 ? "text-secondary" : "text-red-400"}`}>
                      {result.roi >= 0 ? "+" : ""}{result.roi}%
                    </div>
                  </div>
                </div>

                {/* Card identity + correction */}
                <div>
                  {correcting ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); if (correctionInput.trim()) { setCorrectedCardName(correctionInput.trim()); setCorrecting(false); } }}
                      className="flex gap-2 items-center mb-1"
                    >
                      <input
                        autoFocus
                        value={correctionInput}
                        onChange={(e) => setCorrectionInput(e.target.value)}
                        placeholder="Enter correct card name…"
                        className="flex-1 h-8 bg-black/30 border border-primary/40 rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/60"
                      />
                      <button type="submit" className="text-xs font-bold text-primary px-2 py-1 hover:bg-primary/10 rounded transition-colors">OK</button>
                      <button type="button" onClick={() => setCorrecting(false)} className="text-xs text-muted-foreground px-2 py-1 hover:text-foreground transition-colors">✕</button>
                    </form>
                  ) : (
                    <div className="flex items-baseline gap-3 mb-1">
                      <h2 className="font-bold text-base">{correctedCardName ?? result.cardName}</h2>
                      <button
                        onClick={() => { setCorrecting(true); setCorrectionInput(correctedCardName ?? result.cardName); }}
                        className="text-xs text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <RotateCcw size={10} /> Wrong card?
                      </button>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">{result.year} {result.setName} #{result.cardNumber} · {result.parallel}</div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Est. Grade", value: result.estGrade, sub: `${result.probability}% confidence` },
                    { label: "Grade Range", value: result.gradeRange, sub: "likely outcome" },
                    { label: "Est. Value", value: fmt(result.estValue), sub: "post-grading" },
                    { label: "Total Cost", value: askingPrice ? fmt(parseFloat(askingPrice) + parseFloat(shipping || "0")) : "—", sub: "ask + shipping" },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="bg-black/30 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-1">{label}</div>
                      <div className="font-black text-lg">{value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Condition bars */}
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Condition Analysis</div>
                  <div className="space-y-3">
                    {Object.entries(result.condition).map(([key, data]) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize font-semibold">{key}</span>
                          <span className="text-muted-foreground">{data.score}/10 · {data.status}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                            style={{ width: `${(data.score / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Market comps */}
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Market Comps</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {[
                      { label: "Raw", data: result.marketComps.raw },
                      { label: "PSA 8", data: result.marketComps.psa8 },
                      { label: "PSA 9", data: result.marketComps.psa9 },
                      { label: "PSA 10", data: result.marketComps.psa10 },
                    ].map(({ label, data }) => (
                      <div key={label}>
                        <div className="text-xs text-muted-foreground mb-1">{label}</div>
                        <div className="font-bold text-xs">
                          {data.length >= 2 ? `${fmt(data[0])}–${fmt(data[1])}` : data[0] ? `~${fmt(data[0])}` : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI notes */}
                {result.notes.length > 0 && (
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle size={12} className="text-accent" /> AI Notes
                    </div>
                    <ul className="space-y-2">
                      {result.notes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                          <AlertCircle size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToPortfolio}
                    disabled={addToPortfolioMutation.isPending || addedToPortfolio}
                    className="flex-1 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-[#03111c] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {addToPortfolioMutation.isPending ? (
                      <><Loader2 size={14} className="animate-spin" /> Adding…</>
                    ) : addedToPortfolio ? "✓ Added" : "Add to Portfolio"}
                  </button>
                  <button
                    onClick={() => navigate(`/research?card=${encodeURIComponent(correctedCardName ?? result.cardName)}&openAlert=1`)}
                    className="flex-1 h-10 rounded-xl bg-white/5 border border-border text-foreground font-bold text-sm hover:bg-white/10 transition-colors"
                  >
                    Set Alert
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
                          <Pill variant={scan.estGrade.includes("10") ? "teal" : "cyan"}>{scan.estGrade}</Pill>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {scan.estValue ? fmt(scan.estValue) : "—"}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${scan.roi != null && scan.roi < 0 ? "text-destructive" : "text-secondary"}`}>
                        {scan.roi != null ? `${scan.roi >= 0 ? "+" : ""}${scan.roi}%` : "—"}
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
