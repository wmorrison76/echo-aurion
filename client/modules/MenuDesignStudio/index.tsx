/**
 * Menu Design Studio — Standalone Panel (iter164: wired Culinary context providers)
 * Wraps the Culinary EchoMenuStudio with required context so the full studio
 * (previously stub) now renders inside the main app panel system.
 */
import React, { Suspense, lazy } from "react";

const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#f59e0b", text: "#e2e8f0", dim: "#64748b" };

// Culinary context providers — same pattern used inside /app/client/modules/Pastry/client/pages/IndexContent.tsx
const EchoMenuStudio = lazy(() =>
  import("@/modules/Culinary/client/pages/sections/EchoMenuStudio").catch((err) => {
    console.error("[MenuDesignStudio] Failed to load EchoMenuStudio", err);
    return { default: () => <FallbackStudio err={err} /> };
  })
);
const LazyCulinaryAuthProvider = lazy(() =>
  import("@/modules/Culinary/client/context/AuthContext").then((m) => ({ default: m.AuthProvider }))
);
const LazyCulinaryLangProvider = lazy(() =>
  import("@/modules/Culinary/client/context/LanguageContext").then((m) => ({ default: m.LanguageProvider }))
);
const LazyCulinaryAppDataProvider = lazy(() =>
  import("@/modules/Culinary/client/context/AppDataContext").then((m) => ({ default: m.AppDataProvider }))
);

function FallbackStudio({ err }: { err?: Error }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: C.dim }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Menu Design Studio</div>
      <div style={{ fontSize: 12, color: C.dim }}>
        Couldn’t load the studio: {err?.message || "context error"}. Try opening Culinary first.
      </div>
    </div>
  );
}

function StandaloneInfo() {
  return (
    <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(245,158,11,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Menu Design Studio</div>
        <div style={{ fontSize: 10, color: C.dim }}>Shared across all outlets — full designer with Culinary context</div>
      </div>
      <div style={{ fontSize: 10, color: C.dim, background: `${C.accent}10`, padding: "4px 10px", borderRadius: 6 }}>Per-Outlet Module</div>
    </div>
  );
}

class MDSErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.error("[MenuDesignStudio] render error", err); }
  render() {
    if (this.state.err) return <FallbackStudio err={this.state.err} />;
    return this.props.children;
  }
}

export default function MenuDesignStudioPanel() {
  return (
    <div data-testid="menu-design-studio-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StandaloneInfo />
      <div style={{ flex: 1, overflow: "auto" }}>
        <MDSErrorBoundary>
          <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading Menu Design Studio…</div>}>
            <LazyCulinaryAuthProvider>
              <LazyCulinaryLangProvider>
                <LazyCulinaryAppDataProvider>
                  <EchoMenuStudio />
                </LazyCulinaryAppDataProvider>
              </LazyCulinaryLangProvider>
            </LazyCulinaryAuthProvider>
          </Suspense>
        </MDSErrorBoundary>
      </div>
    </div>
  );
}
