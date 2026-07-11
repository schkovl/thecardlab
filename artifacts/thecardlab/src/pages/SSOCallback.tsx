import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuthActions } from "@/lib/auth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * The server-side OAuth callback sets the session cookie and redirects here
 * (or to "/"). All that's left is to load the session and route the user.
 */
export default function SSOCallback() {
  const { refresh } = useAuthActions();
  const [, setLocation] = useLocation();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void refresh().then(() => setLocation(`${basePath}/dashboard`));
  }, [refresh, setLocation]);

  return (
    <div className="min-h-screen bg-[#050914] flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
