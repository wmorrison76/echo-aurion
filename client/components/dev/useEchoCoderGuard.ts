import { useEffect } from "react";

export function useEchoCoderGuard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // PANIC LOCK — Cmd + Shift + Esc
      if (e.metaKey && e.shiftKey && e.key === "Escape") {
        fetch("/api/echocoder/lock", { method: "POST" });
        console.warn("[EchoCoder] Panic lock triggered");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
