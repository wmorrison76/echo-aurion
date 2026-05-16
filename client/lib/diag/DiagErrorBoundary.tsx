/**
 * DiagErrorBoundary — Sentry-wired version
 * For the diagnostics panel system. Reports diagnostic tool render failures to Sentry.
 */

import React from "react";
import * as Sentry from "@sentry/react";
import { upsertPanelResult } from "./diag-core";

interface DiagErrorBoundaryProps {
  children: React.ReactNode;
  diagName?: string;
  /** Optional: when set, updates diag report via upsertPanelResult (DiagRunnerPage) */
  panelKey?: string;
  fallback?: React.ReactNode;
}

interface DiagErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DiagErrorBoundary extends React.Component<
  DiagErrorBoundaryProps,
  DiagErrorBoundaryState
> {
  state: DiagErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): DiagErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const diagName = this.props.diagName ?? this.props.panelKey ?? "DiagnosticTool";

    console.error(`[Diag:${diagName}] Render error:`, error, errorInfo.componentStack);

    Sentry.captureException(error, {
      contexts: {
        diagnostic_boundary: {
          diagName,
          componentStack: errorInfo.componentStack || "N/A",
        },
      },
      tags: {
        error_boundary: "DiagErrorBoundary",
        diag_name: diagName,
        error_type: "diagnostic_render_error",
      },
      fingerprint: ["diag-error", diagName, error.message],
    });

    if (this.props.panelKey) {
      upsertPanelResult(this.props.panelKey, {
        render: {
          ok: false,
          ms: 0,
          error: {
            message: error.message,
            stack: error.stack ?? undefined,
            componentStack: errorInfo.componentStack ?? "",
          },
        },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-4 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-200 text-sm">
          <p className="font-semibold mb-1">
            Diagnostic tool{this.props.diagName || this.props.panelKey ? ` "${this.props.diagName ?? this.props.panelKey}"` : ""} failed
          </p>
          <p className="text-xs opacity-75 mb-3">{this.state.error?.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 bg-yellow-500/80 text-yellow-950 rounded text-xs font-medium"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default DiagErrorBoundary;
export { DiagErrorBoundary };
