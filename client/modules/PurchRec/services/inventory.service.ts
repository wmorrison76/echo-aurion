import type { InventoryLot, StockTxn } from "../data/schemas";
import { getPurchRecState } from "../state/purchRec.store";
export async function listInventoryLots(
  ingredientId?: string,
): Promise<InventoryLot[]> {
  const state = getPurchRecState();
  const lots = ingredientId
    ? state.lots.filter((lot) => lot.ingredientId === ingredientId)
    : state.lots;
  return lots.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function getStockLedger(
  ingredientId?: string,
): Promise<StockTxn[]> {
  const state = getPurchRecState();
  const ledger = ingredientId
    ? state.ledger.filter((entry) => entry.ingredientId === ingredientId)
    : state.ledger;
  return ledger.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
