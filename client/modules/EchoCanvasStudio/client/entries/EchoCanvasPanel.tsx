import React, { Suspense, lazy } from "react";

const EchoCanvasEditor = lazy(() =>
  import("../pages/Editor").catch((err) => {
    console.error("[EchoCanvasPanel] Failed to load editor:", err);
    return {
      default: () => (
        <div className="p-6 text-center">
          <h3 className="font-semibold text-red-500 mb-2">
            Failed to Load Echo Canvas
          </h3>
          <p className="text-sm text-muted-foreground">
            {err?.message || "Unknown error"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
          >
            Reload
          </button>
        </div>
      ),
    };
  }),
);

export default function EchoCanvasPanel() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-full py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Loading Echo Canvas...
            </p>
          </div>
        </div>
      }
    >
      <EchoCanvasEditor />
    </Suspense>
  );
}
