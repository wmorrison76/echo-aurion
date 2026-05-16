//frontend>src>components>EchoCore>panels>StickyNotePanel.jsx
import React, { useEffect, useMemo, useState } from "react";

// lightweight, store-free sticky note with per-panel localStorage persistence
export default function StickyNotePanel({ panelId = "note" }) {
  const storageKey = useMemo(() => `sticky.${panelId}.v1`, [panelId]);
  const [text, setText] = useState("");

  // load once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw != null) setText(raw);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, text);
    } catch {}
  }, [storageKey, text]);

  return (
    <div
      className="sticky-note"
      style={{
        background: "#fffcc0",
        color: "#1a1a1a",
        border: "1px solid rgba(0,0,0,.12)",
        borderRadius: 10,
        padding: 10,
        minHeight: 100,
        boxShadow: "0 10px 24px rgba(0,0,0,.15)",
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a note…"
        spellCheck={false}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 90,
          outline: "none",
          border: "none",
          background: "transparent",
          resize: "none",
          fontSize: 16,
          lineHeight: 1.35,
        }}
      />
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
  <button
    onClick={() => window.dispatchEvent(new CustomEvent("whiteboard-add-sticky", {
      detail: { title: "Note", text, color: "#ffd45b" }
    }))}
    style={{
      border:"1px solid rgba(22,224,255,.28)", background:"rgba(22,224,255,.08)",
      color:"#0cf", borderRadius:8, padding:"4px 8px", cursor:"pointer"
    }}
  >
    Send to Whiteboard
  </button>
</div>

    </div>
  );
}
