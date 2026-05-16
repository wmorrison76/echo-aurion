/**
 * LUCCCA Genesis E — IFO → Inventory Transfer Bridge
 * v1: proposal-only layer. Genesis G will listen to inventory:transfer_proposed events.
 *
 * Responsibilities:
 * - Generate transfer proposals from IFO items
 * - Track transfer state (proposal → committed)
 * - v1: storage is event-only (no persistent transfer table)
 */

import type { InternalFulfillmentOrder } from "@/shared/types/ifo";

/**
 * Single transfer line
 */
export type InventoryTransferLine = {
  name: string;
  quantity: number;
  uom: string;
};

/**
 * Inventory transfer proposal
 * Emitted as inventory:transfer_proposed event
 */
export type InventoryTransferProposal = {
  proposalId: string;
  ifoId: string;
  fromLocationId: string;
  toLocationId: string;
  dueAt: number; // epoch ms, inherit from IFO
  lines: InventoryTransferLine[];
  createdAt: number;
};

/**
 * Generate deterministic ID
 */
function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Build transfer proposal from IFO
 * Returns null if fulfilling location not set yet
 */
export function proposeTransferFromIFO(
  ifo: InternalFulfillmentOrder,
): InventoryTransferProposal | null {
  if (!ifo.fulfillingLocationId) {
    return null;
  }

  return {
    proposalId: uid("inv_xfer"),
    ifoId: ifo.ifoId,
    fromLocationId: ifo.fulfillingLocationId,
    toLocationId: ifo.requestingLocationId,
    dueAt: ifo.dueAt,
    createdAt: Date.now(),
    lines: ifo.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      uom: i.uom,
    })),
  };
}

/**
 * v1: Commit is event-only
 * Genesis G will update actual on-hand ledgers via inventory:transfer_committed event
 * This function is a placeholder for audit logging
 */
export function commitTransfer(_proposal: InventoryTransferProposal): boolean {
  // v1: returns true (optimistic)
  // Later: will check Genesis G ledger state
  return true;
}

/**
 * Check if all items in a transfer proposal are available at source location
 * v1: Always returns true (stub for Genesis G integration)
 * Later: will query Genesis G inventory state
 */
export function validateTransferAvailability(
  _proposal: InventoryTransferProposal,
): boolean {
  // v1 stub: assume available
  return true;
}
