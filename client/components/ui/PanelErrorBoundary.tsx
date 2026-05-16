/**
 * LUCCCA Framework — PanelErrorBoundary (Sentry-wired)
 * Specifically for the panel system. Wraps each panel with Sentry reporting
 * so blank panels generate a Sentry event instead of silently failing.
 */

import React from "react";
import * as Sentry from "@sentry/react";

interface PanelErrorBoundaryProps {
  children: React.ReactNode;
  panelKey: string;
  panelTitle?: string;
  onClose?: () => void;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

class PanelErrorBoundary extends React.Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = {
    hasError: false,
    error: null,
    eventId: null,
  };

  static getDerivedStateFromError(error: Error): Partial<PanelErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { panelKey, panelTitle } = this.props;

    console.error(
      `[Panel:${panelKey}] Render error:`,
      error,
      errorInfo.componentStack
    );

    const eventId = Sentry.captureException(error, {
      contexts: {
        panel: {
          panelKey,
          panelTitle: panelTitle || panelKey,
          componentStack: errorInfo.componentStack || "N/A",
        },
      },
      tags: {
        error_boundary: "PanelErrorBoundary",
        panel_key: panelKey,
        error_type: "panel_render_error",
      },
      fingerprint: ["panel-render-error", panelKey, error.message],
    });

    this.setState({ eventId });

    Sentry.addBreadcrumb({
      category: "panel",
      message: `Panel "${panelKey}" failed to render: ${error.message}`,
      level: "error",
      data: {
        panelKey,
        panelTitle: panelTitle || panelKey,
      },
    });
  }

  handleRetry = () => {
    Sentry.addBreadcrumb({
      category: "panel",
      message: `User retried panel "${this.props.panelKey}" after error`,
      level: "info",
    });
    this.setState({ hasError: false, error: null, eventId: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[120px] p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200">
          <p className="font-semibold text-sm mb-1">
            {this.props.panelTitle || this.props.panelKey} failed to render
          </p>
          <p className="text-xs opacity-75 mb-1 text-center max-w-xs">
            {this.state.error?.message || "Unknown error"}
          </p>
          {this.state.eventId && (
            <p className="text-[10px] opacity-50 font-mono mb-3">
              Sentry: {this.state.eventId}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded text-xs font-medium transition"
            >
              Retry
            </button>
            {this.props.onClose && (
              <button
                type="button"
                onClick={this.props.onClose}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 rounded text-xs font-medium transition"
              >
                Close Panel
              </button>
            )}
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-3 text-[10px] opacity-60 max-w-sm w-full">
              <summary className="cursor-pointer">Stack trace</summary>
              <pre className="mt-1 overflow-auto whitespace-pre-wrap bg-black/30 rounded p-2">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default PanelErrorBoundary;
