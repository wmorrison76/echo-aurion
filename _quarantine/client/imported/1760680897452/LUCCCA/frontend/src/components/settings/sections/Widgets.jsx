import React from "react";

export default function Widgets({ widgets }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Widgets</h2>
      <p className="text-sm opacity-80">Browse installed widgets and launch the Widget Studio to add new ones.</p>

      <div className="grid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12}}>
        {widgets.length === 0 && <div className="opacity-70 text-sm">No widgets found yet.</div>}
        {widgets.map(w => (
          <div key={w.id} className="rounded-xl border border-white/12 p-3 bg-white/3">
            <div className="font-medium">{w.name}</div>
            <div className="flex gap-2 mt-2">
              <button className="dw-btn px-2 py-1 rounded"
                onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "widgets", allowDuplicate: true, title: "Widget Studio" } }))}>
                Edit in Studio
              </button>
              <button className="dw-btn dw-btn--primary px-2 py-1 rounded"
                onClick={() => window.dispatchEvent(new CustomEvent("hud-add-widget", { detail: { id: "from-settings", title: w.name } }))}>
                Add to Dashboard
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <button
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
          onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "widgets", allowDuplicate: true, title: "Widget Studio" } }))}
          title="Open Widget Studio"
        >
          Open Widget Studio
        </button>
      </div>
    </div>
  );
}
