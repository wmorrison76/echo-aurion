import { useState, useEffect } from "react";

/**
 * usePerfMode - A hook to determine performance mode (e.g., for animation toggles, device limits).
 * You can enhance this logic based on user agent, hardware capabilities, or user preference later.
 */
export const usePerfMode = (): "high" | "low" => {
  const [perfMode, setPerfMode] = useState<"high" | "low">("high");

  useEffect(() => {
    // Basic mock logic — replace with actual detection if needed
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;

    if (prefersReducedMotion || isLowEndDevice) {
      setPerfMode("low");
    } else {
      setPerfMode("high");
    }
  }, []);

  return perfMode;
};
