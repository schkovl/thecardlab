import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { mockMarketplace } from "@/data/marketplace";
import { Filter, ChevronDown } from "lucide-react";

export default function Marketplace() {
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
        <Pill variant="cyan" className="px-4 py-2 text-xs cursor-pointer">All Items</Pill>
        <Pill variant="teal" className="px-4 py-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">Slabbed</Pill>
        <Pill variant="violet" className="px-4 py-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">Raw Vintage</Pill>
        <Pill variant="gold" className="px-4 py-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">Sealed Wax</Pill>
        <Pill variant="blue" className="px-4 py-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">Basketball</Pill>
        <Pill variant="red" className="px-4 py-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">Football</Pill>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {mockMarketplace.map(item => (
          <HoloCard key={item.id} className="p-4 flex flex-col group cursor-pointer">
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-black/40">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-2 left-2">
                <Pill variant={item.type === 'Slabbed' ? 'teal' : item.type === 'Raw' ? 'violet' : 'gold'} className="backdrop-blur-md bg-black/40">
                  {item.grade}
                </Pill>
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-2">{item.title}</h3>
              <div className="mt-auto flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">{item.bids > 0 ? `${item.bids} Bids` : 'Price'}</div>
                  <div className="text-xl font-black">${item.price.toLocaleString()}</div>
                </div>
                <div className="text-xs font-bold text-primary">{item.time}</div>
              </div>
            </div>
          </HoloCard>
        ))}
      </div>
    </Shell>
  );
}
