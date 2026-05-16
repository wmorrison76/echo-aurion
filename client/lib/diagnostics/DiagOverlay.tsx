import React, { useState, useEffect } from "react";
import { diag, type DiagEvent } from "./diagnostic-core";

export function DiagOverlay(): React.ReactElement | null {
  const [events, setEvents] = useState<DiagEvent[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    return diag.subscribe((e) => {
      // Defer setState to avoid "Cannot update component while rendering another"
      queueMicrotask(() => {
        setEvents((prev) => [...prev.slice(-200), e]);
      });
    });
  }, []);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        style={{
          position: "fixed",
          bottom: 8,
          right: 8,
          zIndex: 99999,
          padding: "4px 8px",
          fontSize: 12,
        }}
      >
        [DIAG]
      </button>
    );
  }

  const moduleStatus = new Map<string, string>();
  for (const e of events) {
    if (e.module) {
      if (e.type === "module.mount") moduleStatus.set(e.module, "mounted");
      if (e.type === "module.error") moduleStatus.set(e.module, "crashed");
      if (e.type === "module.null_render") moduleStatus.set(e.module, "null render");
      if (e.type === "module.invisible") moduleStatus.set(e.module, "invisible");
      if (e.type === "import.failure") moduleStatus.set(e.module, "import failed");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: 420,
        maxHeight: "50vh",
        background: "#1a1a2e",
        color: "#e0e0e0",
        fontFamily: "monospace",
        fontSize: 12,
        zIndex: 99999,
        overflow: "auto",
        borderRadius: "8px 0 0 0",
        border: "1px solid #333",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          background: "#16213e",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>LUCCCA Diagnostics</strong>
        <div>
          <button
            type="button"
            onClick={() => diag.downloadReport()}
            style={{ marginRight: 8 }}
          >
            Export
          </button>
          <button type="button" onClick={() => setVisible(false)}>
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: 8 }}>
        <strong>Module Health:</strong>
        {[...moduleStatus.entries()].map(([id, status]) => (
          <div key={id}>
            {status} {id}
          </div>
        ))}
      </div>

      <div style={{ padding: 8, borderTop: "1px solid #333" }}>
        <strong>Timeline (last 20):</strong>
        {events
          .slice(-20)
          .reverse()
          .map((e, i) => (
            <div
              key={i}
              style={{
                padding: "2px 0",
                color:
                  e.type.includes("error") || e.type.includes("failure")
                    ? "#ff6b6b"
                    : e.type.includes("mount")
                      ? "#69db7c"
                      : "#e0e0e0",
              }}
            >
              [{e.ts.toFixed(0)}ms] {e.type} {e.module ?? ""}
            </div>
          ))}
      </div>
    </div>
  );
}
