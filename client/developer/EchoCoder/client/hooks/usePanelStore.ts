import { create } from 'zustand';

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

export interface FloatingPanel {
  id: string;
  moduleId: string;
  title: string;
  position: PanelPosition;
  size: PanelSize;
  isMinimized: boolean;
  isPinned: boolean;
  zIndex: number;
  openedAt: number;
}

interface PanelState {
  panels: Map<string, FloatingPanel>;
  nextZIndex: number;
  
  // Actions
  addPanel: (panel: Omit<FloatingPanel, 'zIndex' | 'openedAt'>) => void;
  removePanel: (id: string) => void;
  updatePanel: (id: string, updates: Partial<FloatingPanel>) => void;
  minimizePanel: (id: string) => void;
  maximizePanel: (id: string) => void;
  pinPanel: (id: string) => void;
  unpinPanel: (id: string) => void;
  bringToFront: (id: string) => void;
  clearAllPanels: () => void;
  
  // Getters
  getPanel: (id: string) => FloatingPanel | undefined;
  getPanels: () => FloatingPanel[];
  getPanelsByModule: (moduleId: string) => FloatingPanel[];
}

export const usePanelStore = create<PanelState>((set, get) => ({
  panels: new Map(),
  nextZIndex: 100,

  addPanel: (panel) => {
    set((state) => {
      const id = panel.id;
      const newPanel: FloatingPanel = {
        ...panel,
        zIndex: state.nextZIndex,
        openedAt: Date.now(),
      };
      const newPanels = new Map(state.panels);
      newPanels.set(id, newPanel);
      
      return {
        panels: newPanels,
        nextZIndex: state.nextZIndex + 1,
      };
    });
  },

  removePanel: (id) => {
    set((state) => {
      const newPanels = new Map(state.panels);
      newPanels.delete(id);
      return { panels: newPanels };
    });
  },

  updatePanel: (id, updates) => {
    set((state) => {
      const panel = state.panels.get(id);
      if (!panel) return state;
      
      const newPanels = new Map(state.panels);
      newPanels.set(id, { ...panel, ...updates });
      return { panels: newPanels };
    });
  },

  minimizePanel: (id) => {
    set((state) => {
      const panel = state.panels.get(id);
      if (!panel) return state;
      
      const newPanels = new Map(state.panels);
      newPanels.set(id, { ...panel, isMinimized: true });
      return { panels: newPanels };
    });
  },

  maximizePanel: (id) => {
    set((state) => {
      const panel = state.panels.get(id);
      if (!panel) return state;
      
      const newPanels = new Map(state.panels);
      newPanels.set(id, { ...panel, isMinimized: false });
      return { panels: newPanels };
    });
  },

  pinPanel: (id) => {
    set((state) => {
      const panel = state.panels.get(id);
      if (!panel) return state;
      
      const newPanels = new Map(state.panels);
      newPanels.set(id, { ...panel, isPinned: true });
      return { panels: newPanels };
    });
  },

  unpinPanel: (id) => {
    set((state) => {
      const panel = state.panels.get(id);
      if (!panel) return state;
      
      const newPanels = new Map(state.panels);
      newPanels.set(id, { ...panel, isPinned: false });
      return { panels: newPanels };
    });
  },

  bringToFront: (id) => {
    set((state) => {
      const panel = state.panels.get(id);
      if (!panel) return state;
      
      const newPanels = new Map(state.panels);
      newPanels.set(id, { ...panel, zIndex: state.nextZIndex });
      
      return {
        panels: newPanels,
        nextZIndex: state.nextZIndex + 1,
      };
    });
  },

  clearAllPanels: () => {
    set({ panels: new Map() });
  },

  getPanel: (id) => {
    return get().panels.get(id);
  },

  getPanels: () => {
    return Array.from(get().panels.values()).sort((a, b) => a.openedAt - b.openedAt);
  },

  getPanelsByModule: (moduleId) => {
    return Array.from(get().panels.values())
      .filter((panel) => panel.moduleId === moduleId)
      .sort((a, b) => a.openedAt - b.openedAt);
  },
}));
