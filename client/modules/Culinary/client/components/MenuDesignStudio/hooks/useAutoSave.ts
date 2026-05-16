import { useEffect, useRef, useCallback } from "react";
import type { DesignerState } from "./useDesignerState";

export type SavedDesign = {
  id: string;
  name: string;
  state: DesignerState;
  savedAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "menu-studio-designs";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function useAutoSave(
  state: DesignerState,
  enabled: boolean = true,
  interval: number = AUTO_SAVE_INTERVAL
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  const save = useCallback((designId: string, designName: string) => {
    try {
      const designs = getSavedDesigns();
      const existingIndex = designs.findIndex((d) => d.id === designId);

      const savedDesign: SavedDesign = {
        id: designId,
        name: designName,
        state: JSON.parse(JSON.stringify(state)),
        savedAt: existingIndex >= 0 ? designs[existingIndex].savedAt : Date.now(),
        updatedAt: Date.now(),
      };

      if (existingIndex >= 0) {
        designs[existingIndex] = savedDesign;
      } else {
        designs.push(savedDesign);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
      lastSavedRef.current = JSON.stringify(state);
      return savedDesign;
    } catch (error) {
      console.error("Failed to save design:", error);
      return null;
    }
  }, [state]);

  const autoSave = useCallback(() => {
    if (state.isDirty) {
      const designId = `auto-save-${Date.now()}`;
      save(designId, `Auto-saved: ${new Date().toLocaleString()}`);
    }
  }, [state.isDirty, save]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(autoSave, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, interval, autoSave]);

  return { save, autoSave };
}

export function getSavedDesigns(): SavedDesign[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load saved designs:", error);
    return [];
  }
}

export function getSavedDesign(designId: string): SavedDesign | null {
  const designs = getSavedDesigns();
  return designs.find((d) => d.id === designId) || null;
}

export function deleteSavedDesign(designId: string): boolean {
  try {
    const designs = getSavedDesigns().filter((d) => d.id !== designId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
    return true;
  } catch (error) {
    console.error("Failed to delete design:", error);
    return false;
  }
}

export function renameSavedDesign(designId: string, newName: string): boolean {
  try {
    const designs = getSavedDesigns();
    const design = designs.find((d) => d.id === designId);
    if (design) {
      design.name = newName;
      design.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to rename design:", error);
    return false;
  }
}

export function clearAllSavedDesigns(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear designs:", error);
    return false;
  }
}
