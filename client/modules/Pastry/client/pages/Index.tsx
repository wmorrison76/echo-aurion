/**
 * Minimal shell so the panel’s first chunk does not pull in @/ or context.
 * Full UI (providers + sections) is lazy-loaded from IndexContent.
 */
import React from "react";

const IndexContent = React.lazy(() =>
  import("./IndexContent").catch((err) => {
    console.error("[Pastry] Failed to load IndexContent", err);
    return {
      default: () => (
        <div
          className="flex flex-col items-center justify-center flex-1 min-h-[200px] p-6"
          style={{ backgroundColor: "#b45309", color: "#fff" }}
        >
          <p className="font-bold mb-2">Pastry failed to load</p>
          <p className="text-sm mb-4">
            {err?.message || "Importing a module script failed."}
          </p>
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-white text-[#b45309] text-sm font-medium"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ),
    };
  }),
);

const LoadingFallback = () => (
  <div
    className="flex items-center justify-center w-full min-h-[200px]"
    style={{ backgroundColor: "#d97706", color: "#fff" }}
  >
    <p className="text-sm font-medium">Loading Pastry…</p>
  </div>
);

export default function Index() {
  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <IndexContent />
    </React.Suspense>
  );
}
