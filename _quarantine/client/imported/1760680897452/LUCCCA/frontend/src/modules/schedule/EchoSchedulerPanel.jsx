import React, { useEffect, useMemo, useRef, useState } from "react";

// 🔧 Configure once via env (no vendor/host implied)
const REMOTE_SCHEDULE_URL =
  import.meta.env.VITE_REMOTE_SCHEDULE_URL ||
  "https://your-remote-scheduler.example.com/schedule"; // <-- replace for local testing

// Security: only accept messages from the exact origin of REMOTE_SCHEDULE_URL
const ORIGIN = new URL(REMOTE_SCHEDULE_URL).origin;

export default function EchoSchedulerPanel(){
  const frameRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Minimal context we send to the remote app
  const context = useMemo(() => ({
    app: "LUCCCA",
    version: "v1",
    theme: { dark: document.documentElement.classList.contains("dark") },
  }), []);

  // Initial handshake → remote
  useEffect(() => {
    const id = setTimeout(() => {
      frameRef.current?.contentWindow?.postMessage(
        { type: "rs:init", payload: context },
        ORIGIN
      );
    }, 300);
    return () => clearTimeout(id);
  }, [context]);

  // Listen for messages ← remote
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== ORIGIN) return;
      const { type, payload } = e.data || {};

      switch (type) {
        case "rs:ready":
          setReady(true);
          break;

        case "schedule:email": {
          const { to = "", subject = "Schedule", body = "" } = payload || {};
          window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          break;
        }

        case "schedule:export": {
          const { filename = "scheduler_export.json", data = {} } = payload || {};
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = filename; a.click();
          URL.revokeObjectURL(url);
          break;
        }

        // Optional: telemetry -> Echo (kept generic)
        case "echo:event":
          window.dispatchEvent(new CustomEvent("echo:telemetry", { detail: payload }));
          break;

        // Data bridge (optional parity with legacy storage)
        case "schedule:request": {
          // Lazy import to avoid pulling store unless needed
          import("./store").then(({ loadEmployees, loadBudgets, loadWeek }) => {
            const { kind, key } = payload || {};
            let data = null;
            if (kind === "employees") data = loadEmployees();
            if (kind === "budgets")   data = loadBudgets();
            if (kind === "week")      data = loadWeek(key);
            frameRef.current?.contentWindow?.postMessage(
              { type: "schedule:response", payload: { kind, key, data } },
              ORIGIN
            );
          }).catch(()=>{ /* no-op */});
          break;
        }

        case "schedule:save": {
          import("./store").then(({ saveEmployees, saveBudgets, saveWeek }) => {
            const { kind, key, data } = payload || {};
            if (kind === "employees") saveEmployees(data);
            if (kind === "budgets")   saveBudgets(data);
            if (kind === "week")      saveWeek(key, data);
            frameRef.current?.contentWindow?.postMessage(
              { type: "schedule:saved", payload: { ok: true, kind, key } },
              ORIGIN
            );
          }).catch(()=>{ /* no-op */});
          break;
        }

        default:
          // console.debug("[EchoSchedulerPanel] Unhandled:", type, payload);
          break;
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Theme flips → remote
  useEffect(() => {
    const handler = () => {
      const dark = document.documentElement.classList.contains("dark");
      frameRef.current?.contentWindow?.postMessage(
        { type: "rs:theme", payload: { dark } },
        ORIGIN
      );
    };
    window.addEventListener("lu:avatar:applied", handler);
    window.addEventListener("lu:settings:apply", handler);
    return () => {
      window.removeEventListener("lu:avatar:applied", handler);
      window.removeEventListener("lu:settings:apply", handler);
    };
  }, []);

  return (
    <div className="w-full h-full">
      {!ready && <div className="p-3 text-xs text-gray-500">Loading…</div>}
      <iframe
        ref={frameRef}
        src={REMOTE_SCHEDULE_URL}
        title="Scheduler"
        className="w-full h-full border-0"
        // sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}
