// src/echo/EchoTalkPad.jsx
import React from "react";
import { getEchoBus, installEchoHook } from "./echoClient.js";

export default function EchoTalkPad() {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState("connecting"); // "online" | "local" | "connecting" | "offline"
  const [hint, setHint] = React.useState("Press ⌘/Ctrl+K or just start typing to talk.");
  const [input, setInput] = React.useState("");
  const [log, setLog] = React.useState([]);

  React.useEffect(() => {
    installEchoHook({});
    const bus = getEchoBus();
    const onStatus = (e) => setStatus(e.detail.status);
    const onReply  = (e) => { setLog(L => [...L.slice(-9), { who:"echo", text:e.detail.text }]); setOpen(true); };
    bus.addEventListener("status", onStatus);
    bus.addEventListener("assistant_text", onReply);
    return () => { bus.removeEventListener("status", onStatus); bus.removeEventListener("assistant_text", onReply); };
  }, []);

  React.useEffect(() => {
    const tips = [
      "Ask me to open panels, dock windows, or summarize your P&L.",
      "Try: “show cake orders” or “start a new production plan”.",
      "Use ⌘/Ctrl+J to toggle dark mode.",
    ];
    let i=0; const t = setInterval(()=> setHint(tips[(i=(i+1)%tips.length)]), 6500);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      const isCmd = navigator.platform.toUpperCase().includes("MAC") ? e.metaKey : e.ctrlKey;
      if (isCmd && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(v=>!v); return; }
      if (!open && !e.metaKey && !e.ctrlKey && !e.altKey && e.key?.length === 1) {
        setOpen(true); setInput(e.key); e.preventDefault();
      }
      if (open && e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey, { capture:true });
    return () => window.removeEventListener("keydown", onKey, { capture:true });
  }, [open]);

  const send = React.useCallback(() => {
    const text = input.trim(); if (!text) return;
    window.echo?.sendText(text);
    setLog(L => [...L.slice(-9), { who:"me", text }]);
    setInput("");
  }, [input]);

  const dotStyle = {
    background:
      status === "online" ? "#10b981" :      // green
      status === "local" ?  "#22d3ee" :      // cyan (local stub)
      status === "connecting" ? "#fbbf24" :  // amber
      "#ef4444"                               // red
  };
  const label =
    status === "online" ? "Online" :
    status === "local"  ? "Local (no server)" :
    status === "connecting" ? "Connecting…" :
    "Offline";

  return (
    <>
      <div className="echo-hud">
        <div className="card">
          <span className="dot" style={dotStyle} />
          <div className="text-xs">
            <div className="font-semibold">Echo <span>•</span> {label}</div>
            <div className="hint">{hint}</div>
          </div>
        </div>
      </div>

      {open && (
        <div className="echo-pad">
          <div className="log">
            {log.map((m,i)=>(
              <div key={i} className={`msg ${m.who}`}>{m.text}</div>
            ))}
          </div>
          <div className="input">
            <input
              autoFocus
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={(e)=>{ if (e.key==="Enter") send(); if (e.key==="Escape") setOpen(false); }}
              placeholder="Talk to Echo…  (Enter to send, Esc to close)"
            />
            <button onClick={send}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
