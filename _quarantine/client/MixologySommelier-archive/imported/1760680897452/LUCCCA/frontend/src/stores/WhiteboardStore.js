import { create } from "zustand";
export const TOOLS = { SELECT:"select", PEN:"pen", ERASER:"eraser", SHAPES:"shapes", TEXT:"text", HAND:"hand" };
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export const useWhiteboardStore = create((set, get) => ({
  tool: TOOLS.SELECT,
  zoom: 1,
  pan: { x:0, y:0 },
  history: [], future: [],

  setTool: (tool) => set({ tool }),
  zoomIn:  () => set(s => ({ zoom: clamp(s.zoom * 1.1, 0.2, 4) })),
  zoomOut: () => set(s => ({ zoom: clamp(s.zoom / 1.1, 0.2, 4) })),
  zoomReset: () => set({ zoom: 1 }),
  setPan: (p) => set(s => ({ pan: { ...s.pan, ...p } })),
  resetPan: () => set({ pan: { x:0, y:0 } }),

  pushState: (data) => set(s => ({ history: [...s.history, data], future: [] })),
  undo: () => {
    const { history, future } = get(); if (!history.length) return;
    const prev = history[history.length - 1];
    set({ history: history.slice(0,-1), future: [prev, ...future] });
  },
  redo: () => {
    const { history, future } = get(); if (!future.length) return;
    const next = future[0];
    set({ history: [...history, next], future: future.slice(1) });
  },
}));
