/**
 * ErrorBoundaryWrapper - Reusable error boundary for critical components
 * Catches errors and sends them to Sentry while displaying user-friendly error messages
 */

import React from "react";
import * as Sentry from "@sentry/react";

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
    console.error(`Error in ${section}:`, error, errorInfo);

    // Send to Sentry with section context
    Sentry.captureException(error, {
      contexts: {
        error_boundary: {
          section,
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        boundary: section,
      },
    });

    // Call optional custom handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: "16px",
              margin: "16px",
              border: "1px solid #ff6b6b",
              borderRadius: "8px",
              backgroundColor: "#ffe0e0",
              color: "#c92a2a",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              ⚠️ Error in {this.props.section || "Section"}
            </h3>
            <p>
              We've encountered an unexpected error. Please try refreshing the
              page or navigating to another section.
            </p>
            {process.env.NODE_ENV === "development" && (
              <details style={{ marginTop: "8px", fontSize: "12px" }}>
                <summary>Error details (development only)</summary>
                <pre style={{ overflow: "auto", fontSize: "10px" }}>
                  {this.state.error?.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
              style={{
                marginRight: "8px",
                padding: "8px 16px",
                backgroundColor: "#c92a2a",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "#666",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Back to Home
            </button>
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
