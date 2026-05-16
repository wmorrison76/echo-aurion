import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface OutletInventoryItem {
  id: string;
  outletId: string;
  standardProductId: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  unitCost: number | null;
  totalValue: number;
  lastCountedAt: string | null;
  variancePercentage: number | null;
  status: "active" | "inactive" | "discontinued";
  createdAt: string;
  updatedAt: string;
  standardProduct?: {
    id: string;
    name: string;
    baseUnit: string;
    tier1?: string;
    tier2?: string;
    tier3?: string;
  };
}

interface InventoryTransaction {
  id: string;
  outletId: string;
  standardProductId: string;
  transactionType:
    | "receiving"
    | "physical_count"
    | "adjustment"
    | "waste"
    | "transfer_out"
    | "transfer_in"
    | "preparation"
    | "sale"
    | "spoilage"
    | "inventory_correction";
  referenceType?: string;
  referenceId?: string;
  quantityChange: number;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  standardProduct?: { name: string };
  outlet?: { name: string };
}

interface InventoryParLevel {
  id: string;
  outletId: string;
  standardProductId: string;
  parQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  reorderPoint: number;
  reorderQuantity: number;
  leadTimeDays: number;
  preferredVendorId?: string;
  autoReorder: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  standardProduct?: { name: string; baseUnit: string };
  vendor?: { name: string };
}

interface InventoryAlert {
  id: string;
  outletId: string;
  standardProductId: string;
  alertType:
    | "below_minimum"
    | "above_maximum"
    | "out_of_stock"
    | "variance"
    | "expiring";
  severity: "low" | "medium" | "high" | "critical";
  currentQuantity: number | null;
  expectedQuantity: number | null;
  variancePercentage: number | null;
  message: string | null;
  resolvedAt: string | null;
  createdAt: string;
  standardProduct?: { name: string };
  outlet?: { name: string };
}

interface OutletTransfer {
  id: string;
  fromOutletId: string;
  toOutletId: string;
  standardProductId: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  status: "pending" | "in_transit" | "completed" | "cancelled";
  initiatedAt: string;
  receivedAt?: string;
  notes?: string;
  standardProduct?: { name: string };
  fromOutlet?: { name: string };
  toOutlet?: { name: string };
}

interface InventorySnapshot {
  id: string;
  outletId: string;
  snapshotType: "daily" | "weekly" | "monthly" | "manual";
  totalItems: number;
  totalValue: number;
  snapshotData: any;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function useOutletInventory(outletId: string, limit = 50) {
  const [inventory, setInventory] = useState<OutletInventoryItem[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchInventory = useCallback(
    async (offset = 0) => {
      if (!user) return;
      try {
        setLoading(true);
        const response = await fetch(
          `/api/inventory-sync/outlets/${outletId}/inventory?limit=${limit}&offset=${offset}`,
          { headers: { "x-user-id": user.id } },
        );
        if (!response.ok) throw new Error("Failed to fetch inventory");
        const { data, pagination: pag } =
          (await response.json()) as PaginatedResponse<OutletInventoryItem>;
        setInventory(data);
        setPagination(pag);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [outletId, limit, user],
  );

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return {
    inventory,
    pagination,
    loading,
    error,
    refetch: fetchInventory,
  };
}

export function useInventoryTransactions(outletId?: string, limit = 50) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, organization } = useAuth();

  const fetchTransactions = useCallback(
    async (offset = 0) => {
      if (!user) return;
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        });
        if (outletId) params.append("outletId", outletId);
        const response = await fetch(
          `/api/inventory-sync/transactions?${params}`,
          {
            headers: {
              "x-user-id": user.id,
              "x-org-id": organization?.id || "",
            },
          },
        );
        if (!response.ok) throw new Error("Failed to fetch transactions");
        const { data, pagination: pag } =
          (await response.json()) as PaginatedResponse<InventoryTransaction>;
        setTransactions(data);
        setPagination(pag);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [outletId, limit, user, organization],
  );

  const addTransaction = useCallback(
    async (transactionData: Partial<InventoryTransaction>) => {
      if (!user) return null;
      try {
        const response = await fetch("/api/inventory-sync/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-org-id": organization?.id || "",
          },
          body: JSON.stringify(transactionData),
        });
        if (!response.ok) throw new Error("Failed to create transaction");
        const result = await response.json();
        fetchTransactions();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      }
    },
    [user, organization, fetchTransactions],
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    pagination,
    loading,
    error,
    addTransaction,
    refetch: fetchTransactions,
  };
}

export function useParLevels(outletId: string, limit = 50) {
  const [parLevels, setParLevels] = useState<InventoryParLevel[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, organization } = useAuth();

  const fetchParLevels = useCallback(
    async (offset = 0) => {
      if (!user) return;
      try {
        setLoading(true);
        const response = await fetch(
          `/api/inventory-sync/outlets/${outletId}/par-levels?limit=${limit}&offset=${offset}`,
          {
            headers: {
              "x-user-id": user.id,
              "x-org-id": organization?.id || "",
            },
          },
        );
        if (!response.ok) throw new Error("Failed to fetch par levels");
        const { data, pagination: pag } =
          (await response.json()) as PaginatedResponse<InventoryParLevel>;
        setParLevels(data);
        setPagination(pag);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [outletId, limit, user, organization],
  );

  const createParLevel = useCallback(
    async (parLevelData: Partial<InventoryParLevel>) => {
      if (!user) return null;
      try {
        const response = await fetch("/api/inventory-sync/par-levels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-org-id": organization?.id || "",
          },
          body: JSON.stringify({ ...parLevelData, outletId }),
        });
        if (!response.ok) throw new Error("Failed to create par level");
        const result = await response.json();
        fetchParLevels();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      }
    },
    [outletId, user, organization, fetchParLevels],
  );

  const updateParLevel = useCallback(
    async (id: string, updates: Partial<InventoryParLevel>) => {
      if (!user) return null;
      try {
        const response = await fetch(`/api/inventory-sync/par-levels/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-user-id": user.id },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error("Failed to update par level");
        const result = await response.json();
        fetchParLevels();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      }
    },
    [user, fetchParLevels],
  );

  useEffect(() => {
    fetchParLevels();
  }, [fetchParLevels]);

  return {
    parLevels,
    pagination,
    loading,
    error,
    createParLevel,
    updateParLevel,
    refetch: fetchParLevels,
  };
}

export function useInventoryAlerts(limit = 50) {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAlerts = useCallback(
    async (offset = 0, outletId?: string, severity?: string) => {
      if (!user) return;
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
          resolved: "false",
        });
        if (outletId) params.append("outletId", outletId);
        if (severity) params.append("severity", severity);
        const response = await fetch(`/api/inventory-sync/alerts?${params}`, {
          headers: { "x-user-id": user.id },
        });
        if (!response.ok) throw new Error("Failed to fetch alerts");
        const { data, pagination: pag } =
          (await response.json()) as PaginatedResponse<InventoryAlert>;
        setAlerts(data);
        setPagination(pag);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [limit, user],
  );

  const resolveAlert = useCallback(
    async (alertId: string) => {
      if (!user) return null;
      try {
        const response = await fetch(
          `/api/inventory-sync/alerts/${alertId}/resolve`,
          { method: "PATCH", headers: { "x-user-id": user.id } },
        );
        if (!response.ok) throw new Error("Failed to resolve alert");
        const result = await response.json();
        fetchAlerts();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      }
    },
    [user, fetchAlerts],
  );

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    pagination,
    loading,
    error,
    resolveAlert,
    refetch: fetchAlerts,
  };
}

export function useOutletTransfers(limit = 50) {
  const [transfers, setTransfers] = useState<OutletTransfer[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, organization } = useAuth();

  const fetchTransfers = useCallback(
    async (offset = 0, fromOutletId?: string, status?: string) => {
      if (!user) return;
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        });
        if (fromOutletId) params.append("fromOutletId", fromOutletId);
        if (status) params.append("status", status);
        const response = await fetch(
          `/api/inventory-sync/transfers?${params}`,
          {
            headers: {
              "x-user-id": user.id,
              "x-org-id": organization?.id || "",
            },
          },
        );
        if (!response.ok) throw new Error("Failed to fetch transfers");
        const { data, pagination: pag } =
          (await response.json()) as PaginatedResponse<OutletTransfer>;
        setTransfers(data);
        setPagination(pag);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [limit, user, organization],
  );

  const createTransfer = useCallback(
    async (transferData: Partial<OutletTransfer>) => {
      if (!user || !organization) return null;
      try {
        const response = await fetch("/api/inventory-sync/transfers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-org-id": organization.id,
          },
          body: JSON.stringify({
            ...transferData,
            organizationId: organization.id,
          }),
        });
        if (!response.ok) throw new Error("Failed to create transfer");
        const result = await response.json();
        fetchTransfers();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      }
    },
    [user, organization, fetchTransfers],
  );

  const completeTransfer = useCallback(
    async (transferId: string) => {
      if (!user) return null;
      try {
        const response = await fetch(
          `/api/inventory-sync/transfers/${transferId}/complete`,
          { method: "PATCH", headers: { "x-user-id": user.id } },
        );
        if (!response.ok) throw new Error("Failed to complete transfer");
        const result = await response.json();
        fetchTransfers();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      }
    },
    [user, fetchTransfers],
  );

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  return {
    transfers,
    pagination,
    loading,
    error,
    createTransfer,
    completeTransfer,
    refetch: fetchTransfers,
  };
}

export function useInventorySnapshots(outletId: string, limit = 20) {
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, organization } = useAuth();

  const fetchSnapshots = useCallback(
    async (offset = 0) => {
      if (!user || !organization) return;
      try {
        setLoading(true);
        const response = await fetch(
          `/api/inventory-sync/outlets/${outletId}/snapshots?limit=${limit}&offset=${offset}`,
          { headers: { "x-user-id": user.id } },
        );
        if (!response.ok) throw new Error("Failed to fetch snapshots");
        const { data, pagination: pag } =
          (await response.json()) as PaginatedResponse<InventorySnapshot>;
        setSnapshots(data);
        setPagination(pag);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [outletId, limit, user, organization],
  );

  const createSnapshot = useCallback(
    async (snapshotType = "manual") => {
      if (!user || !organization) return null;
      try {
        const response = await fetch("/api/inventory-sync/snapshots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-org-id": organization.id,
          },
          body: JSON.stringify({
            outletId,
            organizationId: organization.id,
            snapshotType,
          }),
        });
        if (!response.ok) throw new Error("Failed to create snapshot");
        const result = await response.json();
        fetchSnapshots();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      }
    },
    [outletId, user, organization, fetchSnapshots],
  );

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  return {
    snapshots,
    pagination,
    loading,
    error,
    createSnapshot,
    refetch: fetchSnapshots,
  };
}
