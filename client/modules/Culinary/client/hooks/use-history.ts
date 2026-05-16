import { useCallback, useState } from "react";

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

type UseHistoryOptions = {
  maxStates?: number;
};

export function useHistory<T>(initialState: T, options?: UseHistoryOptions) {
  const maxStates = options?.maxStates ?? 50;
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      const resolvedState = typeof newState === "function" ? (newState as (prev: T) => T)(history.present) : newState;

      setHistory((prev) => {
        const newPast = [...prev.past, prev.present];
        // Limit history to maxStates
        if (newPast.length > maxStates) {
          newPast.shift();
        }
        return {
          past: newPast,
          present: resolvedState,
          future: [],
        };
      });
    },
    [history.present, maxStates],
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const newPast = prev.past.slice(0, -1);
      const newPresent = prev.past[prev.past.length - 1];
      return {
        past: newPast,
        present: newPresent!,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const newPresent = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: newPresent!,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    state: history.present,
    setState,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
