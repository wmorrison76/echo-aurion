import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Specialized error boundary for ResizeObserver errors
 * Catches and suppresses ResizeObserver-related errors while allowing other errors to bubble up
 */
class ResizeObserverErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a ResizeObserver error
    if (ResizeObserverErrorBoundary.isResizeObserverError(error)) {
      console.warn('ResizeObserver error caught and suppressed:', error.message);
      // Don't trigger error state for ResizeObserver errors
      return { hasError: false };
    }

    // For other errors, let them bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (ResizeObserverErrorBoundary.isResizeObserverError(error)) {
      console.warn('ResizeObserver error in componentDidCatch:', error.message);
      
      // Call custom error handler if provided
      this.props.onError?.(error, errorInfo);
      
      // Reset error state
      this.setState({ hasError: false, error: undefined });
      return;
    }

    // For non-ResizeObserver errors, set error state
    this.setState({ hasError: true, error });
    this.props.onError?.(error, errorInfo);
  }

  private static isResizeObserverError(error: Error): boolean {
    const message = error.message || '';
    const stack = error.stack || '';
    
    return (
      message.includes('ResizeObserver loop completed with undelivered notifications') ||
      message.includes('ResizeObserver loop limit exceeded') ||
      message.includes('ResizeObserver loop') ||
      stack.includes('ResizeObserver') ||
      error.name === 'ResizeObserverError'
    );
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} />;
      }

      // Simple fallback for non-ResizeObserver errors
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <h3 className="text-red-800 font-medium">Component Error</h3>
          <p className="text-red-600 text-sm mt-1">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ResizeObserverErrorBoundary;

/**
 * HOC to wrap components with ResizeObserver error protection
 */
export function withResizeObserverErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error }>
) {
  const WrappedComponent: React.FC<P> = (props) => (
    <ResizeObserverErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ResizeObserverErrorBoundary>
  );

  WrappedComponent.displayName = `withResizeObserverErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook to handle ResizeObserver errors in functional components
 */
export function useResizeObserverErrorHandler() {
  React.useEffect(() => {
    const isResizeObserverError = (error: Error): boolean => {
      const message = error.message || '';
      const stack = error.stack || '';

      return (
        message.includes('ResizeObserver loop completed with undelivered notifications') ||
        message.includes('ResizeObserver loop limit exceeded') ||
        message.includes('ResizeObserver loop') ||
        stack.includes('ResizeObserver') ||
        error.name === 'ResizeObserverError'
      );
    };

    const handleError = (event: ErrorEvent) => {
      if (event.error && isResizeObserverError(event.error)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn('ResizeObserver error handled by hook:', event.error.message);
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error && isResizeObserverError(event.reason)) {
        event.preventDefault();
        console.warn('ResizeObserver promise rejection handled by hook:', event.reason.message);
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}
