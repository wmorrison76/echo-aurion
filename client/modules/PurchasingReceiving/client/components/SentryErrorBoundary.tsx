import React, { ReactNode } from "react";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/sentry-init";

interface SentryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
interface SentryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SentryErrorBoundary extends React.Component<
  SentryErrorBoundaryProps,
  SentryErrorBoundaryState
> {
  constructor(props: SentryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): SentryErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("React Error Boundary caught:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    try {
      captureException(error, {
        source: "SentryErrorBoundary",
        componentStack: errorInfo?.componentStack,
      });
    } catch (e) {
      logger.error("Failed to send error to Sentry:", e);
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            {" "}
            <div className="text-center">
              {" "}
              <h1 className="mb-4 text-2xl font-bold text-destructive">
                {" "}
                Something went wrong{" "}
              </h1>{" "}
              <p className="mb-4 text-muted-foreground">
                {" "}
                {this.state.error?.message ||
                  "An unexpected error occurred"}{" "}
              </p>{" "}
              <button
                onClick={() => window.location.reload()}
                className="inline-block rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
              >
                {" "}
                Reload Page{" "}
              </button>{" "}
            </div>{" "}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
