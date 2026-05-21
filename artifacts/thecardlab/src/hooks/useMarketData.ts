import { useQuery } from "@tanstack/react-query";

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export interface MarketSignal {
  type: "price_drop" | "pop_update" | "market_trend";
  card: string;
  message: string;
  time: string;
}

export interface MarketPulse {
  index: number;
  change7d: number;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  volume24h: string;
  topMover: string;
  topMoverChange: string;
  signals: MarketSignal[];
}

export interface TrendingPlayer {
  name: string;
  sport: string;
  trend: "+" | "-" | "→";
  reason: string;
}

export interface TrendingSet {
  name: string;
  year: string;
  sport: string;
  trend: "+" | "-" | "→";
}

export interface MarketTrending {
  players: TrendingPlayer[];
  sets: TrendingSet[];
}

export interface EbayListing {
  title: string;
  price: number;
  bids: number;
  timeLeft: string;
  url: string;
}

export interface CardComps {
  raw: number[];
  psa8: number[];
  psa9: number[];
  psa10: number[];
}

export function useMarketPulse() {
  return useQuery<MarketPulse>({
    queryKey: ["market", "pulse"],
    queryFn: () => fetch(`${API}/api/market/pulse`).then((r) => r.json()),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}

export function useMarketTrending() {
  return useQuery<MarketTrending>({
    queryKey: ["market", "trending"],
    queryFn: () => fetch(`${API}/api/market/trending`).then((r) => r.json()),
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}

export function useMarketListings(q = "sports cards graded PSA") {
  return useQuery<EbayListing[]>({
    queryKey: ["market", "listings", q],
    queryFn: () => fetch(`${API}/api/market/listings?q=${encodeURIComponent(q)}`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useMarketComps(card: string) {
  return useQuery<CardComps>({
    queryKey: ["market", "comps", card],
    queryFn: () => fetch(`${API}/api/market/comps?card=${encodeURIComponent(card)}`).then((r) => r.json()),
    enabled: !!card,
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}
