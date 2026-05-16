/**
 * iter213 · EchoWaste standalone preview route
 *
 * Route: /m/waste  OR  /m/waste/:token
 *
 * Mounts the full WasteTab without the StaffMobile shell — lets ops/demo
 * users open the waste capture UI directly (no briefing-token round-trip).
 */
import React from "react";
import { useParams } from "react-router-dom";
import { WasteTab } from "./WasteTab";

export default function WasteStandalone() {
  const { token } = useParams<{ token?: string }>();
  const effectiveToken = token || "demo";

  return (
    <div data-testid="waste-standalone-root" style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
      color: "#f5efe4", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <header style={{
        padding: "18px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>ECHO AURION</div>
          <h1 style={{ fontSize: 22, fontWeight: 300, margin: "4px 0 0", color: "#f5efe4" }}>Echo Cognitive Waste</h1>
        </div>
        <a href="/m/staff/demo" data-testid="waste-standalone-back" style={{
          fontSize: 11, color: "#94a3b8", textDecoration: "none",
          padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(148,163,184,0.2)",
        }}>← Full staff</a>
      </header>

      <main>
        <WasteTab token={effectiveToken} />
      </main>
    </div>
  );
}
