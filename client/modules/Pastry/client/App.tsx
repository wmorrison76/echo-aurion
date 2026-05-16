import React from "react";
import * as Sentry from "@sentry/react";

const Index = React.lazy(() =>
  import("./pages/IndexContent").catch((err) => {
    console.error("[Pastry] Failed to load IndexContent", err);
    return {
      default: () => (
        <div
          className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6"
          style={{ backgroundColor: "#3f0f0f", color: "#fca5a5", border: "1px solid #7f1d1d" }}
        >
          <p className="font-medium text-sm mb-2">Pastry failed to load</p>
          <p className="text-sm mb-4">{err?.message || "Check console"}</p>
          <button
            type="button"
            className="px-3 py-1.5 rounded text-sm font-medium"
            style={{ backgroundColor: "rgba(200,169,126,0.1)", color: "#c8a97e", border: "1px solid rgba(200,169,126,0.3)" }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      ),
    };
  }),
);

const LoadingFallback = () => (
  <div
    className="flex items-center justify-center w-full min-h-[200px] font-semibold"
    style={{ backgroundColor: "#04060d", color: "#c8a97e" }}
  >
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border border-[#c8a97e]/30 border-t-[#c8a97e] mb-4" />
      <p className="text-sm">Loading Pastry…</p>
    </div>
  </div>
);

class PastryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Pastry App] Render error:", error, info.componentStack);
    Sentry.captureException(error, {
      contexts: {
        react_error_boundary: {
          module: "Pastry",
          componentStack: info.componentStack || "N/A",
        },
      },
      tags: {
        error_boundary: "PastryErrorBoundary",
        module: "Pastry",
        error_type: "render_error",
      },
      fingerprint: ["pastry-render-error", error.message],
    });
  }
  render() {
    if (this.state.error) {
      return (
        <div
          className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 overflow-auto"
          style={{ backgroundColor: "#3f0f0f", color: "#fca5a5", border: "1px solid #7f1d1d" }}
        >
          <p className="font-medium text-sm mb-2">
            Pastry content couldn’t load
          </p>
          <p className="text-sm mb-4 max-w-md">{this.state.error.message}</p>
          <button
            type="button"
            className="px-3 py-1.5 rounded text-sm font-medium"
            style={{ backgroundColor: "rgba(200,169,126,0.1)", color: "#c8a97e", border: "1px solid rgba(200,169,126,0.3)" }}
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <div
      className="w-full flex flex-col overflow-auto"
      style={{
        flex: "1 1 auto",
        minHeight: 400,
        height: "100%",
      }}
    >
      <PastryErrorBoundary>
        <React.Suspense fallback={<LoadingFallback />}>
          <Index />
        </React.Suspense>
      </PastryErrorBoundary>
    </div>
  );
}
