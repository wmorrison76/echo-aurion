import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type StorageType = 'dry' | 'cooler' | 'freezer' | 'fish_file' | 'wine_cellar' | 'other';
export type Category = 'protein' | 'seafood' | 'produce' | 'dairy' | 'dry_goods' | 'beverage' | 'disposable' | 'other';

export interface StorageArea {
  id: string;
  name: string;
  type: StorageType;
  description?: string;
}

export interface InventoryItemLot {
  id: string;
  qty: number;
  expiry: string; // ISO date
}

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  storageAreaId: string;
  unit: string;
  unitCost: number; // cost per unit for value estimate
  qtyCountedAtEOM: number; // last end-of-month physical count
  lastCountDate: string; // ISO date
  parLevel?: number; // desired on-hand units
  lots?: InventoryItemLot[]; // optional FEFO lots
}

export type TxType = 'purchase' | 'transfer_in' | 'transfer_out' | 'beo_consumption' | 'adjustment' | 'sale';
export interface Department {
  id: string;
  name: string;
  kind: 'outlet' | 'department';
}

export interface InventoryTx {
  id: string;
  itemId: string;
  type: TxType;
  quantity: number; // positive numbers; direction implied by type
  unitCost?: number; // for purchases/valuation adjustments
  date: string; // ISO
  note?: string;
  sourceAreaId?: string;
  destAreaId?: string;
  sourceDepartmentId?: string;
  destDepartmentId?: string;
  beoId?: string;
}

interface InventoryState {
  areas: StorageArea[];
  departments: Department[];
  items: InventoryItem[];
  tx: InventoryTx[];
  internalStoreroomConnected: boolean;

  // CRUD Areas
  addArea: (area: Omit<StorageArea, 'id'>) => string;
  updateArea: (id: string, updates: Partial<StorageArea>) => void;
  removeArea: (id: string) => void;

  // Departments
  addDepartment: (dept: Omit<Department, 'id'>) => string;
  updateDepartment: (id: string, updates: Partial<Department>) => void;
  removeDepartment: (id: string) => void;

  // Items
  addItem: (item: Omit<InventoryItem, 'id'>) => string;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  removeItem: (id: string) => void;

  // Transactions
  recordTx: (tx: Omit<InventoryTx, 'id'>) => string;
  applyBeoConsumption: (beo: any) => void; // consumes inventory based on BEO recipes

  // Derived helpers
  onHandQty: (itemId: string, asOf?: Date) => number;
  onHandValueByArea: (areaId: string) => number;
  onHandValueTotal: () => number;
  byCategory: () => Record<Category, number>;
  volumeBreakdownByUnit: () => Record<string, number>;

  // Analytics & Forecasting
  forecastDailyUse: (itemId: string, days?: number) => number; // average daily consumption
  suggestReorderQty: (itemId: string, horizonDays?: number) => number;
  lowStockItems: () => InventoryItem[];
  generateAutoPO: () => { itemId: string; name: string; suggestedQty: number; estCost: number }[];

  // Queries
  monthsRange: () => string[]; // ['2025-01', '2025-02', ...]
  transfersByMonth: (month: string | 'all') => InventoryTx[];

  // Integrations
  toggleStoreroomConnection: (connected: boolean) => void;
}

const nowISO = () => new Date().toISOString();

const sampleAreas: StorageArea[] = [
  { id: 'area-dry-1', name: 'Dry Storage A', type: 'dry' },
  { id: 'area-cool-1', name: 'Walk-in Cooler', type: 'cooler' },
  { id: 'area-free-1', name: 'Freezer B', type: 'freezer' },
  { id: 'area-fish-1', name: 'Fish File', type: 'fish_file' },
];

const sampleDepts: Department[] = [
  { id: 'dept-banq', name: 'Banquets', kind: 'outlet' },
  { id: 'dept-rest', name: 'Restaurant', kind: 'outlet' },
  { id: 'dept-rm', name: 'Room Service', kind: 'outlet' },
  { id: 'dept-pastry', name: 'Pastry', kind: 'department' },
  { id: 'dept-butcher', name: 'Butcher', kind: 'department' },
];

const sampleItems: InventoryItem[] = [
  { id: 'itm-1', name: 'Chicken Breast', category: 'protein', storageAreaId: 'area-cool-1', unit: 'lb', unitCost: 3.2, qtyCountedAtEOM: 180, lastCountDate: nowISO(), parLevel: 200 },
  { id: 'itm-2', name: 'Beef Tenderloin', category: 'protein', storageAreaId: 'area-free-1', unit: 'lb', unitCost: 28.5, qtyCountedAtEOM: 42, lastCountDate: nowISO(), parLevel: 60 },
  { id: 'itm-3', name: 'Atlantic Salmon', category: 'seafood', storageAreaId: 'area-fish-1', unit: 'lb', unitCost: 24.0, qtyCountedAtEOM: 30, lastCountDate: nowISO(), parLevel: 50 },
  { id: 'itm-4', name: 'Heavy Cream', category: 'dairy', storageAreaId: 'area-cool-1', unit: 'gal', unitCost: 4.9, qtyCountedAtEOM: 12, lastCountDate: nowISO(), parLevel: 18 },
  { id: 'itm-5', name: 'Flour 50lb', category: 'dry_goods', storageAreaId: 'area-dry-1', unit: 'bag', unitCost: 22.0, qtyCountedAtEOM: 8, lastCountDate: nowISO(), parLevel: 12 },
  { id: 'itm-6', name: 'House Wine Selection', category: 'beverage', storageAreaId: 'area-dry-1', unit: 'bottle', unitCost: 12.0, qtyCountedAtEOM: 55, lastCountDate: nowISO(), parLevel: 80 },
];

const sampleTx: InventoryTx[] = [
  { id: 'tx-1', itemId: 'itm-1', type: 'purchase', quantity: 60, unitCost: 3.1, date: nowISO(), note: 'Weekly chicken delivery' },
  { id: 'tx-2', itemId: 'itm-3', type: 'purchase', quantity: 20, unitCost: 23.5, date: nowISO() },
  { id: 'tx-3', itemId: 'itm-2', type: 'beo_consumption', quantity: 12, date: nowISO(), note: 'Smith Wedding' },
  { id: 'tx-4', itemId: 'itm-4', type: 'transfer_out', quantity: 2, date: nowISO(), note: 'To Pastry' },
];

export const useInventoryStore = create<InventoryState>()(
  devtools((set, get) => ({
    areas: sampleAreas,
    departments: sampleDepts,
    items: sampleItems,
    tx: sampleTx,
    internalStoreroomConnected: false,

    addArea: (area) => {
      const id = `area-${Date.now()}`;
      set((s) => ({ areas: [...s.areas, { id, ...area }] }), false, 'addArea');
      return id;
    },
    updateArea: (id, updates) => set((s) => ({ areas: s.areas.map(a => a.id === id ? { ...a, ...updates } : a) }), false, 'updateArea'),
    removeArea: (id) => set((s) => ({ areas: s.areas.filter(a => a.id !== id), items: s.items.filter(i => i.storageAreaId !== id) }), false, 'removeArea'),

    addDepartment: (dept) => {
      const id = `dept-${Date.now()}`;
      set((s) => ({ departments: [...(s.departments || []), { id, ...dept }] }), false, 'addDepartment');
      return id;
    },
    updateDepartment: (id, updates) => set((s) => ({ departments: (s.departments || []).map(d => d.id === id ? { ...d, ...updates } : d) }), false, 'updateDepartment'),
    removeDepartment: (id) => set((s) => ({ departments: (s.departments || []).filter(d => d.id !== id) }), false, 'removeDepartment'),

    addItem: (item) => {
      const id = `itm-${Date.now()}`;
      set((s) => ({ items: [...s.items, { id, ...item }] }), false, 'addItem');
      return id;
    },
    updateItem: (id, updates) => set((s) => ({ items: s.items.map(i => i.id === id ? { ...i, ...updates } : i) }), false, 'updateItem'),
    removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id), tx: s.tx.filter(t => t.itemId !== id) }), false, 'removeItem'),

    recordTx: (t) => {
      const id = `tx-${Date.now()}`;
      set((s) => ({ tx: [{ id, ...t }, ...s.tx] }), false, 'recordTx');
      return id;
    },

    applyBeoConsumption: (beo: any) => {
      try {
        const guaranteed = Number(beo?.event?.guaranteed || beo?.event?.expected || 0);
        const menuItems = beo?.menu?.items || [];
        for (const m of menuItems) {
          const recipe = m?.recipe;
          if (!recipe?.ingredients || !recipe.yield) continue;
          const scale = Math.max(1, Math.ceil(guaranteed / recipe.yield));
          for (const ing of recipe.ingredients) {
            const targetQty = (ing.amount || 0) * scale; // simplistic unit handling
            // find inventory item by name match
            const inv = get().items.find(i => i.name.toLowerCase().includes(String(ing.name || '').toLowerCase()));
            if (!inv) continue;
            get().recordTx({ itemId: inv.id, type: 'beo_consumption', quantity: targetQty, date: nowISO(), note: beo?.id });
          }
        }
      } catch {}
    },

    onHandQty: (itemId, asOf) => {
      const item = get().items.find(i => i.id === itemId);
      if (!item) return 0;
      const since = new Date(item.lastCountDate).getTime();
      const end = asOf ? asOf.getTime() : Date.now();
      const delta = get().tx
        .filter(t => t.itemId === itemId && new Date(t.date).getTime() >= since && new Date(t.date).getTime() <= end)
        .reduce((sum, t) => {
          const q = t.quantity;
          switch (t.type) {
            case 'purchase':
            case 'transfer_in':
              return sum + q;
            case 'sale':
            case 'beo_consumption':
            case 'transfer_out':
              return sum - q;
            case 'adjustment':
            default:
              return sum + q; // adjustments can be +-; assume signed qty
          }
        }, 0);
      return Math.max(0, item.qtyCountedAtEOM + delta);
    },

    onHandValueByArea: (areaId) => {
      return get().items
        .filter(i => i.storageAreaId === areaId)
        .reduce((s, i) => s + get().onHandQty(i.id) * i.unitCost, 0);
    },

    onHandValueTotal: () => get().items.reduce((s, i) => s + get().onHandQty(i.id) * i.unitCost, 0),

    byCategory: () => {
      const out = {
        protein: 0, seafood: 0, produce: 0, dairy: 0, dry_goods: 0, beverage: 0, disposable: 0, other: 0,
      } as Record<Category, number>;
      for (const i of get().items) {
        out[i.category] += get().onHandQty(i.id) * i.unitCost;
      }
      return out;
    },

    volumeBreakdownByUnit: () => {
      const map = new Map<string, number>();
      for (const i of get().items) {
        const q = get().onHandQty(i.id);
        if (!q) continue;
        map.set(i.unit, (map.get(i.unit) || 0) + q);
      }
      // Convert to plain object
      const out: Record<string, number> = {};
      for (const [u, q] of Array.from(map.entries()).sort((a,b)=> b[1]-a[1])) out[u] = q;
      return out;
    },

    forecastDailyUse: (itemId, days = 30) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const cons = get().tx.filter(t => t.itemId === itemId && (t.type === 'sale' || t.type === 'beo_consumption' || t.type === 'transfer_out') && new Date(t.date).getTime() >= cutoff)
        .reduce((s, t) => s + t.quantity, 0);
      return cons / Math.max(1, days);
    },

    suggestReorderQty: (itemId, horizonDays = 7) => {
      const item = get().items.find(i => i.id === itemId);
      if (!item) return 0;
      const onHand = get().onHandQty(itemId);
      const demand = get().forecastDailyUse(itemId) * horizonDays;
      const target = item.parLevel ?? demand;
      return Math.max(0, Math.ceil(target - onHand));
    },

    lowStockItems: () => get().items.filter(i => (i.parLevel ?? 0) > 0 && get().onHandQty(i.id) < (i.parLevel as number)),

    generateAutoPO: () => {
      const lows = get().lowStockItems();
      return lows.map(i => {
        const qty = get().suggestReorderQty(i.id);
        return { itemId: i.id, name: i.name, suggestedQty: qty, estCost: qty * i.unitCost };
      }).filter(r => r.suggestedQty > 0);
    },

    monthsRange: () => {
      const dates: number[] = [];
      const allDates = [
        ...get().items.map(i => new Date(i.lastCountDate).getTime()),
        ...get().tx.map(t => new Date(t.date).getTime()),
      ].filter(Boolean);
      const min = allDates.length ? Math.min(...allDates) : Date.now();
      const start = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1);
      const end = new Date();
      end.setDate(1);
      const out: string[] = [];
      for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
        out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      return out;
    },

    transfersByMonth: (month) => {
      const isTransfer = (t: InventoryTx) => t.type === 'transfer_in' || t.type === 'transfer_out';
      const tx = get().tx.filter(isTransfer);
      if (month === 'all') return tx;
      return tx.filter(t => t.date.startsWith(month));
    },

    toggleStoreroomConnection: (connected) => set({ internalStoreroomConnected: connected }, false, 'toggleStoreroomConnection'),
  }), { name: 'inventory-store' })
);

export default useInventoryStore;
