import React from "react";

/**
 * CakeBuilderSection (Safe Stub)
 * --------------------------------
 * This section previously lazy-loaded EchoCanvasStudio's CakeBuilderPanel.
 * In the current app state, that import is throwing a runtime error ("No default value"),
 * which causes the entire Pastry panel to fall into the error boundary.
 *
 * This stub keeps the Pastry module stable while EchoCanvasStudio is repaired.
 *
 * Re-enable later by replacing this file with the original lazy loader, or by
 * feature-gating the external import once EchoCanvasStudio is confirmed healthy.
 */

export default function CakeBuilderSection() {
  return (
    <div className="p-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Cake Builder (Temporarily Disabled)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This section was disabled to keep the Pastry panel stable while the
          external EchoCanvasStudio Cake Builder module is being repaired.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => alert("Cake Builder is disabled until EchoCanvasStudio is repaired.")}
            className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
          >
            OK
          </button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Dev note: restore the original lazy import when
          <code className="mx-1 px-1 py-0.5 rounded bg-muted">EchoCanvasStudio/client/entries/CakeBuilderPanel</code>
          exports a valid default component and no longer throws at runtime.
        </p>
      </div>
    </div>
  );
}
