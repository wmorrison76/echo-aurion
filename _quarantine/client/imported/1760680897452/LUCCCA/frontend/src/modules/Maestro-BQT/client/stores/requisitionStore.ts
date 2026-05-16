import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useInventoryStore } from './inventoryStore';
import { useRecipeStore } from './recipeStore';

export type RequisitionStatus = 'requested' | 'approved' | 'scheduled' | 'fulfilled' | 'cancelled';

export interface RequisitionItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  inventoryItemId?: string;
  recipeId?: string; // for finished goods like Demi-Glace
  notes?: string;
}

export interface Requisition {
  id: string;
  outletId: string; // which outlet requested
  outletName?: string;
  dueAt: string; // ISO string with date-time
  createdAt: string;
  status: RequisitionStatus;
  items: RequisitionItem[];
}

interface RequisitionState {
  requisitions: Requisition[];
  create: (req: Omit<Requisition, 'id' | 'createdAt' | 'status'> & { status?: RequisitionStatus }) => string;
  updateStatus: (id: string, status: RequisitionStatus) => void;
  addItem: (reqId: string, item: Omit<RequisitionItem, 'id'>) => string;
  computeDemandByInventoryItem: (asOf?: string) => { inventoryItemId?: string; name: string; unit: string; qty: number }[];
  expandRecipeNeeds: (reqId: string) => { name: string; unit: string; qty: number; inventoryItemId?: string }[];
}

export const useRequisitionStore = create<RequisitionState>()(
  devtools((set, get) => ({
    requisitions: [],
    create: (req) => {
      const id = `req-${Date.now()}`;
      const createdAt = new Date().toISOString();
      set(s => ({ requisitions: [{ id, createdAt, status: req.status ?? 'requested', ...req, items: req.items || [] }, ...s.requisitions] }), false, 'requisition:create');
      return id;
    },
    updateStatus: (id, status) => set(s => ({ requisitions: s.requisitions.map(r => r.id === id ? { ...r, status } : r) }), false, 'requisition:updateStatus'),
    addItem: (reqId, item) => {
      const id = `ri-${Date.now()}`;
      set(s => ({ requisitions: s.requisitions.map(r => r.id === reqId ? { ...r, items: [{ id, ...item }, ...r.items] } : r) }), false, 'requisition:addItem');
      return id;
    },
    computeDemandByInventoryItem: (asOf) => {
      const inv = useInventoryStore.getState();
      const cutoff = asOf ? new Date(asOf).getTime() : Number.MAX_SAFE_INTEGER;
      const map = new Map<string, { inventoryItemId?: string; name: string; unit: string; qty: number }>();
      for (const r of get().requisitions) {
        if (new Date(r.dueAt).getTime() > cutoff) continue;
        for (const it of r.items) {
          const key = (it.inventoryItemId || it.name) + '|' + it.unit;
          const entry = map.get(key) || { inventoryItemId: it.inventoryItemId, name: it.name, unit: it.unit, qty: 0 };
          entry.qty += it.qty;
          if (!entry.inventoryItemId) {
            const match = inv.items.find(i => i.name.toLowerCase().includes(it.name.toLowerCase()));
            if (match) entry.inventoryItemId = match.id;
          }
          map.set(key, entry);
        }
      }
      return Array.from(map.values()).sort((a,b)=> a.name.localeCompare(b.name));
    },
    expandRecipeNeeds: (reqId) => {
      const req = get().requisitions.find(r => r.id === reqId);
      if (!req) return [];
      const recipeStore = useRecipeStore.getState();
      const out: { name: string; unit: string; qty: number; inventoryItemId?: string }[] = [];
      for (const it of req.items) {
        if (it.recipeId) {
          const demand = recipeStore.computeIngredientDemand(it.recipeId, it.qty);
          out.push(...demand);
        } else {
          out.push({ name: it.name, unit: it.unit, qty: it.qty, inventoryItemId: it.inventoryItemId });
        }
      }
      return out;
    },
  }), { name: 'requisition-store' })
);

export default useRequisitionStore;
