import React from 'react';

interface ErrorBoundaryProps extends React.PropsWithChildren {
  fallback?: React.ReactNode | ((reset: () => void, error?: Error) => React.ReactNode);
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Optional: log to monitoring; Sentry MCP can be connected externally
    // console.error('ErrorBoundary caught error', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
    try { this.props.onReset?.(); } catch {}
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return (this.props.fallback as any)(this.reset, this.state.error);
      }
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-xl border p-4 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Something went wrong loading this section.</div>
              <div className="text-sm opacity-80 break-all">{this.state.error?.message}</div>
            </div>
            <button onClick={this.reset} className="inline-flex items-center px-2.5 py-1.5 text-sm rounded border bg-white dark:bg-slate-900">
              Reload section
            </button>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

export default ErrorBoundary;
