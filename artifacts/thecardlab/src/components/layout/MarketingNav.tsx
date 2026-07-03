import { Link } from "wouter";
import { FlaskConical } from "lucide-react";
import { SignInButton, useUser } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function MarketingNav() {
  const { isSignedIn } = useUser();
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-[#050914]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center">
              <FlaskConical size={14} className="text-primary" />
            </div>
            <span className="font-black text-base tracking-tight">
              TheCard<span className="text-primary">Lab</span>
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/pricing">
            <span className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Pricing</span>
          </Link>
          {isSignedIn ? (
            <Link href="/dashboard">
              <button className="h-8 px-4 rounded-xl bg-primary text-[#03111c] font-bold text-xs hover:brightness-110 transition-all">
                Dashboard
              </button>
            </Link>
          ) : (
            <SignInButton mode="redirect" forceRedirectUrl={`${basePath}/dashboard`}>
              <button className="h-8 px-4 rounded-xl bg-primary text-[#03111c] font-bold text-xs hover:brightness-110 transition-all">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </nav>
  );
}
