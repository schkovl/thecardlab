import { Shell } from "@/components/layout/Shell";

export default function MobileApp() {
  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Companion</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Mobile App</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">The full power of TheCardLab, optimized for iOS.</p>
        </div>
      </div>

      <div className="flex justify-center items-center py-10">
        <div className="relative w-[390px] h-[844px] bg-[#000] rounded-[55px] border-[12px] border-[#1a1a1a] shadow-2xl overflow-hidden ring-1 ring-white/10">
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-50"></div>
          
          {/* App Content */}
          <div className="w-full h-full bg-gradient-to-b from-[#081020] to-[#030711] text-white flex flex-col relative">
            
            {/* Header */}
            <div className="pt-16 pb-4 px-6 flex justify-between items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-black font-black text-xs">AC</div>
              <div className="flex gap-4">
                <span className="text-xl">🔍</span>
                <span className="text-xl">🔔</span>
              </div>
            </div>

            <div className="px-6 flex-1 overflow-y-auto pb-24 scrollbar-hide">
              <h1 className="text-3xl font-display font-bold mb-6">Overview</h1>
              
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#101f3a] to-[#071225] border border-white/10 mb-4 shadow-xl">
                <div className="text-xs font-bold text-[#b7c4d7] mb-1">PORTFOLIO VALUE</div>
                <div className="text-3xl font-black mb-1">$278,420</div>
                <div className="text-sm text-secondary font-bold">+12.4%</div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-3xl bg-[#0d1a31] border border-white/5">
                  <div className="text-[10px] font-bold text-muted-foreground mb-1 uppercase">Raw Opps</div>
                  <div className="text-xl font-black text-white">127</div>
                </div>
                <div className="p-4 rounded-3xl bg-[#0d1a31] border border-white/5">
                  <div className="text-[10px] font-bold text-muted-foreground mb-1 uppercase">AI Accuracy</div>
                  <div className="text-xl font-black text-primary">92.7%</div>
                </div>
              </div>

              <h2 className="text-lg font-bold mb-4">Quick Scan</h2>
              <div className="p-6 rounded-3xl border border-primary/30 bg-primary/10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-3">
                  <span className="text-black text-xl">📷</span>
                </div>
                <div className="font-bold text-primary mb-1">Scan a Card</div>
                <div className="text-xs text-primary/70">Instantly get comps and grades</div>
              </div>
            </div>

            {/* Bottom Tab Bar */}
            <div className="absolute bottom-0 w-full h-[90px] bg-[#050914]/90 backdrop-blur-xl border-t border-white/5 flex justify-around items-center px-6 pb-6">
              <div className="flex flex-col items-center text-primary">
                <span className="text-xl mb-1">⌂</span>
                <span className="text-[10px] font-bold">Home</span>
              </div>
              <div className="flex flex-col items-center text-muted-foreground">
                <span className="text-xl mb-1">🔍</span>
                <span className="text-[10px] font-bold">Search</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary -mt-8 flex items-center justify-center text-black text-2xl shadow-[0_0_20px_rgba(0,229,255,0.4)]">
                +
              </div>
              <div className="flex flex-col items-center text-muted-foreground">
                <span className="text-xl mb-1">📊</span>
                <span className="text-[10px] font-bold">Portfolio</span>
              </div>
              <div className="flex flex-col items-center text-muted-foreground">
                <span className="text-xl mb-1">⚙️</span>
                <span className="text-[10px] font-bold">Settings</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Shell>
  );
}
