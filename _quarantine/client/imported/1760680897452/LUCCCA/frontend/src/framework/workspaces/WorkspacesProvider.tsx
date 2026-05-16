import React, { createContext, useContext, useMemo, useRef } from "react";
import type { WorkspacesApi, Workspace } from "./workspace.types";
import { loadJSON, saveJSON } from "../core/storage";

const KEY = "ws:list:v1";
const CUR = "ws:current:v1";
const Ctx = createContext<WorkspacesApi | null>(null);

function uid(){ return Math.random().toString(36).slice(2,8) + "-" + Date.now().toString(36); }

export function WorkspacesProvider({ children }:{ children: React.ReactNode }){
  const listRef = useRef<Workspace[]>(loadJSON(KEY, []));
  const currentIdRef = useRef<string | null>(loadJSON(CUR, null));

  const api: WorkspacesApi = useMemo(()=> ({
    list(){ return listRef.current; },
    save(ws){
      const now = Date.now();
      let next: Workspace;
      if (ws.id){
        next = { ...(listRef.current.find(w=>w.id===ws.id) as Workspace), ...ws, updatedAt: now } as Workspace;
        listRef.current = listRef.current.map(w => w.id===next.id ? next : w);
      } else {
        next = { id: uid(), name: ws.name, layout: ws.layout, createdAt: now, updatedAt: now };
        listRef.current = [next, ...listRef.current];
      }
      saveJSON(KEY, listRef.current);
      return next;
    },
    remove(id){ listRef.current = listRef.current.filter(w => w.id !== id); saveJSON(KEY, listRef.current); },
    load(id){ return listRef.current.find(w => w.id === id); },
    get currentId(){ return currentIdRef.current; },
    setCurrent(id){ currentIdRef.current = id; saveJSON(CUR, id); },
  }), []);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkspacesApi(){ const ctx = useContext(Ctx); if(!ctx) throw new Error("useWorkspacesApi must be inside WorkspacesProvider"); return ctx; }
