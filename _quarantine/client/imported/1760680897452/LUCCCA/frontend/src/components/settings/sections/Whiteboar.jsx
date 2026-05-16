import React from "react";

export default function Whiteboard() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Whiteboard</h2>
      <div className="grid gap-3" style={{gridTemplateColumns:"1fr 1fr"}}>
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10">
          <span>Show grid</span>
          <input type="checkbox" className="settings-switch"
            defaultChecked={localStorage.getItem("lu:whiteboard:grid")==="true"}
            onChange={e=>localStorage.setItem("lu:whiteboard:grid", String(e.target.checked))}
          />
        </label>
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10">
          <span>Sticky note default color</span>
          <input className="settings-input" placeholder="#FFD166"
            defaultValue={localStorage.getItem("lu:whiteboard:stickyColor")||"#FFD166"}
            onBlur={e=>localStorage.setItem("lu:whiteboard:stickyColor", e.target.value)}
          />
        </label>
      </div>

      <div>
        <button
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
          onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "whiteboard", allowDuplicate: true } }))}
        >
          Open Whiteboard
        </button>
      </div>
    </div>
  );
}
