import React from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2, Trash2, Copy, Layers, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onClearAll?: () => void;
  onInsertOrb?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  className?: string;
}

export default function CanvasToolbar({
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onClearAll,
  onInsertOrb,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  className,
}: CanvasToolbarProps) {
  return (
    <div
      className={cn(
        "absolute top-4 left-4 z-40 flex items-center gap-2 p-3",
        "bg-card/90 backdrop-blur-lg border border-primary/30 rounded-lg",
        "shadow-lg hover:shadow-xl transition-shadow",
        className
      )}
    >
      {/* History Controls */}
      <div className="flex items-center gap-1 border-r border-primary/20 pr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="h-8 w-8"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="h-8 w-8"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center gap-1 border-r border-primary/20 pr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDuplicate}
          disabled={!hasSelection}
          title="Duplicate (Ctrl+D)"
          className="h-8 w-8"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={!hasSelection}
          title="Delete (Del)"
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Insert Controls */}
      <div className="flex items-center gap-1 border-r border-primary/20 pr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onInsertOrb}
          title="Insert Orb"
          className="h-8 w-8"
        >
          <Layers className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearAll}
          title="Clear all"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
      </div>

      {/* Info */}
      <div className="flex items-center gap-2 pl-2">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {hasSelection ? "1 selected" : "Select element"}
        </span>
      </div>
    </div>
  );
}
