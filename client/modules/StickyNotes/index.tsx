/**
 * StickyNotes module – single public component for panel host.
 * Contract: panelId (string), onDelete (function) required; onUpdate, onResize optional.
 */
import React from "react";
import StickyNotePanel, { type StickyNote } from "./StickyNotePanel";

export type { StickyNote };

export interface StickyNotesModuleProps {
  /** Panel instance id; used for localStorage key `sticky-note-${panelId}` */
  panelId: string;
  /** Called when the user deletes the note / closes the panel */
  onDelete: () => void;
  /** Optional: called when note content is updated (e.g. for host sync) */
  onUpdate?: (updates: Partial<StickyNote>) => void;
  /** Optional: called when user resizes the note panel */
  onResize?: (size: { width: number; height: number }) => void;
  panelHeight?: number;
}

class StickyNotesErrorBoundary extends React.Component<
  { children: React.ReactNode; onDelete: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-muted/30 text-center">
          <p className="text-sm font-semibold text-foreground mb-1">
            Note failed to load
          </p>
          <p
            className="text-xs text-muted-foreground mb-3 max-w-[200px] truncate"
            title={this.state.error.message}
          >
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={this.props.onDelete}
            className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 mt-2"
          >
            Close
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function StickyNotesModule({
  panelId,
  onDelete,
  onUpdate,
  onResize,
}: StickyNotesModuleProps) {
  const safeOnDelete = typeof onDelete === "function" ? onDelete : () => {};
  return (
    <StickyNotesErrorBoundary onDelete={safeOnDelete}>
      <StickyNotePanel
        panelId={panelId}
        onDelete={safeOnDelete}
        onUpdate={onUpdate}
        onResize={onResize}
      />
    </StickyNotesErrorBoundary>
  );
}
