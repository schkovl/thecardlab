import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { mockVaultItems } from "@/data/vault";
import { ShieldCheck, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";

export default function Vault() {
  const totalInsured = mockVaultItems.reduce((acc, item) => acc + item.insuredValue, 0);

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Secure Storage</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Global Vault</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Tax-free, fully insured secure storage facilities for your premium assets.</p>
        </div>
        <button onClick={() => toast("Submission flow started")} className="h-10 px-5 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center gap-2 shadow-[0_10px_30px_rgba(0,229,255,0.2)]">
          <Truck size={16} /> Send to Vault
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <HoloCard>
          <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Vault Balance</div>
          <div className="text-[32px] font-black mt-1">${totalInsured.toLocaleString()}</div>
          <div className="text-xs text-secondary mt-2 flex items-center gap-1"><ShieldCheck size={14}/> Fully Insured by Lloyd's</div>
        </HoloCard>
        <HoloCard>
          <div className="text-xs font-black text-muted-foreground tracking-[0.5px] uppercase">Items Stored</div>
          <div className="text-[32px] font-black mt-1">{mockVaultItems.length}</div>
          <div className="text-xs text-muted-foreground mt-2">Across 1 location</div>
        </HoloCard>
        <HoloCard className="border-primary/30 bg-primary/5">
          <div className="text-xs font-black text-primary tracking-[0.5px] uppercase">Tax Savings</div>
          <div className="text-[32px] font-black text-primary mt-1">${(totalInsured * 0.08).toLocaleString()}</div>
          <div className="text-xs text-primary/80 mt-2">Est. sales tax avoided</div>
        </HoloCard>
      </div>

      <h2 className="text-lg font-bold mb-4">Your Vaulted Items</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockVaultItems.map(item => (
          <HoloCard key={item.id} className="flex gap-4 p-4">
            <div className="w-20 h-28 rounded-lg overflow-hidden bg-black/40 shrink-0">
              <img src={item.image} alt={item.card} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm leading-tight pr-4">{item.card}</h3>
                  <Pill variant="cyan" className="shrink-0">{item.status}</Pill>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={12} /> {item.location} • Since {item.dateStored}
                </div>
              </div>
              <div className="flex justify-between items-end mt-4">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Insured Value</div>
                  <div className="font-bold">${item.insuredValue.toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs font-bold text-foreground hover:text-primary transition-colors">Request Image</button>
                  <button className="text-xs font-bold text-foreground hover:text-primary transition-colors">Withdraw</button>
                </div>
              </div>
            </div>
          </HoloCard>
        ))}
      </div>
    </Shell>
  );
}
