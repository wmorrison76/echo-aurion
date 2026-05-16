import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PresenceState, PresenceUser, Cursor } from "./presence.types";

const Ctx = createContext<PresenceState | null>(null);
const ChannelName = "lu:presence:channel";
function rid(){ return Math.random().toString(36).slice(2,8); }

export function PresenceProvider({ children, name="You", color="#7fffd4", avatarUrl }:
  { children: React.ReactNode; name?: string; color?: string; avatarUrl?: string; }){
  const id = useRef(localStorage.getItem("lu:presence:id") || ("u_"+rid()));
  useEffect(()=> localStorage.setItem("lu:presence:id", id.current), []);
  const [others, setOthers] = useState<PresenceState["others"]>({});
  const self: PresenceUser = useMemo(()=> ({ id: id.current, name, color, avatarUrl }), [name, color, avatarUrl]);

  useEffect(() => {
    const bc = "BroadcastChannel" in window ? new BroadcastChannel(ChannelName) : null;
    const key = "lu:presence:fallback";
    const send = (msg: any) => { if (bc) bc.postMessage(msg); try{ localStorage.setItem(key, JSON.stringify({ msg, t: Date.now() })); } catch{} };
    const onCursor = (e: MouseEvent) => send({ type:"cursor", from:self.id, x:e.clientX, y:e.clientY, ts:Date.now(), user:self });
    window.addEventListener("mousemove", onCursor);

    const onMsg = (data:any) => {
      if (!data || data.from === self.id) return;
      setOthers(prev => ({ ...prev, [data.from]: { user: data.user, cursor: data.type==="cursor" ? { x:data.x, y:data.y, ts:data.ts } as Cursor : prev[data.from]?.cursor, following: prev[data.from]?.following ?? null } }));
    };
    const onBC = (ev: MessageEvent) => onMsg(ev.data);
    const onStorage = (ev: StorageEvent) => { if (ev.key === key && ev.newValue) { try { onMsg(JSON.parse(ev.newValue).msg); } catch {} } };
    bc?.addEventListener("message", onBC);
    window.addEventListener("storage", onStorage);
    send({ type:"hello", from:self.id, user:self });
    return () => { bc?.removeEventListener("message", onBC); bc?.close(); window.removeEventListener("storage", onStorage); window.removeEventListener("mousemove", onCursor); };
  }, [self]);

  const value = useMemo(()=>({ self, others }), [self, others]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePresence(){ const c = useContext(Ctx); if(!c) throw new Error("usePresence must be used within PresenceProvider"); return c; }

export function MultiCursorOverlay(){
  const { others } = usePresence();
  return (
    <div className="pointer-events-none fixed inset-0 z-[1100]">
      {Object.entries(others).map(([id, { user, cursor }]) => cursor && (
        <div key={id} className="absolute" style={{ left: cursor.x + 6, top: cursor.y + 8 }}>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full" style={{ background: user.color || "#9bf" }} />
            <div className="px-2 py-0.5 rounded text-xs" style={{ background:"rgba(0,0,0,.55)", border:"1px solid rgba(255,255,255,.18)"}}>
              {user.name || id}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
