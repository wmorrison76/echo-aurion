import { create } from "zustand";
import type { InventoryLot, PurchaseOrder, StockTxn } from "../data/schemas";
export type PurchRecStatus = PurchaseOrder["status"];
interface PurchRecState {
  orders: Record<string, PurchaseOrder>;
  lots: InventoryLot[];
  ledger: StockTxn[];
  onHandBase: Record<string, number>;
  ingredientCosts: Record<string, number>;
  setInitialInventory: (inventory: Record<string, number>) => void;
  upsertOrder: (order: PurchaseOrder) => void;
  updateOrderStatus: (orderId: string, status: PurchRecStatus) => void;
  replaceOrder: (
    orderId: string,
    transform: (order: PurchaseOrder) => PurchaseOrder,
  ) => void;
  appendLots: (
    lots: InventoryLot[],
    ledgerEntries: StockTxn[],
    costUpdates: Record<string, number>,
  ) => void;
}
export const usePurchRecStore = create<PurchRecState>((set, get) => ({
  orders: {},
  lots: [],
  ledger: [],
  onHandBase: {},
  ingredientCosts: {},
  setInitialInventory: (inventory) => {
    set({ onHandBase: { ...inventory } });
  },
  upsertOrder: (order) => {
    set((state) => ({ orders: { ...state.orders, [order.id]: order } }));
  },
  updateOrderStatus: (orderId, status) => {
    set((state) => {
      const existing = state.orders[orderId];
      if (!existing) return state;
      const updated: PurchaseOrder = { ...existing, status };
      return { orders: { ...state.orders, [orderId]: updated } };
    });
  },
  replaceOrder: (orderId, transform) => {
    set((state) => {
      const existing = state.orders[orderId];
      if (!existing) return state;
      const next = transform(existing);
      return { orders: { ...state.orders, [orderId]: next } };
    });
  },
  appendLots: (lots, ledgerEntries, costUpdates) => {
    set((state) => {
      const nextLots = [...state.lots, ...lots];
      const nextLedger = [...state.ledger, ...ledgerEntries].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );
      const nextOnHand = { ...state.onHandBase };
      Object.entries(costUpdates).forEach(([ingredientId, newCost]) => {
        state.ingredientCosts[ingredientId] = newCost;
      });
      lots.forEach((lot) => {
        nextOnHand[lot.ingredientId] =
          (nextOnHand[lot.ingredientId] ?? 0) + lot.qtyOnHandBase;
      });
      return {
        lots: nextLots,
        ledger: nextLedger,
        onHandBase: nextOnHand,
        ingredientCosts: { ...state.ingredientCosts, ...costUpdates },
      };
    });
  },
}));
export function getPurchRecState() {
  return usePurchRecStore.getState();
}
