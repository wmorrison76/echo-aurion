/**
 * Shared Financials Store
 * 
 * Centralized state management for financial data across all modules
 * - Real-time sync support
 * - Cross-module integration (EchoAurum, RevenueOps, CostManagement)
 * - GL posting with atomic transactions
 * - Financial forecasting
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface FinancialTransaction {
  id: string;
  type: "revenue" | "expense" | "transfer" | "adjustment";
  category: string;
  amount: number;
  currency: string;
  date: string;
  outletId: string;
  description: string;
  reference?: string;
  glAccount?: string;
  posted: boolean;
  postedAt?: string;
  createdAt: string;
}

export interface FinancialPeriod {
  id: string;
  outletId: string;
  startDate: string;
  endDate: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  status: "open" | "closed" | "locked";
}

export interface FinancialsStoreState {
  // Data
  transactions: FinancialTransaction[];
  periods: FinancialPeriod[];
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  isPosting: boolean;
  error: string | null;
  
  // Filters
  selectedOutletId: string | null;
  selectedPeriod: string | null;
  selectedCategory: string | null;
  
  // Real-time sync
  lastSyncTime: number;
  pendingPostings: string[];
  failedPostings: string[];
  
  // Actions
  addTransaction: (transaction: FinancialTransaction) => void;
  updateTransaction: (id: string, updates: Partial<FinancialTransaction>) => void;
  deleteTransaction: (id: string) => void;
  setTransactions: (transactions: FinancialTransaction[]) => void;
  
  // GL Posting (atomic)
  postTransaction: (id: string) => Promise<boolean>;
  postMultipleTransactions: (ids: string[]) => Promise<{ succeeded: string[]; failed: string[] }>;
  
  // Periods
  addPeriod: (period: FinancialPeriod) => void;
  updatePeriod: (id: string, updates: Partial<FinancialPeriod>) => void;
  setPeriods: (periods: FinancialPeriod[]) => void;
  
  // Filters
  setSelectedOutletId: (outletId: string | null) => void;
  setSelectedPeriod: (periodId: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
  
  // Sync
  setSyncing: (syncing: boolean) => void;
  setPosting: (posting: boolean) => void;
  setLastSyncTime: (time: number) => void;
  addPendingPosting: (id: string) => void;
  addFailedPosting: (id: string) => void;
  clearPendingPostings: () => void;
  retryFailedPostings: () => Promise<void>;
  
  // Computed
  getTransactionById: (id: string) => FinancialTransaction | undefined;
  getTransactionsByPeriod: (periodId: string) => FinancialTransaction[];
  getTransactionsByOutlet: (outletId: string) => FinancialTransaction[];
  getTotalRevenue: (periodId?: string) => number;
  getTotalExpenses: (periodId?: string) => number;
  getProfit: (periodId?: string) => number;
  getMargin: (periodId?: string) => number;
  getUnpostedTransactions: () => FinancialTransaction[];
  
  // Reset
  reset: () => void;
}

const initialState = {
  transactions: [],
  periods: [],
  isLoading: false,
  isSyncing: false,
  isPosting: false,
  error: null,
  selectedOutletId: null,
  selectedPeriod: null,
  selectedCategory: null,
  lastSyncTime: 0,
  pendingPostings: [],
  failedPostings: [],
};

export const useFinancialsStore = create<FinancialsStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        addTransaction: (transaction) =>
          set((state) => ({
            transactions: [transaction, ...state.transactions],
            pendingPostings: transaction.posted
              ? state.pendingPostings
              : [...state.pendingPostings, transaction.id],
          })),
        
        updateTransaction: (id, updates) =>
          set((state) => ({
            transactions: state.transactions.map((t) =>
              t.id === id
                ? { ...t, ...updates, updatedAt: new Date().toISOString() }
                : t
            ),
          })),
        
        deleteTransaction: (id) =>
          set((state) => ({
            transactions: state.transactions.filter((t) => t.id !== id),
            pendingPostings: state.pendingPostings.filter((pid) => pid !== id),
          })),
        
        setTransactions: (transactions) => set({ transactions }),
        
        postTransaction: async (id) => {
          const transaction = get().transactions.find((t) => t.id === id);
          if (!transaction || transaction.posted) return false;
          
          set((state) => ({
            isPosting: true,
            pendingPostings: [...state.pendingPostings, id],
          }));
          
          try {
            // Simulate API call - replace with actual API
            await new Promise((resolve) => setTimeout(resolve, 500));
            
            set((state) => ({
              transactions: state.transactions.map((t) =>
                t.id === id
                  ? { ...t, posted: true, postedAt: new Date().toISOString() }
                  : t
              ),
              pendingPostings: state.pendingPostings.filter((pid) => pid !== id),
              isPosting: false,
            }));
            
            return true;
          } catch (error) {
            set((state) => ({
              failedPostings: [...state.failedPostings, id],
              pendingPostings: state.pendingPostings.filter((pid) => pid !== id),
              isPosting: false,
              error: error instanceof Error ? error.message : "Posting failed",
            }));
            return false;
          }
        },
        
        postMultipleTransactions: async (ids) => {
          set({ isPosting: true });
          const results = { succeeded: [] as string[], failed: [] as string[] };
          
          for (const id of ids) {
            const success = await get().postTransaction(id);
            if (success) {
              results.succeeded.push(id);
            } else {
              results.failed.push(id);
            }
          }
          
          set({ isPosting: false });
          return results;
        },
        
        addPeriod: (period) =>
          set((state) => ({
            periods: [...state.periods, period],
          })),
        
        updatePeriod: (id, updates) =>
          set((state) => ({
            periods: state.periods.map((period) =>
              period.id === id ? { ...period, ...updates } : period
            ),
          })),
        
        setPeriods: (periods) => set({ periods }),
        
        setSelectedOutletId: (outletId) => set({ selectedOutletId: outletId }),
        setSelectedPeriod: (periodId) => set({ selectedPeriod: periodId }),
        setSelectedCategory: (category) => set({ selectedCategory: category }),
        
        setSyncing: (syncing) => set({ isSyncing: syncing }),
        setPosting: (posting) => set({ isPosting: posting }),
        setLastSyncTime: (time) => set({ lastSyncTime: time }),
        addPendingPosting: (id) =>
          set((state) => ({
            pendingPostings: state.pendingPostings.includes(id)
              ? state.pendingPostings
              : [...state.pendingPostings, id],
          })),
        addFailedPosting: (id) =>
          set((state) => ({
            failedPostings: state.failedPostings.includes(id)
              ? state.failedPostings
              : [...state.failedPostings, id],
          })),
        clearPendingPostings: () => set({ pendingPostings: [] }),
        retryFailedPostings: async () => {
          const failed = get().failedPostings;
          if (failed.length === 0) return;
          
          set({ failedPostings: [] });
          await get().postMultipleTransactions(failed);
        },
        
        getTransactionById: (id) => get().transactions.find((t) => t.id === id),
        getTransactionsByPeriod: (periodId) =>
          get().transactions.filter((t) => {
            const period = get().periods.find((p) => p.id === periodId);
            if (!period) return false;
            return t.date >= period.startDate && t.date <= period.endDate;
          }),
        getTransactionsByOutlet: (outletId) =>
          get().transactions.filter((t) => t.outletId === outletId),
        getTotalRevenue: (periodId) => {
          const transactions = periodId
            ? get().getTransactionsByPeriod(periodId)
            : get().transactions;
          return transactions
            .filter((t) => t.type === "revenue" && t.posted)
            .reduce((sum, t) => sum + t.amount, 0);
        },
        getTotalExpenses: (periodId) => {
          const transactions = periodId
            ? get().getTransactionsByPeriod(periodId)
            : get().transactions;
          return transactions
            .filter((t) => t.type === "expense" && t.posted)
            .reduce((sum, t) => sum + t.amount, 0);
        },
        getProfit: (periodId) => {
          return get().getTotalRevenue(periodId) - get().getTotalExpenses(periodId);
        },
        getMargin: (periodId) => {
          const revenue = get().getTotalRevenue(periodId);
          if (revenue === 0) return 0;
          return (get().getProfit(periodId) / revenue) * 100;
        },
        getUnpostedTransactions: () => get().transactions.filter((t) => !t.posted),
        
        reset: () => set(initialState),
      }),
      {
        name: "financials-storage",
        partialize: (state) => ({
          transactions: state.transactions.filter((t) => t.posted),
          periods: state.periods,
          lastSyncTime: state.lastSyncTime,
        }),
      }
    ),
    { name: "FinancialsStore" }
  )
);
