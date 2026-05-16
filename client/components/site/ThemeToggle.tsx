/**
 * Echo AURION · Theme Toggle Icon (iter261)
 *
 * SINGLE global icon that flips between dark and light mode.
 * Replaces the old theme picker inside Settings.
 *
 * Placement: top-right of desktop shell, next to UserAvatarMenu.
 */
import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/styles/design-tokens";

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export default function ThemeToggle({ compact, className = "" }: ThemeToggleProps) {
  const { mode, toggle, t } = useTheme();
  const Icon = mode === "dark" ? Sun : Moon;
  const size = compact ? "w-7 h-7" : "w-8 h-8";
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle-btn"
      aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      className={`group relative inline-flex items-center justify-center ${size} rounded-full border transition-all hover:scale-105 active:scale-95 ${className}`}
      style={{
        background: t.surface,
        borderColor: t.border,
        color: t.accent,
      }}
    >
      <Icon className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12" />
      <span className="sr-only">{mode === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
