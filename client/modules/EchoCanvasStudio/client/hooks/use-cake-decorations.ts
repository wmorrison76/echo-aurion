/**
 * Use Cake Decorations Hook
 * Manages decoration state, generation, and lifecycle
 */

import { useState, useCallback } from "react";
import type {
  Decoration,
  TextPipingDecoration,
  DecorationState,
  DecorationQueueItem,
} from "@/lib/decoration-types";

interface UseCakeDecorationsOptions {
  maxDecorations?: number;
  autoSave?: boolean;
  persistToLocalStorage?: boolean;
}

const STORAGE_KEY = "cake-decorations";

export function useCakeDecorations(options: UseCakeDecorationsOptions = {}) {
  const {
    maxDecorations = 20,
    autoSave = true,
    persistToLocalStorage = true,
  } = options;

  const [state, setState] = useState<DecorationState>(() => {
    if (persistToLocalStorage) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            decorations: parsed.decorations || [],
            isGenerating: false,
            activeDecoration: undefined,
          };
        }
      } catch (e) {
        console.warn("Failed to load decorations from localStorage:", e);
      }
    }
    return {
      decorations: [],
      isGenerating: false,
    };
  });

  const [generationQueue, setGenerationQueue] = useState<DecorationQueueItem[]>(
    [],
  );

  // Save to localStorage
  const saveToStorage = useCallback(() => {
    if (persistToLocalStorage) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            decorations: state.decorations,
            lastSaved: new Date().toISOString(),
          }),
        );
      } catch (e) {
        console.warn("Failed to save decorations to localStorage:", e);
      }
    }
  }, [state.decorations, persistToLocalStorage]);

  // Add decoration
  const addDecoration = useCallback(
    (decoration: Decoration) => {
      setState((prev) => {
        if (prev.decorations.length >= maxDecorations) {
          return {
            ...prev,
            lastError: `Maximum ${maxDecorations} decorations allowed`,
          };
        }

        const updated = {
          ...prev,
          decorations: [...prev.decorations, decoration],
          activeDecoration: decoration.id,
        };

        if (autoSave) {
          setTimeout(() => saveToStorage(), 0);
        }

        return updated;
      });
    },
    [maxDecorations, autoSave, saveToStorage],
  );

  // Remove decoration
  const removeDecoration = useCallback(
    (id: string) => {
      setState((prev) => {
        const updated = {
          ...prev,
          decorations: prev.decorations.filter((d) => d.id !== id),
          activeDecoration:
            prev.activeDecoration === id ? undefined : prev.activeDecoration,
        };

        if (autoSave) {
          setTimeout(() => saveToStorage(), 0);
        }

        return updated;
      });
    },
    [autoSave, saveToStorage],
  );

  // Update decoration
  const updateDecoration = useCallback(
    (id: string, updates: Partial<Decoration>) => {
      setState((prev) => {
        const updated = {
          ...prev,
          decorations: prev.decorations.map((d) =>
            d.id === id ? { ...d, ...updates } : d,
          ),
        };

        if (autoSave) {
          setTimeout(() => saveToStorage(), 0);
        }

        return updated;
      });
    },
    [autoSave, saveToStorage],
  );

  // Set active decoration
  const setActiveDecoration = useCallback((id: string | undefined) => {
    setState((prev) => ({
      ...prev,
      activeDecoration: id,
    }));
  }, []);

  // Get active decoration
  const getActiveDecoration = useCallback(() => {
    return state.decorations.find((d) => d.id === state.activeDecoration);
  }, [state.decorations, state.activeDecoration]);

  // Get decorations by type
  const getDecorationsByType = useCallback(
    (type: string) => {
      return state.decorations.filter((d) => d.type === type);
    },
    [state.decorations],
  );

  // Clear all decorations
  const clearDecorations = useCallback(() => {
    setState((prev) => ({
      ...prev,
      decorations: [],
      activeDecoration: undefined,
    }));

    if (persistToLocalStorage) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn("Failed to clear localStorage:", e);
      }
    }
  }, [persistToLocalStorage]);

  // Queue decoration for generation
  const queueDecorationGeneration = useCallback(
    (decoration: Decoration, prompt: string, priority: number = 5) => {
      const queueItem: DecorationQueueItem = {
        id: decoration.id,
        type: decoration.type,
        prompt,
        config: decoration,
        priority,
        retries: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      setGenerationQueue((prev) => {
        const sorted = [...prev, queueItem].sort(
          (a, b) => b.priority - a.priority,
        );
        return sorted;
      });

      return queueItem;
    },
    [],
  );

  // Update queue item status
  const updateQueueItemStatus = useCallback(
    (id: string, status: DecorationQueueItem["status"], imageUrl?: string) => {
      setGenerationQueue((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            if (status === "completed" && imageUrl) {
              // Also update the decoration with the generated image
              updateDecoration(id, {
                imageUrl,
                generationStatus: "completed",
              });
            }
            return { ...item, status };
          }
          return item;
        }),
      );
    },
    [updateDecoration],
  );

  // Remove from queue
  const removeFromQueue = useCallback((id: string) => {
    setGenerationQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Set generating state
  const setIsGenerating = useCallback((isGenerating: boolean) => {
    setState((prev) => ({
      ...prev,
      isGenerating,
    }));
  }, []);

  // Update position
  const updateDecorationPosition = useCallback(
    (id: string, position: { x: number; y: number; z?: number }) => {
      updateDecoration(id, { position });
    },
    [updateDecoration],
  );

  // Update rotation
  const updateDecorationRotation = useCallback(
    (id: string, rotation: { x: number; y: number; z: number }) => {
      updateDecoration(id, { rotation });
    },
    [updateDecoration],
  );

  // Update scale
  const updateDecorationScale = useCallback(
    (id: string, scale: number) => {
      updateDecoration(id, { scale });
    },
    [updateDecoration],
  );

  // Update opacity
  const updateDecorationOpacity = useCallback(
    (id: string, opacity: number) => {
      updateDecoration(id, { opacity });
    },
    [updateDecoration],
  );

  // Duplicate decoration
  const duplicateDecoration = useCallback(
    (id: string) => {
      const decoration = state.decorations.find((d) => d.id === id);
      if (decoration) {
        const duplicate: Decoration = {
          ...decoration,
          id: `${decoration.id}-copy-${Date.now()}`,
          position: {
            ...decoration.position,
            x: decoration.position.x + 10,
            y: decoration.position.y + 10,
          },
        };
        addDecoration(duplicate);
        return duplicate;
      }
      return null;
    },
    [state.decorations, addDecoration],
  );

  // Export decorations as JSON
  const exportDecorations = useCallback(() => {
    return JSON.stringify(state.decorations, null, 2);
  }, [state.decorations]);

  // Import decorations from JSON
  const importDecorations = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json) as Decoration[];
      setState((prev) => ({
        ...prev,
        decorations: [...prev.decorations, ...imported],
      }));
      return true;
    } catch (e) {
      console.error("Failed to import decorations:", e);
      return false;
    }
  }, []);

  return {
    // State
    decorations: state.decorations,
    activeDecoration: state.activeDecoration,
    isGenerating: state.isGenerating,
    lastError: state.lastError,
    generationQueue,

    // Decoration management
    addDecoration,
    removeDecoration,
    updateDecoration,
    setActiveDecoration,
    getActiveDecoration,
    getDecorationsByType,
    clearDecorations,
    duplicateDecoration,

    // Generation queue
    queueDecorationGeneration,
    updateQueueItemStatus,
    removeFromQueue,
    setIsGenerating,

    // Position/rotation/scale updates
    updateDecorationPosition,
    updateDecorationRotation,
    updateDecorationScale,
    updateDecorationOpacity,

    // Import/export
    exportDecorations,
    importDecorations,
  };
}

export type UseCakeDecorationsReturn = ReturnType<typeof useCakeDecorations>;
