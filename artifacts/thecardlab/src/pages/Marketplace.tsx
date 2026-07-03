import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { CardDetailModal, type CardDetail } from "@/components/cards/CardDetailModal";
import { Filter, ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useMarketListings } from "@/hooks/useMarketData";
import { useCurrency } from "@/hooks/useCurrency";

const CATEGORY_QUERIES: Record<string, string> = {
  "All Items": "sports cards graded PSA",
  "Slabbed": "sports cards PSA graded slab",
  "Basketball": "basketball cards PSA graded",
  "Football": "football cards PSA graded",
  "Baseball": "baseball cards PSA graded",
  "Pokémon TCG": "pokemon cards PSA graded charizard pikachu",
  "Raw Vintage": "vintage sports cards raw ungraded",
  "Sealed Wax": "sports cards sealed wax box",
};

type SortMode = "ending" | "price_asc" | "price_desc";
const SORT_LABELS: Record<SortMode, string> = { ending: "Ending Soon", price_asc: "Price: Low", price_desc: "Price: High" };
const SORT_CYCLE: SortMode[] = ["ending", "price_asc", "price_desc"];

export default function Marketplace() {
  usePageMeta("Marketplace — TheCardLab", "Buy, sell, and trade verified graded slabs, raw vintage, and sealed wax with zero hidden fees.");
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [sort, setSort] = useState<SortMode>("ending");
  const [filterType, setFilterType] = useState<"all" | "bin" | "auction">("all");
  const [showFilters, setShowFilters] = useState(false);
  const query = CATEGORY_QUERIES[activeCategory] ?? CATEGORY_QUERIES["All Items"];
  const { data: listings, isLoading } = useMarketListings(query);
  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const { fmt } = useCurrency();

  const cycleSort = () => {
    const idx = SORT_CYCLE.indexOf(sort);
    setSort(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]);
  };

  const sortedListings = [...(listings ?? [])].filter((item) => {
    if (filterType === "bin") return item.bids === 0;
    if (filterType === "auction") return item.bids > 0;
    return true;
  }).sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    return 0;
  });

  return (
    <Shell>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Global Exchange</div>
          <h1 className="text-2xl lg:text-4xl font-display font-bold tracking-tight mb-2">Marketplace</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Buy, sell, and trade verified assets with zero hidden fees.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`h-10 px-4 rounded-xl border font-bold flex items-center gap-2 transition-colors ${showFilters ? "bg-primary/10 border-primary/40 text-primary" : "bg-white/5 border-border text-foreground hover:bg-white/10"}`}
          >
            <Filter size={16} /> Filters
          </button>
          <button
            onClick={cycleSort}
            className="h-10 px-4 rounded-xl bg-white/5 border border-border text-foreground font-bold flex items-center gap-2 hover:bg-white/10 transition-colors"
          >
            Sort: {SORT_LABELS[sort]} <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex gap-2 mb-4 p-3 rounded-xl bg-white/5 border border-border items-center">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">Listing Type</span>
          {(["all", "bin", "auction"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`h-7 px-3 rounded-lg text-xs font-bold border transition-colors ${filterType === f ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-white/5 text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "All" : f === "bin" ? "Buy It Now" : "Auction"}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {Object.keys(CATEGORY_QUERIES).map((cat, i) => {
          const variants = ["cyan", "teal", "violet", "gold", "blue", "red", "teal", "gold"] as const;
          return (
            <Pill
              key={cat}
              variant={variants[i % variants.length]}
              className={`px-4 py-2 text-xs cursor-pointer transition-opacity shrink-0 ${activeCategory === cat ? "" : "opacity-50 hover:opacity-100"}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Pill>
          );
        })}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-border animate-pulse aspect-[3/4]" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedListings.map((item, i) => (
            <div
              key={i}
              onClick={() => setSelectedCard({ title: item.title, subtitle: `${fmt(item.price)} · ${item.bids > 0 ? `${item.bids} bids` : "Buy It Now"}`, recommendation: "Submit", externalUrl: item.url, price: item.price })}
            >
              <HoloCard className="p-4 flex flex-col group cursor-pointer h-full">
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-primary/10 to-black/60 flex items-center justify-center">
                  <div className="text-center px-4">
                    <div className="text-4xl mb-2">🃏</div>
                    <div className="text-xs text-muted-foreground font-mono">eBay Live</div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Pill variant="teal" className="backdrop-blur-md bg-black/40 text-xs">
                      {item.bids > 0 ? "Auction" : "BIN"}
                    </Pill>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={14} className="text-primary" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-2">{item.title}</h3>
                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">{item.bids > 0 ? `${item.bids} Bids` : "Price"}</div>
                      <div className="text-xl font-black">{fmt(item.price)}</div>
                    </div>
                    <div className="text-xs font-bold text-primary">{item.timeLeft || "Active"}</div>
                  </div>
                </div>
              </HoloCard>
            </div>
          ))}
          {sortedListings.length === 0 && !isLoading && (
            <div className="col-span-full text-center text-muted-foreground py-16">No listings found.</div>
          )}
        </div>
      )}

      <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
    </Shell>
  );
}
