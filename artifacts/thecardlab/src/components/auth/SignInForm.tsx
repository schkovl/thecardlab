import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthActions } from "@/lib/auth";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

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
  const [oauthActive, setOauthActive] = useState(false);

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

  return (
    <div className="bg-[#0d1a31] rounded-[22px] w-[440px] max-w-full border border-[#1e3a5f] overflow-hidden">
      <div className="p-8">
        <h1 className="text-white font-black tracking-tight text-2xl mb-1">Welcome back</h1>
        <p className="text-[#64748b] text-sm mb-6">Sign in to TheCardLab</p>

        <OAuthButtons
          redirectUrl={redirectUrl}
          disabled={loading}
          onStart={() => setOauthActive(true)}
        />

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
            disabled={loading || oauthActive}
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
