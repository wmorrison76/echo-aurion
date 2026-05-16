/**
 * MaestroBQT Module - Simplified Entry Point
 * Minimal wrapper that defers complex initialization until after module load
 */

import React from "react";

// Lazy load the actual module to prevent initialization errors during import
const MaestroBQTModule = lazy(async () => {
  try {
    // Dynamic import with explicit path
    const module = await import("./index-full");
    return { default: module.default || module.MaestroBQTModule || module };
  } catch (error) {
    console.error("[MaestroBQT] Failed to load module:", error);
    // Return fallback component
    return {
      default: () => (
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Failed to Load MaestroBQT
          </h3>
          <p className="text-sm text-foreground/70 mb-4">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Reload Page
          </button>
        </div>
      ),
    };
  }
});

// Simple wrapper component - minimal initialization
export default function MaestroBQTWrapper(props: any) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-foreground/60">Loading MaestroBQT...</p>
          </div>
        </div>
      }
    >
      <MaestroBQTModule {...props} />
    </Suspense>
  );
}
