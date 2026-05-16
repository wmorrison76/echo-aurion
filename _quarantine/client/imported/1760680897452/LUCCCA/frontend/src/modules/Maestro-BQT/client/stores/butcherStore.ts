import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BEODocument } from '../types/beo';
import type { BEOComputation } from '../services/recipe-scaling';
import { scaleBEORecipes } from '../services/recipe-scaling';
import { useBEOStore } from './beoStore';
import { useInventoryStore, type InventoryItem, type Department } from './inventoryStore';

export type MeatCategory = 'beef' | 'pork' | 'lamb' | 'poultry' | 'seafood' | 'game' | 'other';

export interface CutRequirement {
  id: string;
  beoId: string;
  eventDate: string; // YYYY-MM-DD
  outletId?: string; // destination outlet/department being served
  menuItemId: string;
  recipeId?: string;
  proteinName: string; // e.g., Beef Tenderloin
  category: MeatCategory;
  cut: string; // e.g., "tenderloin steaks 8oz"
  rawWeightLb: number; // pre-trim/raw weight target
  finishedWeightLb: number; // post-trim/finished weight target
  leadDays: number; // days prior needed
  dueDate: string; // YYYY-MM-DD when butcher should complete
  serviceTime?: string; // event service time window
  deliverBy?: string; // who delivers
  status: 'queued' | 'in_prep' | 'ready' | 'transferred';
}

export interface ButcherTransfer {
  id: string;
  date: string; // ISO
  itemId: string; // inventory item id used to value transfer
  quantity: number; // in inventory unit
  unitCost: number;
  destDepartmentId: string; // outlet charged
  note?: string;
  linkedCutId?: string;
}

export interface ButcherState {
  hasCentralButcher: boolean;
  orders: CutRequirement[];
  transfers: ButcherTransfer[];
  lastGeneratedAt?: string;

  // Derived views
  upcomingForDate: (date: string) => CutRequirement[];
  pending: () => CutRequirement[];
  byOutlet: (deptId: string) => CutRequirement[];

  // Core actions
  ingestBEO: (beo: BEODocument, computed?: BEOComputation, outletId?: string) => void;
  regenerateFromAll: () => void;
  updateStatus: (cutId: string, status: CutRequirement['status']) => void;
  updateCut: (cutId: string, patch: Partial<CutRequirement>) => void;
  addManualCut: (cut: Omit<CutRequirement, 'id'> & { id?: string }) => string;
  recordTransfer: (params: Omit<ButcherTransfer, 'id' | 'unitCost'> & { itemId: string }) => string;
  linkTransferToCut: (transferId: string, cutId: string) => void;
  clearGeneratedForBEO: (beoId: string) => void;
}

// Utility: simple categorization based on ingredient or inventory name
const toMeatCategory = (name: string): MeatCategory => {
  const n = name.toLowerCase();
  if (/(beef|tenderloin|short rib|ribeye|brisket)/.test(n)) return 'beef';
  if (/(pork|belly|loin|ham)/.test(n)) return 'pork';
  if (/(lamb|mutton|rack)/.test(n)) return 'lamb';
  if (/(chicken|duck|turkey|poultry)/.test(n)) return 'poultry';
  if (/(salmon|fish|tuna|halibut|cod|shrimp|seafood|lobster|crab)/.test(n)) return 'seafood';
  if (/(venison|elk|boar|bison)/.test(n)) return 'game';
  return 'other';
};

const dateAdd = (date: string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Estimate trim yield from overrides or category defaults
const guessTrimYield = (category: MeatCategory): number => {
  switch (category) {
    case 'beef': return 0.8;
    case 'pork': return 0.85;
    case 'lamb': return 0.85;
    case 'poultry': return 0.9;
    case 'seafood': return 0.9;
    case 'game': return 0.75;
    default: return 0.85;
  }
};

function getTrimYieldForName(name: string, category: MeatCategory): number {
  try {
    const raw = localStorage.getItem('butcher.yield.overrides');
    if (raw) {
      const map = JSON.parse(raw) as Record<string, number>;
      const direct = map[name];
      if (typeof direct === 'number' && direct > 0 && direct <= 1) return direct;
      // try by category key
      const catKey = `category:${category}`;
      const byCat = map[catKey];
      if (typeof byCat === 'number' && byCat > 0 && byCat <= 1) return byCat;
    }
  } catch {}
  return guessTrimYield(category);
}

export const useButcherStore = create<ButcherState>()(devtools((set, get) => ({
  hasCentralButcher: true,
  orders: [],
  transfers: [],

  upcomingForDate: (date) => get().orders
    .filter(o => o.dueDate === date)
    .sort((a,b)=> a.proteinName.localeCompare(b.proteinName)),

  pending: () => get().orders.filter(o => o.status === 'queued' || o.status === 'in_prep'),

  byOutlet: (deptId) => get().orders.filter(o => o.outletId === deptId),

  ingestBEO: (beo, computed, outletId) => {
    const comp = computed || scaleBEORecipes(beo);
    const guestCount = beo.event.guaranteed || beo.event.expected || 0;
    const today = new Date();

    const newCuts: CutRequirement[] = [];

    for (const item of beo.menu.items || []) {
      const r = item.recipe;
      if (!r) continue;
      // Identify protein ingredients as those matching inventory items in protein/seafood or keyword heuristics
      const proteinIngs = (r.ingredients || []).filter(ing => {
        const name = String(ing.name || '').toLowerCase();
        return /(beef|pork|lamb|chicken|duck|turkey|salmon|fish|tuna|halibut|cod|shrimp|lobster|crab|venison|bison|elk)/.test(name);
      });

      const servingsPerBatch = Math.max(1, r.yield || 1);
      const buffer = 1.04; // 4% over guaranteed
      const bufferedGuests = Math.ceil(guestCount * buffer);
      const batches = Math.ceil(bufferedGuests / servingsPerBatch);

      for (const ing of proteinIngs) {
        const proteinName = ing.name;
        const category = toMeatCategory(proteinName);
        const cut = ing.prepRequired ? `${proteinName} - ${ing.prepRequired}` : proteinName;
        const finishedWeightLb = convertToLb(ing.amount * batches, ing.unit);
        const trimYield = getTrimYieldForName(proteinName, category);
        const rawWeightLb = finishedWeightLb / Math.max(0.01, trimYield);
        const leadDays = Math.max(0, r.prepDaysAdvance || 0);
        const dueDate = dateAdd(beo.event.date, -leadDays);

        newCuts.push({
          id: `cut-${beo.id}-${item.id}-${ing.id}`,
          beoId: beo.id,
          eventDate: beo.event.date,
          outletId,
          menuItemId: item.id,
          recipeId: r.id,
          proteinName,
          category,
          cut,
          rawWeightLb: Number(rawWeightLb.toFixed(2)),
          finishedWeightLb: Number(finishedWeightLb.toFixed(2)),
          leadDays,
          dueDate,
          serviceTime: beo.event.time,
          status: 'queued'
        });
      }
    }

    // Merge without duplicates by id
    set(state => {
      const existingIds = new Set(state.orders.map(o => o.id));
      const merged = [...state.orders];
      for (const c of newCuts) {
        if (!existingIds.has(c.id)) merged.push(c);
      }
      return { orders: merged, lastGeneratedAt: new Date().toISOString() };
    }, false, 'butcher/ingestBEO');
  },

  regenerateFromAll: () => {
    const { events, beos, computed } = useBEOStore.getState();
    const byId: Record<string, BEODocument> = beos || {} as any;
    const compById = computed || {} as Record<string, BEOComputation|undefined>;

    // Clear all existing orders then rebuild
    set({ orders: [], lastGeneratedAt: new Date().toISOString() }, false, 'butcher/clear');

    for (const ev of events) {
      if (!ev.beoId) continue;
      const beo = byId[ev.beoId];
      if (!beo) continue;
      // Assume outletId can be derived from room or a default department
      const outlet = pickDefaultOutlet();
      get().ingestBEO(beo, compById[ev.beoId], outlet?.id);
    }
  },

  updateStatus: (cutId, status) => set((s)=>({ orders: s.orders.map(o => o.id === cutId ? { ...o, status } : o) })),

  updateCut: (cutId, patch) => set((s)=>({ orders: s.orders.map(o => o.id === cutId ? { ...o, ...patch } : o) })),

  addManualCut: (cut) => {
    const id = cut.id || `cut-man-${Date.now()}`;
    set((s)=> ({ orders: [{ ...cut, id }, ...s.orders] }), false, 'butcher/addManualCut');
    return id;
  },

  recordTransfer: (params) => {
    const inv = useInventoryStore.getState();
    const item = inv.items.find(i => i.id === params.itemId);
    if (!item) throw new Error('Inventory item not found');
    const unitCost = item.unitCost;
    const id = `butx-${Date.now()}`;

    // Record in butcher state
    set((s)=>({ transfers: [{ id, unitCost, ...params }, ...s.transfers] }), false, 'butcher/transfer');

    // Record inventory tx for chargeback
    inv.recordTx({
      itemId: item.id,
      type: 'transfer_out',
      quantity: params.quantity,
      unitCost,
      date: new Date().toISOString(),
      note: params.note,
      sourceDepartmentId: 'dept-butcher',
      destDepartmentId: params.destDepartmentId,
    });

    return id;
  },

  linkTransferToCut: (transferId, cutId) => set((s)=>({ transfers: s.transfers.map(t => t.id === transferId ? { ...t, linkedCutId: cutId } : t) })),

  clearGeneratedForBEO: (beoId) => set((s)=>({ orders: s.orders.filter(o => o.beoId !== beoId) })),

}), { name: 'butcher-store' }));

function pickDefaultOutlet(): Department | undefined {
  const inv = useInventoryStore.getState();
  return inv.departments.find(d => d.kind === 'outlet');
}

function convertToLb(amount: number, unit: string): number {
  const u = (unit || '').toLowerCase();
  if (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') return amount;
  if (u === 'oz' || u === 'ounce' || u === 'ounces') return amount / 16;
  if (u === 'kg' || u === 'kilogram' || u === 'kilograms') return amount * 2.20462;
  if (u === 'g' || u === 'gram' || u === 'grams') return amount * 0.00220462;
  if (u === 'each' || u === 'ea') return amount * 1.0; // fallback 1 each ~= 1 lb for unknowns
  return amount; // fallback
}

export default useButcherStore;
