import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { CheckCircle2, Crosshair, AlertTriangle, Search, Loader2, Upload, RotateCcw, Camera } from "lucide-react";
import { useRef, useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useCurrency } from "@/hooks/useCurrency";

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "https://api.thecardlab.app";

type Comps = { raw: number[]; psa8: number[]; psa9: number[]; psa10: number[] };

type ScanAnalysis = {
  centering: { leftRight: string; topBottom: string; score: number; status: string; note: string };
  corners: { score: number; status: string; defects: string[] };
  edges: { score: number; status: string; defects: string[] };
  surface: { score: number; status: string; defects: string[] };
  overallScore: number;
  estimatedGrade: string;
  prob10: number;
  prob9: number;
  prob8: number;
  recommendation: "Submit" | "Manual Review" | "Pass";
  notes: string[];
};

function useCardComps(card: string) {
  return useQuery<Comps>({
    queryKey: ["comps", card],
    queryFn: async () => {
      const res = await fetch(`${API}/api/market/comps?card=${encodeURIComponent(card)}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    enabled: card.length > 4,
    staleTime: 30 * 60 * 1000,
  });
}

function compRange(arr: number[], fmt: (n: number) => string) {
  if (arr.length >= 2) return `${fmt(arr[0])} – ${fmt(arr[1])}`;
  if (arr.length === 1) return `~${fmt(arr[0])}`;
  return "—";
}

function estGrade10Prob(comps: Comps): number {
  if (!comps.psa10.length) return 72;
  const p10mid = (comps.psa10[0] + comps.psa10[1]) / 2;
  const p9mid = comps.psa9.length ? (comps.psa9[0] + comps.psa9[1]) / 2 : p10mid * 0.7;
  const ratio = p9mid > 0 ? p10mid / p9mid : 1.4;
  if (ratio > 2.5) return 85;
  if (ratio > 1.8) return 78;
  if (ratio > 1.3) return 70;
  return 62;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadSlotToGCS(
  file: File,
  side: "front" | "back",
  token: string | null,
): Promise<{ objectPath: string } | null> {
  try {
    const res = await fetch(`${API}/api/grade-lab/upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ side, mimeType: file.type || "image/jpeg" }),
    });
    if (!res.ok) return null;
    const { uploadUrl, objectPath } = (await res.json()) as { uploadUrl: string; objectPath: string };
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    return putRes.ok ? { objectPath } : null;
  } catch {
    return null;
  }
}

const DEMO_CARD_PLACEHOLDER = "e.g. 2023 Panini Prizm Wembanyama Silver RC";
const DEFAULT_CARD = "";

type ImageSlot = {
  file: File;
  previewUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  // One of these will be set after upload resolves:
  objectPath?: string;  // GCS path (preferred)
  base64?: string;      // fallback when GCS unavailable
  uploading: boolean;
} | null;

export default function GradeLab() {
  usePageMeta("Grade Lab — TheCardLab", "Upload front and back card photos. AI analyzes centering, defects, and surfaces to predict PSA, BGS, SGC, and CGC grade outcomes.");
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [frontSlot, setFrontSlot] = useState<ImageSlot>(null);
  const [backSlot, setBackSlot] = useState<ImageSlot>(null);
  const [cardName, setCardName] = useState(DEFAULT_CARD);
  const [searchInput, setSearchInput] = useState(DEFAULT_CARD);
  const [scanAnalysis, setScanAnalysis] = useState<ScanAnalysis | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const { fmt } = useCurrency();

  const { data: comps, isFetching } = useCardComps(cardName);

  const bothUploaded = !!frontSlot && !frontSlot.uploading && !!backSlot && !backSlot.uploading;
  const prob10 = scanAnalysis ? scanAnalysis.prob10 : comps ? estGrade10Prob(comps) : 78;
  const prob9 = scanAnalysis ? scanAnalysis.prob9 : Math.round((100 - prob10) * 0.75);
  const prob8 = scanAnalysis ? scanAnalysis.prob8 : 100 - prob10 - prob9;

  const handleFileChange = async (side: "front" | "back", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mimeType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";
    const previewUrl = URL.createObjectURL(file);
    const pending: ImageSlot = { file, previewUrl, mimeType, uploading: true };
    if (side === "front") setFrontSlot(pending);
    else setBackSlot(pending);
    setScanAnalysis(null);
    e.target.value = "";

    // Try GCS direct upload; fall back to base64
    const token = await getToken();
    const gcsResult = await uploadSlotToGCS(file, side, token);
    const resolved: ImageSlot = gcsResult
      ? { file, previewUrl, mimeType, objectPath: gcsResult.objectPath, uploading: false }
      : { file, previewUrl, mimeType, base64: await readFileAsBase64(file), uploading: false };

    if (side === "front") setFrontSlot(resolved);
    else setBackSlot(resolved);
  };

  const handleAnalyze = async () => {
    if (!frontSlot || !backSlot) {
      toast.error("Upload both front and back photos before analyzing");
      return;
    }
    setScanLoading(true);
    setScanAnalysis(null);
    try {
      const token = await getToken();
      const body = frontSlot.objectPath
        ? {
            frontObjectPath: frontSlot.objectPath,
            backObjectPath: backSlot.objectPath,
            cardName,
          }
        : {
            imageBase64: frontSlot.base64,
            mimeType: frontSlot.mimeType,
            backImageBase64: backSlot.base64,
            backMimeType: backSlot.mimeType,
            cardName,
          };

      const res = await fetch(`${API}/api/grade-lab/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data: ScanAnalysis = await res.json();
      setScanAnalysis(data);
      toast.success("AI scan analysis complete");
    } catch {
      toast.error("Scan analysis failed — showing estimate");
    } finally {
      setScanLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setCardName(searchInput.trim());
    setScanAnalysis(null);
  };

  const centeringLabel = scanAnalysis
    ? `${scanAnalysis.centering.leftRight} L/R · ${scanAnalysis.centering.topBottom} T/B`
    : "55% / 45%";

  const defectItems: Array<{ icon: "check" | "warn"; label: string; pill: string; variant: "teal" | "gold" | "destructive" }> = [];
  if (scanAnalysis) {
    const addCategory = (
      label: string,
      score: number,
      defects: string[],
      category: string
    ) => {
      const scoreStr = score.toString();
      if (defects.length === 0) {
        defectItems.push({ icon: "check", label: `${category} look clean`, pill: `${scoreStr} ${label}`, variant: "teal" });
      } else {
        defects.forEach((d) => {
          defectItems.push({ icon: "warn", label: d, pill: `${scoreStr} ${label}`, variant: score >= 8 ? "gold" : "destructive" });
        });
      }
    };
    addCategory("Surf", scanAnalysis.surface.score, scanAnalysis.surface.defects, "Surface");
    addCategory("Corn", scanAnalysis.corners.score, scanAnalysis.corners.defects, "Corners");
    addCategory("Edge", scanAnalysis.edges.score, scanAnalysis.edges.defects, "Edges");
  } else {
    defectItems.push({ icon: "warn", label: "Upload a card scan for AI defect detection", pill: "Pending", variant: "gold" });
    defectItems.push({ icon: "check", label: "Market comp data loaded — grade probabilities estimated", pill: "Est.", variant: "teal" });
  }

  const recommendationColor =
    scanAnalysis?.recommendation === "Pass"
      ? "from-destructive/10 border-destructive/20"
      : scanAnalysis?.recommendation === "Manual Review"
      ? "from-accent/10 border-accent/20"
      : "from-primary/10 border-primary/20";

  const recommendationTextColor =
    scanAnalysis?.recommendation === "Pass"
      ? "text-destructive"
      : scanAnalysis?.recommendation === "Manual Review"
      ? "text-accent"
      : "text-primary";

  return (
    <Shell>
      <div className="mb-6">
        <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Pre-Submission</div>
        <h1 className="text-2xl lg:text-4xl font-display font-bold tracking-tight mb-2">Grade Lab</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">Upload front and back photos — like depositing a cheque. AI analyzes centering, defects, and surfaces from both sides.</p>
      </div>

      {/* Dual-side upload — both required before analysis */}
      <input ref={frontFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleFileChange("front", e)} />
      <input ref={backFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleFileChange("back", e)} />

      <div className="grid grid-cols-2 gap-4 mb-4">
        {(["front", "back"] as const).map(side => {
          const slot = side === "front" ? frontSlot : backSlot;
          const ref = side === "front" ? frontFileInputRef : backFileInputRef;
          return (
            <button
              key={side}
              type="button"
              onClick={() => ref.current?.click()}
              className="relative border-2 border-dashed rounded-2xl overflow-hidden transition-all group focus:outline-none"
              style={{
                borderColor: slot ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.12)",
                background: slot ? "rgba(0,229,255,0.03)" : "rgba(255,255,255,0.02)",
                minHeight: 160,
              }}
            >
              {slot ? (
                <>
                  <img src={slot.previewUrl} alt={side} className="w-full h-40 object-contain p-2" />
                  <div className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${slot.uploading ? "bg-accent/90 text-[#03111c]" : "bg-primary/90 text-[#03111c]"}`}>
                    {slot.uploading ? <span className="flex items-center gap-1"><Loader2 size={8} className="animate-spin" /> uploading…</span> : `${side} ✓`}
                  </div>
                  {!slot.uploading && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs font-bold text-white">Replace</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                  <Camera size={28} />
                  <span className="text-sm font-bold capitalize">{side} of card</span>
                  <span className="text-xs opacity-60">Tap to upload</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!bothUploaded || scanLoading}
        className="w-full mb-6 h-12 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: bothUploaded && !scanLoading ? "#00e5ff" : "rgba(255,255,255,0.05)",
          color: bothUploaded && !scanLoading ? "#03111c" : "inherit",
          border: bothUploaded ? "none" : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {scanLoading
          ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</>
          : (frontSlot?.uploading || backSlot?.uploading)
          ? <><Loader2 size={16} className="animate-spin" /> Uploading image…</>
          : !frontSlot && !backSlot
          ? <><Camera size={16} /> Upload front + back to analyze</>
          : !bothUploaded
          ? <><Upload size={16} /> {frontSlot && !frontSlot.uploading ? "Add back photo to continue" : "Add front photo to continue"}</>
          : <><Crosshair size={16} /> Analyze card</>
        }
      </button>

      <HoloCard className="mb-6 p-4">
        <form onSubmit={handleSearch} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
              Card Name — fetch live eBay comps
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                ref={searchInputRef}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={DEMO_CARD_PLACEHOLDER}
                className="w-full h-10 bg-white/5 border border-border rounded-xl pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isFetching}
            className="h-10 px-5 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold hover:bg-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isFetching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {isFetching ? "Fetching…" : "Get Comps"}
          </button>
        </form>
      </HoloCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <HoloCard className="p-0 overflow-hidden flex flex-col h-[540px]">
            <div className="p-4 border-b border-border bg-white/5 flex justify-between items-center">
              <div className="font-bold text-sm">Front Scan Analysis</div>
              <div className="flex gap-2">
                {scanLoading && <Loader2 size={16} className="animate-spin text-primary" />}
                <button className="p-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30">
                  <Crosshair size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-black/50 relative flex items-center justify-center p-8 overflow-hidden group">
              {frontSlot?.previewUrl ? (
                <img src={frontSlot.previewUrl} alt="Card" className="h-full object-contain shadow-2xl relative z-10" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground/40 z-10">
                  <Camera size={40} />
                  <span className="text-xs font-bold">Upload front scan</span>
                </div>
              )}
              <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-full border-t-2 border-primary/50 border-dashed absolute top-[10%] left-0" />
                <div className="w-full border-b-2 border-primary/50 border-dashed absolute bottom-[10%] left-0" />
                <div className="h-full border-l-2 border-primary/50 border-dashed absolute left-[10%] top-0" />
                <div className="h-full border-r-2 border-primary/50 border-dashed absolute right-[10%] top-0" />
                <div className="absolute top-[5%] left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs font-mono text-primary">
                  {centeringLabel}
                </div>
              </div>
            </div>
          </HoloCard>

          {scanAnalysis && (
            <HoloCard>
              <h3 className="text-sm font-black uppercase tracking-wider mb-3">Centering Detail</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Left / Right</span>
                  <span className="font-bold">{scanAnalysis.centering.leftRight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Top / Bottom</span>
                  <span className="font-bold">{scanAnalysis.centering.topBottom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-bold">{scanAnalysis.centering.status}</span>
                </div>
                {scanAnalysis.centering.note && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border">{scanAnalysis.centering.note}</p>
                )}
              </div>
            </HoloCard>
          )}
        </div>

        <div className="lg:col-span-7 space-y-6">
          <HoloCard>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1 max-w-xs leading-tight">{cardName}</h2>
                <div className="text-sm text-muted-foreground flex items-center gap-3">
                  <span>
                    {scanLoading
                      ? "AI analyzing scan…"
                      : scanAnalysis
                      ? `AI grade: ${scanAnalysis.estimatedGrade}`
                      : isFetching
                      ? "Fetching live market data…"
                      : "Upload a scan for AI analysis"}
                  </span>
                  {!scanLoading && (
                    <button
                      onClick={() => { searchInputRef.current?.focus(); searchInputRef.current?.select(); }}
                      className="text-xs text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1 shrink-0"
                    >
                      <RotateCcw size={10} /> Wrong card?
                    </button>
                  )}
                </div>
              </div>
              <Pill variant="teal" className="text-sm px-3 py-1.5 shrink-0 ml-4">
                {scanAnalysis ? scanAnalysis.estimatedGrade : "PSA 10 Likely"}
              </Pill>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-8">
              <div className="text-center p-4 rounded-xl bg-white/5 border border-border">
                <div className="text-[32px] font-black text-primary mb-1">{prob10}%</div>
                <div className="text-xs font-bold text-muted-foreground uppercase">PSA 10 Prob.</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5 border border-border">
                <div className="text-[32px] font-black text-foreground mb-1">{prob9}%</div>
                <div className="text-xs font-bold text-muted-foreground uppercase">PSA 9 Prob.</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5 border border-border">
                <div className="text-[32px] font-black text-muted-foreground mb-1">{prob8}%</div>
                <div className="text-xs font-bold text-muted-foreground uppercase">PSA 8 Prob.</div>
              </div>
            </div>

            <h3 className="text-sm font-black uppercase tracking-wider mb-3">
              Live Market Comps {isFetching && <Loader2 size={12} className="inline animate-spin ml-1" />}
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {([
                { label: "Raw", range: comps ? compRange(comps.raw, fmt) : "—" },
                { label: "PSA 8", range: comps ? compRange(comps.psa8, fmt) : "—" },
                { label: "PSA 9", range: comps ? compRange(comps.psa9, fmt) : "—" },
                { label: "PSA 10", range: comps ? compRange(comps.psa10, fmt) : "—" },
              ] as const).map(c => (
                <div key={c.label} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-border text-sm">
                  <span className="font-bold text-muted-foreground">{c.label}</span>
                  <span className="font-bold text-foreground">{c.range}</span>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-black uppercase tracking-wider mb-4">
              {scanAnalysis ? "AI Defect Log" : "Defect Log"}
            </h3>
            <div className="space-y-3 mb-8">
              {defectItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-border">
                  {item.icon === "warn"
                    ? <AlertTriangle size={18} className="text-accent shrink-0" />
                    : <CheckCircle2 size={18} className="text-secondary shrink-0" />
                  }
                  <div className="flex-1 text-sm">{item.label}</div>
                  <Pill variant={item.variant === "destructive" ? "gold" : item.variant}>{item.pill}</Pill>
                </div>
              ))}
              {scanAnalysis?.notes && scanAnalysis.notes.length > 0 && (
                <div className="pt-2">
                  {scanAnalysis.notes.map((note, i) => (
                    <p key={i} className="text-xs text-muted-foreground py-1 border-t border-border first:border-t-0">{note}</p>
                  ))}
                </div>
              )}
            </div>

            <div className={`p-5 rounded-xl bg-gradient-to-r ${recommendationColor} border`}>
              <h4 className={`font-bold mb-2 ${recommendationTextColor}`}>
                {scanAnalysis
                  ? `Recommendation: ${scanAnalysis.recommendation}`
                  : "Recommendation: Submit to PSA"}
              </h4>
              <p className="text-sm text-foreground/80 mb-4">
                {comps?.psa10?.length
                  ? `PSA 10 market range ${compRange(comps.psa10, fmt)} — strong submission candidate.`
                  : "High probability of gem mint. Expected value increase post-grading."}
              </p>
              {scanAnalysis?.recommendation !== "Pass" && (
                <button
                  onClick={() => navigate(`/grading-tracker?card=${encodeURIComponent(cardName)}&openSubmission=1`)}
                  className="h-10 px-6 rounded-lg bg-primary text-[#03111c] font-bold text-sm hover:brightness-110 transition-all"
                >
                  Start PSA Submission
                </button>
              )}
            </div>
          </HoloCard>
        </div>
      </div>
    </Shell>
  );
}
