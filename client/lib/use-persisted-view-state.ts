import React from "react";

function safeReadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/**
 * Persist small view state (filters, selected ids, zoom) across refresh/tab switches.
 * Uses sessionStorage (survives refresh, resets when tab closes).
 */
export function usePersistedViewState<T>(params: {
  key: string;
  defaultValue: T;
}) {
  const { key, defaultValue } = params;

  const [state, setState] = React.useState<T>(() => {
    const saved = safeReadJson<T>(key);
    return saved ?? defaultValue;
  });

  // If key changes (different view instance), load its saved value.
  React.useEffect(() => {
    const saved = safeReadJson<T>(key);
    setState(saved ?? defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  React.useEffect(() => {
    safeWriteJson(key, state);
  }, [key, state]);

  return [state, setState] as const;
}
