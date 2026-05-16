import { useCallback } from "react";
import { usePurchRecStore } from "../state/purchRec.store";
import {
  receivePurchaseOrder,
  ReceiptPayload,
} from "../services/receiving.service";
export function useReceiving() {
  const orders = usePurchRecStore((state) => state.orders);
  const lots = usePurchRecStore((state) => state.lots);
  const receive = useCallback(async (payload: ReceiptPayload) => {
    await receivePurchaseOrder(payload);
  }, []);
  return { orders, lots, receive };
}
