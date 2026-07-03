import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="text-[120px] font-black leading-none text-primary/20 select-none mb-2">404</div>
        <h1 className="text-2xl font-bold mb-3">Page not found</h1>
        <p className="text-muted-foreground text-sm mb-8 max-w-xs">
          This page doesn&apos;t exist or was moved. Head back to the dashboard.
        </p>
        <Link href="/dashboard">
          <button className="h-10 px-6 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center gap-2 shadow-[0_10px_30px_rgba(0,229,255,0.2)] hover:brightness-110 transition-all">
            <Home size={16} /> Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
