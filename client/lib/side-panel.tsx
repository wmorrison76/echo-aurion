/**
 * iter210 · Shared <SidePanel /> primitive (audit recommendation FE-4).
 *
 * EchoViewerDrawer, ConventionEditor, Group Resume editor, BEO editor, and the
 * upcoming EchoWaste capture review all hand-roll the same fixed-inset
 * backdrop + right-aligned aside. This is the single source of truth.
 *
 * Usage::
 *
 *   <SidePanel open={open} onClose={() => setOpen(false)} title="Echo Viewer">
 *     <p>whatever…</p>
 *   </SidePanel>
 */
import React from "react";
import { X } from "lucide-react";

export type SidePanelProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Bytes of max width on desktop — defaults to 42rem (672px). */
  maxWidth?: string;
  children: React.ReactNode;
  /** Stacked above normal modals so it always wins. */
  zIndex?: number;
  /** Extra buttons (e.g. refresh) rendered left of the close button. */
  headerActions?: React.ReactNode;
  /** data-testid for the outer container (default "side-panel"). */
  testId?: string;
  /** When true, clicking the backdrop closes the panel. Default true. */
  dismissOnBackdrop?: boolean;
};

export default function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = "42rem",
  children,
  zIndex = 110,
  headerActions,
  testId = "side-panel",
  dismissOnBackdrop = true,
}: SidePanelProps) {
  // Escape key handler
  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex"
      style={{ zIndex, pointerEvents: "auto" }}
      data-testid={testId}
    >
      <div
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={dismissOnBackdrop ? onClose : undefined}
        data-testid={`${testId}-backdrop`}
      />
      <aside
        className="w-full h-full overflow-y-auto border-l text-slate-100"
        style={{
          maxWidth,
          background: "rgb(2 6 23)",
          borderLeftColor: "rgba(148,163,184,0.15)",
          fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        {(title || headerActions) && (
          <header className="sticky top-0 z-10 flex items-start justify-between gap-3 p-5 bg-gradient-to-b from-slate-950 to-slate-950/90 border-b border-slate-800 backdrop-blur-md">
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-xl font-light truncate">{title}</h2>}
              {subtitle && (
                <div className="text-[11px] text-slate-500 mt-1">{subtitle}</div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <button
                data-testid={`${testId}-close`}
                onClick={onClose}
                className="p-2 rounded-md hover:bg-slate-800 text-slate-400"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>
        )}
        <div className="p-5">{children}</div>
      </aside>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// iter212 · <CenterDialog /> — sibling primitive for center-modal patterns
// used by ConventionEditor, ConventionImportDrawer, Group Resume section
// editor, ResumeImportDrawer, and the BEO editor dialog. Replaces hand-rolled
// `<div className="fixed inset-0 z-[99950] flex items-center justify-center"` shells.
// ═══════════════════════════════════════════════════════════════════════════
export type CenterDialogProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: string;      // default "32rem"
  minHeight?: string;     // optional
  zIndex?: number;        // default 99950 (matches pre-iter212 stacking)
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  testId?: string;
  dismissOnBackdrop?: boolean;
  /** When provided, renders a <form> wrapper so Enter submits. */
  onSubmit?: (e: React.FormEvent) => void;
};

export function CenterDialog({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = "32rem",
  minHeight,
  zIndex = 99950,
  children,
  headerActions,
  testId = "center-dialog",
  dismissOnBackdrop = true,
  onSubmit,
}: CenterDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const Inner: any = onSubmit ? "form" : "div";

  return (
    <div
      data-testid={testId}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex, background: "rgba(0,0,0,0.6)" }}
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <Inner
        className="w-full rounded-xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth, minHeight, fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        {(title || headerActions) && (
          <header className="flex items-start justify-between gap-3 p-4 border-b border-slate-800">
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-base font-semibold truncate">{title}</h2>}
              {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {headerActions}
              <button
                type="button"
                data-testid={`${testId}-close`}
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>
        )}
        <div className="p-5 overflow-y-auto">{children}</div>
      </Inner>
    </div>
  );
}
