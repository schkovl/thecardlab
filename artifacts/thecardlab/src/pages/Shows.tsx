import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { Calendar as CalendarIcon, MapPin, Users, Plus, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/usePageMeta";

type Show = {
  id: number;
  name: string;
  date: string;
  city: string;
  venue: string;
  featuredDealers: number;
  url?: string;
};

function useShows() {
  return useQuery<Show[]>({
    queryKey: ["shows"],
    queryFn: async () => {
      const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "https://api.thecardlab.app";
      const res = await fetch(`${base}/api/shows`);
      if (!res.ok) throw new Error("Failed to fetch shows");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
}

const REGIONS = ["All Regions", "Midwest", "South", "West Coast", "East Coast"] as const;
type Region = typeof REGIONS[number];
const REGION_VARIANTS: Record<Region, "cyan" | "teal" | "violet" | "gold" | "blue"> = {
  "All Regions": "cyan", Midwest: "teal", South: "violet", "West Coast": "gold", "East Coast": "blue",
};

const MIDWEST_KEYWORDS = ["IL", "MI", "OH", "IN", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS", "Chicago", "Detroit", "Columbus", "Indianapolis", "Milwaukee", "Minneapolis"];
const SOUTH_KEYWORDS = ["TX", "FL", "GA", "TN", "NC", "SC", "AL", "MS", "AR", "LA", "OK", "VA", "Houston", "Dallas", "Miami", "Atlanta", "Nashville", "Charlotte"];
const WEST_KEYWORDS = ["CA", "OR", "WA", "AZ", "NV", "Los Angeles", "San Francisco", "Seattle", "Portland", "Phoenix", "Las Vegas"];
const EAST_KEYWORDS = ["NY", "NJ", "PA", "MA", "CT", "RI", "DE", "MD", "DC", "New York", "Philadelphia", "Boston", "Baltimore", "Washington"];

function matchesRegion(show: Show, region: Region): boolean {
  if (region === "All Regions") return true;
  const haystack = `${show.city} ${show.venue} ${show.name}`;
  const keywords = region === "Midwest" ? MIDWEST_KEYWORDS : region === "South" ? SOUTH_KEYWORDS : region === "West Coast" ? WEST_KEYWORDS : EAST_KEYWORDS;
  return keywords.some((kw) => haystack.includes(kw));
}

export default function Shows() {
  usePageMeta("Card Shows — TheCardLab", "Find upcoming card shows, conventions, and trade nights near you. Filter by region.");
  const { data: shows, isLoading } = useShows();
  const [region, setRegion] = useState<Region>("All Regions");

  const visibleShows = (shows ?? []).filter((s) => matchesRegion(s, region));

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Events</div>
          <h1 className="text-2xl lg:text-4xl font-display font-bold tracking-tight mb-2">Card Shows</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Find upcoming card shows, conventions, and trade nights near you.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {REGIONS.map((r) => (
          <Pill
            key={r}
            variant={REGION_VARIANTS[r]}
            className={`px-4 py-2 text-xs cursor-pointer transition-opacity ${region === r ? "" : "opacity-50 hover:opacity-100"}`}
            onClick={() => setRegion(r)}
          >
            {r}
          </Pill>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleShows.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-16">No shows found for this region.</div>
          )}
          {visibleShows.map(show => (
            <HoloCard key={show.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{show.name}</h3>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground/90 font-medium">
                    <CalendarIcon size={16} className="text-primary" /> {show.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={16} /> {show.city}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={16} /> {show.featuredDealers}+ Dealers
                  </div>
                </div>
                <div className="text-xs mt-2 text-muted-foreground">{show.venue}</div>
              </div>

              <div className="shrink-0 flex gap-3">
                {show.url ? (
                  <a
                    href={show.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    Details <ExternalLink size={14} />
                  </a>
                ) : (
                  <button className="h-10 px-4 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors">
                    Details
                  </button>
                )}
                <button
                  onClick={() => toast.success(`${show.name} added to your calendar`)}
                  className="h-10 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold hover:bg-primary/20 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Calendar
                </button>
              </div>
            </HoloCard>
          ))}
        </div>
      )}
    </Shell>
  );
}
