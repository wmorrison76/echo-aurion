/**
 * Inventory Commands (Genesis G)
 * Single entry point for all inventory side effects: adjustments, surplus broadcasts.
 * All commands emit OSBus events with source tracking for auditability.
 */

import { osBus } from "@/lib/os-bus";
import type { CommandResult } from "@/lib/commands/index";
import {
  appendLedgerEntry,
  getLocationSnapshot,
} from "@/lib/inventory-ledger-store";

// ---- Types ----

export interface InventoryAdjustmentLine {
  itemKey: string;
  name: string;
  qty: number;
  uom: string;
  direction: "IN" | "OUT";
}

export interface InventoryAdjustmentProposal {
  adjustmentId: string;
  locationId: string;
  source: "MANUAL" | "SYSTEM" | "CORRECTION";
  lines: InventoryAdjustmentLine[];
  note: string;
  createdAt: number;
  status: "PROPOSED" | "COMMITTED" | "REJECTED";
}

export interface InventorySurplus {
  id: string;
  locationId: string;
  name: string;
  qty: number;
  uom: string;
  note?: string;
  createdAt: number;
  expiresAt?: number;
}

// ---- Helpers ----

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function now(): number {
  return Date.now();
}

// ---- Commands ----

/**
 * Propose an inventory adjustment (manual count, waste, etc.)
 * Does NOT immediately write to ledger; emits proposal event.
 * Genesis G service (or v1 optimistic handler) commits it later.
 */
export function proposeInventoryAdjustment(params: {
  locationId: string;
  note: string;
  lines: InventoryAdjustmentLine[];
  source?: "MANUAL" | "SYSTEM" | "CORRECTION";
}): CommandResult<{ adjustmentId: string }> {
  try {
    if (!params.locationId || !params.lines || params.lines.length === 0) {
      return {
        ok: false,
        error:
          "proposeInventoryAdjustment requires locationId and non-empty lines array",
      };
    }

    const adjustmentId = uid("inv_adj");
    const source = params.source || "MANUAL";
    const proposal: InventoryAdjustmentProposal = {
      adjustmentId,
      locationId: params.locationId,
      source,
      lines: params.lines,
      note: params.note,
      createdAt: now(),
      status: "PROPOSED",
    };

    // Emit proposal event for Genesis G service (and other listeners)
    osBus.emit?.("inventory:adjustment_proposed", {
      adjustmentId,
      locationId: params.locationId,
      source: "commands.proposeInventoryAdjustment",
      lines: params.lines,
      note: params.note,
      createdAt: now(),
    });

    return { ok: true, data: { adjustmentId } };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "proposeInventoryAdjustment error",
    };
  }
}

/**
 * Commit an adjustment to the ledger
 * Called after Genesis G service validates (v1: optimistically after proposal)
 */
export function commitAdjustment(
  adjustmentId: string,
  locationId: string,
  lines: InventoryAdjustmentLine[],
): CommandResult<{ committed: boolean }> {
  try {
    // Write each line to the ledger
    for (const line of lines) {
      appendLedgerEntry(locationId, {
        itemKey: line.itemKey,
        name: line.name,
        qty: line.qty,
        uom: line.uom,
        direction: line.direction,
        timestamp: now(),
        note: `Adjustment: ${line.direction === "IN" ? "added" : "removed"}`,
      });
    }

    // Emit committed event
    osBus.emit?.("inventory:adjustment_committed", {
      adjustmentId,
      locationId,
      committedAt: now(),
      source: "commands.commitAdjustment",
    });

    // Emit snapshot update to refresh displays
    const snapshot = getLocationSnapshot(locationId);
    osBus.emit?.("inventory:snapshot_updated", {
      locationId,
      snapshot: snapshot.map((s) => ({
        itemKey: s.itemKey,
        name: s.name,
        onHand: s.onHand,
        uom: s.uom,
      })),
      updatedAt: now(),
      source: "commands.commitAdjustment",
    });

    return { ok: true, data: { committed: true } };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "commitAdjustment error",
    };
  }
}

/**
 * Broadcast a surplus item (available from another location)
 * Used to notify other chefs of available excess inventory.
 */
export function proposeInventorySurplus(params: {
  locationId: string;
  name: string;
  qty: number;
  uom: string;
  note?: string;
  expiresAt?: number;
}): CommandResult<{ surplusId: string }> {
  try {
    if (!params.locationId || !params.name || !params.qty || !params.uom) {
      return {
        ok: false,
        error: "proposeInventorySurplus requires locationId, name, qty, uom",
      };
    }

    const surplusId = uid("inv_surplus");
    const createdAt = now();
    const expiresAt = params.expiresAt || createdAt + 86400000; // 24h default

    const surplus: InventorySurplus = {
      id: surplusId,
      locationId: params.locationId,
      name: params.name,
      qty: params.qty,
      uom: params.uom,
      note: params.note,
      createdAt,
      expiresAt,
    };

    // Emit surplus broadcast event
    osBus.emit?.("inventory:surplus_broadcasted", {
      id: surplusId,
      locationId: params.locationId,
      name: params.name,
      qty: params.qty,
      uom: params.uom,
      note: params.note,
      createdAt,
      expiresAt,
      source: "commands.proposeInventorySurplus",
    });

    return { ok: true, data: { surplusId } };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "proposeInventorySurplus error",
    };
  }
}

/**
 * Optimistically commit an adjustment (v1 behavior)
 * For use in panels that want immediate local feedback.
 * Real flow: propose -> wait for Genesis G validation -> commit.
 * v1: propose -> optimistic commit (assume success).
 */
export function optimisticallyCommitAdjustment(
  locationId: string,
  lines: InventoryAdjustmentLine[],
  note: string,
): CommandResult<{ adjustmentId: string }> {
  try {
    // Propose first
    const proposalResult = proposeInventoryAdjustment({
      locationId,
      lines,
      note,
      source: "MANUAL",
    });

    if (!proposalResult.ok) {
      return proposalResult;
    }

    const adjustmentId = proposalResult.data.adjustmentId;

    // Then immediately commit (optimistic)
    const commitResult = commitAdjustment(adjustmentId, locationId, lines);
    if (!commitResult.ok) {
      return commitResult;
    }

    return { ok: true, data: { adjustmentId } };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "optimisticallyCommitAdjustment error",
    };
  }
}
