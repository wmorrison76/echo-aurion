/**
 * Enhanced Type Definitions
 * Phase 4: TypeScript Improvements
 * 
 * Branded types and stricter TypeScript patterns
 */

import type { PanelId as BasePanelId } from "./types";

/**
 * Branded type for PanelId to prevent mixing IDs
 * This helps catch type errors at compile time
 */
export type PanelId = BasePanelId & { readonly __brand: "PanelId" };

/**
 * Create a PanelId from a string (type-safe)
 */
export function createPanelId(id: string): PanelId {
  return id as PanelId;
}

/**
 * Generic panel configuration
 */
export interface PanelConfig<T = unknown> {
  id: PanelId;
  title: string;
  data?: T;
  metadata?: Record<string, unknown>;
}

/**
 * Generic panel props with type safety
 */
export interface PanelProps<T = unknown> {
  id: PanelId;
  config: PanelConfig<T>;
  data?: T;
  onUpdate?: (data: T) => void;
  onClose?: () => void;
}

/**
 * Type guard for PanelId
 */
export function isPanelId(value: unknown): value is PanelId {
  return typeof value === "string";
}

/**
 * Panel state with strict typing
 */
export interface StrictPanelState {
  readonly id: PanelId;
  readonly position: Readonly<{ x: number; y: number }>;
  readonly size: Readonly<{ width: number; height: number }>;
  readonly isMinimized: boolean;
  readonly isExpanded: boolean;
  readonly zIndex: number;
}
