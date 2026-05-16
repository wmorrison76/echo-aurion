/**
 * Enhanced Error Boundary for Module Loading
 * Provides comprehensive error information for debugging
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { captureException } from "@/lib/sentry-init";

interface Props {
  children: ReactNode;
  moduleKey?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ModuleLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      captureException(error, { source: "ModuleLoadErrorBoundary", moduleKey: this.props.moduleKey, componentStack: errorInfo?.componentStack });
    } catch (_) { /* Sentry not available */ }
    // Log to diagnostics if available
    if (typeof window !== "undefined") {
      try {
        const diagnostics = (window as any).moduleDiagnostics;
        if (diagnostics && this.props.moduleKey) {
          diagnostics.logError(this.props.moduleKey, error, {
            componentStack: errorInfo.componentStack,
            errorBoundary: true,
          });
        }
      } catch (e) {
        // Diagnostics not available, continue with normal logging
      }
    }

    // Enhanced console logging
    console.group(`🔴 Error Boundary Caught Error${this.props.moduleKey ? ` (Module: ${this.props.moduleKey})` : ""}`);
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
    if (errorInfo.componentStack) {
      console.error("Component Stack:", errorInfo.componentStack);
    }
    console.groupEnd();

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const error = this.state.error;
      const errorInfo = this.state.errorInfo;

      return (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded m-4">
          <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2 text-lg">
            ⚠️ Module Error
          </h3>
          <p className="text-red-800 dark:text-red-200 text-sm mb-4">
            {this.props.moduleKey
              ? `The "${this.props.moduleKey}" module encountered an error while rendering.`
              : "A module encountered an error while rendering."}
          </p>

          <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded mb-4 text-xs space-y-2">
            <div>
              <strong className="text-red-900 dark:text-red-200">Error:</strong>
              <p className="font-mono text-red-900 dark:text-red-200 break-all mt-1">
                {error.message || String(error)}
              </p>
            </div>

            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100">
                  Stack Trace
                </summary>
                <pre className="mt-2 text-xs overflow-auto max-h-40 whitespace-pre-wrap font-mono">
                  {error.stack}
                </pre>
              </details>
            )}

            {errorInfo?.componentStack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100">
                  Component Stack
                </summary>
                <pre className="mt-2 text-xs overflow-auto max-h-40 whitespace-pre-wrap font-mono">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  console.group("=== ERROR BOUNDARY DIAGNOSTICS ===");
                  console.error("Error:", error);
                  console.error("Error Info:", errorInfo);
                  if ((window as any).getModuleDiagnostics) {
                    console.log("Module Diagnostics:", (window as any).getModuleDiagnostics());
                  }
                  console.groupEnd();
                }
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
            >
              📊 Show Diagnostics
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
