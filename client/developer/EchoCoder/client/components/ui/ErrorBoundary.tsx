import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?(error: Error, info: React.ErrorInfo): void;
};

type ErrorBoundaryState = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (typeof this.props.onError === "function") this.props.onError(error, info);
  }
  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-md border p-3 text-xs bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200">
            <div className="font-semibold mb-1">Something went wrong rendering this panel.</div>
            <div className="opacity-80 whitespace-pre-wrap">{this.state.error?.message || String(this.state.error)}</div>
            <button className="mt-2 rounded border px-2 py-0.5" onClick={() => this.setState({ hasError: false, error: null })}>Try again</button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
