import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { mockShows } from "@/data/shows";
import { Calendar as CalendarIcon, MapPin, Users, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Shows() {
  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Events</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Card Shows</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Find upcoming card shows, conventions, and trade nights near you.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <Pill variant="cyan" className="px-4 py-2 text-xs cursor-pointer">All Regions</Pill>
        <Pill variant="teal" className="px-4 py-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">Midwest</Pill>
        <Pill variant="violet" className="px-4 py-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">South</Pill>
        <Pill variant="gold" className="px-4 py-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">West Coast</Pill>
        <Pill variant="blue" className="px-4 py-2 text-xs opacity-50 hover:opacity-100 cursor-pointer">East Coast</Pill>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mockShows.map(show => (
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
              <div className="text-xs mt-2">{show.venue}</div>
            </div>
            
            <div className="shrink-0 flex gap-3">
              <button className="h-10 px-4 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors">Details</button>
              <button onClick={() => toast.success("Added to calendar")} className="h-10 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold hover:bg-primary/20 transition-colors flex items-center gap-2">
                <Plus size={16} /> Calendar
              </button>
            </div>
          </HoloCard>
        ))}
      </div>
    </Shell>
  );
}
