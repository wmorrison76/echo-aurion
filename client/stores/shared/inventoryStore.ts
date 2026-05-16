/**
 * Shared Inventory Store
 * 
 * Centralized state management for inventory data across all modules
 * - Real-time sync support
 * - Cross-module integration (Culinary, Purchasing, Maestro)
 * - Optimistic updates
 * - Event-driven updates
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  parLevel: number;
  reorderPoint: number;
  vendor?: string;
  cost?: number;
  lastUpdated: string;
  organizationId: string;
  outletId: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: "receipt" | "consumption" | "adjustment" | "transfer";
  quantity: number;
  timestamp: string;
  userId: string;
  notes?: string;
}

export interface InventoryStoreState {
  // Data
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  
  // Filters
  selectedOutletId: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  
  // Real-time sync
  lastSyncTime: number;
  pendingChanges: string[];
  
  // Actions
  setItems: (items: InventoryItem[]) => void;
  addItem: (item: InventoryItem) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  
  // Transactions
  addTransaction: (transaction: InventoryTransaction) => void;
  setTransactions: (transactions: InventoryTransaction[]) => void;
  
  // Filters
  setSelectedOutletId: (outletId: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // Sync
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  addPendingChange: (itemId: string) => void;
  clearPendingChanges: () => void;
  
  // Computed
  getItemById: (id: string) => InventoryItem | undefined;
  getItemsByOutlet: (outletId: string) => InventoryItem[];
  getItemsByCategory: (category: string) => InventoryItem[];
  getLowStockItems: () => InventoryItem[];
  
  // Reset
  reset: () => void;
}

const initialState = {
  items: [],
  transactions: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  selectedOutletId: null,
  selectedCategory: null,
  searchQuery: "",
  lastSyncTime: 0,
  pendingChanges: [],
};

export const useInventoryStore = create<InventoryStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setItems: (items) => set({ items }),
        
        addItem: (item) =>
          set((state) => ({
            items: [...state.items, item],
            pendingChanges: [...state.pendingChanges, item.id],
          })),
        
        updateItem: (id, updates) =>
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item
            ),
            pendingChanges: state.pendingChanges.includes(id)
              ? state.pendingChanges
              : [...state.pendingChanges, id],
          })),
        
        deleteItem: (id) =>
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
          })),
        
        addTransaction: (transaction) =>
          set((state) => ({
            transactions: [transaction, ...state.transactions].slice(0, 1000), // Keep last 1000
            pendingChanges: [...state.pendingChanges, transaction.itemId],
          })),
        
        setTransactions: (transactions) => set({ transactions }),
        
        setSelectedOutletId: (outletId) => set({ selectedOutletId: outletId }),
        setSelectedCategory: (category) => set({ selectedCategory: category }),
        setSearchQuery: (query) => set({ searchQuery: query }),
        
        setSyncing: (syncing) => set({ isSyncing: syncing }),
        setLastSyncTime: (time) => set({ lastSyncTime: time }),
        addPendingChange: (itemId) =>
          set((state) => ({
            pendingChanges: state.pendingChanges.includes(itemId)
              ? state.pendingChanges
              : [...state.pendingChanges, itemId],
          })),
        clearPendingChanges: () => set({ pendingChanges: [] }),
        
        getItemById: (id) => get().items.find((item) => item.id === id),
        getItemsByOutlet: (outletId) => get().items.filter((item) => item.outletId === outletId),
        getItemsByCategory: (category) => get().items.filter((item) => item.category === category),
        getLowStockItems: () =>
          get().items.filter((item) => item.currentStock <= item.reorderPoint),
        
        reset: () => set(initialState),
      }),
      {
        name: "inventory-storage",
        partialize: (state) => ({
          items: state.items,
          lastSyncTime: state.lastSyncTime,
        }),
      }
    ),
    { name: "InventoryStore" }
  )
);
