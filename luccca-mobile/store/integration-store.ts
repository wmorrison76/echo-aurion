import { create } from "zustand";
import { persist } from "zustand/middleware";
import { executeSql, querySql } from "@/lib/database/sqlite";
import { getApiClient } from "@/lib/api-client";

export interface Integration {
  id: string;
  org_id: string;
  provider: "google" | "outlook" | "slack";
  account_name?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  is_active: boolean;
  is_syncing: boolean;
  last_sync_at?: string;
  last_error?: string;
  sync_count: number;
  created_at: string;
  updated_at: string;
}

export interface IntegrationState {
  integrations: Integration[];
  isLoading: boolean;
  error: string | null;
  isSyncing: Record<string, boolean>;

  loadIntegrations: () => Promise<void>;
  getIntegration: (id: string) => Integration | undefined;
  getIntegrationByProvider: (
    provider: "google" | "outlook" | "slack",
  ) => Integration | undefined;
  enableIntegration: (id: string) => Promise<void>;
  disableIntegration: (id: string) => Promise<void>;
  syncIntegration: (id: string) => Promise<void>;
  removeIntegration: (id: string) => Promise<void>;
  startOAuthFlow: (provider: "google" | "outlook" | "slack") => Promise<void>;
}

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set, get) => ({
      integrations: [],
      isLoading: false,
      error: null,
      isSyncing: {},

      loadIntegrations: async () => {
        set({ isLoading: true, error: null });
        try {
          const integrations = await querySql<Integration>(
            "SELECT * FROM integrations ORDER BY created_at DESC",
          );
          set({ integrations });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load integrations";
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      getIntegration: (id) => {
        return get().integrations.find((i) => i.id === id);
      },

      getIntegrationByProvider: (provider) => {
        return get().integrations.find(
          (i) => i.provider === provider && i.is_active,
        );
      },

      enableIntegration: async (id) => {
        try {
          const integration = get().getIntegration(id);
          if (!integration) throw new Error("Integration not found");

          const now = new Date().toISOString();
          await executeSql(
            "UPDATE integrations SET is_active = 1, updated_at = ? WHERE id = ?",
            [now, id],
          );

          set((state) => ({
            integrations: state.integrations.map((i) =>
              i.id === id ? { ...i, is_active: true, updated_at: now } : i,
            ),
          }));

          const api = getApiClient();
          await api.put(`/integrations/${id}/enable`);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to enable integration";
          set({ error: message });
          throw error;
        }
      },

      disableIntegration: async (id) => {
        try {
          const integration = get().getIntegration(id);
          if (!integration) throw new Error("Integration not found");

          const now = new Date().toISOString();
          await executeSql(
            "UPDATE integrations SET is_active = 0, updated_at = ? WHERE id = ?",
            [now, id],
          );

          set((state) => ({
            integrations: state.integrations.map((i) =>
              i.id === id ? { ...i, is_active: false, updated_at: now } : i,
            ),
          }));

          const api = getApiClient();
          await api.put(`/integrations/${id}/disable`);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to disable integration";
          set({ error: message });
          throw error;
        }
      },

      syncIntegration: async (id) => {
        try {
          set((state) => ({
            isSyncing: { ...state.isSyncing, [id]: true },
          }));

          const api = getApiClient();
          const response = await api.post(`/integrations/${id}/sync`);

          const now = new Date().toISOString();
          await executeSql(
            "UPDATE integrations SET last_sync_at = ?, last_error = NULL, updated_at = ? WHERE id = ?",
            [now, now, id],
          );

          set((state) => ({
            integrations: state.integrations.map((i) =>
              i.id === id
                ? { ...i, last_sync_at: now, last_error: null, updated_at: now }
                : i,
            ),
          }));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Sync failed";

          const now = new Date().toISOString();
          await executeSql(
            "UPDATE integrations SET last_error = ?, updated_at = ? WHERE id = ?",
            [errorMessage, now, id],
          );

          set((state) => ({
            integrations: state.integrations.map((i) =>
              i.id === id
                ? { ...i, last_error: errorMessage, updated_at: now }
                : i,
            ),
            error: errorMessage,
          }));
          throw error;
        } finally {
          set((state) => ({
            isSyncing: { ...state.isSyncing, [id]: false },
          }));
        }
      },

      removeIntegration: async (id) => {
        try {
          const integration = get().getIntegration(id);
          if (!integration) throw new Error("Integration not found");

          await executeSql("DELETE FROM integrations WHERE id = ?", [id]);

          set((state) => ({
            integrations: state.integrations.filter((i) => i.id !== id),
          }));

          const api = getApiClient();
          await api.delete(`/integrations/${id}`);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to remove integration";
          set({ error: message });
          throw error;
        }
      },

      startOAuthFlow: async (provider) => {
        try {
          set({ isLoading: true });
          const api = getApiClient();

          const response = await api.post(
            `/integrations/oauth/${provider}/authorize`,
          );

          if (response.data.authUrl) {
            console.log(`[Integration] Open OAuth URL for ${provider}`);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "OAuth flow failed";
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "integration-store",
    },
  ),
);
