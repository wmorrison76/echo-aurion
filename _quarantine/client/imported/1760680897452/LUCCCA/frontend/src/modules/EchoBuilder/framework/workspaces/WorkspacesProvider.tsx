import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { loadJSON, saveJSON, remove } from "../core/storage";
import type { Workspace, WorkspacesApi } from "./workspace.types";

const KEY = "ws:list:v1";
const CUR = "ws:current:v1";

const Ctx = createContext<WorkspacesApi | null>(null);

function uid() { return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36); }

export function WorkspacesProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Workspace[]>(() => loadJSON(KEY, [] as Workspace[]));
  const [currentId, setCurrentId] = useState<string | null>(() => loadJSON(CUR, null as any));

  const persist = useCallback((next: Workspace[]) => {
    setList(next);
    saveJSON(KEY, next);
  }, []);

  const listFn = useCallback(() => list, [list]);

  const save = useCallback<WorkspacesApi["save"]>((ws) => {
    const now = Date.now();
    let next: Workspace[];
    if (ws.id) {
      next = list.map((it) => it.id === ws.id ? { ...it, name: ws.name, layout: ws.layout, updatedAt: now } : it);
    } else {
      const item: Workspace = { id: uid(), name: ws.name, layout: ws.layout, createdAt: now, updatedAt: now };
      next = [item, ...list];
    }
    persist(next);
    return next[0];
  }, [list, persist]);

  const removeFn = useCallback((id: string) => {
    const next = list.filter((w) => w.id !== id);
    persist(next);
    if (currentId === id) {
      setCurrentId(null);
      saveJSON(CUR, null);
    }
  }, [list, persist, currentId]);

  const load = useCallback((id: string) => list.find(w => w.id === id), [list]);

  const setCurrent = useCallback((id: string | null) => {
    setCurrentId(id);
    saveJSON(CUR, id);
  }, []);

  const value = useMemo<WorkspacesApi>(() => ({
    list: listFn,
    save,
    remove: removeFn,
    load,
    currentId,
    setCurrent,
  }), [listFn, save, removeFn, load, currentId, setCurrent]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspacesApi() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspacesApi must be used within WorkspacesProvider");
  return ctx;
}

export default WorkspacesProvider;
