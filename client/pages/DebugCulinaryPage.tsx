/**
 * Standalone Culinary debug page.
 * Renders the Culinary module in a separate full-page view (no panel shell)
 * to isolate rendering issues. Open: /debug/culinary
 */
import React, { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CulinaryModule = lazy(() =>
  import("@/modules/Culinary").catch((err) => {
    console.error("[DebugCulinary] Failed to load Culinary module:", err);
    throw err;
  })
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full min-h-[400px] bg-amber-950/30">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-amber-500/50 border-t-amber-400 mb-4" />
      <p className="text-amber-200">Loading Culinary module…</p>
    </div>
  </div>
);

export default function DebugCulinaryPage() {
  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Minimal header */}
      <header className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
          Culinary (standalone debug)
        </span>
      </header>

      {/* Full-height Culinary content */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Suspense fallback={<LoadingFallback />}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <CulinaryModule />
          </div>
        </Suspense>
      </main>
    </div>
  );
}
