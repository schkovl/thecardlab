import { useRef, useState } from "react";
import { X, Camera, Loader2, Upload, Sparkles, ChevronRight, RotateCcw, Check } from "lucide-react";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "https://api.thecardlab.app";

// ── Types ──────────────────────────────────────────────────────────────────────

type MimeType = "image/jpeg" | "image/png" | "image/webp";

type ImageSlot = {
  file: File;
  previewUrl: string;
  mimeType: MimeType;
  objectPath?: string;
  base64?: string;
  uploading: boolean;
} | null;

export type CardIdentification = {
  name: string;
  set: string;
  year: string;
  cardNumber: string;
  player: string;
  sport: string;
  gradePotential: string;
  details: string;
  confidence: number;
};

type Step = "upload" | "analyze" | "save";

interface Props {
  onClose: () => void;
  onSaved: (card: string, grade: string, cost: number, value: number) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadSlot(
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
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    return put.ok ? { objectPath } : null;
  } catch {
    return null;
  }
}

const GRADES = ["Raw", "PSA 7", "PSA 8", "PSA 9", "PSA 10", "BGS 9", "BGS 9.5", "SGC 10"];

function confidenceColor(n: number): string {
  if (n >= 85) return "text-secondary";
  if (n >= 65) return "text-accent";
  return "text-destructive";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ImageSlotButton({
  side,
  slot,
  onClick,
}: {
  side: "front" | "back";
  slot: ImageSlot;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative border-2 border-dashed rounded-2xl overflow-hidden transition-all group focus:outline-none w-full"
      style={{
        borderColor: slot ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.12)",
        background: slot ? "rgba(0,229,255,0.03)" : "rgba(255,255,255,0.02)",
        minHeight: 168,
      }}
    >
      {slot ? (
        <>
          <img src={slot.previewUrl} alt={side} className="w-full h-40 object-contain p-2" />
          <div
            className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
              slot.uploading ? "bg-accent/90 text-[#03111c]" : "bg-primary/90 text-[#03111c]"
            }`}
          >
            {slot.uploading ? (
              <span className="flex items-center gap-1">
                <Loader2 size={8} className="animate-spin" /> uploading…
              </span>
            ) : (
              `${side} ✓`
            )}
          </div>
          {!slot.uploading && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              <RotateCcw size={14} className="text-white" />
              <span className="text-xs font-bold text-white">Retake</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
          <Camera size={28} />
          <span className="text-sm font-bold capitalize">{side} of card</span>
          <span className="text-xs opacity-50">Tap to upload</span>
        </div>
      )}
    </button>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "upload", label: "Scan" },
    { id: "analyze", label: "Identify" },
    { id: "save", label: "Save" },
  ];
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                i < idx
                  ? "bg-secondary text-[#03111c]"
                  : i === idx
                  ? "bg-primary text-[#03111c]"
                  : "bg-white/10 text-muted-foreground"
              }`}
            >
              {i < idx ? <Check size={13} strokeWidth={3} /> : i + 1}
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                i === idx ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-full mb-5 transition-colors ${i < idx ? "bg-secondary/60" : "bg-white/10"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ScanAddCardModal({ onClose, onSaved }: Props) {
  const { getToken } = useAuth();

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [frontSlot, setFrontSlot] = useState<ImageSlot>(null);
  const [backSlot, setBackSlot] = useState<ImageSlot>(null);
  const [identifying, setIdentifying] = useState(false);
  const [cardId, setCardId] = useState<CardIdentification | null>(null);

  // editable fields after AI identification
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState("PSA 9");
  const [editCost, setEditCost] = useState("");
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const bothReady =
    !!frontSlot && !frontSlot.uploading && !!backSlot && !backSlot.uploading;

  // ── Image handling ───────────────────────────────────────────────────────────

  const handleFile = async (side: "front" | "back", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mimeType = (file.type || "image/jpeg") as MimeType;
    const previewUrl = URL.createObjectURL(file);
    const pending: ImageSlot = { file, previewUrl, mimeType, uploading: true };

    if (side === "front") setFrontSlot(pending);
    else setBackSlot(pending);
    e.target.value = "";

    const token = await getToken();
    const gcs = await uploadSlot(file, side, token);
    const resolved: ImageSlot = gcs
      ? { file, previewUrl, mimeType, objectPath: gcs.objectPath, uploading: false }
      : { file, previewUrl, mimeType, base64: await readFileAsBase64(file), uploading: false };

    if (side === "front") setFrontSlot(resolved);
    else setBackSlot(resolved);
  };

  // ── AI identification ────────────────────────────────────────────────────────

  const handleIdentify = async () => {
    if (!frontSlot || !backSlot) return;
    setIdentifying(true);
    try {
      const token = await getToken();
      const body = frontSlot.objectPath
        ? { frontObjectPath: frontSlot.objectPath, backObjectPath: backSlot.objectPath }
        : {
            imageBase64: frontSlot.base64,
            mimeType: frontSlot.mimeType,
            backImageBase64: backSlot.base64,
            backMimeType: backSlot.mimeType,
          };

      const res = await fetch(`${API}/api/portfolio/identify-card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("AI identification failed");
      const data: CardIdentification = await res.json();
      setCardId(data);

      // Pre-fill editable fields
      const fullName = [data.year, data.set, data.player, data.cardNumber]
        .filter(Boolean)
        .join(" ")
        .trim() || data.name;
      setEditName(fullName || data.name);
      setEditGrade("Raw");
      setStep("analyze");
    } catch {
      toast.error("AI identification failed — enter details manually");
      setCardId({
        name: "",
        set: "",
        year: "",
        cardNumber: "",
        player: "",
        sport: "",
        gradePotential: "",
        details: "",
        confidence: 0,
      });
      setEditName("");
      setEditGrade("Raw");
      setStep("analyze");
    } finally {
      setIdentifying(false);
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const cost = parseInt(editCost, 10);
    const value = parseInt(editValue, 10);
    if (!editName.trim()) { toast.error("Card name required"); return; }
    if (isNaN(cost) || cost < 0) { toast.error("Enter a valid cost"); return; }
    if (isNaN(value) || value < 0) { toast.error("Enter a valid value"); return; }
    setSaving(true);
    onSaved(editName.trim(), editGrade, cost, value);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <input ref={frontRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => handleFile("front", e)} />
      <input ref={backRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => handleFile("back", e)} />

      <div className="w-full max-w-md bg-gradient-to-br from-[#0d1a31] to-[#071225] border border-[#1e3a5f] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50">
          <div>
            <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-0.5">Portfolio</div>
            <h2 className="text-base font-black">
              {step === "upload" ? "Scan Your Card" : step === "analyze" ? "Confirm Details" : "Set Value"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          <StepIndicator current={step} />

          {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground -mt-2 mb-4">
                Photograph both sides of the card. Lay it flat on a solid background.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <ImageSlotButton side="front" slot={frontSlot} onClick={() => frontRef.current?.click()} />
                <ImageSlotButton side="back" slot={backSlot} onClick={() => backRef.current?.click()} />
              </div>

              <button
                onClick={handleIdentify}
                disabled={!bothReady || identifying}
                className="w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: bothReady && !identifying ? "#00e5ff" : "rgba(255,255,255,0.05)",
                  color: bothReady && !identifying ? "#03111c" : "inherit",
                  border: bothReady ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {identifying ? (
                  <><Loader2 size={16} className="animate-spin" /> AI identifying card…</>
                ) : !frontSlot && !backSlot ? (
                  <><Camera size={16} /> Upload both sides</>
                ) : !bothReady ? (
                  <><Upload size={16} /> {!frontSlot || frontSlot.uploading ? "Add front photo" : "Add back photo"}</>
                ) : (
                  <><Sparkles size={16} /> Identify Card with AI</>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0d1a31] px-3 text-[10px] text-muted-foreground uppercase tracking-wider">or skip scan</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setCardId(null);
                  setEditName("");
                  setEditGrade("Raw");
                  setStep("analyze");
                }}
                className="w-full h-10 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 border border-border/50 transition-colors"
              >
                Enter details manually
              </button>
            </div>
          )}

          {/* ── Step 2: Analyze / Edit ─────────────────────────────────────── */}
          {step === "analyze" && (
            <div className="space-y-4">
              {cardId && cardId.confidence > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-border/50">
                  <Sparkles size={16} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-muted-foreground">AI Confidence</div>
                    <div className="text-sm font-black truncate">{cardId.sport} · {cardId.set}</div>
                  </div>
                  <span className={`text-xl font-black shrink-0 ${confidenceColor(cardId.confidence)}`}>
                    {cardId.confidence}%
                  </span>
                </div>
              )}

              {/* Card name */}
              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                  Card Name *
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. 2023 Panini Prizm Wembanyama Silver RC"
                  className="w-full h-10 bg-white/5 border border-border rounded-xl px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* AI-detected fields (read-only display) */}
              {cardId && cardId.confidence > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Player", val: cardId.player },
                    { label: "Year", val: cardId.year },
                    { label: "Card #", val: cardId.cardNumber },
                    { label: "Grade Potential", val: cardId.gradePotential },
                  ]
                    .filter((f) => f.val)
                    .map((f) => (
                      <div key={f.label} className="p-2.5 rounded-lg bg-white/5 border border-border/50">
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{f.label}</div>
                        <div className="text-xs font-bold truncate">{f.val}</div>
                      </div>
                    ))}
                </div>
              )}

              {/* Grade */}
              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                  Grade
                </label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="w-full h-10 bg-white/5 border border-border rounded-xl px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g} className="bg-[#0d1a31]">{g}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("upload")}
                  className="h-10 px-4 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 border border-border/50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("save")}
                  disabled={!editName.trim()}
                  className="flex-1 h-10 rounded-xl bg-primary text-[#03111c] font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next: Set Value <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Save ───────────────────────────────────────────────── */}
          {step === "save" && (
            <div className="space-y-4">
              {/* Card preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-border/50">
                {frontSlot && (
                  <img src={frontSlot.previewUrl} alt="card" className="w-12 h-16 object-contain rounded-lg shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{editName}</div>
                  <div className="text-xs text-primary font-bold mt-0.5">{editGrade}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                    Cost Basis (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      value={editCost}
                      onChange={(e) => setEditCost(e.target.value)}
                      placeholder="0"
                      className="w-full h-10 bg-white/5 border border-border rounded-xl pl-7 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                    Current Value (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="0"
                      className="w-full h-10 bg-white/5 border border-border rounded-xl pl-7 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("analyze")}
                  className="h-10 px-4 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 border border-border/50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim() || !editCost || !editValue}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-primary to-[#22d3a6] text-[#03111c] font-black text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-[0_0_20px_rgba(0,229,255,0.25)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Add to Portfolio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
