/**
 * Shared theme detection utility
 * Works in all contexts: React context (useTheme hook), isolated React roots, or DOM-based detection
 */

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/**
 * Hook to detect theme that works in all contexts
 * - Uses useTheme hook if ThemeProvider context is available
 * - Falls back to DOM-based detection for isolated React roots
 */
export function useThemeDetection(): Theme {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const detectTheme = () => {
      const html = document.documentElement;
      const isDark =
        html.classList.contains("dark") ||
        (!html.classList.contains("light") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setTheme(isDark ? "dark" : "light");
    };

    // Try to use ThemeProvider context first (if available)
    try {
      // Dynamic import to avoid errors if next-themes is not available
      const { useTheme: useNextTheme } = require("next-themes");
      const { resolvedTheme } = useNextTheme();
      if (resolvedTheme === "light" || resolvedTheme === "dark") {
        setTheme(resolvedTheme);
        return;
      }
    } catch {
      // ThemeProvider not available, use DOM-based detection
    }

    // Initial detection
    detectTheme();

    // Watch for class changes on html element
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also watch for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => detectTheme();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return theme;
}

/**
 * DOM-based theme detection (no React hooks)
 * Use this in non-React contexts or when React hooks are not available
 */
export function detectThemeFromDOM(): Theme {
  const html = document.documentElement;
  const isDark =
    html.classList.contains("dark") ||
    (!html.classList.contains("light") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  return isDark ? "dark" : "light";
}
