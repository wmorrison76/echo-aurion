import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useRequisitionStore } from './requisitionStore';
import { useRecipeStore } from './recipeStore';
import { useBEOStore } from './beoStore';

export interface FinishedProductCount {
  id: string;
  deptId: string;
  productName: string;
  unit: string; // e.g., qt, lb, each
  qty: number;
  at: string; // ISO timestamp
}

export interface ParConfig {
  productName: string;
  unit: string;
  par: number;
  min: number;
  max?: number;
}

interface FinishedProductState {
  counts: FinishedProductCount[];
  pars: ParConfig[];

  recordCount: (c: Omit<FinishedProductCount, 'id' | 'at'> & { at?: string }) => string;
  currentOnHand: (deptId: string, productName: string, unit?: string) => number;
  getPar: (productName: string, unit?: string) => ParConfig | undefined;
  setPar: (cfg: ParConfig) => void;

  suggestPars: (horizonDays?: number) => { productName: string; unit: string; suggestedPar: number; basis: string }[];
}

export const useFinishedProductStore = create<FinishedProductState>()(
  devtools((set, get) => ({
    counts: [],
    pars: [],

    recordCount: (c) => {
      const id = `fpc-${Date.now()}`;
      const at = c.at || new Date().toISOString();
      set(s => ({ counts: [{ id, ...c, at }, ...s.counts] }), false, 'finished/recordCount');
      return id;
    },

    currentOnHand: (deptId, productName, unit) => {
      const u = (unit || '').toLowerCase();
      return get().counts
        .filter(x => x.deptId === deptId && x.productName.toLowerCase() === productName.toLowerCase() && (!u || x.unit.toLowerCase() === u))
        .sort((a,b)=> a.at.localeCompare(b.at))
        .reduce((sum, c) => sum + c.qty, 0);
    },

    getPar: (productName, unit) => get().pars.find(p => p.productName.toLowerCase() === productName.toLowerCase() && (!unit || p.unit.toLowerCase() === unit.toLowerCase())),
    setPar: (cfg) => set(s => ({ pars: [...s.pars.filter(p => !(p.productName.toLowerCase() === cfg.productName.toLowerCase() && p.unit.toLowerCase() === cfg.unit.toLowerCase())), cfg] })),

    // Heuristic par suggestions combining requisitions (demand) and upcoming BEOs/recipes
    suggestPars: (horizonDays = 7) => {
      const now = Date.now();
      const horizon = now + horizonDays*24*60*60*1000;
      const req = useRequisitionStore.getState();
      const recipe = useRecipeStore.getState();
      const beo = useBEOStore.getState();

      const demandMap = new Map<string, { name: string; unit: string; qty: number }>();

      // From requisitions due within horizon
      for (const r of req.requisitions) {
        const due = new Date(r.dueAt).getTime();
        if (due > horizon) continue;
        for (const it of r.items) {
          const key = `${it.name.toLowerCase()}|${it.unit.toLowerCase()}`;
          const cur = demandMap.get(key) || { name: it.name, unit: it.unit, qty: 0 };
          cur.qty += it.qty;
          demandMap.set(key, cur);
        }
      }

      // From BEOs: if recipes reference finished goods directly by name (e.g., 'Demi-Glace') treat as demand
      for (const ev of beo.events) {
        const t = new Date(ev.date).getTime();
        if (t > horizon) continue;
        const b = ev.beoId ? beo.beos[ev.beoId] : undefined;
        if (!b) continue;
        for (const mi of b.menu.items || []) {
          const r = mi.recipe; if(!r) continue;
          for (const ing of r.ingredients || []) {
            const name = ing.name || '';
            // simple heuristic: finished goods often titled with capitalized names like Demi-Glace, Veal Stock
            if (/glace|stock|sauce|reduction/i.test(name)) {
              const key = `${name.toLowerCase()}|${ing.unit.toLowerCase()}`;
              const cur = demandMap.get(key) || { name, unit: ing.unit, qty: 0 };
              cur.qty += ing.amount || 0;
              demandMap.set(key, cur);
            }
          }
        }
      }

      // Build suggestions: target par ~= avg daily demand * horizonDays * 1.2 safety
      const out: { productName: string; unit: string; suggestedPar: number; basis: string }[] = [];
      for (const { name, unit, qty } of demandMap.values()) {
        const avgPerDay = qty / Math.max(1, horizonDays);
        const suggested = Math.max(1, Math.round(avgPerDay * horizonDays * 1.2));
        out.push({ productName: name, unit, suggestedPar: suggested, basis: `requisitions+beos ${horizonDays}d` });
      }
      return out.sort((a,b)=> b.suggestedPar - a.suggestedPar);
    },
  }), { name: 'finished-products' })
);

export default useFinishedProductStore;
