/**
 * Authentication Store
 * Manages user authentication state and session
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUserId,
  getCurrentOrgId,
} from "@/lib/api-client";

export interface User {
  id: string;
  email: string;
  name: string;
  org_id: string;
  org_name?: string;
  role?: string;
  avatar_url?: string;
}

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            const tokens = await apiLogin(email, password);

            // Fetch user details
            const userId = await getCurrentUserId();
            const orgId = await getCurrentOrgId();

            if (userId && orgId) {
              const user: User = {
                id: userId,
                email,
                name: email.split("@")[0],
                org_id: orgId,
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Login failed",
              isLoading: false,
            });
            throw error;
          }
        },

        register: async (email: string, password: string, name: string) => {
          set({ isLoading: true, error: null });
          try {
            const tokens = await apiRegister(email, password, name);

            const userId = await getCurrentUserId();
            const orgId = await getCurrentOrgId();

            if (userId && orgId) {
              const user: User = {
                id: userId,
                email,
                name,
                org_id: orgId,
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
            }
          } catch (error) {
            set({
              error:
                error instanceof Error ? error.message : "Registration failed",
              isLoading: false,
            });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true });
          try {
            await apiLogout();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Logout failed",
              isLoading: false,
            });
            throw error;
          }
        },

        restoreSession: async () => {
          set({ isLoading: true });
          try {
            const userId = await getCurrentUserId();
            const orgId = await getCurrentOrgId();

            if (userId && orgId) {
              // Restore user session
              const user: User = {
                id: userId,
                email: "",
                name: "",
                org_id: orgId,
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          } catch (error) {
            console.error("Session restore failed:", error);
            set({
              isAuthenticated: false,
              isLoading: false,
            });
          }
        },

        clearError: () => set({ error: null }),

        setUser: (user: User) => set({ user }),
      }),
      {
        name: "auth-storage",
        storage: {
          getItem: async (key: string) => {
            try {
              const value = await SecureStore.getItemAsync(key);
              return value ? JSON.parse(value) : null;
            } catch {
              return null;
            }
          },
          setItem: async (key: string, value: any) => {
            try {
              await SecureStore.setItemAsync(key, JSON.stringify(value));
            } catch (error) {
              console.error("Failed to save to secure storage:", error);
            }
          },
          removeItem: async (key: string) => {
            try {
              await SecureStore.deleteItemAsync(key);
            } catch (error) {
              console.error("Failed to delete from secure storage:", error);
            }
          },
        },
      },
    ),
  ),
);
