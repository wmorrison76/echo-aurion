/**
 * LUCCCA Framework — SentryErrorBoundary
 * ========================================
 * Drop-in replacement for all module error boundaries.
 * Reports every caught render error to Sentry with full context.
 */

import React from "react";
import * as Sentry from "@sentry/react";

interface SentryErrorBoundaryProps {
  children: React.ReactNode;
  /** Module or section name — shows in Sentry tags and the fallback UI */
  module: string;
  /** Optional custom fallback. If not provided, uses the built-in fallback */
  fallback?: React.ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Accent color for the fallback UI (hex). Defaults to module-aware colors */
  accentColor?: string;
}

interface SentryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

const MODULE_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Culinary:        { bg: "#b45309", text: "#fff", accent: "#d97706" },
  Pastry:          { bg: "#9333ea", text: "#fff", accent: "#a855f7" },
  Schedule:        { bg: "#d97706", text: "#1a1a1a", accent: "#f59e0b" },
  VideoConference: { bg: "#0ea5e9", text: "#fff", accent: "#38bdf8" },
  Whiteboard:      { bg: "#059669", text: "#fff", accent: "#10b981" },
  EchoCoder:       { bg: "#6366f1", text: "#fff", accent: "#818cf8" },
  EKG:             { bg: "#ef4444", text: "#fff", accent: "#f87171" },
  default:         { bg: "#374151", text: "#fff", accent: "#6b7280" },
};

function getModuleColor(module: string) {
  if (MODULE_COLORS[module]) return MODULE_COLORS[module];
  const key = Object.keys(MODULE_COLORS).find((k) =>
    module.toLowerCase().startsWith(k.toLowerCase())
  );
  return key ? MODULE_COLORS[key] : MODULE_COLORS.default;
}

class SentryErrorBoundary extends React.Component<
  SentryErrorBoundaryProps,
  SentryErrorBoundaryState
> {
  constructor(props: SentryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<SentryErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { module, onError } = this.props;

    console.error(
      `[${module}] Render error caught by SentryErrorBoundary:`,
      error,
      errorInfo.componentStack
    );

    const eventId = Sentry.captureException(error, {
      contexts: {
        react_error_boundary: {
          module,
          componentStack: errorInfo.componentStack || "N/A",
          errorMessage: error.message,
          errorName: error.name,
        },
      },
      tags: {
        error_boundary: "SentryErrorBoundary",
        module,
        error_type: "render_error",
      },
      fingerprint: ["render-error", module, error.message],
    });

    this.setState({ errorId: eventId });

    Sentry.setContext("last_render_error", {
      module,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    onError?.(error, errorInfo);
  }

  handleRetry = () => {
    Sentry.addBreadcrumb({
      category: "error_boundary",
      message: `User retried after render error in ${this.props.module}`,
      level: "info",
    });
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const colors = this.props.accentColor
        ? { bg: this.props.accentColor, text: "#fff", accent: this.props.accentColor }
        : getModuleColor(this.props.module);

      return (
        <div
          className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 overflow-auto"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          <p className="font-bold text-base mb-2">
            {this.props.module} content couldn&apos;t load
          </p>
          <p className="text-sm mb-1 max-w-md text-center opacity-90">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          {this.state.errorId && (
            <p className="text-xs mb-4 opacity-60 font-mono">
              Error ID: {this.state.errorId}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded text-sm font-medium"
              style={{ backgroundColor: colors.text, color: colors.bg }}
              onClick={this.handleRetry}
            >
              Retry
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded text-sm font-medium opacity-70"
              style={{
                backgroundColor: "transparent",
                color: colors.text,
                border: `1px solid ${colors.text}50`,
              }}
              onClick={() => {
                Sentry.showReportDialog({
                  eventId: this.state.errorId || undefined,
                  title: `Report issue with ${this.props.module}`,
                });
              }}
            >
              Report Issue
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 text-xs opacity-70 max-w-lg w-full">
              <summary className="cursor-pointer">Error details (dev only)</summary>
              <pre className="mt-2 overflow-auto text-[10px] whitespace-pre-wrap bg-black/20 rounded p-2">
                {this.state.error.stack || this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default SentryErrorBoundary;
