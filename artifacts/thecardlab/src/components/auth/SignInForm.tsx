import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthActions, startOAuth } from "@/lib/auth";

interface SignInFormProps {
  signUpUrl: string;
  redirectUrl: string;
}

export function SignInForm({ signUpUrl, redirectUrl }: SignInFormProps) {
  const { signIn } = useAuthActions();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
      setLocation(redirectUrl);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message !== "Request failed"
          ? err.message
          : "Incorrect email or password.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOAuth(provider: "google" | "microsoft") {
    setOauthLoading(provider);
    setError("");
    startOAuth(provider, redirectUrl);
  }

  return (
    <div className="bg-[#0d1a31] rounded-[22px] w-[440px] max-w-full border border-[#1e3a5f] overflow-hidden">
      <div className="p-8">
        <h1 className="text-white font-black tracking-tight text-2xl mb-1">Welcome back</h1>
        <p className="text-[#64748b] text-sm mb-6">Sign in to TheCardLab</p>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={!!oauthLoading || loading}
            className="flex items-center justify-center gap-3 w-full border border-[#1e3a5f] bg-[#050914] hover:bg-[#0d1a31] text-[#e2e8f0] font-semibold rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
          >
            {oauthLoading === "google" ? (
              <span className="w-5 h-5 border-2 border-[#e2e8f0] border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuth("microsoft")}
            disabled={!!oauthLoading || loading}
            className="flex items-center justify-center gap-3 w-full border border-[#1e3a5f] bg-[#050914] hover:bg-[#0d1a31] text-[#e2e8f0] font-semibold rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
          >
            {oauthLoading === "microsoft" ? (
              <span className="w-5 h-5 border-2 border-[#e2e8f0] border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#f25022" d="M1 1h10v10H1z"/>
                <path fill="#00a4ef" d="M13 1h10v10H13z"/>
                <path fill="#7fba00" d="M1 13h10v10H1z"/>
                <path fill="#ffb900" d="M13 13h10v10H13z"/>
              </svg>
            )}
            Continue with Microsoft
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[#1e3a5f]" />
          <span className="text-[#475569] text-xs">or</span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
        </div>

        {/* Email + password form */}
        <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4">
          <div>
            <label className="block text-[#94a3b8] text-xs font-bold uppercase tracking-wide mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#050914] border border-[#1e3a5f] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00e5ff] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-[#94a3b8] text-xs font-bold uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[#050914] border border-[#1e3a5f] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00e5ff] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[#ff4d61] text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !!oauthLoading}
            className="w-full bg-[#00e5ff] text-[#03111c] font-black rounded-xl py-3 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:bg-[#22d3a6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-[#03111c] border-t-transparent rounded-full animate-spin" />
            ) : "Sign in"}
          </button>
        </form>

        <div className="flex items-center justify-end mt-5 text-sm">
          <span className="text-[#64748b]">
            No account?{" "}
            <a href={signUpUrl} className="text-[#00e5ff] font-semibold hover:underline">
              Sign up
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
