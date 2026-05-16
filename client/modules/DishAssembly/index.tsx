/**
 * Dish Assembly — Standalone Per-Outlet Panel
 * Wraps the Culinary dish-assembly workspace as a shared module.
 * Previously duplicated in Culinary (~1170 lines) and Pastry (~1243 lines).
 * Connects to Kitchen Routing for station/printer mapping.
 */
import React, { Suspense, lazy } from "react";

const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#f59e0b", text: "#e2e8f0", dim: "#64748b" };

const DishAssemblyWorkspace = lazy(() =>
  import("@/modules/Culinary/client/pages/sections/dish-assembly").catch(() => ({
    default: () => <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Dish Assembly requires Culinary context. Open from Culinary module.</div>,
  }))
);

export default function DishAssemblyPanel() {
  return (
    <div data-testid="dish-assembly-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(245,158,11,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Dish Assembly</div>
          <div style={{ fontSize: 10, color: C.dim }}>Component mapping, station routing, plating — connects to Kitchen Routing</div>
        </div>
        <div style={{ fontSize: 10, color: C.dim, background: `${C.accent}10`, padding: "4px 10px", borderRadius: 6 }}>Per-Outlet Module</div>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading Dish Assembly...</div>}>
          <DishAssemblyWorkspace />
        </Suspense>
      </div>
    </div>
  );
}
