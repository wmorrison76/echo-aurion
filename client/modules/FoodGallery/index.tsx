/**
 * Food Gallery — Desktop entry.
 * iter244 · ultra-modern editorial layout (DesktopGalleryAlpha) is now default.
 * Legacy Culinary Gallery still accessible via "Legacy view" toggle.
 */
import React, { Suspense, lazy } from "react";
import DesktopGalleryAlpha from "./DesktopGalleryAlpha";

const LegacyGallery = lazy(() =>
  import("@/modules/Culinary/client/pages/sections/Gallery").catch(() => ({
    default: () => <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
      Legacy gallery requires Culinary context.
    </div>,
  })),
);

export default function FoodGalleryPanel() {
  const [legacy, setLegacy] = React.useState(false);
  return (
    <div data-testid="food-gallery-panel" style={{
      height: "100%", borderRadius: 10, overflow: "hidden",
      display: "flex", flexDirection: "column",
      background: "#0a0a0a",
    }}>
      <div style={{
        padding: "10px 18px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(212,175,55,0.04)",
      }}>
        <div style={{ fontSize: 11, color: "#8b8680", letterSpacing: 1 }}>
          Cross-linked to Recipes · Menu Builder · Dish Assembly · Waste
        </div>
        <button data-testid="gallery-legacy-toggle" onClick={() => setLegacy((v) => !v)} style={{
          fontSize: 10, padding: "4px 10px", borderRadius: 4,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: legacy ? "#d4af37" : "#8b8680", cursor: "pointer", letterSpacing: 1,
        }}>{legacy ? "← BACK TO EDITORIAL" : "LEGACY VIEW"}</button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {legacy ? (
          <Suspense fallback={<div style={{ padding: 40, color: "#64748b" }}>Loading…</div>}>
            <LegacyGallery />
          </Suspense>
        ) : (
          <DesktopGalleryAlpha />
        )}
      </div>
    </div>
  );
}
