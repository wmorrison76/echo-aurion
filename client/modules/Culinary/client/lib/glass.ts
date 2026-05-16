// Glass-morphism utility re-exports cn for tablet UI components
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Glass panel class presets for tablet UI */
export const glassPanel =
  "backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl";
export const glassPanelDark =
  "backdrop-blur-xl bg-black/20 border border-white/10 shadow-xl";
