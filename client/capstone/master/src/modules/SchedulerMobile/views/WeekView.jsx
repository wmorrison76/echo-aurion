import React from "react";

export default function WeekView({ entries=[] }) {
  return (
    <div className="week-view grid gap-1">
      {entries.map(e=>(
        <div key={e.id} className="p-1 rounded bg-white/5 text-xs">
          {e.title} ({e.start}-{e.end})
        </div>
      ))}
    </div>
  );
}
