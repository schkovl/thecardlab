import { useSignUp, useClerk } from "@clerk/react";
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SSOContinue() {
  const { signUp, isLoaded } = useSignUp();
  const { setActive } = useClerk();
  const [, setLocation] = useLocation();
  const ran = useRef(false);

  useEffect(() => {
    if (!isLoaded || ran.current) return;
    ran.current = true;

    async function complete() {
      if (!signUp) {
        setLocation(`${basePath}/sign-in`);
        return;
      }

      try {
        let current = signUp;

        // If password is a missing requirement, auto-set one silently
        if (current.missingFields?.includes("password")) {
          const randomPassword = `Tcl-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}!`;
          current = await current.update({ password: randomPassword });
        }

        if (current.status === "complete" && current.createdSessionId) {
          await setActive({ session: current.createdSessionId });
          setLocation(`${basePath}/dashboard`);
        } else {
          // Other missing fields — fall back to sign-up page
          setLocation(`${basePath}/sign-up`);
        }
      } catch {
        setLocation(`${basePath}/sign-up`);
      }
    }

    complete();
  }, [isLoaded, signUp, setActive, setLocation]);

  return (
    <div className="min-h-screen bg-[#050914] flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
