import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { Filter, ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useMarketListings } from "@/hooks/useMarketData";

const CATEGORY_QUERIES: Record<string, string> = {
  "All Items": "sports cards graded PSA",
  "Slabbed": "sports cards PSA graded slab",
  "Raw Vintage": "vintage sports cards raw ungraded",
  "Sealed Wax": "sports cards sealed wax box",
  "Basketball": "basketball cards PSA graded",
  "Football": "football cards PSA graded",
};

export default function Marketplace() {
  const [activeCategory, setActiveCategory] = useState("All Items");
  const query = CATEGORY_QUERIES[activeCategory] ?? CATEGORY_QUERIES["All Items"];
  const { data: listings, isLoading } = useMarketListings(query);

  return (
    <Shell>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Global Exchange</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Marketplace</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Buy, sell, and trade verified assets with zero hidden fees.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-xl bg-white/5 border border-border text-foreground font-bold flex items-center gap-2 hover:bg-white/10 transition-colors">
            <Filter size={16} /> Filters
          </button>
          <button className="h-10 px-4 rounded-xl bg-white/5 border border-border text-foreground font-bold flex items-center gap-2 hover:bg-white/10 transition-colors">
            Sort: Ending Soon <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {Object.keys(CATEGORY_QUERIES).map((cat, i) => (
          <Pill
            key={cat}
            variant={i === 0 ? "cyan" : i === 1 ? "teal" : i === 2 ? "violet" : i === 3 ? "gold" : i === 4 ? "blue" : "red"}
            className={`px-4 py-2 text-xs cursor-pointer transition-opacity ${activeCategory === cat ? "" : "opacity-50 hover:opacity-100"}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Pill>
        ))}
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
          {(listings ?? []).map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer">
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
                      <div className="text-xl font-black">${item.price.toLocaleString()}</div>
                    </div>
                    <div className="text-xs font-bold text-primary">{item.timeLeft || "Active"}</div>
                  </div>
                </div>
              </HoloCard>
            </a>
          ))}
          {(listings ?? []).length === 0 && !isLoading && (
            <div className="col-span-full text-center text-muted-foreground py-16">No listings found.</div>
          )}
        </div>
      )}
    </Shell>
  );
}
