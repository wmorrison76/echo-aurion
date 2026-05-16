import { Component, ReactNode, ErrorInfo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureException } from "@/lib/sentry-init";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    captureException(error, {
      source: "EchoAurum.ErrorBoundary",
      componentStack: errorInfo?.componentStack,
    });
    this.props.onError?.(error, errorInfo);
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen bg-background">
            {" "}
            <div className="text-center space-y-4 p-6 rounded-lg border border-red-200 bg-red-50 max-w-md">
              {" "}
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />{" "}
              <h2 className="text-xl font-bold text-red-900">
                {" "}
                Something went wrong{" "}
              </h2>{" "}
              <p className="text-sm text-red-800">
                {" "}
                {this.state.error?.message ||
                  "An unexpected error occurred"}{" "}
              </p>{" "}
              <details className="text-xs text-red-700 text-left bg-background rounded p-2 border border-red-100">
                {" "}
                <summary className="cursor-pointer font-semibold">
                  {" "}
                  Details{" "}
                </summary>{" "}
                <pre className="mt-2 overflow-auto max-h-32">
                  {" "}
                  {this.state.error?.stack}{" "}
                </pre>{" "}
              </details>{" "}
              <Button
                onClick={this.handleReset}
                className="gap-2 bg-red-600 hover:bg-red-700 w-full"
              >
                {" "}
                <RefreshCw className="w-4 h-4" /> Try again{" "}
              </Button>{" "}
            </div>{" "}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
