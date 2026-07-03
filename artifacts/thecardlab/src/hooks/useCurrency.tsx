import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const CAD_PER_USD = 1.36;
const STORAGE_KEY = "tcl_currency";

interface CurrencyCtx {
  isCad: boolean;
  toggle: () => void;
  fmt: (usdAmount: number) => string;
  fmtSub: (usdAmount: number) => string | null;
  fmtK: (usdAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyCtx>({
  isCad: true,
  toggle: () => {},
  fmt: (n) => `$${n.toLocaleString()}`,
  fmtSub: () => null,
  fmtK: (n) => (n >= 1000 ? `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `$${n.toLocaleString()}`),
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [isCad, setIsCad] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "CAD";
    return true; // default CAD until IP detection resolves
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return;
    // Auto-detect country via IP; default to CAD on any failure
    fetch("https://ipapi.co/country_code")
      .then((r) => r.text())
      .then((code) => {
        const isCanada = code.trim() === "CA";
        setIsCad(isCanada);
        localStorage.setItem(STORAGE_KEY, isCanada ? "CAD" : "USD");
      })
      .catch(() => {
        localStorage.setItem(STORAGE_KEY, "CAD");
      });
  }, []);

  const toggle = () => {
    setIsCad((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, next ? "CAD" : "USD");
      return next;
    });
  };

  const fmt = (usdAmount: number): string => {
    if (isCad) return `CA$${Math.round(usdAmount * CAD_PER_USD).toLocaleString()}`;
    return `$${usdAmount.toLocaleString()}`;
  };

  const fmtSub = (usdAmount: number): string | null => {
    if (!isCad) return null;
    return `USD $${usdAmount.toLocaleString()}`;
  };

  const fmtK = (usdAmount: number): string => {
    const val = isCad ? Math.round(usdAmount * CAD_PER_USD) : usdAmount;
    const sym = isCad ? "CA$" : "$";
    return val >= 1000
      ? `${sym}${(val / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : `${sym}${val.toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider value={{ isCad, toggle, fmt, fmtSub, fmtK }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
