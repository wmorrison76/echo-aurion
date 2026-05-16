/**
 * Error boundary that reports to diagnostic core and Sentry; renders a diag fallback with data-module-root.
 */

import React from "react";
import * as Sentry from "@sentry/react";
import { diag } from "./diagnostic-core";

interface Props {
  moduleId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DiagErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { moduleId } = this.props;
    console.error(`[Diag:${moduleId}] Render error:`, error, errorInfo.componentStack);

    Sentry.captureException(error, {
      contexts: {
        diagnostic_boundary: {
          diagName: moduleId,
          componentStack: errorInfo.componentStack || "N/A",
        },
      },
      tags: {
        error_boundary: "DiagErrorBoundary",
        diag_name: moduleId,
        error_type: "diagnostic_render_error",
      },
      fingerprint: ["diag-error", moduleId, error.message],
    });

    diag.moduleError(moduleId, error);
    diag.emit(
      "error_boundary.catch",
      {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      moduleId
    );
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback ?? (
          <div
            data-module-root={this.props.moduleId}
            data-diag-status="crashed"
            style={{
              padding: 16,
              background: "var(--destructive-subtle, #fee)",
              border: "1px solid var(--destructive, #c00)",
              borderRadius: 8,
            }}
          >
            <strong>[DIAG] {this.props.moduleId} crashed</strong>
            <pre style={{ fontSize: 12, marginTop: 8, overflow: "auto" }}>
              {this.state.error.message}
            </pre>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
