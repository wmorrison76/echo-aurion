/**
 * ErrorBoundaryWrapper - Reusable error boundary for critical PurchRec sections
 * Catches errors and sends them to Sentry while displaying user-friendly error messages
 */

import React from "react";
import * as Sentry from "@sentry/react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  section?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryWrapper extends React.Component<
  ErrorBoundaryWrapperProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryWrapperProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const section = this.props.section || "Unknown";
    console.error(`[PurchRec] Error in ${section}:`, error, errorInfo);

    // Send to Sentry with section context
    Sentry.captureException(error, {
      contexts: {
        error_boundary: {
          section,
          module: "PurchRec",
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        boundary: section,
        module: "PurchRec",
        error_type: "render_error",
      },
    });

    // Call optional custom handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 m-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">
                  ⚠️ Error in {this.props.section || "Section"}
                </h3>
                <p className="text-red-800 dark:text-red-200 text-sm mb-3">
                  We've encountered an unexpected error. Please try refreshing
                  the page or navigating to another section.
                </p>
                {process.env.NODE_ENV === "development" && (
                  <details className="text-xs mb-3">
                    <summary className="cursor-pointer text-red-700 dark:text-red-400 font-mono">
                      Error details (development only)
                    </summary>
                    <pre className="mt-2 p-2 bg-red-100 dark:bg-red-950/50 rounded overflow-auto text-red-900 dark:text-red-200">
                      {this.state.error?.message}
                      {"\n\n"}
                      {this.state.error?.stack}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      this.setState({ hasError: false, error: null });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 rounded transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/";
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    Back to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryWrapper;

// Export higher-order component for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  section?: string,
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundaryWrapper section={section}>
        <Component {...props} />
      </ErrorBoundaryWrapper>
    );
  };
}
