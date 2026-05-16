import React from "react";

type Cell = { day: string; kpi: string; value: number };

export const TrendSurface3D: React.FC<{ cells: Cell[] }> = ({ cells }) => {
  const days = Array.from(new Set(cells.map((c) => c.day)));
  const kpis = Array.from(new Set(cells.map((c) => c.kpi)));
  const max = Math.max(1, ...cells.map((c) => c.value));
  const cellMap = new Map(cells.map((c) => [`${c.day}|${c.kpi}`, c.value]));
  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4">
      {" "}
      <div className="font-semibold mb-2">3D KPI Surface</div>{" "}
      <div className="overflow-auto">
        {" "}
        <div
          className="grid"
          style={{ gridTemplateColumns: `120px repeat(${days.length}, 80px)` }}
        >
          {" "}
          <div />{" "}
          {days.map((d) => (
            <div key={d} className="text-xs text-gray-300 text-center">
              {" "}
              {d}{" "}
            </div>
          ))}{" "}
          {kpis.map((k) => (
            <React.Fragment key={k}>
              {" "}
              <div className="text-xs text-gray-300 p-1">{k}</div>{" "}
              {days.map((d) => {
                const v = cellMap.get(`${d}|${k}`) ?? 0;
                const h = Math.round((v / max) * 48) + 4;
                const bg =
                  v > 75
                    ? "bg-emerald-600"
                    : v > 50
                      ? "bg-primary"
                      : v > 25
                        ? "bg-amber-600"
                        : "bg-red-600";
                return (
                  <div
                    key={`${d}-${k}`}
                    className="flex items-end justify-center p-1"
                  >
                    {" "}
                    <div
                      className={`${bg} w-8 rounded`}
                      style={{ height: `${h}px` }}
                      title={`${k} ${v.toFixed(1)}`}
                    />{" "}
                  </div>
                );
              })}{" "}
            </React.Fragment>
          ))}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};

// Builder widget registration (no hooks at module scope)
if (typeof window !== "undefined") {
  try {
    (window as any)?.LUCCCA?.registerWidget?.("TrendSurface3D", TrendSurface3D);
  } catch {
    // ignore
  }
}
