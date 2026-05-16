import { create as createStore } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MaestroBqtTabRow, MaestroBqtTabState, MaestroBqtTab, UUID } from './MaestroBqtTabTypes';

function uid(): UUID { try { return crypto.randomUUID() as UUID; } catch { return (Math.random().toString(36).slice(2) as UUID); } }

export interface MaestroBqtTabsStore extends MaestroBqtTabState {
  hydrated: boolean;
  usePerTabColors: boolean;
  setUsePerTabColors(on: boolean): void;
  init(state?: Partial<MaestroBqtTabState>): void;
  addRow(name?: string): UUID;
  removeRow(rowId: UUID): void;
  addTab(rowId: UUID, tab: Omit<MaestroBqtTab, 'id'>): UUID;
  removeTab(rowId: UUID, tabId: UUID): void;
  renameTab(rowId: UUID, tabId: UUID, title: string): void;
  moveTab(srcRowId: UUID, srcIndex: number, dstRowId: UUID, dstIndex: number): void;
  setActive(rowId: UUID, tabId: UUID): void;
  updateTab(rowId: UUID, tabId: UUID, patch: Partial<MaestroBqtTab>): void;
}

export const useMaestroBqtTabs = createStore<MaestroBqtTabsStore>()(
  persist(
    (set, get) => ({
      rows: [],
      active: null,
      hydrated: false,
      usePerTabColors: false,
      setUsePerTabColors: (on)=> set({ usePerTabColors: on }),
      init: (state) => set((s) => {
        const baseRows = state?.rows ?? (s.rows.length ? s.rows : [
          { id: uid(), name: 'Top', tabs: [] },
          { id: uid(), name: 'Middle', tabs: [] },
          { id: uid(), name: 'Bottom', tabs: [] },
        ]);
        const normalized = baseRows.map(r => ({
          ...r,
          tabs: r.tabs.map(t => t.kind === 'ROUTE' && (t.payload === '/beo-management' || t.payload === '/beo-management/') ? { ...t, payload: '/beo-management/new' } : t)
        }));
        return { rows: normalized, active: state?.active ?? s.active ?? null };
      }),
      addRow: (name = 'Row') => { const id = uid(); set((s) => ({ rows: [...s.rows, { id, name, tabs: [] }].slice(0, 3) })); return id; },
      removeRow: (rowId) => set((s) => ({ rows: s.rows.filter(r => r.id !== rowId) })),
      addTab: (rowId, tab) => { const id = uid(); set((s) => ({ rows: s.rows.map(r => r.id === rowId ? { ...r, tabs: [...r.tabs, { ...tab, id }] } : r) })); return id; },
      removeTab: (rowId, tabId) => set((s) => ({ rows: s.rows.map(r => r.id === rowId ? { ...r, tabs: r.tabs.filter(t => t.id !== tabId) } : r) })),
      renameTab: (rowId, tabId, title) => set((s) => ({ rows: s.rows.map(r => r.id === rowId ? { ...r, tabs: r.tabs.map(t => t.id === tabId ? { ...t, title } : t) } : r) })),
      moveTab: (srcRowId, srcIndex, dstRowId, dstIndex) => set((s) => { const src = s.rows.find(r => r.id === srcRowId)!; const dst = s.rows.find(r => r.id === dstRowId)!; const tab = src.tabs[srcIndex]; const newSrc = src.tabs.filter((_, i) => i !== srcIndex); const newDst = [...dst.tabs]; newDst.splice(dstIndex, 0, tab); return { rows: s.rows.map(r => r.id === srcRowId ? { ...r, tabs: newSrc } : r.id === dstRowId ? { ...r, tabs: newDst } : r) }; }),
      setActive: (rowId, tabId) => set({ active: { rowId, tabId } }),
      updateTab: (rowId, tabId, patch) => set((s)=> ({ rows: s.rows.map(r=> r.id===rowId ? { ...r, tabs: r.tabs.map(t=> t.id===tabId ? { ...t, ...patch } : t) } : r) })),
    }),
    { name: 'maestroBqt.globalTabs' }
  )
);

export const MaestroBqtDefaultRows: MaestroBqtTabRow[] = [
  { id: uid(), name: 'Top', tabs: [
    { id: uid(), title: 'Dashboard', kind: 'ROUTE', payload: '/', color: '#2563eb' },
    { id: uid(), title: 'Global Calendar', kind: 'ROUTE', payload: '/calendar', color: '#10b981' },
    { id: uid(), title: 'Personal Calendar', kind: 'ROUTE', payload: '/personal-calendar', color: '#06b6d4' },
    { id: uid(), title: 'Connect', kind: 'PANEL', payload: { id: 'MaestroBqtConnectPanel' }, color: '#a855f7' },
  ]},
  { id: uid(), name: 'Middle', tabs: [
    { id: uid(), title: 'BEOs', kind: 'ROUTE', payload: '/beo-management/new', color: '#f59e0b' },
    { id: uid(), title: 'BQT Menu', kind: 'PANEL', payload: { id: 'MenuBuilderPanel' }, color: '#6366f1' },
    { id: uid(), title: 'Prep List Creator', kind: 'PANEL', payload: { id: 'PrepListPanel' }, color: '#14b8a6' },
    { id: uid(), title: 'Production', kind: 'PANEL', payload: { id: 'ProductionPlannerPanel' }, color: '#ef4444' },
    { id: uid(), title: 'Schedule', kind: 'ROUTE', payload: '/production?view=schedule', color: '#06b6d4' },
    { id: uid(), title: 'Butcher', kind: 'PANEL', payload: { id: 'ButcherPanel' }, color: '#f97316' },
    { id: uid(), title: 'Ordering/Invoices', kind: 'ROUTE', payload: '/ordering', color: '#0ea5e9' },
    { id: uid(), title: 'Inventory', kind: 'ROUTE', payload: '/inventory', color: '#84cc16' },
    { id: uid(), title: 'Menu Analytics', kind: 'ROUTE', payload: '/menu-analytics', color: '#8b5cf6' },
    { id: uid(), title: 'Add Recipe', kind: 'PANEL', payload: { id: 'AddRecipePanel' }, color: '#22c55e' },
    { id: uid(), title: 'Recipes', kind: 'ROUTE', payload: '/recipes', color: '#0ea5e9' },
  ]},
  { id: uid(), name: 'Bottom', tabs: [
    { id: uid(), title: 'Chef Kitchen', kind: 'ROUTE', payload: '/kitchen', color: '#e11d48' },
    { id: uid(), title: 'HACCP', kind: 'ROUTE', payload: '/haccp', color: '#16a34a' },
    { id: uid(), title: 'Pre-Inspection', kind: 'ROUTE', payload: '/pre-inspection', color: '#0ea5e9' },
    { id: uid(), title: 'Staff Assignment', kind: 'ROUTE', payload: '/team-dashboard', color: '#c084fc' },
    { id: uid(), title: 'Chat', kind: 'ROUTE', payload: '/chat', color: '#60a5fa' },
    { id: uid(), title: 'Food/Event Photos', kind: 'PANEL', payload: { id: 'MediaLibraryPanel' }, color: '#06b6d4' },
  ]},
];
