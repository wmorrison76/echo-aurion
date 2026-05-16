import React from "react";
/** * Panel Registry * Maps module names to their default exported components * Used for dynamic loading in floating panels */ export type PanelKey =
  "purchasing";
export interface PanelRegistry {
  [key: string]: () => Promise<{ default: React.ComponentType<any> }>;
} /** * Preload a module in the background during idle time * Helps reduce loading delay when user opens the panel */
export const preloadModule = (panelKey: PanelKey) => {
  if (typeof window === "undefined") return; // Always use setTimeout as fallback - requestIdleCallback may not be reliable setTimeout(() => { PANEL_REGISTRY[panelKey]?.().catch(() => { // Silently fail - preload is best-effort }); }, 2000);
}; /** * Preload critical modules on app startup * Called from App.tsx to reduce panel load times */
export const preloadCriticalModules = () => {
  if (typeof window === "undefined") return; // Preload core modules preloadModule("purchasing");
}; /** * Central registry for module panels * Only includes modules that actually exist in src/modules/ */
export const PANEL_REGISTRY: PanelRegistry = {
  purchasing: () => import("@modules/PurchRec"),
}; /** * Panel metadata */
export interface PanelMetadata {
  key: PanelKey;
  label: string;
  description: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
}
export const PANEL_METADATA: Record<PanelKey, PanelMetadata> = {
  purchasing: {
    key: "purchasing",
    label: "Purchasing & Receiving",
    description:
      "Purchase orders, receiving, invoice matching, supplier management",
    icon: "📦",
    defaultWidth: 1100,
    defaultHeight: 700,
  },
}; /** * Get all available panels */
export function getAllPanels(): PanelMetadata[] {
  return Object.values(PANEL_METADATA);
} /** * Get panel metadata by key */
export function getPanelMetadata(key: PanelKey): PanelMetadata | undefined {
  return PANEL_METADATA[key];
} /** * Check if a panel key is valid */
export function isValidPanelKey(key: any): key is PanelKey {
  return key in PANEL_REGISTRY;
} /** * Get default dimensions for a panel */
export function getDefaultPanelDimensions(key: PanelKey) {
  const metadata = PANEL_METADATA[key];
  return {
    width: metadata?.defaultWidth ?? 600,
    height: metadata?.defaultHeight ?? 400,
  };
}
