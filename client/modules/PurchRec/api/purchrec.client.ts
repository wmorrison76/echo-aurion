import type { OrderGuideRow } from "../services/orderGuide.service";
import { generateOrderGuide } from "../services/orderGuide.service";
import { createOrUpdatePO, submitPO } from "../services/purchaseOrder.service";
import {
  receivePurchaseOrder,
  ReceiptPayload,
} from "../services/receiving.service";
import { getStockLedger } from "../services/inventory.service";
import type { PurchaseOrder, StockTxn } from "../data/schemas";
export async function fetchOrderGuide(): Promise<OrderGuideRow[]> {
  return generateOrderGuide();
}
export async function savePurchaseOrder(
  po: PurchaseOrder,
): Promise<PurchaseOrder> {
  return createOrUpdatePO(po);
}
export async function submitPurchaseOrder(poId: string): Promise<void> {
  await submitPO(poId);
}
export async function receivePurchaseOrderApi(
  payload: ReceiptPayload,
): Promise<void> {
  await receivePurchaseOrder(payload);
}
export async function fetchStockLedger(
  ingredientId?: string,
): Promise<StockTxn[]> {
  return getStockLedger(ingredientId);
}
