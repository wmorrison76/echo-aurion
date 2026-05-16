// File: src/components/RescueShell.jsx
import React from "react";

/**
 * RescueShell: Global error boundary for LUCCCA
 * Captures UI errors, logs them, and shows fallback UI
 */

class RescueShell extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 LUCCCA RescueShell caught an error:", error, errorInfo);

    const errorLog = {
      message: error.toString(),
      location: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
    };

    // Simple local log — can swap for Vault or backend later
    localStorage.setItem("luccca_error_log", JSON.stringify(errorLog));
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 text-red-700 p-8">
          <h2 className="text-2xl font-bold">🚧 LUCCCA encountered a problem</h2>
          <p className="mt-2">We've logged the error and will continue rendering what we can.</p>
          <pre className="mt-4 bg-red-100 p-2 rounded text-sm overflow-auto">
            {this.state.errorInfo?.componentStack || "No component stack available"}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RescueShell;
