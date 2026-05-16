/**
 * LUCCA Dashboard - Main entry point
 *
 * This component serves as the primary dashboard, integrating:
 * 1. The imported LUCCA project as the main UI
 * 2. EchoCoder tools accessible from Studio/Settings
 * 3. Seamless experience between both systems
 *
 * When a project is imported, this component will load the imported project's
 * main Board component instead of the EchoCoder Board.
 */

import { Suspense, useState, useEffect, lazy, Component, ReactNode } from "react";
import Board from "./Board";

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading LUCCA Dashboard...</p>
      </div>
    </div>
  );
}

/**
 * Error Boundary component to catch rendering errors
 */
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: () => ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: () => ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error("ErrorBoundary caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("Error details:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">{this.state.error?.message || "Unknown error"}</p>
            <button
              onClick={() => window.location.href = "/"}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * LuccaDashboard component
 *
 * This component dynamically loads the imported LUCCCA project's board.
 * If no project is imported, falls back to EchoCoder Board.
 */
export default function LuccaDashboard() {
  const [importedBoard, setImportedBoard] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("LuccaDashboard: Component mounted");
    const loadImportedProject = async () => {
      try {
        console.log("LuccaDashboard: Starting to load imported project...");
        // Check if an imported project session exists
        const importSession = sessionStorage.getItem("import.session.current");

        if (importSession) {
          try {
            const session = JSON.parse(importSession);
            console.log("LUCCA: Imported project session detected", session.id);

            // Try to load the LUCCCA app component
            // Expected structure: frontend/src/app.jsx which loads:
            // - sidebar.jsx
            // - board.jsx
            // - backboard.jsx
            // - glowydesk.jsx

            let appModule: any = null;
            const basePath = `../imported/${session.id}`;

            // Try different paths where app.jsx might be located
            const appPaths = [
              `${basePath}/src/app.jsx`,
              `${basePath}/src/App.jsx`,
              `${basePath}/app.jsx`,
              `${basePath}/App.jsx`,
              `${basePath}/frontend/src/app.jsx`,
              `${basePath}/frontend/src/App.jsx`,
            ];

            for (const appPath of appPaths) {
              try {
                console.log(`LUCCA: Attempting to load from ${appPath}`);
                // @vite-ignore
                appModule = await import(appPath);
                console.log(`LUCCA: Successfully loaded app from ${appPath}`);
                break;
              } catch (err) {
                console.debug(`LUCCA: Failed to load from ${appPath}:`, err);
                continue;
              }
            }

            if (appModule && appModule.default) {
              console.log("LUCCA: Setting imported board component");
              setImportedBoard(() => appModule.default);
            } else {
              console.warn(
                "LUCCA: Could not find app component, checked paths:",
                appPaths
              );
              setError(null);
            }
          } catch (parseErr) {
            console.log("LUCCA: Invalid import session, using EchoCoder");
          }
        } else {
          console.log("LUCCA: No imported project, using EchoCoder dashboard");
        }
      } catch (err) {
        console.error("LUCCA: Error loading imported project:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        console.log("LuccaDashboard: Loading complete");
        setIsLoading(false);
      }
    };

    loadImportedProject();
  }, []);

  if (isLoading) {
    return <LoadingFallback />;
  }

  // If we have an imported board, render it
  if (importedBoard) {
    const ImportedBoard = importedBoard;
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <ImportedBoard />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Fallback to EchoCoder Board
  console.log("LUCCA: Rendering EchoCoder Board");
  return <ErrorBoundary><Board /></ErrorBoundary>;
}
