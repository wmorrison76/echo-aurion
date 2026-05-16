import React from "react";
import { ShiftCell, DayKey } from "../lib/schedule";
import { cellClipboard } from "../lib/cellClipboard";
import { Copy, Clipboard, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
interface ShiftCellInputProps {
  cell: ShiftCell;
  employeeId: string;
  day: DayKey;
  onUpdate: (cell: ShiftCell) => void;
  onDelete?: () => void;
}
export const ShiftCellInput: React.FC<ShiftCellInputProps> = ({
  cell,
  employeeId,
  day,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(cell.value);
  const [showToast, setShowToast] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleCopy = () => {
    cellClipboard.copySingleCell(cell);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };
  const handlePaste = () => {
    const pastedCell = cellClipboard.pasteIntoCell(cell);
    onUpdate(pastedCell);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };
  const handleClear = () => {
    onUpdate({
      value: "",
      range: null,
      in: "",
      out: "",
      position: "",
      breakMin: 0,
      tip: 0,
    });
  };
  const handleSave = () => {
    onUpdate({ ...cell, value: editValue });
    setIsEditing(false);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(cell.value);
    } else if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      e.preventDefault();
      handleCopy();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      e.preventDefault();
      handlePaste();
    }
  };
  return (
    <ContextMenu>
      {" "}
      <ContextMenuTrigger asChild>
        {" "}
        <div className="relative">
          {" "}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className={cn(
                "w-full px-2 py-1 border border-primary rounded",
                "text-sm bg-background",
              )}
              placeholder="e.g., 9-5, 9am-5pm"
            />
          ) : (
            <div
              onClick={() => {
                setEditValue(cell.value);
                setIsEditing(true);
              }}
              className={cn(
                "w-full px-2 py-1 rounded cursor-pointer",
                "text-sm bg-muted hover:bg-muted/80 transition-colors",
                cell.value && "bg-blue-50 dark:bg-blue-950",
                "min-h-8 flex items-center",
              )}
            >
              {" "}
              <span className="font-medium">{cell.value || "-"}</span>{" "}
              {cell.position && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({cell.position})
                </span>
              )}{" "}
            </div>
          )}{" "}
          {showToast && (
            <div className="absolute -top-8 left-0 text-xs bg-green-600 text-white px-2 py-1 rounded whitespace-nowrap z-10">
              {" "}
              ✓ Done{" "}
            </div>
          )}{" "}
        </div>{" "}
      </ContextMenuTrigger>{" "}
      <ContextMenuContent className="w-56">
        {" "}
        <ContextMenuItem onClick={handleCopy} className="flex gap-2">
          {" "}
          <Copy className="h-4 w-4" /> Copy{" "}
        </ContextMenuItem>{" "}
        {cellClipboard.hasContent() && (
          <ContextMenuItem onClick={handlePaste} className="flex gap-2">
            {" "}
            <Clipboard className="h-4 w-4" /> Paste{" "}
          </ContextMenuItem>
        )}{" "}
        <ContextMenuSeparator />{" "}
        <ContextMenuItem
          onClick={handleClear}
          className="flex gap-2 text-destructive"
        >
          {" "}
          <Trash2 className="h-4 w-4" /> Clear{" "}
        </ContextMenuItem>{" "}
        {cellClipboard.getClipboardInfo() && (
          <>
            {" "}
            <ContextMenuSeparator />{" "}
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {" "}
              {cellClipboard.getClipboardInfo()}{" "}
            </div>{" "}
          </>
        )}{" "}
      </ContextMenuContent>{" "}
    </ContextMenu>
  );
}; /** * Standalone copy/paste button bar for row operations */
interface RowOperationsProps {
  employeeId: string;
  shifts: Record<string, ShiftCell>;
  onCopyRow: () => void;
  onPasteRow: () => void;
  onClearRow: () => void;
}
export const RowOperations: React.FC<RowOperationsProps> = ({
  employeeId,
  shifts,
  onCopyRow,
  onPasteRow,
  onClearRow,
}) => {
  return (
    <div className="flex gap-1 px-2 py-1 border rounded bg-muted/50">
      {" "}
      <button
        onClick={onCopyRow}
        title="Copy entire row"
        className="p-1 hover:bg-muted rounded text-xs"
      >
        {" "}
        <Copy className="h-3.5 w-3.5" />{" "}
      </button>{" "}
      {cellClipboard.hasContent() && (
        <button
          onClick={onPasteRow}
          title="Paste to entire row"
          className="p-1 hover:bg-muted rounded text-xs"
        >
          {" "}
          <Clipboard className="h-3.5 w-3.5" />{" "}
        </button>
      )}{" "}
      <button
        onClick={onClearRow}
        title="Clear entire row"
        className="p-1 hover:bg-muted rounded text-xs text-destructive"
      >
        {" "}
        <Trash2 className="h-3.5 w-3.5" />{" "}
      </button>{" "}
    </div>
  );
};
