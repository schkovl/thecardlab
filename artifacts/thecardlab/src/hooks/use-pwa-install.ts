import { useEffect, useState, useCallback } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type Platform = "ios" | "android" | "desktop-chrome" | "desktop-safari" | "desktop-firefox" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Chrome|Edg/i.test(ua)) return "desktop-chrome";
  if (/Safari/i.test(ua)) return "desktop-safari";
  if (/Firefox/i.test(ua)) return "desktop-firefox";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)")?.matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(isStandalone());
  const [platform] = useState<Platform>(detectPlatform());

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return { ok: false, reason: "no-prompt" as const };
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return { ok: choice.outcome === "accepted", reason: choice.outcome };
  }, [deferred]);

  return {
    canPromptInstall: !!deferred,
    installed,
    platform,
    promptInstall,
  };
}
