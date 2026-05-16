// src/components/MixologyTabs.jsx
import React, { useState } from "react";

const TABS = [
  { id: "spirits", label: "Spirits" },
  { id: "techniques", label: "Techniques" },
  { id: "recipes", label: "Recipes" },
  { id: "garnishes", label: "Garnishes" },
];

export default function MixologyTabs() {
  const [tab, setTab] = useState("spirits");
  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-3 py-1.5 rounded-full text-sm border transition",
              tab === t.id
                ? "bg-cyan-500/15 border-cyan-400 text-cyan-300"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/5 dark:bg-white/5 p-4 min-h-[220px]">
        <h3 className="text-sm font-semibold mb-2">{tab.toUpperCase()}</h3>
        <div className="text-sm opacity-80">
          <p>Mixology content for <b>{tab}</b> goes here.</p>
        </div>
      </div>
    </div>
  );
}
