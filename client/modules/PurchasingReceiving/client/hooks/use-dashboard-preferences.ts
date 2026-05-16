import { useCallback, useEffect, useMemo, useState } from "react";
export interface DashboardPreferenceSnapshot {
  order: string[];
  pinned: string[];
  collapsed: string[];
  disabled: string[];
}
interface DashboardPreferenceControls {
  order: string[];
  pinned: string[];
  collapsed: string[];
  disabled: string[];
  pinnedSet: Set<string>;
  collapsedSet: Set<string>;
  disabledSet: Set<string>;
  setOrder: (nextOrder: string[]) => void;
  togglePinned: (panelId: string) => void;
  toggleCollapsed: (panelId: string) => void;
  toggleDisabled: (panelId: string) => void;
  reset: () => void;
}
const STORAGE_KEY = "echo_dashboard_prefs_v1";
const EMPTY_STATE: DashboardPreferenceSnapshot = {
  order: [],
  pinned: [],
  collapsed: [],
  disabled: [],
};
const unique = (values: string[], allowed: Set<string>) => {
  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const value of values) {
    if (!allowed.has(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    filtered.push(value);
  }
  return filtered;
};
const sanitizeState = (
  state: DashboardPreferenceSnapshot,
  panelIds: readonly string[],
): DashboardPreferenceSnapshot => {
  const allowed = new Set(panelIds);
  const disabled = unique(state.disabled, allowed);
  const disabledSet = new Set(disabled);
  const pinned = unique(state.pinned, allowed).filter(
    (id) => !disabledSet.has(id),
  );
  const collapsed = unique(state.collapsed, allowed).filter(
    (id) => !disabledSet.has(id),
  );
  const order = unique(state.order, allowed);
  for (const id of panelIds) {
    if (!order.includes(id)) {
      order.push(id);
    }
  }
  const filteredOrder = order.filter((id) => !disabledSet.has(id));
  return { order: filteredOrder, pinned, collapsed, disabled };
};
const readStorage = (): DashboardPreferenceSnapshot => {
  try {
    if (typeof window === "undefined") return EMPTY_STATE;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_STATE;
    const snapshot = parsed as DashboardPreferenceSnapshot;
    return {
      order: Array.isArray(snapshot.order) ? snapshot.order.slice() : [],
      pinned: Array.isArray(snapshot.pinned) ? snapshot.pinned.slice() : [],
      collapsed: Array.isArray(snapshot.collapsed)
        ? snapshot.collapsed.slice()
        : [],
      disabled: Array.isArray(snapshot.disabled)
        ? snapshot.disabled.slice()
        : [],
    } satisfies DashboardPreferenceSnapshot;
  } catch {
    return EMPTY_STATE;
  }
};
const writeStorage = (snapshot: DashboardPreferenceSnapshot) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore write failures */
  }
};
export function useDashboardPreferences(
  panelIds: readonly string[],
): DashboardPreferenceControls {
  const panelKey = useMemo(() => panelIds.join("|"), [panelIds]);
  const [state, setState] = useState<DashboardPreferenceSnapshot>(() =>
    sanitizeState(readStorage(), panelIds),
  );
  useEffect(() => {
    setState((prev) => sanitizeState(prev, panelIds));
  }, [panelKey, panelIds]);
  useEffect(() => {
    writeStorage(state);
  }, [state]);
  const setOrder = useCallback(
    (nextOrder: string[]) => {
      setState((prev) =>
        sanitizeState({ ...prev, order: nextOrder }, panelIds),
      );
    },
    [panelIds],
  );
  const togglePinned = useCallback(
    (panelId: string) => {
      setState((prev) => {
        const exists = prev.pinned.includes(panelId);
        const pinned = exists
          ? prev.pinned.filter((id) => id !== panelId)
          : [...prev.pinned, panelId];
        return sanitizeState({ ...prev, pinned }, panelIds);
      });
    },
    [panelIds],
  );
  const toggleCollapsed = useCallback(
    (panelId: string) => {
      setState((prev) => {
        const exists = prev.collapsed.includes(panelId);
        const collapsed = exists
          ? prev.collapsed.filter((id) => id !== panelId)
          : [...prev.collapsed, panelId];
        return sanitizeState({ ...prev, collapsed }, panelIds);
      });
    },
    [panelIds],
  );
  const toggleDisabled = useCallback(
    (panelId: string) => {
      setState((prev) => {
        const exists = prev.disabled.includes(panelId);
        const disabled = exists
          ? prev.disabled.filter((id) => id !== panelId)
          : [...prev.disabled, panelId];
        return sanitizeState({ ...prev, disabled }, panelIds);
      });
    },
    [panelIds],
  );
  const reset = useCallback(() => {
    setState(
      sanitizeState({ ...EMPTY_STATE, order: panelIds.slice() }, panelIds),
    );
  }, [panelIds]);
  const pinnedSet = useMemo(() => new Set(state.pinned), [state.pinned]);
  const collapsedSet = useMemo(
    () => new Set(state.collapsed),
    [state.collapsed],
  );
  const disabledSet = useMemo(() => new Set(state.disabled), [state.disabled]);
  return {
    order: state.order,
    pinned: state.pinned,
    collapsed: state.collapsed,
    disabled: state.disabled,
    pinnedSet,
    collapsedSet,
    disabledSet,
    setOrder,
    togglePinned,
    toggleCollapsed,
    toggleDisabled,
    reset,
  };
}
