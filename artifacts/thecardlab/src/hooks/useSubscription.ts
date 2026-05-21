import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

export type SubscriptionStatus = {
  isPro: boolean;
  status: string | null;
  currentPeriodEnd: number | null;
  loading: boolean;
  error: string | null;
};

const cache: { data: SubscriptionStatus | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 60_000;

export function useSubscription(): SubscriptionStatus {
  const { isSignedIn, isLoaded } = useAuth();
  const [state, setState] = useState<SubscriptionStatus>({
    isPro: false,
    status: null,
    currentPeriodEnd: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setState({ isPro: false, status: null, currentPeriodEnd: null, loading: false, error: null });
      return;
    }

    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      setState(cache.data);
      return;
    }

    const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

    fetch(`${base}/api/me`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`/api/me returned ${res.status}`);
        return res.json();
      })
      .then((data: { isPro: boolean; subscription?: { status: string; currentPeriodEnd: number } | null }) => {
        const result: SubscriptionStatus = {
          isPro: data.isPro,
          status: data.subscription?.status ?? null,
          currentPeriodEnd: data.subscription?.currentPeriodEnd ?? null,
          loading: false,
          error: null,
        };
        cache.data = result;
        cache.ts = Date.now();
        setState(result);
      })
      .catch((err) => {
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      });
  }, [isLoaded, isSignedIn]);

  return state;
}

export function invalidateSubscriptionCache() {
  cache.data = null;
  cache.ts = 0;
}
