import { useEffect, useState } from "react";
import {
  fetchOAuthProviders,
  startOAuth,
  type OAuthProvider,
} from "@/lib/auth";

interface OAuthButtonsProps {
  redirectUrl: string;
  disabled?: boolean;
  /** Fired when a provider redirect begins, so forms can lock their inputs. */
  onStart?: (providerId: string) => void;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  microsoft: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#00a4ef" d="M13 1h10v10H13z"/>
      <path fill="#7fba00" d="M1 13h10v10H1z"/>
      <path fill="#ffb900" d="M13 13h10v10H13z"/>
    </svg>
  ),
  apple: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"/>
    </svg>
  ),
};

/**
 * Renders a button per *configured* OAuth provider, reported live by
 * /api/auth/oauth/providers. Nothing renders while loading or when no
 * provider is configured — the parent decides whether to show a divider.
 */
export function OAuthButtons({ redirectUrl, disabled, onStart }: OAuthButtonsProps) {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchOAuthProviders().then((list) => {
      if (!cancelled) setProviders(list.filter((p) => p.configured));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (providers.length === 0) return null;

  return (
    <>
      <div className="flex flex-col gap-3 mb-6">
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setLoadingId(p.id);
              onStart?.(p.id);
              startOAuth(p.id, redirectUrl);
            }}
            disabled={disabled || !!loadingId}
            className="flex items-center justify-center gap-3 w-full border border-[#1e3a5f] bg-[#050914] hover:bg-[#0d1a31] text-[#e2e8f0] font-semibold rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
          >
            {loadingId === p.id ? (
              <span className="w-5 h-5 border-2 border-[#e2e8f0] border-t-transparent rounded-full animate-spin" />
            ) : (
              PROVIDER_ICONS[p.id] ?? null
            )}
            Continue with {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-[#1e3a5f]" />
        <span className="text-[#475569] text-xs">or</span>
        <div className="flex-1 h-px bg-[#1e3a5f]" />
      </div>
    </>
  );
}
