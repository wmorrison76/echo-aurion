import React, { ReactNode, useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorState {
  hasError: boolean;
  error: Error | null;
}

export default function ErrorBoundary({
  children,
  fallback,
  onError,
}: ErrorBoundaryProps) {
  const [state, setState] = useState<ErrorState>({
    hasError: false,
    error: null,
  });

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Error caught by boundary:", event.error);
      setState({
        hasError: true,
        error: event.error,
      });
      onError?.(event.error, { componentStack: "" });
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, [onError]);

  const reset = () => {
    setState({ hasError: false, error: null });
  };

  if (state.hasError && state.error) {
    if (fallback) {
      return fallback(state.error, reset);
    }

    return (
      <div
        style={{
          padding: "20px",
          backgroundColor: "#1a0a0a",
          border: "2px solid #d32f2f",
          borderRadius: "8px",
          color: "#ff6b6b",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <AlertTriangle size={20} color="#ff6b6b" />
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>
            Something went wrong
          </h3>
        </div>
        <div
          style={{
            backgroundColor: "#0a0a0a",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "12px",
            fontSize: "12px",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              color: "#ff9999",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            {state.error.name}: {state.error.message}
          </div>
          {state.error.stack && (
            <div
              style={{
                color: "#888",
                fontSize: "11px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {state.error.stack}
            </div>
          )}
        </div>
        <button
          onClick={reset}
          style={{
            padding: "8px 16px",
            backgroundColor: "rgba(255, 107, 107, 0.1)",
            border: "1px solid #ff6b6b",
            color: "#ff9999",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "12px",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return children;
}
