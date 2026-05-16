import { roundCurrency } from "../utils/cost";
import { createId } from "../utils/id";
import { loadVendorCatalog } from "./fixtures";
import { getPurchRecState, usePurchRecStore } from "../state/purchRec.store";
import type {
  InventoryLot,
  PurchaseOrder,
  PurchaseOrderLine,
  StockTxn,
} from "../data/schemas";
import type { VendorCatalogEntry } from "../utils/vendors";
export interface ReceiptLineInput {
  poLineId: string;
  qtyPacks: number;
  unitCostPerPack?: number;
  expDate?: string | null;
  vendorRef?: string | null;
}
export interface ReceiptPayload {
  poId: string;
  receivedAt?: string;
  lines: ReceiptLineInput[];
}
export async function receivePurchaseOrder(
  payload: ReceiptPayload,
): Promise<void> {
  const state = getPurchRecState();
  const po = state.orders[payload.poId];
  if (!po) throw new Error(`Purchase order ${payload.poId} not found`);
  if (!payload.lines.length) return;
  const vendorCatalog = await loadVendorCatalog();
  const vendorItemsMap = buildVendorItemMap(vendorCatalog);
  const now = payload.receivedAt ?? new Date().toISOString();
  const lots: InventoryLot[] = [];
  const ledger: StockTxn[] = [];
  const costUpdates: Record<string, number> = {};
  const runningQty: Record<string, number> = { ...state.onHandBase };
  const runningCost: Record<string, number> = { ...state.ingredientCosts };
  const updatedLines: PurchaseOrderLine[] = po.lines.map((line) => ({
    ...line,
  }));
  payload.lines.forEach((lineInput) => {
    const targetLine = updatedLines.find(
      (line) => line.id === lineInput.poLineId,
    );
    if (!targetLine) {
      return;
    }
    const vendorItem = vendorItemsMap.get(targetLine.vendorItemId);
    if (!vendorItem) {
      return;
    }
    const qtyPacks = Math.max(0, lineInput.qtyPacks);
    if (qtyPacks <= 0) {
      return;
    }
    const qtyBase = qtyPacks * vendorItem.convToBase;
    const unitCostPerPack = lineInput.unitCostPerPack ?? targetLine.unitCost;
    const unitCostPerBase = roundCurrency(
      unitCostPerPack / vendorItem.convToBase,
    );
    targetLine.receivedQty = roundCurrency(
      (targetLine.receivedQty ?? 0) + qtyPacks,
    );
    targetLine.receivedQtyBase = roundCurrency(
      (targetLine.receivedQtyBase ?? 0) + qtyBase,
    );
    const lot: InventoryLot = {
      id: createId("lot"),
      ingredientId: targetLine.ingredientId,
      qtyOnHandBase: qtyBase,
      unitCostPerBase,
      expDate: lineInput.expDate ?? undefined,
      source: { poId: po.id, poLineId: targetLine.id, vendorId: po.vendorId },
      createdAt: now,
    };
    const txn: StockTxn = {
      id: createId("txn"),
      ingredientId: targetLine.ingredientId,
      type: "RECEIVE",
      qtyBase,
      unitCostPerBase,
      ref: { poId: po.id, note: lineInput.vendorRef ?? undefined },
      createdAt: now,
    };
    lots.push(lot);
    ledger.push(txn);
    const ingredientId = targetLine.ingredientId;
    const prevQty = runningQty[ingredientId] ?? 0;
    const prevCost =
      runningCost[ingredientId] ??
      state.ingredientCosts[ingredientId] ??
      unitCostPerBase;
    const newCost = computeRollingCost(
      prevQty,
      prevCost,
      qtyBase,
      unitCostPerBase,
    );
    runningQty[ingredientId] = prevQty + qtyBase;
    runningCost[ingredientId] = newCost;
    costUpdates[ingredientId] = newCost;
  });
  if (!lots.length) return;
  usePurchRecStore.getState().appendLots(lots, ledger, costUpdates);
  const updatedPO: PurchaseOrder = {
    ...po,
    lines: updatedLines,
    status: deriveStatus(updatedLines, po.status),
    receivedAt: now,
  };
  usePurchRecStore.getState().upsertOrder(updatedPO);
}
function deriveStatus(
  lines: PurchaseOrderLine[],
  current: PurchaseOrder["status"],
): PurchaseOrder["status"] {
  const totalOrdered = lines.reduce((sum, line) => sum + line.qty, 0);
  const totalReceived = lines.reduce(
    (sum, line) => sum + (line.receivedQty ?? 0),
    0,
  );
  if (totalReceived === 0) return current;
  if (totalReceived >= totalOrdered && totalOrdered > 0) {
    return "RECEIVED";
  }
  return "PARTIAL";
}
function buildVendorItemMap(
  catalog: VendorCatalogEntry[],
): Map<string, VendorCatalogEntry["items"][number]> {
  const map = new Map<string, VendorCatalogEntry["items"][number]>();
  catalog.forEach((entry) => {
    entry.items.forEach((item) => {
      map.set(item.id, item);
    });
  });
  return map;
}
function computeRollingCost(
  currentQty: number,
  currentCost: number,
  receivedQtyBase: number,
  unitCostPerBase: number,
): number {
  const newQty = currentQty + receivedQtyBase;
  if (newQty <= 0) {
    return unitCostPerBase;
  }
  const weighted = currentQty * currentCost + receivedQtyBase * unitCostPerBase;
  return roundCurrency(weighted / newQty);
}
