import { Crown, Lock } from "lucide-react";
import { openModal } from "@/lib/modal-bus";
import { useSubscription } from "@/hooks/useSubscription";

interface PaywallGateProps {
  /** Feature name shown in the upgrade prompt */
  feature: string;
  /** Plan required. Currently only "pro" is supported. */
  plan?: "pro";
  children: React.ReactNode;
}

export function PaywallGate({ feature, plan = "pro", children }: PaywallGateProps) {
  const { isPro, loading } = useSubscription();

  if (loading) return <>{children}</>;
  if (plan === "pro" && isPro) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-gradient-to-br from-[#101f3a] to-[#071225] border border-primary/30 rounded-2xl p-6 text-center shadow-2xl max-w-xs mx-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-primary" />
          </div>
          <div className="font-black text-base mb-1">{feature}</div>
          <div className="text-xs text-muted-foreground mb-4">
            Available on Pro plan. Upgrade to unlock unlimited access.
          </div>
          <button
            onClick={() => openModal("pricing")}
            className="w-full py-2.5 rounded-xl bg-gradient-to-br from-primary to-secondary text-[#03111c] font-black text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(0,229,255,0.25)] hover:shadow-[0_12px_32px_rgba(0,229,255,0.35)] hover:-translate-y-0.5 transition-all"
          >
            <Crown size={14} /> Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}
