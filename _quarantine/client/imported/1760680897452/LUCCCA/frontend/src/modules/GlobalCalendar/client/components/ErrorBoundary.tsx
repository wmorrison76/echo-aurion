import React, { Component, ErrorInfo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryState>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Filter out ResizeObserver errors - they shouldn't trigger error boundary
    if (error.message && error.message.includes('ResizeObserver loop completed with undelivered notifications')) {
      console.warn('ResizeObserver error suppressed by ErrorBoundary:', error.message);
      return { hasError: false };
    }

    // Filter out other ResizeObserver related errors
    if (error.message && (
      error.message.includes('ResizeObserver loop limit exceeded') ||
      error.message.includes('ResizeObserver loop') ||
      error.stack?.includes('ResizeObserver')
    )) {
      console.warn('ResizeObserver-related error suppressed by ErrorBoundary:', error.message);
      return { hasError: false };
    }

    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Filter out ResizeObserver errors before logging
    if (error.message && (
      error.message.includes('ResizeObserver loop completed with undelivered notifications') ||
      error.message.includes('ResizeObserver loop limit exceeded') ||
      error.message.includes('ResizeObserver loop') ||
      error.stack?.includes('ResizeObserver')
    )) {
      console.warn('ResizeObserver error caught and suppressed:', error.message);
      return;
    }

    // Log error to monitoring service in production
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // In production, you would send this to your error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      // errorReportingService.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorReport = {
      id: errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In production, send this to your support system
    console.log('Error Report:', errorReport);
    
    // For now, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => alert('Error report copied to clipboard. Please share this with support.'))
      .catch(() => alert('Please manually copy the error details from the console.'));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent {...this.state} />;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="glass-panel max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-500/10 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. This error has been logged.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <Bug className="h-4 w-4 text-amber-500" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="text-sm font-mono bg-muted/50 p-2 rounded border">
                    {this.state.error?.message || 'Unknown error occurred'}
                  </div>
                  {this.state.errorId && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Error ID: {this.state.errorId}
                    </p>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">What can you do?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Try refreshing the page or going back</li>
                  <li>• Check if the issue persists after trying again</li>
                  <li>• Contact support if the problem continues</li>
                  <li>• Your work is automatically saved every 30 seconds</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                <Button onClick={this.handleReportError} variant="outline" size="sm">
                  <Bug className="h-4 w-4 mr-2" />
                  Report Error
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    Developer Details (Development Mode)
                  </summary>
                  <div className="text-xs font-mono bg-muted/50 p-3 rounded border overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{this.state.error.stack}</pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
