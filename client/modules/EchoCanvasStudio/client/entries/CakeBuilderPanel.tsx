import React, { Suspense, lazy } from "react";

const CakeBuilderModule = lazy(() =>
  import("../modules/cake-builder").catch((err) => {
    console.error("[CakeBuilderPanel] Failed to load module:", err);
    return {
      default: () => (
        <div className="p-6 text-center">
          <h3 className="font-semibold text-red-500 mb-2">
            Failed to Load Cake Builder
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

export default function CakeBuilderPanel() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-full py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Loading Cake Builder...
            </p>
          </div>
        </div>
      }
    >
      <CakeBuilderModule />
    </Suspense>
  );
}
