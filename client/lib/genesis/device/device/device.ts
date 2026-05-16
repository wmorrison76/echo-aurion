/**
 * Device helpers (Desktop vs Tablet vs Mobile)
 * -------------------------------------------
 * Best practice: Do not reuse desktop "floating panel" UX on touch devices.
 * This module provides a single source of truth for responsive shell selection.
 */
export type DeviceKind = "desktop" | "tablet" | "mobile";

export function detectDeviceKind(width: number): DeviceKind {
  // conservative breakpoints; can be tuned
  if (width <= 640) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}
