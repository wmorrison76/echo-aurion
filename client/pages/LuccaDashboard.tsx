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

import { Suspense, useState, useEffect, lazy } from "react";
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
    const loadImportedProject = async () => {
      try {
        // Dynamic imports with variable paths cause Vite memory issues
        // This feature is legacy and optional - skip it in dev mode
        // In production, re-enable if needed by using static imports instead

        console.log("LUCCA: Imported project loading disabled (use static imports if needed)");
        setError(null);
      } catch (err) {
        console.error("LUCCA: Error loading imported project:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
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
      <Suspense fallback={<LoadingFallback />}>
        <ImportedBoard />
      </Suspense>
    );
  }

  // Fallback to EchoCoder Board
  console.log("LUCCA: Rendering EchoCoder Board");
  return <Board />;
}
