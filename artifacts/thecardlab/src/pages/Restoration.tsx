import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { Wrench, Sparkles, Loader2, Clock, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/useCurrency";
import { usePageMeta } from "@/hooks/usePageMeta";

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "https://api.thecardlab.app";

type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  color: string;
  turnaround: string;
};

function useRestorationServices() {
  return useQuery<Service[]>({
    queryKey: ["restoration-services"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/restoration`);
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
}

const COLOR_MAP: Record<string, string> = {
  primary: "text-primary",
  accent: "text-accent",
  secondary: "text-secondary",
};

const ICON_MAP: Record<string, React.ReactNode> = {
  cleaning: <Sparkles size={20} />,
  pressing: <div className="font-black text-xl">P</div>,
  reholdering: <div className="font-black text-xl">R</div>,
  bundle: <Wrench size={20} />,
};

const BG_MAP: Record<string, string> = {
  primary: "bg-primary/20 text-primary",
  accent: "bg-accent/20 text-accent",
  secondary: "bg-secondary/20 text-secondary",
};

export default function Restoration() {
  usePageMeta("Restoration Lab — TheCardLab", "Professional cleaning, pressing, and re-holdering to maximize your card's grading potential.");
  const { data: services, isLoading } = useRestorationServices();
  const { fmt } = useCurrency();

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Expert Services</div>
          <h1 className="text-2xl lg:text-4xl font-display font-bold tracking-tight mb-2">Restoration Lab</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Professional cleaning, pressing, and re-holdering to maximize grading potential.</p>
        </div>
        <a
          href="mailto:support@thecardlab.app?subject=Restoration%20Service%20Request"
          className="h-10 px-5 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center gap-2 shadow-[0_10px_30px_rgba(0,229,255,0.2)]"
        >
          <Wrench size={16} /> Request Service
        </a>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {(services ?? []).filter(s => s.id !== "bundle").map(service => (
            <HoloCard key={service.id} className="flex flex-col justify-between">
              <div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${BG_MAP[service.color] ?? "bg-primary/20 text-primary"}`}>
                  {ICON_MAP[service.id] ?? <Wrench size={20} />}
                </div>
                <h3 className="font-bold mb-2">{service.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
              </div>
              <div className="flex items-end justify-between">
                <div className={`text-lg font-black ${COLOR_MAP[service.color] ?? "text-primary"}`}>
                  {fmt(service.price)} <span className="text-xs font-normal text-muted-foreground">/{service.unit}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} /> {service.turnaround}
                </div>
              </div>
            </HoloCard>
          ))}
        </div>
      )}

      {/* Bundle offer */}
      {services?.find(s => s.id === "bundle") && (() => {
        const bundle = services.find(s => s.id === "bundle")!;
        return (
          <HoloCard className="mb-8 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <div>
              <Pill variant="cyan" className="text-xs mb-2">Best Value</Pill>
              <h3 className="font-bold text-lg mb-1">{bundle.name}</h3>
              <p className="text-sm text-muted-foreground">{bundle.description}</p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <div className="text-2xl font-black text-primary">{fmt(bundle.price)} <span className="text-xs font-normal text-muted-foreground">/{bundle.unit}</span></div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} /> {bundle.turnaround}
              </div>
              <a
                href="mailto:support@thecardlab.app?subject=Restoration%20Bundle%20Request"
                className="mt-1 h-9 px-5 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm"
              >
                Order Bundle <ChevronRight size={14} />
              </a>
            </div>
          </HoloCard>
        );
      })()}

      <h2 className="text-lg font-bold mb-4">Active Projects</h2>
      <HoloCard className="p-8 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-1">
          <Wrench size={22} className="text-muted-foreground" />
        </div>
        <p className="font-bold">No active restoration projects</p>
        <p className="text-sm text-muted-foreground max-w-xs">Submit cards via the Request Service button above and they'll appear here once received.</p>
      </HoloCard>
    </Shell>
  );
}
