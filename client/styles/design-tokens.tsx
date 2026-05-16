/**
 * Echo AURION · Unified Design Tokens
 *
 * SINGLE SOURCE OF TRUTH for every module's look & feel.
 * Import from here — do NOT hard-code hex values or Tailwind arbitrary values
 * when a token exists. When the theme switches dark ↔ light the whole app
 * re-paints without touching a single component.
 *
 * Usage:
 *   import { tokens, useThemeTokens } from "@/styles/design-tokens";
 *   const t = useThemeTokens();
 *   <div style={{ background: t.panelBg, color: t.textPrimary }} />
 */
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

export interface ThemeTokens {
  // Surfaces (top = darkest bg, bottom = most elevated card)
  panelBg: string;
  surface: string;
  surfaceElevated: string;
  subtle: string;
  // Borders
  border: string;
  borderStrong: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Brand accent (Oracle-gold)
  accent: string;
  accentSoft: string;
  // Semantic
  healthy: string;
  watch: string;
  drift: string;
  critical: string;
  info: string;
  // Backdrop image URL
  backdropUrl: string;
}

const DARK: ThemeTokens = {
  panelBg:        "#0a0e17",
  surface:        "#141825",
  surfaceElevated:"#1a1f2e",
  subtle:         "rgba(255,255,255,0.04)",
  border:         "rgba(255,255,255,0.06)",
  borderStrong:   "rgba(255,255,255,0.14)",
  textPrimary:    "#e2e8f0",
  textSecondary:  "#94a3b8",
  textMuted:      "#64748b",
  accent:         "#c8a97e",
  accentSoft:     "rgba(200,169,126,0.14)",
  healthy:        "#10b981",
  watch:          "#f59e0b",
  drift:          "#f97316",
  critical:       "#ef4444",
  info:           "#60a5fa",
  backdropUrl:    "/backdrops/aurion-dark.svg",
};

const LIGHT: ThemeTokens = {
  panelBg:        "#f4f1ea",   // warm parchment
  surface:        "#ffffff",
  surfaceElevated:"#ffffff",
  subtle:         "rgba(15,23,42,0.04)",
  border:         "rgba(15,23,42,0.08)",
  borderStrong:   "rgba(15,23,42,0.18)",
  textPrimary:    "#1e293b",
  textSecondary:  "#475569",
  textMuted:      "#94a3b8",
  accent:         "#8a6d3b",   // deeper bronze for contrast on light
  accentSoft:     "rgba(138,109,59,0.14)",
  healthy:        "#059669",
  watch:          "#d97706",
  drift:          "#ea580c",
  critical:       "#dc2626",
  info:           "#2563eb",
  backdropUrl:    "/backdrops/aurion-light.svg",
};

export const tokens = { dark: DARK, light: LIGHT };

// ── Theme context ──────────────────────────────────────────────────────
interface ThemeCtx { mode: ThemeMode; setMode: (m: ThemeMode) => void; t: ThemeTokens; toggle: () => void; }
const ThemeContext = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "echo-theme-mode";

export function AurionThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved === "dark" || saved === "light") return saved;
    // iter263 · Fall back to legacy theme-manager preference if present so we
    // don't reset users who chose a mode via the old Settings panel.
    try {
      const legacy = localStorage.getItem("luccca-theme-preferences");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed?.appearance === "dark" || parsed?.appearance === "light") {
          return parsed.appearance;
        }
      }
    } catch {}
    // System preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
    return "dark";
  });

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
      // iter263 · Keep legacy theme-manager in sync so it doesn't override us on reload.
      // theme-manager reads from `luccca-theme-preferences` and applies `appearance`.
      try {
        const raw = localStorage.getItem("luccca-theme-preferences");
        const parsed = raw ? JSON.parse(raw) : {};
        parsed.appearance = m;
        localStorage.setItem("luccca-theme-preferences", JSON.stringify(parsed));
        // Let theme-manager know so applyTheme() re-runs.
        window.dispatchEvent(
          new CustomEvent("theme-preferences-changed", { detail: parsed }),
        );
      } catch {}
    } catch {}
  };
  const toggle = () => setMode(mode === "dark" ? "light" : "dark");

  // Reflect mode on <html> so Tailwind dark: classes work AND so bare CSS can query.
  // iter262 · Also inject tokens as CSS custom properties so every existing
  // module (Pastry, Culinary, Schedule, PurchRec, etc.) automatically re-themes
  // without a per-component edit — they just need to use var(--aurion-*).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("theme-dark", "theme-light");
    document.documentElement.classList.add(`theme-${mode}`);
    document.documentElement.dataset.themeMode = mode;
    // Tailwind dark class
    if (mode === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    // Inject CSS custom properties
    const t = mode === "dark" ? DARK : LIGHT;
    const r = document.documentElement.style;
    r.setProperty("--aurion-panel-bg", t.panelBg);
    r.setProperty("--aurion-surface", t.surface);
    r.setProperty("--aurion-surface-elevated", t.surfaceElevated);
    r.setProperty("--aurion-subtle", t.subtle);
    r.setProperty("--aurion-border", t.border);
    r.setProperty("--aurion-border-strong", t.borderStrong);
    r.setProperty("--aurion-text-primary", t.textPrimary);
    r.setProperty("--aurion-text-secondary", t.textSecondary);
    r.setProperty("--aurion-text-muted", t.textMuted);
    r.setProperty("--aurion-accent", t.accent);
    r.setProperty("--aurion-accent-soft", t.accentSoft);
    r.setProperty("--aurion-healthy", t.healthy);
    r.setProperty("--aurion-watch", t.watch);
    r.setProperty("--aurion-drift", t.drift);
    r.setProperty("--aurion-critical", t.critical);
    r.setProperty("--aurion-info", t.info);
    r.setProperty("--aurion-backdrop-url", `url(${t.backdropUrl})`);
  }, [mode]);

  const t = mode === "dark" ? DARK : LIGHT;
  return (
    <ThemeContext.Provider value={{ mode, setMode, t, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeTokens(): ThemeTokens {
  const ctx = useContext(ThemeContext);
  return ctx?.t ?? DARK;
}
export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback so components don't crash if provider is missing during HMR
    return { mode: "dark", setMode: () => {}, t: DARK, toggle: () => {} };
  }
  return ctx;
}
