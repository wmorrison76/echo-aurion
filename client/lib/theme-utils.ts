/**
 * Theme Utilities
 * 
 * Provides utilities for consistent dark/light mode support across all modules
 * Ensures all modules respond to theme changes properly
 */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Hook to get current theme with SSR safety
 */
export function useAppTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || systemTheme || "dark") : "dark";
  const isDark = currentTheme === "dark";
  const isLight = currentTheme === "light";

  return {
    theme: currentTheme as "light" | "dark",
    setTheme,
    isDark,
    isLight,
    mounted,
  };
}

/**
 * Theme-aware className helper
 * Applies different classes based on theme
 */
export function themeClass(classes: {
  light?: string;
  dark?: string;
  default?: string;
}): string {
  const { isDark } = useAppTheme();
  
  const base = classes.default || "";
  const theme = isDark ? (classes.dark || "") : (classes.light || "");

  return [base, theme].filter(Boolean).join(" ");
}

/**
 * Ensure module wrapper has proper theme classes
 */
export function useThemeWrapper() {
  const { theme, isDark, mounted } = useAppTheme();

  return {
    themeClass: `bg-background text-foreground ${isDark ? "dark" : ""}`,
    theme,
    isDark,
    mounted,
  };
}

/**
 * Theme-aware background colors
 */
export const themeBg = {
  primary: "bg-background",
  secondary: "bg-surface",
  accent: "bg-primary/10",
  muted: "bg-muted",
  card: "bg-card",
  border: "bg-border",
} as const;

/**
 * Theme-aware text colors
 */
export const themeText = {
  primary: "text-foreground",
  secondary: "text-muted-foreground",
  accent: "text-primary",
  muted: "text-muted",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
} as const;

/**
 * Theme-aware border colors
 */
export const themeBorder = {
  default: "border-border",
  muted: "border-muted",
  accent: "border-primary/20",
  focus: "border-primary",
} as const;
