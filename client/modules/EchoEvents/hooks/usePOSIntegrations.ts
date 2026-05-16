import { useState, useCallback } from "react";
interface POSConnection {
  id: string;
  eventId: string;
  posProvider: "toast" | "lightspeed" | "gotab";
  storeId: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
interface SyncResult {
  id: string;
  eventId: string;
  syncedAt: Date;
  itemsProcessed: number;
  itemsSuccessful: number;
  itemsFailed: number;
  totalCosts: number;
  errors: string[];
}
interface UsePOSIntegrationsReturn {
  loading: boolean;
  error: string | null;
  connectPOS: (
    eventId: string,
    provider: "toast" | "lightspeed" | "gotab",
    storeId: string,
    apiKey: string,
  ) => Promise<POSConnection | null>;
  getPOSStatus: (
    eventId: string,
    provider: "toast" | "lightspeed" | "gotab",
  ) => Promise<POSConnection | null>;
  syncCosts: (eventId: string) => Promise<SyncResult | null>;
  disconnectPOS: (connectionId: string) => Promise<boolean>;
}
export const usePOSIntegrations = (): UsePOSIntegrationsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectPOS = useCallback(
    async (
      eventId: string,
      provider: "toast" | "lightspeed" | "gotab",
      storeId: string,
      apiKey: string,
    ): Promise<POSConnection | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/pos-integrations/connect/${provider}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ eventId, storeId, apiKey }),
          },
        );
        if (!response.ok) {
          throw new Error(
            `Failed to connect to ${provider}: ${response.statusText}`,
          );
        }
        const result = await response.json();
        return result.data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getPOSStatus = useCallback(
    async (
      eventId: string,
      provider: "toast" | "lightspeed" | "gotab",
    ): Promise<POSConnection | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/pos-integrations/status/${provider}?eventId=${eventId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`Failed to fetch status: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const syncCosts = useCallback(
    async (eventId: string): Promise<SyncResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/pos-integrations/sync/${eventId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to sync costs: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const disconnectPOS = useCallback(
    async (connectionId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/pos-integrations/disconnect/${connectionId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to disconnect POS: ${response.statusText}`);
        }
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  return { loading, error, connectPOS, getPOSStatus, syncCosts, disconnectPOS };
};
