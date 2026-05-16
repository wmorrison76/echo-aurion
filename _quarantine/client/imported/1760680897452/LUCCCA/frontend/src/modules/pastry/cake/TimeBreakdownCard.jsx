// src/modules/pastry/cake/componets/TimeBreakdownCard.jsx
import React, { useMemo } from "react";
import { estimateBuildBreakdown, formatHhMm } from "../utils/TimeEstimator.js";

/**
 * TimeBreakdownCard
 * Visualizes the phase-by-phase build time from estimateBuildBreakdown().
 *
 * Props:
 *  - layers: your current layers array
 *  - options: { panShape, diameterInches, sheetSize, chillBetweenCoats, ovens, convection }
 *
 * Example:
 *   <TimeBreakdownCard
 *     layers={layers}
 *     options={{ panShape: "round", diameterInches: 10, ovens: 1, convection: false }}
 *   />
 */
export default function TimeBreakdownCard({
  layers = [],
  options = { panShape: "round", diameterInches: 10, ovens: 1, convection: false, chillBetweenCoats: true },
  title = "Estimated Timeline",
}) {
  const breakdown = useMemo(() => estimateBuildBreakdown(layers, options), [layers, options]);
  const max = useMemo(() => Math.max(1, ...breakdown.steps.map((s) => s.minutes)), [breakdown]);
  const total = breakdown.totalMinutes;

  return (
    <div style={{ padding: 16, border: "1px solid #374151", background: "#0b1220", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ color: "#e5e7eb", fontWeight: 600 }}>{title}</div>
        <div style={{ color: "#93c5fd", fontWeight: 600 }}>{formatHhMm(total)} total</div>
      </div>

      <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8 }}>
        Shape: <b>{options.panShape}</b>
        {options.panShape !== "sheet" ? (
          <> · Diameter: <b>{options.diameterInches}"</b></>
        ) : (
          <> · Sheet: <b>{options.sheetSize || "half"}</b></>
        )}
        {" · "}Ovens: <b>{options.ovens || 1}</b>
        {" · "}Convection: <b>{options.convection ? "Yes" : "No"}</b>
        {" · "}Chill after crumb: <b>{options.chillBetweenCoats ? "Yes" : "No"}</b>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {breakdown.steps
          .filter((s) => s.minutes > 0)
          .map((s) => {
            const pct = Math.max(2, Math.round((s.minutes / max) * 100));
            const label =
              {
                recipePrep: "Prepare recipe / mise en place",
                bake: "Bake layers",
                cool: "Cool layers",
                torte: "Cut / level (torte)",
                fill: "Apply filling",
                supports: "Insert supports / dowels",
                crumb: "Crumb coat",
                chill: "Chill (after crumb)",
                finalIce: "Final icing / smoothing",
                decorBasic: "Basic decoration / borders",
                staging: "Staging / cleanup buffer",
              }[s.key] || s.label || s.key;

            return (
              <div key={s.key}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#e5e7eb", fontSize: 13 }}>
                  <span>{label}</span>
                  <span style={{ color: "#cbd5e1" }}>{s.minutes} min</span>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(148,163,184,0.25)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #374151", color: "#9ca3af", fontSize: 12 }}>
        Tip: increase <b>ovens</b> or toggle <b>convection</b> in options to see bake-time effects.
      </div>
    </div>
  );
}
