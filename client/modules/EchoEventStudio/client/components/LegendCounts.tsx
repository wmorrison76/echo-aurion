import React from "react";

import type { Item } from "@/pages/Planner";

export default function LegendCounts({ items }: { items: Item[] }) {
  const byLabel = React.useMemo(() => {
    const acc: Record<string, number> = {};
    for (const it of items) {
      const key = it.label || it.type;
      const add = it.type === "chair" ? 1 : Math.max(0, it.seats || 0);
      acc[key] = (acc[key] || 0) + add;
    }
    return acc;
  }, [items]);

  const byRow = React.useMemo(() => {
    const band = 8; /* feet per band */
    const acc: Record<string, number> = {};
    for (const it of items) {
      const y = Math.floor(it.y / band) * band;
      const key = `${y}-${y + band} ft`;
      const add = it.type === "chair" ? 1 : Math.max(0, it.seats || 0);
      acc[key] = (acc[key] || 0) + add;
    }
    return acc;
  }, [items]);

  return (
    <div className="text-xs space-y-2">
      <div>
        <div className="font-semibold">Legend</div>
        {Object.entries(byLabel).map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span>{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="font-semibold">Counts by Row (8ft)</div>
        {Object.entries(byRow).map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span>{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
