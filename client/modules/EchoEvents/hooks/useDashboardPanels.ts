import { useState, useCallback, useEffect } from "react";
export interface DashboardPanel {
  id: string;
  title: string;
  type:
    | "assistant"
    | "schedule"
    | "actions"
    | "opportunities"
    | "clients"
    | "metrics"
    | "weather"
    | "calendar";
  isVisible: boolean;
  isMinimized: boolean;
  position?: number;
  customSize?: "small" | "medium" | "large";
}
interface DashboardPanelsState {
  panels: DashboardPanel[];
  addPanel: (panel: DashboardPanel) => void;
  removePanel: (panelId: string) => void;
  togglePanel: (panelId: string) => void;
  toggleMinimize: (panelId: string) => void;
  reorderPanels: (panelIds: string[]) => void;
  resetPanels: () => void;
  updatePanelSize: (
    panelId: string,
    size: "small" | "medium" | "large",
  ) => void;
}
const DEFAULT_PANELS: DashboardPanel[] = [
  {
    id: "assistant",
    title: "Smart Assistant",
    type: "assistant",
    isVisible: true,
    isMinimized: false,
    position: 0,
  },
  {
    id: "schedule",
    title: "Today's Schedule",
    type: "schedule",
    isVisible: true,
    isMinimized: false,
    position: 1,
  },
  {
    id: "actions",
    title: "Recommended Actions",
    type: "actions",
    isVisible: true,
    isMinimized: false,
    position: 2,
  },
  {
    id: "opportunities",
    title: "Opportunities",
    type: "opportunities",
    isVisible: true,
    isMinimized: false,
    position: 3,
  },
  {
    id: "clients",
    title: "Top Clients",
    type: "clients",
    isVisible: true,
    isMinimized: false,
    position: 4,
  },
  {
    id: "metrics",
    title: "Key Metrics",
    type: "metrics",
    isVisible: true,
    isMinimized: false,
    position: 5,
  },
  {
    id: "weather",
    title: "Weather",
    type: "weather",
    isVisible: true,
    isMinimized: false,
    position: 6,
  },
  {
    id: "calendar",
    title: "Calendar",
    type: "calendar",
    isVisible: true,
    isMinimized: false,
    position: 7,
  },
];
export function useDashboardPanels(): DashboardPanelsState {
  const [panels, setPanels] = useState<DashboardPanel[]>(() => {
    const saved = localStorage.getItem("dashboardPanels");
    return saved ? JSON.parse(saved) : DEFAULT_PANELS;
  });
  useEffect(() => {
    localStorage.setItem("dashboardPanels", JSON.stringify(panels));
  }, [panels]);
  const addPanel = useCallback((panel: DashboardPanel) => {
    setPanels((prev) => {
      const existing = prev.find((p) => p.id === panel.id);
      if (existing) {
        return prev.map((p) =>
          p.id === panel.id ? { ...p, isVisible: true } : p,
        );
      }
      return [...prev, { ...panel, position: prev.length }];
    });
  }, []);
  const removePanel = useCallback((panelId: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, isVisible: false } : p)),
    );
  }, []);
  const togglePanel = useCallback((panelId: string) => {
    setPanels((prev) =>
      prev.map((p) =>
        p.id === panelId ? { ...p, isVisible: !p.isVisible } : p,
      ),
    );
  }, []);
  const toggleMinimize = useCallback((panelId: string) => {
    setPanels((prev) =>
      prev.map((p) =>
        p.id === panelId ? { ...p, isMinimized: !p.isMinimized } : p,
      ),
    );
  }, []);
  const reorderPanels = useCallback((panelIds: string[]) => {
    setPanels((prev) => {
      const newPanels = [...prev];
      panelIds.forEach((id, index) => {
        const panel = newPanels.find((p) => p.id === id);
        if (panel) panel.position = index;
      });
      return newPanels.sort((a, b) => (a.position || 0) - (b.position || 0));
    });
  }, []);
  const resetPanels = useCallback(() => {
    setPanels(DEFAULT_PANELS);
    localStorage.removeItem("dashboardPanels");
  }, []);
  const updatePanelSize = useCallback(
    (panelId: string, size: "small" | "medium" | "large") => {
      setPanels((prev) =>
        prev.map((p) => (p.id === panelId ? { ...p, customSize: size } : p)),
      );
    },
    [],
  );
  return {
    panels: panels.filter((p) => p.isVisible),
    addPanel,
    removePanel,
    togglePanel,
    toggleMinimize,
    reorderPanels,
    resetPanels,
    updatePanelSize,
  };
}
