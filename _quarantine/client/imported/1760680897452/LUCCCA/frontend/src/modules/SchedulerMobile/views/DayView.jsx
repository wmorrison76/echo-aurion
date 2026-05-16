import React from "react";

export default function DayView({ entries=[] }) {
  return (
    <div className="day-view grid gap-2">
      {entries.map(e=>(
        <div key={e.id} className="p-2 rounded bg-white/5 border border-white/10">
          <div className="font-medium">{e.title}</div>
          <div className="text-xs opacity-70">{e.start} - {e.end}</div>
        </div>
      ))}
    </div>
  );
}
