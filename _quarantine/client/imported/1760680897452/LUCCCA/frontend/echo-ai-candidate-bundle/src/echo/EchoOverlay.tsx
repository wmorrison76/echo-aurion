// src/echo/EchoOverlay.jsx
import React from "react";
import { getEchoBus } from "./echoClient.js";

export default function EchoOverlay() {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState("connecting"); // online | connecting | offline
  const [input, setInput] = React.useState("");
  const [log, setLog] = React.useState([]);

  // Listen to the echo bus
  React.useEffect(() => {
    const bus = getEchoBus?.();
    if (!bus) return;
    const onStatus = (e) => setStatus(e.detail?.status || "connecting");
    const onReply  = (e) => {
      const text = e.detail?.text ?? "";
      if (text) setLog((L) => [...L.slice(-11), { who: "echo", text }]);
      setOpen(true);
    };
    bus.addEventListener("status", onStatus);
    bus.addEventListener("assistant_text", onReply);
    return () => {
      bus.removeEventListener("status", onStatus);
      bus.removeEventListener("assistant_text", onReply);
    };
  }, []);

  // Global open/close + “type anywhere to start” + Cmd/Ctrl+K hotkey
  React.useEffect(() => {
    const onAnyKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen(true); setTimeout(() => document.getElementById("echo-input")?.focus(), 0); return;
      }
      if (!open && e.key?.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setOpen(true); setInput(e.key); e.preventDefault();
      }
      if (open && e.key === "Escape") setOpen(false);
    };
    const onProgrammaticOpen = () => { setOpen(true); setTimeout(() => document.getElementById("echo-input")?.focus(), 0); };
    window.addEventListener("keydown", onAnyKey, { capture: true });
    window.addEventListener("echo.open", onProgrammaticOpen);
    return () => {
      window.removeEventListener("keydown", onAnyKey, { capture: true });
      window.removeEventListener("echo.open", onProgrammaticOpen);
    };
  }, [open]);

  const send = React.useCallback(() => {
    const text = input.trim();
    if (!text) return;
    window.echo?.sendText?.(text); // real send (WS/HTTP handled in echoClient)
    setLog((L) => [...L.slice(-11), { who: "me", text }]);
    setInput("");
  }, [input]);

  const dot =
    status === "online" ? "#34d399" : status === "offline" ? "#f87171" : "#fbbf24";

  return (
    <div
      className="fixed top-[60px] left-1/2 -translate-x-1/2 z-[5000] pointer-events-none"
      style={{ width: "min(820px, calc(100vw - 24px))" }}
    >
      {/* Presence chip */}
      <div className="pointer-events-auto rounded-xl border border-white/15 dark:border-cyan-300/25 bg-white/80 dark:bg-slate-900/85 backdrop-blur-md shadow-lg px-3 py-2 flex items-center gap-3">
        <span style={{ width:10, height:10, borderRadius:9999, background: dot, boxShadow:"0 0 10px rgba(52,211,153,.6)"}}/>
        <div className="text-xs">
          <div className="font-semibold text-slate-800 dark:text-cyan-100">Echo • {status === "online" ? "Online" : status === "connecting" ? "Connecting…" : "Offline"}</div>
          <div className="text-slate-600 dark:text-cyan-100/70">Press <kbd>⌘/Ctrl</kbd>+<kbd>K</kbd> or just start typing to talk.</div>
        </div>
      </div>

      {/* Pad */}
      {open && (
        <div className="mt-2 pointer-events-auto rounded-2xl border border-cyan-300/30 bg-slate-900/90 backdrop-blur-xl shadow-2xl p-3">
          <div className="max-h-[40vh] overflow-auto space-y-2 pr-1">
            {log.map((m, i) => (
              <div
                key={i}
                className={
                  m.who === "me"
                    ? "text-sm text-cyan-100 bg-cyan-900/40 border border-cyan-400/30 rounded-lg px-2 py-1 self-end"
                    : "text-sm text-slate-100 bg-white/5 border border-cyan-300/25 rounded-lg px-2 py-1"
                }
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              id="echo-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); if (e.key === "Escape") setOpen(false); }}
              placeholder="Ask Echo…  (Enter to send, Esc to close)"
              className="flex-1 rounded-lg px-3 py-2 bg-white/90 text-slate-900 outline-none border border-cyan-300/40"
            />
            <button onClick={send} className="rounded-lg px-3 py-2 bg-cyan-600 text-white hover:bg-cyan-500">Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
