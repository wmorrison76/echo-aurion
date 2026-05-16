/**
 * Genesis E — Inventory Move Event
 * Tracks inventory flowing between locations with full trace.
 */

export type InventoryMoveLine = {
  itemName: string;
  unit: string;
  quantity: number;
  category?: string | null;
};

export type InventoryMove = {
  moveId: string;
  createdAtISO: string;

  fromLocationId: string;
  toLocationId: string;

  reason: "INTERNAL_FULFILLMENT" | "TRANSFER" | "ADJUSTMENT";
  sourceId?: string | null;

  lines: InventoryMoveLine[];

  note: string;
};
