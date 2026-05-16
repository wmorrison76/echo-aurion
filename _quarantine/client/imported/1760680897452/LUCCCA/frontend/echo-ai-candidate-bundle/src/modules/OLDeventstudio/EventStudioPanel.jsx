// src/panels/EventStudioPanel.tsx
import React, { Suspense } from "react";

/** Simple error boundary to surface the real reason */
class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("EventStudioPanel crashed:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 16, color: "crimson", whiteSpace: "pre-wrap" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Panel failed to load</div>
          {String(this.state.err?.message || this.state.err)}
        </div>
      );
    }
    return this.props.children;
  }
}

/** Minimal chrome */
function PanelChrome({ title = "CRM • Event Studio", children }) {
  return (
    <div className="rounded-2xl shadow-lg border border-black/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur p-3 w-full h-full overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500/80" />
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="inline-block w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="text-sm opacity-70">{title}</div>
      </div>
      {children}
    </div>
  );
}

/** Use absolute import so it always targets the current Vite origin/port */
const CRMModule = React.lazy(() =>
  import("@/modules/crm/client/App.tsx").then((m) => ({
    default: m.default ?? m.App ?? Object.values(m)[0] ?? (() => null),
  }))
);

export default function EventStudioPanel() {
  return (
    <PanelErrorBoundary>
      <PanelChrome>
        <Suspense fallback={<div style={{ padding: 16 }}>Loading CRM Event Studio…</div>}>
          <CRMModule />
        </Suspense>
      </PanelChrome>
    </PanelErrorBoundary>
  );
}
