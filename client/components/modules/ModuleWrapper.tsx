/**
 * LUCCCA Framework — ModuleWrapper (Sentry-wired)
 * Wraps every lazy-loaded module with Sentry error capture.
 * Used by the panel system to wrap each module's content.
 */

import React from "react";
import * as Sentry from "@sentry/react";

interface ModuleWrapperProps {
  children: React.ReactNode;
  moduleId: string;
  moduleName?: string;
  onClose?: () => void;
  onError?: (error: Error) => void;
  loadingFallback?: React.ReactNode;
}

interface ModuleWrapperState {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
  retryCount: number;
}

function DefaultLoadingFallback({ moduleName }: { moduleName: string }) {
  return (
    <div className="flex items-center justify-center w-full min-h-[200px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white/80 mb-3" />
        <p className="text-sm text-white/60">Loading {moduleName}…</p>
      </div>
    </div>
  );
}

class ModuleWrapper extends React.Component<ModuleWrapperProps, ModuleWrapperState> {
  state: ModuleWrapperState = {
    hasError: false,
    error: null,
    eventId: null,
    retryCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<ModuleWrapperState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { moduleId, moduleName, onError } = this.props;
    const displayName = moduleName || moduleId;

    console.error(
      `[ModuleWrapper:${moduleId}] Module render error:`,
      error,
      "\nComponent stack:",
      errorInfo.componentStack
    );

    const eventId = Sentry.captureException(error, {
      contexts: {
        module_wrapper: {
          moduleId,
          moduleName: displayName,
          componentStack: errorInfo.componentStack || "N/A",
          retryCount: this.state.retryCount,
        },
      },
      tags: {
        error_boundary: "ModuleWrapper",
        module_id: moduleId,
        module_name: displayName,
        error_type: "module_render_error",
        retry_count: String(this.state.retryCount),
      },
      fingerprint: ["module-wrapper-error", moduleId, error.message],
    });

    this.setState({ eventId });

    Sentry.addBreadcrumb({
      category: "module",
      message: `Module "${displayName}" (${moduleId}) crashed: ${error.message}`,
      level: "error",
      data: { moduleId, retryCount: this.state.retryCount },
    });

    onError?.(error);
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    const { moduleName, moduleId } = this.props;

    Sentry.addBreadcrumb({
      category: "module",
      message: `User retried module "${moduleName || moduleId}" (attempt ${newRetryCount})`,
      level: "info",
    });

    this.setState({
      hasError: false,
      error: null,
      eventId: null,
      retryCount: newRetryCount,
    });
  };

  render() {
    const { moduleId, moduleName, onClose, loadingFallback, children } = this.props;
    const displayName = moduleName || moduleId;

    if (this.state.hasError) {
      const maxRetries = 3;
      const canRetry = this.state.retryCount < maxRetries;

      return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6 rounded-lg border border-destructive/30 bg-destructive/10">
          <div className="text-center max-w-md">
            <p className="font-semibold text-base mb-2 text-destructive">
              {displayName} failed to load
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              {this.state.error?.message || "An unexpected error occurred while rendering this module."}
            </p>
            {this.state.eventId && (
              <p className="text-[10px] text-muted-foreground/50 font-mono mb-4">
                Error reported to monitoring · ID: {this.state.eventId}
              </p>
            )}
            {!canRetry && (
              <p className="text-xs text-destructive/80 mb-4">
                This module has failed {maxRetries} times. Please report this issue or try reloading the page.
              </p>
            )}
            <div className="flex gap-2 justify-center">
              {canRetry && (
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition"
                >
                  Retry {this.state.retryCount > 0 ? `(${this.state.retryCount}/${maxRetries})` : ""}
                </button>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-1.5 bg-muted text-muted-foreground rounded text-sm font-medium hover:bg-muted/80 transition"
              >
                Reload Page
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 bg-transparent border border-muted text-muted-foreground rounded text-sm font-medium hover:bg-muted/20 transition"
                >
                  Close
                </button>
              )}
            </div>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 text-xs text-muted-foreground/60 max-w-lg w-full">
              <summary className="cursor-pointer">
                Stack trace (dev only) · Retry #{this.state.retryCount}
              </summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap bg-black/20 rounded p-3 text-[10px]">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return (
      <React.Suspense
        fallback={loadingFallback || <DefaultLoadingFallback moduleName={displayName} />}
      >
        {children}
      </React.Suspense>
    );
  }
}

export default ModuleWrapper;
