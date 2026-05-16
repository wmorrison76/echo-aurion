/**
 * usePanelState — in-panel UI state persistence (iter167)
 *
 * Complements the existing IndexedDB panel-shell persistence by remembering
 * fine-grained in-panel state (active tab, scroll position, filter selections,
 * draft form values) per panelId across hot-reload + browser refresh.
 *
 * Usage:
 *   const [tab, setTab] = usePanelState("pastry", "active-tab", "recipes");
 *   const [filter, setFilter] = usePanelState("inventory", "filter", { dept: "all" });
 */
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = (panelId: string, slot: string) => `echoai3:panel-state:${panelId}:${slot}`;

function readSlot<T>(panelId: string, slot: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(KEY(panelId, slot));
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeSlot<T>(panelId: string, slot: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY(panelId, slot), JSON.stringify(value)); } catch {}
}

/** Persist any JSON-serializable value into localStorage, scoped per panelId + slot key. */
export function usePanelState<T>(
  panelId: string,
  slot: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readSlot<T>(panelId, slot, initial));
  const setAndPersist = useCallback((v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as any)(prev) : v;
      writeSlot(panelId, slot, next);
      return next;
    });
  }, [panelId, slot]);
  return [value, setAndPersist];
}

/** Attach to any scrollable element ref to auto-persist + restore scroll position. */
export function usePanelScroll(panelId: string, ref: React.RefObject<HTMLElement>, slot = "scroll"): void {
  const restored = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!restored.current) {
      const y = readSlot<number>(panelId, slot, 0);
      if (y > 0) el.scrollTop = y;
      restored.current = true;
    }
    let timer: any = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => writeSlot(panelId, slot, el.scrollTop), 250);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [panelId, ref, slot]);
}

/** Clear every persisted in-panel state for a panel (call on panel close if desired). */
export function clearPanelPersistedState(panelId: string): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(`echoai3:panel-state:${panelId}:`));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}
