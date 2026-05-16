import React, { useState, useCallback } from "react";
import type { CanvasState } from "./types";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutGrid, FileText, X } from "lucide-react";

interface AISuggestionsPanelProps {
  canvasState: CanvasState;
  onApplyPartialState: (update: Partial<CanvasState>) => void;
  readOnly?: boolean;
}

function buildSummary(state: CanvasState): string {
  const parts: string[] = [];
  if (state.stickyNotes.length) {
    parts.push("Sticky notes:\n" + state.stickyNotes.map((n) => `• ${n.text || "(empty)"}`).join("\n"));
  }
  if (state.texts.length) {
    parts.push("Text:\n" + state.texts.map((t) => `• ${t.text}`).join("\n"));
  }
  if (state.shapes.length) {
    parts.push(`Shapes: ${state.shapes.length} item(s)`);
  }
  if (parts.length === 0) return "No content to summarize yet. Add sticky notes or text.";
  return parts.join("\n\n");
}

function suggestGridLayout(state: CanvasState): Partial<CanvasState> {
  const notes = [...state.stickyNotes];
  if (notes.length === 0) return {};
  const pad = 24;
  const cols = Math.ceil(Math.sqrt(notes.length));
  const width = notes[0]?.width ?? 180;
  const height = notes[0]?.height ?? 140;
  const startX = 80;
  const startY = 80;
  const stickyNotes = notes.map((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      ...n,
      x: startX + col * (width + pad),
      y: startY + row * (height + pad),
    };
  });
  return { stickyNotes };
}

export function AISuggestionsPanel({
  canvasState,
  onApplyPartialState,
  readOnly = false,
}: AISuggestionsPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleSummarize = useCallback(() => {
    setSummary(buildSummary(canvasState));
  }, [canvasState]);

  const handleSuggestLayout = useCallback(() => {
    const update = suggestGridLayout(canvasState);
    if (Object.keys(update).length) onApplyPartialState(update);
    setShowPanel(false);
  }, [canvasState, onApplyPartialState]);

  if (readOnly) return null;

  return (
    <>
      <div className="absolute top-3 left-3 z-30">
        <Button
          onClick={() => setShowPanel(true)}
          variant="outline"
          size="sm"
          className="gap-2 rounded-lg border-purple-400/30 hover:border-purple-400 text-purple-600 dark:text-purple-400"
        >
          <Sparkles size={16} />
          AI
        </Button>
      </div>
      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowPanel(false); setSummary(null); }}>
          <div className="bg-background border border-border rounded-lg shadow-2xl p-6 max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">AI Suggestions</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowPanel(false); setSummary(null); }}><X size={18} /></Button>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={handleSummarize}>
                <FileText size={16} />
                Summarize board
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={handleSuggestLayout} disabled={canvasState.stickyNotes.length === 0}>
                <LayoutGrid size={16} />
                Suggest layout (grid stickies)
              </Button>
            </div>
            {summary != null && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border overflow-y-auto flex-1 min-h-0">
                <p className="text-sm text-foreground whitespace-pre-wrap">{summary}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
