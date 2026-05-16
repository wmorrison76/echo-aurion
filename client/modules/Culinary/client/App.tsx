import React from "react";
import * as Sentry from "@sentry/react";
import Index from "./pages/Index";
import { AppDataProvider } from "./context/AppDataContext";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { YieldProvider } from "./context/YieldContext";
import { CrawlerProvider } from "./context/CrawlerContext";
import { OutletProvider } from "./context/OutletContext";
import { CollaborationProvider } from "./context/CollaborationContext";

class IndexErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; eventId: string | null }
> {
  state = { error: null as Error | null, eventId: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      "[Culinary App] Index render error:",
      error,
      info.componentStack,
    );
    const eventId = Sentry.captureException(error, {
      contexts: {
        react_error_boundary: {
          module: "Culinary",
          componentStack: info.componentStack || "N/A",
        },
      },
      tags: {
        error_boundary: "CulinaryIndexErrorBoundary",
        module: "Culinary",
        error_type: "render_error",
      },
      fingerprint: ["culinary-render-error", error.message],
    });
    this.setState({ eventId });
  }
  render() {
    if (this.state.error) {
      return (
        <div
          className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 overflow-auto"
          style={{ backgroundColor: "#3f0f0f", color: "#fca5a5", border: "1px solid #7f1d1d" }}
        >
          <p className="font-medium text-sm mb-2">
            Culinary content couldn’t load
          </p>
          <p className="text-sm mb-1 max-w-md">{this.state.error.message}</p>
          {this.state.eventId && (
            <p className="text-xs mb-4 opacity-50 font-mono">
              Error ID: {this.state.eventId}
            </p>
          )}
          <button
            type="button"
            className="px-4 py-2 rounded-sm text-sm font-medium transition-all"
            style={{ backgroundColor: "rgba(200,169,126,0.1)", color: "#c8a97e", border: "1px solid rgba(200,169,126,0.3)" }}
            onClick={() => this.setState({ error: null, eventId: null })}
            data-testid="culinary-error-retry"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const LoadingFallback = () => (
  <div
    className="flex items-center justify-center w-full min-h-[200px]"
    style={{ backgroundColor: "#04060d", color: "#c8a97e", fontFamily: "'IBM Plex Sans', sans-serif" }}
  >
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-6 w-6 border border-[#c8a97e]/30 border-t-[#c8a97e] mb-4" />
      <p className="text-xs font-mono uppercase tracking-[0.15em] text-white/40">Loading Culinary</p>
    </div>
  </div>
);

export default function App() {
  const rootRef = React.useRef<HTMLDivElement>(null);
  console.debug("[Culinary App] Rendering App component");
  return (
    <div
      ref={rootRef}
      className="culinary-app-root flex flex-col min-w-[280px] bg-background scrollbar-hide"
      style={{
        width: "100%",
        height: "100%",
        minHeight: 400,
        overflow: "auto",
      }}
    >
      <AuthProvider>
        <LanguageProvider>
          <AppDataProvider>
            <OutletProvider>
              <YieldProvider>
                <CrawlerProvider>
                  <CollaborationProvider>
                    <IndexErrorBoundary>
                      <React.Suspense fallback={<LoadingFallback />}>
                        <Index />
                      </React.Suspense>
                    </IndexErrorBoundary>
                  </CollaborationProvider>
                </CrawlerProvider>
              </YieldProvider>
            </OutletProvider>
          </AppDataProvider>
        </LanguageProvider>
      </AuthProvider>
    </div>
  );
}
