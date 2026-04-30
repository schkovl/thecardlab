import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.documentElement.classList.add("dark");

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* no-op: PWA install still works without an active SW */
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
