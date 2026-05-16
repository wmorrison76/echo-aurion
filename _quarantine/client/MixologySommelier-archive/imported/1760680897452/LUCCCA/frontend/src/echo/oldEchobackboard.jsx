import React, { useEffect, useRef, useState } from "react";
import { getEchoBus } from "../echo/echoClient.js";

/**
 * EchoBackboard
 * Presence orb + toast + private backboard notes.
 *
 * Fire these from anywhere:
 *   window.dispatchEvent(new CustomEvent("echo-notify", { detail: { text, tone: "info"|"ok"|"warn"|"muted", ms?:number }}))
 *   window.dispatchEvent(new CustomEvent("echo-add-note", { detail: { title?, text?, minutes?, x?, y? } }))
 *   window.dispatchEvent(new CustomEvent("backboard-add-sticky", { detail: { title?, text?, minutes?, x?, y? } }))
 *   window.dispatchEvent(new CustomEvent("echo-assist", { detail: { message } }))
 */
export default function EchoBackboard({ onRequestDockAll, onRequestRestoreAll }) {
  const [visible, setVisible] = useState(true);
  const [banner, setBanner]   = useState(null); // {text,tone}
  const [pulse, setPulse]     = useState(false);
  const [status, setStatus]   = useState("connecting"); // online|local|connecting|offline

  // Echo events: status + assistant replies -> toast
  useEffect(() => {
    const bus = getEchoBus();
    const onStatus = (e) => setStatus(e.detail?.status || "connecting");
    const onAssistant = (e) => {
      const text = e.detail?.text; if (!text) return;
      window.dispatchEvent(new CustomEvent("echo-notify", { detail: { text, tone: "info", ms: 4500 } }));
      setPulse(true);
      setTimeout(() => setPulse(false), 900);
    };
    bus.addEventListener("status", onStatus);
    bus.addEventListener("assistant_text", onAssistant);
    return () => {
      bus.removeEventListener("status", onStatus);
      bus.removeEventListener("assistant_text", onAssistant);
    };
  }, []);

  // Backboard notes (local/private)
  const LS_KEY = "lu:bb-notes:v1";
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(notes)); }, [notes]);

  // reminder tick
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      let changed = false;
      notes.forEach(n => {
        if (n.dueAt && !n._fired && now >= n.dueAt) {
          window.dispatchEvent(new CustomEvent("echo-notify", {
            detail: { text: `⏰ ${n.title || "Reminder"}`, tone: "ok", ms: 5000 }
          }));
          n._fired = true; changed = true; setPulse(true);
        }
      });
      if (changed) setNotes([...notes]);
    };
    const id = setInterval(tick, 20_000); tick();
    return () => clearInterval(id);
  }, [notes]);

  const addNote = (partial = {}) => {
    const id  = "bb-" + Math.random().toString(36).slice(2, 8);
    const now = Date.now();
    const x   = partial.x ?? 120 + Math.floor(Math.random()*60);
    const y   = partial.y ?? 110 + Math.floor(Math.random()*50);
    const w   = partial.w ?? 260;
    const h   = partial.h ?? 170;
    const n = {
      id, x, y, w, h,
      title: partial.title ?? "Note",
      text:  partial.text  ?? "",
      color: partial.color ?? "#0ad0f2",
      dueAt: partial.dueAt ?? null,
      _fired: false,
      createdAt: now, updatedAt: now,
    };
    setNotes(v => v.concat(n));
    return n;
  };
  const updateNote = (id, patch) => {
    setNotes(v => v.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n));
  };
  const removeNote = (id) => setNotes(v => v.filter(n => n.id !== id));

  // Events from app (TOAST, ADD NOTE, ASSIST)
  useEffect(() => {
    const onNotify = (e) => {
      const d = e.detail || {};
      if (!d.text) return;
      setBanner({ text: String(d.text), tone: d.tone || "info" });
      setPulse(true);
      const ms = Math.min(10_000, Math.max(1200, d.ms ?? 3500));
      const t = setTimeout(() => { setBanner(null); setPulse(false); }, ms);
      return () => clearTimeout(t);
    };
    const onAddNote = (e) => {
      const d = e.detail || {};
      const n = addNote(d);
      if (d.minutes && !Number.isNaN(+d.minutes)) {
        updateNote(n.id, { dueAt: Date.now() + Math.max(1, +d.minutes) * 60_000, _fired:false });
      }
      setBanner({ text: "Backboard note created.", tone: "ok" });
      setTimeout(() => setBanner(null), 1800);
    };
    const onAssist = (e) => {
      const msg = e.detail?.message || "Echo would like to clear space to help.";
      const ok  = window.confirm(`${msg}\n\nAllow Echo to dock open windows now?`);
      if (ok && typeof onRequestDockAll === "function") onRequestDockAll();
      setBanner({ text: ok ? "Docked. How can I help?" : "Okay, I’ll stay out of the way.", tone: ok ? "ok" : "muted" });
      setTimeout(() => setBanner(null), 1800);
    };

    window.addEventListener("echo-notify", onNotify);
    window.addEventListener("echo-add-note", onAddNote);
    window.addEventListener("backboard-add-sticky", onAddNote);
    window.addEventListener("echo-assist", onAssist);
    return () => {
      window.removeEventListener("echo-notify", onNotify);
      window.removeEventListener("echo-add-note", onAddNote);
      window.removeEventListener("backboard-add-sticky", onAddNote);
      window.removeEventListener("echo-assist", onAssist);
    };
  }, [onRequestDockAll]);

  // auto-dim orb
  useEffect(() => {
    let fadeTimer;
    const show = () => { setVisible(true); clearTimeout(fadeTimer); fadeTimer = setTimeout(() => setVisible(false), 1500); };
    const onMove = (e) => { if (e.clientX >= window.innerWidth - 220 && e.clientY <= 200) show(); };
    window.addEventListener("mousemove", onMove);
    fadeTimer = setTimeout(() => setVisible(false), 1500);
    return () => { window.removeEventListener("mousemove", onMove); clearTimeout(fadeTimer); };
  }, []);

  const statusDot =
    status === "online" ? "0 0 14px rgba(16,196,100,.65)" :
    status === "local"  ? "0 0 14px rgba(246,173,85,.6)" :
                          "0 0 14px rgba(255,86,86,.6)";

  return (
    <div className="echo-backboard" style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }} aria-hidden>
      {/* subtle pulse wash */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: pulse ? "radial-gradient(600px 300px at 85% 8%, rgba(22,224,255,.10), transparent 60%)" : "transparent",
          transition: "background .35s ease",
        }}
      />

      {/* Orb */}
      <div
        role="button" title={`Ask Echo (${status})`}
        onClick={() => {
          const q = window.prompt("Ask Echo a quick question:");
          if (!q) return;
          window.echo?.sendText(q);
          window.dispatchEvent(new CustomEvent("echo-notify", { detail: { text: `Thinking: ${q}`, tone: "info", ms: 1800 } }));
        }}
        style={{
          position: "absolute", top: 12, right: 14, width: 34, height: 34,
          borderRadius: 999, background: "rgba(10,16,28,.75)",
          border: "1px solid rgba(22,224,255,.38)",
          boxShadow: `${statusDot}, inset 0 0 0 1px rgba(255,255,255,.05)`,
          color: "#aef", display: "grid", placeItems: "center",
          pointerEvents: "auto", transform: visible ? "none" : "translateY(-6px)", opacity: visible ? 1 : 0.25,
          transition: "opacity .25s ease, transform .25s ease", cursor: "pointer",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </svg>
      </div>

      {/* Mini palette under orb */}
      <div
        onMouseEnter={() => setVisible(true)}
        style={{
          position: "absolute", top: 54, right: 14, display: "flex", gap: 6,
          pointerEvents: "auto", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(-4px)",
          transition: "all .2s ease",
        }}
      >
        <MiniBtn label="Add backboard note" onClick={() => window.dispatchEvent(new CustomEvent("backboard-add-sticky"))}>
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M7 2h10a3 3 0 013 3v9.6a2 2 0 01-.59 1.41l-3.4 3.4A2 2 0 0114.6 21H7a3 3 0 01-3-3V5a3 3 0 013-3Z"/></svg>
        </MiniBtn>
        {onRequestDockAll && (
          <MiniBtn label="Dock all" onClick={onRequestDockAll}>
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h8v6H3V3Zm10 0h8v12h-8V3ZM3 11h8v10H3V11Zm10 14v-2h8v2h-8Z"/></svg>
          </MiniBtn>
        )}
        {onRequestRestoreAll && (
          <MiniBtn label="Restore" onClick={onRequestRestoreAll}>
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M4 7h10v10H4zM8 3h12v12h-2V5H8z"/></svg>
          </MiniBtn>
        )}
      </div>

      {/* Toast */}
      {banner && (
        <div
          style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            padding: "8px 12px", borderRadius: 10, fontSize: 13, pointerEvents: "auto",
            border: "1px solid rgba(22,224,255,.35)",
            background:
              banner.tone === "ok"   ? "rgba(16,196,100,.10)" :
              banner.tone === "warn" ? "rgba(246,173,85,.12)" :
              banner.tone === "muted"? "rgba(255,255,255,.05)" :
                                       "rgba(22,224,255,.10)",
            color: "#0a1528",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 22px rgba(0,0,0,.35), 0 0 18px rgba(22,224,255,.18)",
          }}
        >
          {banner.text}
        </div>
      )}

      {/* Private notes */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {notes.map(n => (
          <BackboardNote
            key={n.id}
            note={n}
            onChange={(patch) => updateNote(n.id, patch)}
            onRemove={() => removeNote(n.id)}
            onSendToWhiteboard={() => {
              window.dispatchEvent(new CustomEvent("whiteboard-add-sticky", {
                detail: { title: n.title, text: n.text, color: "#ffd45b" }
              }));
              setBanner({ text: "Sent to Whiteboard.", tone: "ok" });
              setTimeout(() => setBanner(null), 1800);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MiniBtn({ children, onClick, label }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        height: 28, width: 28, display: "grid", placeItems: "center",
        borderRadius: 8, border: "1px solid rgba(22,224,255,.28)",
        background: "rgba(10,16,28,.72)", color: "#d7f6ff",
        cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.05)",
        pointerEvents: "auto",
      }}
    >
      {children}
    </button>
  );
}

/** One draggable/resizable private backboard note. */
function BackboardNote({ note, onChange, onRemove, onSendToWhiteboard }) {
  const ref = useRef(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingBody,  setEditingBody]  = useState(false);

  // drag
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const header = el.querySelector(".bbn-h");
    let startX=0, startY=0, sx=0, sy=0, dragging=false;
    const down = (e) => { dragging = true; startX=e.clientX; startY=e.clientY; sx=note.x; sy=note.y;
      window.addEventListener("mousemove", move); window.addEventListener("mouseup", up); e.preventDefault(); };
    const move = (e) => { if (!dragging) return; onChange({ x: sx + (e.clientX - startX), y: sy + (e.clientY - startY) }); };
    const up   = () => { dragging=false; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    header.addEventListener("mousedown", down);
    return () => header.removeEventListener("mousedown", down);
  }, [note.x, note.y, onChange]);

  // resize
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const handle = el.querySelector(".bbn-r");
    let startX=0, startY=0, sw=0, sh=0, resizing=false;
    const down = (e) => { resizing=true; startX=e.clientX; startY=e.clientY; sw=note.w; sh=note.h;
      window.addEventListener("mousemove", move); window.addEventListener("mouseup", up); e.preventDefault(); };
    const move = (e) => { if (!resizing) return; onChange({ w: Math.max(160, sw + (e.clientX - startX)), h: Math.max(120, sh + (e.clientY - startY)) }); };
    const up   = () => { resizing=false; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    handle.addEventListener("mousedown", down);
    return () => handle.removeEventListener("mousedown", down);
  }, [note.w, note.h, onChange]);

  const setReminder = () => {
    const input = window.prompt("Reminder: minutes from now (or ISO datetime e.g. 2025-09-01T14:30)");
    if (!input) return;
    let due = null;
    if (/^\d+(\.\d+)?$/.test(input)) due = Date.now() + parseFloat(input) * 60_000;
    else {
      const t = Date.parse(input);
      if (!Number.isNaN(t)) due = t;
    }
    if (!due) { alert("Could not parse time."); return; }
    onChange({ dueAt: due, _fired:false });
  };

  return (
    <div
      ref={ref}
      className="bb-note"
      style={{
        position: "absolute",
        left: note.x, top: note.y, width: note.w, height: note.h,
        pointerEvents: "auto",
        borderRadius: 12,
        border: "1px solid rgba(22,224,255,.35)",
        background: "linear-gradient(180deg, rgba(22,224,255,.10), rgba(22,224,255,.06))",
        boxShadow: "0 10px 22px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.05)",
        color: "#0a1528",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className="bbn-h" style={{
        fontWeight: 700, padding: "6px 8px", display: "flex",
        alignItems: "center", gap: 6, cursor: "move",
        borderBottom: "1px solid rgba(22,224,255,.25)", background: "rgba(10,16,28,.55)",
        color: "#d7f6ff",
      }}>
        {editingTitle ? (
          <input
            autoFocus defaultValue={note.title}
            onBlur={(e) => { onChange({ title: e.target.value }); setEditingTitle(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            style={{ background: "transparent", outline: "none", border: "none", color: "inherit", fontWeight: 700, flex: 1 }}
          />
        ) : (
          <div onDoubleClick={() => setEditingTitle(true)} style={{ flex: 1 }}>{note.title}</div>
        )}
        <IconBtn title="Reminder" onClick={setReminder}>⏰</IconBtn>
        <IconBtn title="Send to Whiteboard" onClick={onSendToWhiteboard}>⇢</IconBtn>
        <IconBtn title="Delete" onClick={onRemove}>✕</IconBtn>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        {editingBody ? (
          <textarea
            autoFocus defaultValue={note.text}
            onBlur={(e) => { onChange({ text: e.target.value }); setEditingBody(false); }}
            style={{ position: "absolute", inset: 0, resize: "none", background: "transparent", border: "none", outline: "none", color: "inherit", padding: 10, fontSize: 14, lineHeight: 1.35 }}
          />
        ) : (
          <div onDoubleClick={() => setEditingBody(true)} style={{ position: "absolute", inset: 0, padding: 10, fontSize: 14, lineHeight: 1.35, whiteSpace: "pre-wrap", color:"#d7f6ff" }}>
            {note.text || <span style={{ opacity: .6 }}>Double-click to edit…</span>}
          </div>
        )}
      </div>

      <div className="bbn-r" style={{
        position: "absolute", right: 6, bottom: 6, width: 14, height: 14,
        borderRadius: 4, background: "rgba(22,224,255,.25)", border: "1px solid rgba(22,224,255,.38)", cursor: "nwse-resize"
      }} />
    </div>
  );
}

function IconBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      style={{
        height: 22, minWidth: 22, padding: "0 6px",
        borderRadius: 6, border: "1px solid rgba(22,224,255,.28)",
        background: "rgba(22,224,255,.08)", color: "#d7f6ff", cursor: "pointer"
      }}
    >
      {children}
    </button>
  );
}
