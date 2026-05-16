/**
 * Shows a visible banner when module health is degraded (e.g. health check timeout).
 * Makes "no errors but not rendering" easier to diagnose by surfacing backend/degraded state.
 */

import { useState, useEffect, useRef } from "react";
import { getModuleHealth, type ValidationResult } from "@/lib/module-validator";
import { cn } from "@/lib/glass";

const BANNER_DISMISSED_KEY = "degraded-banner-dismissed";

export default function DegradedModeBanner() {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(BANNER_DISMISSED_KEY) === "1";
  });

  useEffect(() => {
    const clearRetry = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const scheduleRetry = () => {
      if (dismissed || retryTimerRef.current) return;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        void loadHealth();
      }, 10000);
    };

    const loadHealth = async () => {
      try {
        const r = await getModuleHealth();
        setResult(r);
        if (r.systemHealth === "healthy") {
          clearRetry();
          return;
        }
        scheduleRetry();
      } catch {
        setResult(null);
        scheduleRetry();
      }
    };

    const onDegraded = (e: CustomEvent<ValidationResult>) => {
      setResult(e.detail);
      scheduleRetry();
    };

    window.addEventListener("module-health-degraded", onDegraded as EventListener);

    const t = setTimeout(() => {
      void loadHealth();
    }, 300);

    return () => {
      clearTimeout(t);
      clearRetry();
      window.removeEventListener("module-health-degraded", onDegraded as EventListener);
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, "1");
    } catch (_) {}
  };

  if (!result || result.systemHealth === "healthy" || dismissed) return null;

  const isCritical = result.systemHealth === "critical";
  const summary =
    result.warnings[0] ||
    (result.backendConnected ? "Some modules may not work correctly." : "Backend unreachable – running in degraded mode.");

  return (
    <div
      role="alert"
      className={cn(
        "fixed left-0 right-0 top-0 z-[30000] flex items-center justify-between gap-4 px-4 py-2 text-sm shadow-md",
        "border-b",
        isCritical
          ? "bg-destructive/15 text-destructive border-destructive/40"
          : "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40"
      )}
      style={{ marginLeft: "var(--sidebar-width, 256px)", marginTop: 48 }}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {isCritical ? "System status: critical" : "System running in degraded mode"}
        </span>
        <span className="opacity-90">{summary}</span>
        <span className="text-xs opacity-75">
          (Check console Warnings or run backend: pnpm run dev)
        </span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded px-2 py-1 hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Dismiss banner"
      >
        Dismiss
      </button>
    </div>
  );
}
