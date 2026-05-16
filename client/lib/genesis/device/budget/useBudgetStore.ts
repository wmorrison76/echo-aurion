import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BudgetCategory = {
  key: "food" | "alcohol" | "disposables" | "smallwares";
  label: string;
  monthlyBudget: number;
  monthToDateSpend: number;
};

export const useBudgetStore = create<any>()(
  persist(
    (set, get) => ({
      categories: [
        { key: "food", label: "Food", monthlyBudget: 120000, monthToDateSpend: 82000 },
        { key: "alcohol", label: "Alcohol", monthlyBudget: 45000, monthToDateSpend: 30000 },
        { key: "disposables", label: "Disposables", monthlyBudget: 15000, monthToDateSpend: 9000 },
        { key: "smallwares", label: "Smallwares", monthlyBudget: 8000, monthToDateSpend: 2100 },
      ] as BudgetCategory[],
      setSpend: (key: BudgetCategory["key"], spend: number) => {
        set({
          categories: get().categories.map((c: BudgetCategory) => (c.key === key ? { ...c, monthToDateSpend: spend } : c)),
        });
      },
      setBudget: (key: BudgetCategory["key"], budget: number) => {
        set({
          categories: get().categories.map((c: BudgetCategory) => (c.key === key ? { ...c, monthlyBudget: budget } : c)),
        });
      },
    }),
    { name: "luccca.genesis.budgets.v1" }
  )
);
