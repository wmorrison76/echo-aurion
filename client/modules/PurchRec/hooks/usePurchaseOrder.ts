import { useCallback, useMemo } from "react";
import type { OrderGuideRow } from "../services/orderGuide.service";
import {
  createOrUpdatePO,
  generatePurchaseOrdersFromGuide,
  listPurchaseOrders,
  submitPO,
  updatePOStatus,
} from "../services/purchaseOrder.service";
import type { PurchaseOrder } from "../data/schemas";
import { usePurchRecStore } from "../state/purchRec.store";
interface UsePurchaseOrderResult {
  purchaseOrders: PurchaseOrder[];
  generateFromGuide: (rows: OrderGuideRow[]) => Promise<PurchaseOrder[]>;
  saveOrder: (po: PurchaseOrder) => Promise<PurchaseOrder>;
  submitOrder: (poId: string) => Promise<void>;
  setStatus: (poId: string, status: PurchaseOrder["status"]) => Promise<void>;
  refresh: () => Promise<PurchaseOrder[]>;
}
export function usePurchaseOrder(): UsePurchaseOrderResult {
  const orders = usePurchRecStore((state) => state.orders);
  const purchaseOrders = useMemo(() => Object.values(orders), [orders]);
  const generateFromGuide = useCallback(async (rows: OrderGuideRow[]) => {
    return generatePurchaseOrdersFromGuide(rows);
  }, []);
  const saveOrder = useCallback(async (po: PurchaseOrder) => {
    return createOrUpdatePO(po);
  }, []);
  const submitOrder = useCallback(async (poId: string) => {
    await submitPO(poId);
  }, []);
  const setStatus = useCallback(
    async (poId: string, status: PurchaseOrder["status"]) => {
      await updatePOStatus(poId, status);
    },
    [],
  );
  const refresh = useCallback(async () => {
    return listPurchaseOrders();
  }, []);
  return {
    purchaseOrders,
    generateFromGuide,
    saveOrder,
    submitOrder,
    setStatus,
    refresh,
  };
}
