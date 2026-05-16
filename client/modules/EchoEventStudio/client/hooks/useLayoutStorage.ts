import { useCallback, useState } from "react";

import type { EchoLayoutObject } from "@/scenes/EchoLayoutScene";
import { toast } from "@/hooks/use-toast";

export interface SavedLayout {
  id: string;
  name: string;
  roomWidth: number;
  roomLength: number;
  objects: EchoLayoutObject[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

/**
 * useLayoutStorage
 * Local-first layout persistence for EchoEventStudio (Phase 1).
 */
export function useLayoutStorage() {
  const [layouts, setLayouts] = useState<SavedLayout[]>(() => {
    try {
      const saved = localStorage.getItem("echo_layouts");
      return saved ? (JSON.parse(saved) as SavedLayout[]) : [];
    } catch {
      return [];
    }
  });

  const saveLayout = useCallback(
    async (
      name: string,
      roomWidth: number,
      roomLength: number,
      objects: EchoLayoutObject[],
      layoutId?: string,
    ): Promise<string | null> => {
      try {
        const id = layoutId || `layout_${Date.now()}`;
        const now = new Date().toISOString();
        const createdAt = layoutId
          ? layouts.find((l) => l.id === layoutId)?.createdAt || now
          : now;

        const layout: SavedLayout = {
          id,
          name,
          roomWidth,
          roomLength,
          objects,
          createdAt,
          updatedAt: now,
          metadata: {
            totalObjects: objects.length,
            objectTypes: objects.reduce(
              (acc, o) => {
                acc[(o as any).type] = (acc[(o as any).type] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ),
          },
        };

        setLayouts((prev) => {
          const updated = layoutId
            ? prev.map((l) => (l.id === layoutId ? layout : l))
            : [...prev, layout];
          localStorage.setItem("echo_layouts", JSON.stringify(updated));
          return updated;
        });

        toast({
          title: layoutId ? "Layout updated" : "Layout saved",
          description: `"${name}" has been saved successfully`,
        });
        return id;
      } catch (err) {
        toast({
          title: "Error saving layout",
          description:
            err instanceof Error ? err.message : "Failed to save layout",
          variant: "destructive",
        });
        return null;
      }
    },
    [layouts],
  );

  const deleteLayout = useCallback((layoutId: string) => {
    setLayouts((prev) => {
      const updated = prev.filter((l) => l.id !== layoutId);
      localStorage.setItem("echo_layouts", JSON.stringify(updated));
      return updated;
    });
    toast({ title: "Layout deleted" });
  }, []);

  const loadLayoutById = useCallback(
    (layoutId: string): SavedLayout | null => {
      return layouts.find((l) => l.id === layoutId) || null;
    },
    [layouts],
  );

  const loadLayouts = useCallback(() => {
    setLayouts(() => {
      try {
        const saved = localStorage.getItem("echo_layouts");
        return saved ? (JSON.parse(saved) as SavedLayout[]) : [];
      } catch {
        return [];
      }
    });
  }, []);

  return {
    isAvailable: true,
    isLoading: false,
    isSaving: false,
    layouts,
    saveLayout,
    deleteLayout,
    loadLayoutById,
    loadLayouts,
  };
}
