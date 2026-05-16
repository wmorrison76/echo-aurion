import { create } from "zustand";

const defaultBounds = { x:120, y:120, width:520, height:360, z:1, isFullscreen:false };
const ensurePanelBounds = (state, id) => (state.panels[id] ? state.panels : { ...state.panels, [id]: { ...defaultBounds } });

export const usePanelStore = create((set, get) => ({
  openPanels: [],
  minimizedPanels: [],
  focusedPanel: null,
  panels: {},
  _z: 100,
  _nextZ() { const v = get()._z + 1; set({ _z: v }); return v; },

  setDefaultPanels: (ids) => set((state) => {
    const uniq = Array.from(new Set(ids));
    let panels = state.panels;
    uniq.forEach(id => { panels = ensurePanelBounds({ panels }, id); });
    let z = get()._z; const nextPanels = { ...panels };
    uniq.forEach(id => { z += 1; nextPanels[id] = { ...(nextPanels[id]), z, isFullscreen:false }; });
    return { openPanels: uniq, minimizedPanels: state.minimizedPanels.filter(id => !uniq.includes(id)), focusedPanel: uniq.at(-1) || null, panels: nextPanels, _z: z };
  }),

  openPanel: (id) => set((state) => {
    const panels = ensurePanelBounds(state, id);
    if (!state.openPanels.includes(id)) {
      const z = get()._nextZ();
      return { openPanels: [...state.openPanels, id], minimizedPanels: state.minimizedPanels.filter(p=>p!==id), focusedPanel:id, panels:{ ...panels, [id]: { ...(panels[id]), z, isFullscreen:false } } };
    }
    const z = get()._nextZ();
    return { focusedPanel:id, panels:{ ...panels, [id]: { ...(panels[id]), z } } };
  }),

  closePanel: (id) => set((state) => ({
    openPanels: state.openPanels.filter(p => p !== id),
    minimizedPanels: state.minimizedPanels.filter(p => p !== id),
    focusedPanel: state.focusedPanel === id ? null : state.focusedPanel,
  })),

  minimizePanel: (id) => set((state) => ({
    openPanels: state.openPanels.filter(p => p !== id),
    minimizedPanels: [...new Set([...state.minimizedPanels, id])],
    focusedPanel: state.focusedPanel === id ? null : state.focusedPanel,
  })),

  restorePanel: (id) => set((state) => {
    const panels = ensurePanelBounds(state, id);
    const z = get()._nextZ();
    return { openPanels: [...new Set([...state.openPanels, id])], minimizedPanels: state.minimizedPanels.filter(p=>p!==id), focusedPanel:id, panels:{ ...panels, [id]: { ...(panels[id]), z, isFullscreen:false } } };
  }),

  focusPanel: (id) => set((state) => {
    if (!state.openPanels.includes(id)) return {};
    const z = get()._nextZ();
    return { focusedPanel:id, panels:{ ...state.panels, [id]: { ...(state.panels[id] || defaultBounds), z } } };
  }),

  setPanelBounds: (id, patch) => set((state) => {
    const cur = state.panels[id]; if (!cur) return {};
    return { panels: { ...state.panels, [id]: { ...cur, ...patch } } };
  }),

  toggleFullscreen: (id) => set((state) => {
    const cur = state.panels[id]; if (!cur) return {};
    const z = get()._nextZ();
    return { panels: { ...state.panels, [id]: { ...cur, isFullscreen: !cur.isFullscreen, z } }, focusedPanel: id };
  }),

  minimizeAllPanels: () => set((state) => ({
    minimizedPanels: [...new Set([...state.minimizedPanels, ...state.openPanels])],
    openPanels: [],
    focusedPanel: null,
  })),

  restoreAllMinimized: () => set((state) => {
    let panels = { ...state.panels }; let z = get()._z;
    state.minimizedPanels.forEach(id => { if (!panels[id]) panels[id] = { ...defaultBounds }; z += 1; panels[id] = { ...panels[id], z, isFullscreen:false }; });
    return { openPanels: [...new Set([...state.openPanels, ...state.minimizedPanels])], minimizedPanels: [], focusedPanel: state.minimizedPanels.at(-1) || state.focusedPanel, panels, _z: z };
  }),

  resetPanels: () => set({ openPanels: [], minimizedPanels: [], focusedPanel: null }),
}));
