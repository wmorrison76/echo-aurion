/**
 * Genesis G — Inventory Events (Canonical)
 * Event types for surplus broadcasts and inventory updates.
 */

import type {
  SurplusAvailability,
  InventoryLedgerEntry,
  InventoryItemState,
} from "./inventory";

export interface InventorySurplusBroadcast {
  surplus: SurplusAvailability;
}

export interface InventoryUpdatedEvent {
  locationId: string;
  item: InventoryItemState;
  ledger: InventoryLedgerEntry;
}
