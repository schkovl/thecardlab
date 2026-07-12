import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthActions } from "@/lib/auth";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

interface SignUpFormProps {
  signInUrl: string;
  redirectUrl: string;
}

export function SignUpForm({ signInUrl, redirectUrl }: SignUpFormProps) {
  const { signUp } = useAuthActions();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthActive, setOauthActive] = useState(false);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signUp({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      });
      setLocation(redirectUrl);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message !== "Request failed"
          ? err.message
          : "Sign up failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-[#050914] border border-[#1e3a5f] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00e5ff] transition-colors";
  const labelClass = "block text-[#94a3b8] text-xs font-bold uppercase tracking-wide mb-1.5";

  return (
    <div className="bg-[#0d1a31] rounded-[22px] w-[440px] max-w-full border border-[#1e3a5f] overflow-hidden">
      <div className="p-8">
        <h1 className="text-white font-black tracking-tight text-2xl mb-1">Create your account</h1>
        <p className="text-[#64748b] text-sm mb-6">Join TheCardLab — AI-powered card intelligence</p>

        <OAuthButtons
          redirectUrl={redirectUrl}
          disabled={loading}
          onStart={() => setOauthActive(true)}
        />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First name</label>
              <input type="text" value={form.firstName} onChange={field("firstName")} required autoComplete="given-name" className={inputClass} placeholder="Jane" />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input type="text" value={form.lastName} onChange={field("lastName")} required autoComplete="family-name" className={inputClass} placeholder="Doe" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email address</label>
            <input type="email" value={form.email} onChange={field("email")} required autoComplete="email" className={inputClass} placeholder="you@example.com" />
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <input type="password" value={form.password} onChange={field("password")} required minLength={8} autoComplete="new-password" className={inputClass} placeholder="At least 8 characters" />
          </div>

          {error && <p className="text-[#ff4d61] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || oauthActive}
            className="w-full bg-[#00e5ff] text-[#03111c] font-black rounded-xl py-3 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:bg-[#22d3a6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <span className="w-5 h-5 border-2 border-[#03111c] border-t-transparent rounded-full animate-spin" /> : "Create account"}
          </button>
        </form>

        <p className="text-center text-[#64748b] text-sm mt-5">
          Already have an account?{" "}
          <a href={signInUrl} className="text-[#00e5ff] font-semibold hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
