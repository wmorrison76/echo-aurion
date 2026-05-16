/**
 * Glass Design System Utilities
 * Combines Tailwind classes with glass morphism effects
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes intelligently
 * Prevents conflicting utilities and keeps the most specific
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Glass panel classes for floating components
 * Includes backdrop blur, borders, and shadow effects
 */
export const glass = {
  // Base glass effect (applies to both light and dark modes)
  base: "backdrop-blur-[12px] rounded-lg overflow-hidden",

  // Panel wrapper - large floating container
  panel: cn(
    "glass-panel",
    "rounded-lg overflow-hidden",
    "shadow-lg"
  ),

  // Card - smaller glass container
  card: cn(
    "glass-card",
    "rounded-lg overflow-hidden",
    "backdrop-blur-[12px]"
  ),

  // Button - interactive glass button
  button: cn(
    "glass-button",
    "rounded-md px-3 py-2",
    "transition-all duration-200",
    "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
  ),

  // Input - glass form input
  input: cn(
    "glass-input",
    "rounded-md px-3 py-2",
    "backdrop-blur-[8px]",
    "transition-all duration-200",
    "focus:outline-none focus:ring-2"
  ),

  // Header - glass header bar
  header: cn(
    "glass-panel",
    "border-b",
    "px-4 py-3",
    "backdrop-blur-[12px]"
  ),

  // Overlay - semi-transparent glass overlay
  overlay: cn(
    "glass-overlay",
    "fixed inset-0",
    "backdrop-blur-[4px]"
  ),
};

/**
 * Color scheme utilities
 */
export const colors = {
  cyan: "theme-cyan",
  blue: "theme-blue",
  emerald: "theme-emerald",
  violet: "theme-violet",
  rose: "theme-rose",
} as const;

export type ColorScheme = keyof typeof colors;

/**
 * Get all available color schemes
 */
export const colorSchemes: Array<{ id: ColorScheme; label: string; emoji: string }> = [
  { id: "cyan", label: "Cyan", emoji: "🔵" },
  { id: "blue", label: "Blue", emoji: "🔷" },
  { id: "emerald", label: "Emerald", emoji: "💚" },
  { id: "violet", label: "Violet", emoji: "💜" },
  { id: "rose", label: "Rose", emoji: "🌹" },
];

/**
 * Animation utilities for glass components
 */
export const animations = {
  // Panel entrance animation
  panelEnter: "panel-enter animation-duration-300",

  // Smooth transition for state changes
  smooth: "transition-all duration-300 ease-out",

  // Fast transition for interactions
  fast: "transition-all duration-200 ease-out",

  // Fade in
  fadeIn: "animate-in fade-in duration-300",

  // Fade out
  fadeOut: "animate-out fade-out duration-300",
};

/**
 * Responsive breakpoints (matching Tailwind)
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/**
 * Create a glass panel with custom classes
 */
export function glassPanel(...classes: ClassValue[]) {
  return cn(glass.panel, ...classes);
}

/**
 * Create a glass card with custom classes
 */
export function glassCard(...classes: ClassValue[]) {
  return cn(glass.card, ...classes);
}

/**
 * Create a glass button with custom classes
 */
export function glassButton(...classes: ClassValue[]) {
  return cn(glass.button, ...classes);
}

/**
 * Create a glass input with custom classes
 */
export function glassInput(...classes: ClassValue[]) {
  return cn(glass.input, ...classes);
}
