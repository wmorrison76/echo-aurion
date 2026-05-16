import { useEffect, useState } from "react";
import {
  getStockLedger,
  listInventoryLots,
} from "../services/inventory.service";
import type { InventoryLot, StockTxn } from "../data/schemas";
interface UseInventoryResult {
  lots: InventoryLot[];
  ledger: StockTxn[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
export function useInventory(ingredientId?: string): UseInventoryResult {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [ledger, setLedger] = useState<StockTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const load = async () => {
    setLoading(true);
    try {
      const [lotData, ledgerData] = await Promise.all([
        listInventoryLots(ingredientId),
        getStockLedger(ingredientId),
      ]);
      setLots(lotData);
      setLedger(ledgerData);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [ingredientId]);
  return {
    lots,
    ledger,
    loading,
    error,
    refresh: async () => {
      await load();
    },
  };
}
