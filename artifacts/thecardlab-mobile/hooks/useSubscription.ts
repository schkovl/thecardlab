import { useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";

export type SubscriptionState = {
  isPro: boolean;
  status: string | null;
  loading: boolean;
};

const cache: { data: SubscriptionState | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 60_000;

export function useSubscription(): SubscriptionState {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isPro: false,
    status: null,
    loading: true,
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setState({ isPro: false, status: null, loading: false });
      return;
    }

    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      setState(cache.data);
      return;
    }

    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) {
      setState({ isPro: false, status: null, loading: false });
      return;
    }

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`https://${domain}/api/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`/api/me returned ${res.status}`);
        const data = (await res.json()) as {
          isPro: boolean;
          subscription?: { status: string } | null;
        };
        const result: SubscriptionState = {
          isPro: data.isPro,
          status: data.subscription?.status ?? null,
          loading: false,
        };
        cache.data = result;
        cache.ts = Date.now();
        setState(result);
      } catch {
        setState({ isPro: false, status: null, loading: false });
      }
    })();
  }, [isLoaded, isSignedIn]);

  return state;
}

export function invalidateSubscriptionCache() {
  cache.data = null;
  cache.ts = 0;
}
