// src/features/calendar/ProductionCalendar.jsx
import React, { useMemo } from "react";

/**
 * ProductionCalendar
 * - Input: tasks[] from generateTasksFromOrder()
 * - Groups by day; shows time ranges; color by task type.
 *
 * Props:
 *  - tasks: [{ id, title, type, start, end, resource, outletId, meta }]
 *  - days?: number window forward/back (default 7)
 */
export default function ProductionCalendar({ tasks = [], days = 7 }) {
  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => new Date(a.start) - new Date(b.start)),
    [tasks]
  );

  const byDay = useMemo(() => {
    const map = new Map();
    for (const t of sorted) {
      const day = t.start.slice(0, 10); // YYYY-MM-DD
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(t);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  }, [sorted]);

  const colorFor = (type) => {
    if (type === "bake") return "#f97316";
    if (type === "cool") return "#06b6d4";
    if (type === "torte") return "#38bdf8";
    if (type === "fill") return "#22c55e";
    if (type === "supports") return "#d946ef";
    if (type === "crumb") return "#eab308";
    if (type === "chill") return "#60a5fa";
    if (type === "finalIce") return "#a78bfa";
    if (type === "decorBasic") return "#f43f5e";
    if (type === "recipePrep") return "#10b981";
    if (type === "pickup") return "#94a3b8";
    return "#9ca3af";
  };

  const fmt = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {byDay.map(([day, items]) => (
        <div key={day} style={{ border: "1px solid #374151", borderRadius: 12, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 14px",
              background: "#0b1220",
              borderBottom: "1px solid #374151",
              color: "#e5e7eb",
              fontWeight: 600,
            }}
          >
            {new Date(day + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div style={{ padding: 12, display: "grid", gap: 8 }}>
            {items.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr",
                  gap: 12,
                  alignItems: "center",
                  padding: "8px 10px",
                  border: "1px solid #334155",
                  borderRadius: 10,
                  background: "rgba(148,163,184,0.06)",
                }}
              >
                <div style={{ color: "#cbd5e1", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas" }}>
                  {fmt(t.start)} — {fmt(t.end)}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#e5e7eb" }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: colorFor(t.type),
                        display: "inline-block",
                      }}
                    />
                    <strong>{t.title}</strong>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                    Resource: <b>{t.resource}</b>
                    {t.meta?.beo ? <> · BEO: <b>{t.meta.beo}</b></> : null}
                    {t.meta?.reo ? <> · REO: <b>{t.meta.reo}</b></> : null}
                    {t.outletId ? <> · Outlet: <b>{t.outletId}</b></> : null}
                  </div>
                </div>
              </div>
            ))}

            {!items.length && <div style={{ color: "#94a3b8" }}>No scheduled tasks.</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
