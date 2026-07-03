import { useState } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateAlert,
  useCreatePortfolioHolding,
  getListAlertsQueryKey,
  getListPortfolioHoldingsQueryKey,
} from "@workspace/api-client-react";

export interface CardDetail {
  title: string;
  subtitle: string;
  recommendation?: "Submit" | "Pass" | "Manual Review";
  externalUrl?: string;
  price?: number;
}

interface CardDetailModalProps {
  card: CardDetail | null;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [step, setStep] = useState<"main" | "portfolio">("main");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [grade, setGrade] = useState("Raw");

  const createAlert = useCreateAlert({
    mutation: {
      onSuccess: () => {
        toast.success("Price drop alert created");
        qc.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        onClose();
      },
      onError: () => toast.error("Failed to create alert"),
    },
  });

  const createHolding = useCreatePortfolioHolding({
    mutation: {
      onSuccess: () => {
        toast.success(`${card?.title ?? "Card"} added to portfolio`);
        qc.invalidateQueries({ queryKey: getListPortfolioHoldingsQueryKey() });
        setStep("main");
        setPurchasePrice("");
        onClose();
      },
      onError: () => toast.error("Failed to add to portfolio"),
    },
  });

  if (!card) return null;

  const isPass = card.recommendation === "Pass";
  const actionLabel = isPass ? "Pass" : "Submit";

  const handleAction = () => {
    if (isPass) {
      toast("Card passed — skipped");
      onClose();
    } else {
      navigate("/grading-tracker");
      onClose();
    }
  };

  const handleWatchDrop = () => {
    createAlert.mutate({
      data: { cardName: card.title, alertType: "price_drop" },
    });
  };

  const handleAddToPortfolio = () => {
    if (step === "main") {
      setStep("portfolio");
      return;
    }
    const cost = purchasePrice ? Number(purchasePrice) : (card.price ?? 0);
    createHolding.mutate({
      data: { card: card.title, grade, value: cost, cost },
    });
  };

  const handleClose = () => {
    setStep("main");
    setPurchasePrice("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="w-full sm:max-w-sm bg-[#0d1120] sm:rounded-3xl rounded-t-3xl border border-white/10 p-6 pb-8 sm:pb-6 shadow-2xl">
        {/* Close button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {step === "main" ? (
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight mb-1">
              {card.title}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-8">{card.subtitle}</p>

            <div className="flex flex-col gap-3">
              {/* Submit / Pass */}
              <button
                onClick={handleAction}
                className={
                  isPass
                    ? "bg-[#3b2a4a] text-white text-sm font-medium px-6 py-2.5 rounded-3xl hover:bg-[#4a3560] transition-colors"
                    : "bg-transparent border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black text-sm font-medium px-6 py-2.5 rounded-3xl transition-all"
                }
              >
                {actionLabel}
              </button>

              {/* Add to Portfolio */}
              <button
                onClick={handleAddToPortfolio}
                disabled={createHolding.isPending}
                className="bg-gradient-to-r from-[#00f0ff] to-[#00ff9d] text-black font-semibold text-base py-4 rounded-3xl shadow-lg shadow-cyan-500/30 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createHolding.isPending && <Loader2 size={16} className="animate-spin" />}
                Add to Portfolio
              </button>

              {/* Watch for Price Drop */}
              <button
                onClick={handleWatchDrop}
                disabled={createAlert.isPending}
                className="bg-[#27272a] hover:bg-[#3a3a42] text-white font-medium py-4 rounded-3xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createAlert.isPending && <Loader2 size={16} className="animate-spin" />}
                Watch for Price Drop
              </button>

              {/* External link (Marketplace) */}
              {card.externalUrl && (
                <a
                  href={card.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleClose}
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <ExternalLink size={14} /> View on eBay
                </a>
              )}
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setStep("main")}
              className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <h3 className="text-lg font-bold mb-1">{card.title}</h3>
            <p className="text-muted-foreground text-sm mb-5">Enter purchase details</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Purchase Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder={card.price ? String(card.price) : "0"}
                  className="w-full h-10 bg-white/5 border border-border rounded-xl px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Grade
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full h-10 bg-white/5 border border-border rounded-xl px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  {["Raw", "PSA 7", "PSA 8", "PSA 9", "PSA 10", "BGS 9", "BGS 9.5", "SGC 10"].map(g => (
                    <option key={g} value={g} className="bg-[#0d1120]">{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleAddToPortfolio}
              disabled={createHolding.isPending}
              className="w-full bg-gradient-to-r from-[#00f0ff] to-[#00ff9d] text-black font-semibold text-base py-4 rounded-3xl hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {createHolding.isPending && <Loader2 size={16} className="animate-spin" />}
              Confirm Add to Portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
