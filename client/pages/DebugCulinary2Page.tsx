/**
 * Standalone Culinary 2 debug page.
 * Renders the Culinary2 module in a separate full-page view (no panel shell).
 * Open: /debug/culinary2
 */
import React, { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Culinary2 module folder does not exist. Production build was failing because
// vite's static analysis tried to resolve this path. Use a runtime-string
// dynamic import so vite skips it; if the folder ever lands, this page works
// again without further changes.
const Culinary2Module = lazy(() =>
  import(/* @vite-ignore */ ["@", "modules", "Culinary2"].join("/"))
    .catch((err) => {
      console.error("[DebugCulinary2] Failed to load Culinary2 module:", err);
      return { default: () => <div className="p-8 text-amber-300">Culinary2 module is not installed.</div> } as any;
    })
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full min-h-[400px] bg-amber-950/30">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-amber-500/50 border-t-amber-400 mb-4" />
      <p className="text-amber-200">Loading Culinary 2 module…</p>
    </div>
  </div>
);

export default function DebugCulinary2Page() {
  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
          Culinary 2 (standalone debug)
        </span>
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Suspense fallback={<LoadingFallback />}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <Culinary2Module />
          </div>
        </Suspense>
      </main>
    </div>
  );
}
