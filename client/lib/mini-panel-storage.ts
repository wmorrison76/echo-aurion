/**
 * Mini Panel Storage System
 * Manages persistent storage and retrieval of mini dashboard panels
 * Includes position, size, and visibility state
 */

export interface MiniPanelConfig {
  id: string;
  title: string;
  panelId: string; // e.g., "revenue-trend", "cost-breakdown"
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isPinned: boolean;
  isFloating: boolean; // Track if panel has been dragged out of dashboard
  createdAt: number;
  order: number;
  zIndex?: number;
}

const STORAGE_KEY = "luccca-mini-panels";

// Keep mini panels above the app shell, but below global modals.
// This range is intentionally large enough to allow frequent focus changes.
const MIN_Z_INDEX = 30000;
const MAX_Z_INDEX = 50000;

function isSamePosition(
  a: MiniPanelConfig["position"],
  b: MiniPanelConfig["position"],
): boolean {
  return a.x === b.x && a.y === b.y;
}

function isSameSize(
  a: MiniPanelConfig["size"],
  b: MiniPanelConfig["size"],
): boolean {
  return a.width === b.width && a.height === b.height;
}

function isSamePanelConfig(a: MiniPanelConfig, b: MiniPanelConfig): boolean {
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.panelId === b.panelId &&
    isSamePosition(a.position, b.position) &&
    isSameSize(a.size, b.size) &&
    a.isMinimized === b.isMinimized &&
    a.isPinned === b.isPinned &&
    a.isFloating === b.isFloating &&
    a.createdAt === b.createdAt &&
    a.order === b.order &&
    (a.zIndex ?? null) === (b.zIndex ?? null)
  );
}

function isValidZIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readPanelsFromStorage(): MiniPanelConfig[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed as MiniPanelConfig[];
  } catch {
    return [];
  }
}

function needsZIndexNormalization(panels: MiniPanelConfig[]): boolean {
  return panels.some((p) => {
    if (!isValidZIndex(p.zIndex)) return true;
    return p.zIndex < MIN_Z_INDEX || p.zIndex > MAX_Z_INDEX;
  });
}

function normalizeZIndexes(panels: MiniPanelConfig[]): MiniPanelConfig[] {
  if (panels.length === 0) return panels;

  if (!needsZIndexNormalization(panels)) {
    return panels;
  }

  const sorted = [...panels].sort((a, b) => {
    const az = isValidZIndex(a.zIndex) ? a.zIndex : MIN_Z_INDEX;
    const bz = isValidZIndex(b.zIndex) ? b.zIndex : MIN_Z_INDEX;
    if (az !== bz) return az - bz;
    if (a.order !== b.order) return a.order - b.order;
    return a.createdAt - b.createdAt;
  });

  const idToZIndex = new Map<string, number>();
  sorted.forEach((p, index) => {
    idToZIndex.set(p.id, MIN_Z_INDEX + index);
  });

  return panels.map((p) => ({
    ...p,
    zIndex: idToZIndex.get(p.id) ?? MIN_Z_INDEX,
  }));
}

function arraysEqual(a: MiniPanelConfig[], b: MiniPanelConfig[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!isSamePanelConfig(a[i], b[i])) return false;
  }
  return true;
}

export class MiniPanelManager {
  private static savePanels(
    panels: MiniPanelConfig[],
    opts?: { dispatch?: boolean },
  ): void {
    const dispatch = opts?.dispatch ?? true;
    const prev = readPanelsFromStorage();

    if (arraysEqual(prev, panels)) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));

    if (dispatch) {
      window.dispatchEvent(
        new CustomEvent("mini-panels-updated", { detail: { panels } }),
      );
    }
  }

  static getAllMiniPanels(): MiniPanelConfig[] {
    const parsed = readPanelsFromStorage();
    const originalLength = parsed.length;

    // Clean up legacy panels that shouldn't exist
    let panels = parsed.filter((p: any) => {
      if (
        p?.panelId === "realtime-staff-coverage" ||
        p?.panelId === "staff-coverage"
      ) {
        return false;
      }
      return true;
    });

    const removedLegacy = panels.length !== originalLength;
    const normalized = normalizeZIndexes(panels);
    const didNormalize = !arraysEqual(panels, normalized);

    panels = normalized;

    // Persist cleanup/normalization without emitting an event (prevents render loops).
    if (removedLegacy || didNormalize) {
      this.savePanels(panels, { dispatch: false });
    }

    return panels;
  }

  static saveMiniPanel(panel: MiniPanelConfig): void {
    const panels = this.getAllMiniPanels();
    const index = panels.findIndex((p) => p.id === panel.id);

    if (index >= 0) {
      if (isSamePanelConfig(panels[index], panel)) {
        return;
      }
      panels[index] = panel;
    } else {
      panels.push(panel);
    }

    this.savePanels(panels);
  }

  static removeMiniPanel(panelId: string): void {
    const prevPanels = this.getAllMiniPanels();
    const panels = prevPanels.filter((p) => p.id !== panelId);
    if (panels.length === prevPanels.length) {
      return;
    }

    this.savePanels(panels);
  }

  static updatePosition(
    panelId: string,
    position: { x: number; y: number },
  ): void {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;
    if (isSamePosition(panel.position, position)) return;
    panel.position = position;
    this.savePanels(panels);
  }

  static updateSize(
    panelId: string,
    size: { width: number; height: number },
  ): void {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;
    if (isSameSize(panel.size, size)) return;
    panel.size = size;
    this.savePanels(panels);
  }

  static toggleMinimize(panelId: string): void {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;
    panel.isMinimized = !panel.isMinimized;
    this.savePanels(panels);
  }

  static setMinimized(panelId: string, isMinimized: boolean): void {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;
    if (panel.isMinimized === isMinimized) return;
    panel.isMinimized = isMinimized;
    this.savePanels(panels);
  }

  static togglePin(panelId: string): void {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;
    panel.isPinned = !panel.isPinned;
    this.savePanels(panels);
  }

  static setPinned(panelId: string, isPinned: boolean): void {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;
    if (panel.isPinned === isPinned) return;
    panel.isPinned = isPinned;
    this.savePanels(panels);
  }

  static setFloating(panelId: string, isFloating: boolean): void {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;
    if (panel.isFloating === isFloating) return;
    panel.isFloating = isFloating;
    this.savePanels(panels);
  }

  static createMiniPanel(
    panelId: string,
    title: string,
    width: number = 320,
    height: number = 200,
  ): MiniPanelConfig {
    const id = `mini-${panelId}-${Date.now()}`;
    const panels = this.getAllMiniPanels();
    const maxOrder = Math.max(0, ...panels.map((p) => p.order));

    const maxZ = Math.max(
      MIN_Z_INDEX,
      ...panels.map((p) => (isValidZIndex(p.zIndex) ? p.zIndex : MIN_Z_INDEX)),
    );

    const offset = panels.length * 30;

    const newPanel: MiniPanelConfig = {
      id,
      title,
      panelId,
      position: {
        x: Math.min(offset, 400),
        y: Math.min(offset, 250),
      },
      size: { width, height },
      isMinimized: false,
      isPinned: false,
      isFloating: false,
      createdAt: Date.now(),
      order: maxOrder + 1,
      zIndex: Math.min(MAX_Z_INDEX, maxZ + 1),
    };

    panels.push(newPanel);
    this.savePanels(panels);
    return newPanel;
  }

  static clearAllMiniPanels(): void {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("mini-panels-updated", { detail: { panels: [] } }),
    );
  }

  static getPinned(): MiniPanelConfig[] {
    return this.getAllMiniPanels().filter((p) => p.isPinned);
  }

  static updateOrder(panelId: string, newIndex: number): void {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;
    if (panel.order === newIndex) return;
    panel.order = newIndex;
    this.savePanels(panels);
  }

  static updateZIndex(panelId: string, newZIndex: number): void {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;

    const clamped = Math.min(
      MAX_Z_INDEX,
      Math.max(
        MIN_Z_INDEX,
        Number.isFinite(newZIndex) ? newZIndex : MIN_Z_INDEX,
      ),
    );

    if ((panel.zIndex ?? MIN_Z_INDEX) === clamped) return;

    panel.zIndex = clamped;
    this.savePanels(panels);
  }

  static bringToFront(panelId: string): number | null {
    const panels = this.getAllMiniPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return null;

    let maxZ = Math.max(
      MIN_Z_INDEX,
      ...panels.map((p) => (isValidZIndex(p.zIndex) ? p.zIndex : MIN_Z_INDEX)),
    );

    // If we're getting close to MAX_Z_INDEX, normalize the stack proactively
    // This prevents z-index starvation and ensures smooth interaction
    if (maxZ > MAX_Z_INDEX - 100) {
      const sorted = [...panels].sort((a, b) => {
        const az = isValidZIndex(a.zIndex) ? a.zIndex : MIN_Z_INDEX;
        const bz = isValidZIndex(b.zIndex) ? b.zIndex : MIN_Z_INDEX;
        if (az !== bz) return az - bz;
        if (a.order !== b.order) return a.order - b.order;
        return a.createdAt - b.createdAt;
      });

      const idToZIndex = new Map<string, number>();
      sorted.forEach((p, index) => {
        idToZIndex.set(p.id, MIN_Z_INDEX + index);
      });

      panels.forEach((p) => {
        p.zIndex = idToZIndex.get(p.id) ?? MIN_Z_INDEX;
      });

      maxZ = Math.max(
        MIN_Z_INDEX,
        ...panels.map((p) =>
          isValidZIndex(p.zIndex) ? p.zIndex : MIN_Z_INDEX,
        ),
      );
    }

    const nextZ = Math.min(MAX_Z_INDEX, maxZ + 1);

    if ((panel.zIndex ?? MIN_Z_INDEX) === nextZ) {
      return nextZ;
    }

    panel.zIndex = nextZ;
    this.savePanels(panels);
    return nextZ;
  }
}
