import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { captureException } from '@/lib/sentry-init';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class UniversalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `Error in ${this.props.moduleName || 'component'}:`,
      error,
      errorInfo
    );
    try {
      captureException(error, { source: "UniversalErrorBoundary", moduleName: this.props.moduleName, componentStack: errorInfo?.componentStack });
    } catch (_) { /* Sentry not available */ }
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6">
          <Card className="border-red-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-red-600 mb-2">
                    {this.props.moduleName || 'Component'} Failed to Load
                  </h2>
                  <p className="text-gray-600 mb-4">
                    An error occurred while loading this module. The system has logged
                    this issue for review.
                  </p>
                  
                  <details className="mb-4">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-4 bg-gray-50 rounded text-sm font-mono">
                      <div className="mb-2">
                        <strong>Error:</strong> {this.state.error?.message}
                      </div>
                      {this.state.error?.stack && (
                        <div className="text-xs text-gray-600 overflow-auto max-h-40">
                          {this.state.error.stack}
                        </div>
                      )}
                    </div>
                  </details>

                  <div className="flex space-x-2">
                    <button
                      onClick={this.handleReset}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                    >
                      Reload Page
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
