import React, { ReactNode, ErrorInfo } from "react";
import { captureException } from "@/lib/sentry-init";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

function safeErrorToString(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value instanceof Error) return value.message || value.name;

  try {
    return JSON.stringify(value);
  } catch {
    try {
      return Object.prototype.toString.call(value);
    } catch {
      return "[Unserializable]";
    }
  }
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = safeErrorToString(error);
    const errorInfoMessage = safeErrorToString(errorInfo);
    console.error("ErrorBoundary caught:", errorMessage, errorInfoMessage);
    this.setState({ errorInfo });

    captureException(error, {
      source: "ErrorBoundary",
      componentStack: errorInfo?.componentStack ?? undefined,
      errorMessage: errorInfoMessage,
    });

    if (typeof window !== "undefined") {
      (window as any).__lastRuntimeError = {
        message: errorMessage,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
      };
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Something went wrong
            </h1>
            <p className="text-foreground/60 mb-6">
              The application encountered an error. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-foreground/60 hover:text-foreground">
                  Error details
                </summary>
                <div className="mt-2 space-y-3 text-xs text-foreground/80">
                  <pre className="p-3 bg-background/50 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.error.stack && (
                    <pre className="p-3 bg-background/50 rounded overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <pre className="p-3 bg-background/50 rounded overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
