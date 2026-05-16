import { useCallback, useRef, useState } from "react";
import type { DesignerState } from "./useDesignerState";

export function useHistory(maxSteps: number = 50) {
  const historyRef = useRef<DesignerState[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryStates = useCallback(() => {
    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(currentIndexRef.current < historyRef.current.length - 1);
  }, []);

  const push = useCallback(
    (state: DesignerState) => {
      // Remove any redo history when a new action is taken
      if (currentIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);
      }

      // Add new state
      historyRef.current.push(JSON.parse(JSON.stringify(state)));

      // Limit history size
      if (historyRef.current.length > maxSteps) {
        historyRef.current.shift();
      } else {
        currentIndexRef.current++;
      }

      updateHistoryStates();
    },
    [maxSteps, updateHistoryStates]
  );

  const undo = useCallback((): DesignerState | null => {
    if (currentIndexRef.current > 0) {
      currentIndexRef.current--;
      updateHistoryStates();
      return historyRef.current[currentIndexRef.current];
    }
    return null;
  }, [updateHistoryStates]);

  const redo = useCallback((): DesignerState | null => {
    if (currentIndexRef.current < historyRef.current.length - 1) {
      currentIndexRef.current++;
      updateHistoryStates();
      return historyRef.current[currentIndexRef.current];
    }
    return null;
  }, [updateHistoryStates]);

  const clear = useCallback(() => {
    historyRef.current = [];
    currentIndexRef.current = -1;
    updateHistoryStates();
  }, [updateHistoryStates]);

  const initialize = useCallback((initialState: DesignerState) => {
    historyRef.current = [JSON.parse(JSON.stringify(initialState))];
    currentIndexRef.current = 0;
    updateHistoryStates();
  }, [updateHistoryStates]);

  return {
    push,
    undo,
    redo,
    clear,
    initialize,
    canUndo,
    canRedo,
  };
}
