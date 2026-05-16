/**
 * Panel render diagnostic (dev-only).
 * Detects when a panel's content area has no meaningful DOM and logs details
 * to help diagnose blank-panel issues. Enable with ?panelDebug=1 or in DEV.
 */

import React, { useEffect, useRef, useState } from "react";

const DEV = import.meta.env?.DEV ?? true;

function hasMeaningfulContent(container: HTMLElement): boolean {
  if (!container) return false;
  const first = container.firstElementChild;
  if (!first) return false;
  // Consider "meaningful" if there are any elements (div, section, main, etc.)
  const count = first.querySelectorAll?.("div, section, main, article, header, nav, aside, p, span, button, a, img, svg")?.length ?? 0;
  if (count > 0) return true;
  // Or if the first child has text or a non-empty subtree
  const text = (first.textContent ?? "").trim();
  if (text.length > 0) return true;
  return false;
}

export interface PanelRenderDiagnosticProps {
  panelKey: string;
  panelTitle: string;
  children: React.ReactNode;
  /** When true, run diagnostic and show banner if content is empty. */
  enabled?: boolean;
}

export default function PanelRenderDiagnostic({
  panelKey,
  panelTitle,
  children,
  enabled = true,
}: PanelRenderDiagnosticProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [emptyReport, setEmptyReport] = useState<{
    childCount: number;
    firstChildTag: string;
    firstChildChildCount: number;
  } | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    if (!DEV || !enabled || reported.current) return;
    const t = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const first = el.firstElementChild;
      const childCount = el.childNodes?.length ?? 0;
      const firstChildTag = first?.tagName ?? "none";
      const firstChildChildCount = first?.childNodes?.length ?? 0;
      const meaningful = hasMeaningfulContent(el);

      if (!meaningful) {
        reported.current = true;
        const detail = {
          childCount,
          firstChildTag,
          firstChildChildCount,
        };
        setEmptyReport(detail);
        console.group(`🟠 [Panel Render] "${panelTitle}" (${panelKey}) – content did not render`);
        console.warn("Panel key:", panelKey);
        console.warn("Entry element: React node (panel component or fallback)");
        console.warn("Container child count:", childCount);
        console.warn("First child tag:", firstChildTag);
        console.warn("First child's child count:", firstChildChildCount);
        console.warn("This usually means: (1) the module threw before paint, (2) the root component returns null, or (3) Suspense never resolved. Check for uncaught errors above.");
        console.groupEnd();
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [panelKey, panelTitle, enabled]);

  return (
    <div ref={containerRef} className="flex flex-col flex-1 min-h-0 w-full h-full">
      {children}
      {DEV && enabled && emptyReport && (
        <div
          className="mt-2 p-3 rounded border border-amber-500/70 bg-amber-500/15 text-amber-900 dark:text-amber-200 text-xs space-y-1 flex-shrink-0"
          role="status"
        >
          <p className="font-semibold">Panel content did not render; check console.</p>
          <p>Panel: {panelKey} ({panelTitle})</p>
          <p>Container children: {emptyReport.childCount} · First child: &lt;{emptyReport.firstChildTag}&gt; with {emptyReport.firstChildChildCount} child(ren)</p>
          <p>This usually means the module threw before paint, the root returns null, or Suspense never resolved.</p>
          <button
            type="button"
            className="mt-2 px-2 py-1 rounded bg-amber-500/80 hover:bg-amber-500 text-amber-950 text-xs font-medium"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("panel-reload-requested", { detail: { panelKey } }));
            }}
          >
            Reload panel
          </button>
        </div>
      )}
    </div>
  );
}
