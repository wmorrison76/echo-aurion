import { createId } from "../utils/id";
import { extendedCost, roundCurrency } from "../utils/cost";
import type { OrderGuideRow } from "./orderGuide.service";
import type { PurchaseOrder, PurchaseOrderLine } from "../data/schemas";
import { getPurchRecState, usePurchRecStore } from "../state/purchRec.store";
export interface PurchaseOrderDraftOptions {
  notes?: string;
}
export async function generatePurchaseOrdersFromGuide(
  rows: OrderGuideRow[],
  options: PurchaseOrderDraftOptions = {},
): Promise<PurchaseOrder[]> {
  const grouped = new Map<
    string,
    { vendorId: string; lines: PurchaseOrderLine[] }
  >();
  rows.forEach((row) => {
    if (!row.vendorItem || row.suggestedPacks <= 0) return;
    const vendorId = row.vendorItem.vendorId;
    const qty = Math.max(row.suggestedPacks, 0);
    const unitCost = roundCurrency(row.vendorItem.pricePerPack);
    const extCost = extendedCost(unitCost, qty);
    const line: PurchaseOrderLine = {
      id: createId("poline"),
      vendorItemId: row.vendorItem.id,
      ingredientId: row.ingredient.id,
      qty,
      uom: "pack",
      unitCost,
      extCost,
      receivedQty: 0,
      receivedQtyBase: 0,
    };
    const existing = grouped.get(vendorId);
    if (existing) {
      existing.lines.push(line);
    } else {
      grouped.set(vendorId, { vendorId, lines: [line] });
    }
  });
  const now = new Date().toISOString();
  const pos: PurchaseOrder[] = Array.from(grouped.values()).map((entry) => ({
    id: createId("po"),
    vendorId: entry.vendorId,
    status: "DRAFT",
    lines: entry.lines,
    notes: options.notes,
    createdAt: now,
  }));
  pos.forEach((po) => usePurchRecStore.getState().upsertOrder(po));
  return pos;
}
export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const state = getPurchRecState();
  return Object.values(state.orders);
}
export async function createOrUpdatePO(
  po: PurchaseOrder,
): Promise<PurchaseOrder> {
  const normalized: PurchaseOrder = {
    ...po,
    lines: po.lines.map((line) => ({
      ...line,
      id: line.id ?? createId("poline"),
      extCost: extendedCost(line.unitCost, line.qty),
      receivedQty: line.receivedQty ?? 0,
      receivedQtyBase: line.receivedQtyBase ?? 0,
    })),
  };
  usePurchRecStore.getState().upsertOrder(normalized);
  return normalized;
}
export async function submitPO(poId: string): Promise<void> {
  const state = getPurchRecState();
  const existing = state.orders[poId];
  if (!existing) throw new Error(`PO ${poId} not found`);
  if (existing.status !== "DRAFT") return;
  const submitted: PurchaseOrder = {
    ...existing,
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
  };
  usePurchRecStore.getState().upsertOrder(submitted);
}
export async function updatePOStatus(
  poId: string,
  status: PurchaseOrder["status"],
): Promise<void> {
  usePurchRecStore.getState().updateOrderStatus(poId, status);
}
