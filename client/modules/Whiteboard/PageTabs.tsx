import React, { useState } from "react";
import { Plus, X, Edit2, Check } from "lucide-react";
import { cn } from "@/lib/glass";
export interface WhiteboardPage {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: number;
}
interface PageTabsProps {
  pages: WhiteboardPage[];
  currentPageId: string;
  onPageChange: (pageId: string) => void;
  onPageCreate: () => void;
  onPageDelete: (pageId: string) => void;
  onPageRename: (pageId: string, newName: string) => void;
  onPageDuplicate?: (pageId: string) => void;
  readOnly?: boolean;
}
export const PageTabs: React.FC<PageTabsProps> = ({
  pages,
  currentPageId,
  onPageChange,
  onPageCreate,
  onPageDelete,
  onPageRename,
  onPageDuplicate,
  readOnly = false,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);
  const handleRenameStart = (page: WhiteboardPage) => {
    setRenamingId(page.id);
    setRenameValue(page.name);
  };
  const handleRenameSave = (pageId: string) => {
    if (renameValue.trim()) {
      onPageRename(pageId, renameValue.trim());
    }
    setRenamingId(null);
  };
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-secondary/20 border-b border-border/20 overflow-x-auto">
      {" "}
      {/* Page Tabs */}{" "}
      <div className="flex gap-1 flex-1 overflow-x-auto">
        {" "}
        {pages.map((page) => (
          <div
            key={page.id}
            onMouseEnter={() => setHoveredPageId(page.id)}
            onMouseLeave={() => setHoveredPageId(null)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all whitespace-nowrap",
              currentPageId === page.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary/50 text-foreground/70 hover:bg-secondary/70",
            )}
          >
            {" "}
            {renamingId === page.id ? (
              /* Rename Input */ <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSave(page.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSave(page.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                autoFocus
                className="bg-background text-foreground px-2 py-1 rounded text-xs border border-border/50 focus:border-primary outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              /* Page Name */ <button
                onClick={() => onPageChange(page.id)}
                className="flex-1 text-left truncate"
              >
                {" "}
                {page.name}{" "}
              </button>
            )}{" "}
            {/* Hover Actions */}{" "}
            {hoveredPageId === page.id && !renamingId && !readOnly && (
              <div className="flex gap-1">
                {" "}
                {pages.length > 1 && (
                  <button
                    onClick={() => handleRenameStart(page)}
                    className="p-1 hover:bg-background/50 rounded transition-colors"
                    title="Rename page"
                  >
                    {" "}
                    <Edit2 size={12} />{" "}
                  </button>
                )}{" "}
                {pages.length > 1 && (
                  <button
                    onClick={() => onPageDelete(page.id)}
                    className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors"
                    title="Delete page"
                  >
                    {" "}
                    <X size={12} />{" "}
                  </button>
                )}{" "}
              </div>
            )}{" "}
            {/* Rename Confirm */}{" "}
            {renamingId === page.id && (
              <button
                onClick={() => handleRenameSave(page.id)}
                className="p-1 hover:bg-background/50 rounded transition-colors"
                title="Save rename"
              >
                {" "}
                <Check size={12} />{" "}
              </button>
            )}{" "}
          </div>
        ))}{" "}
      </div>{" "}
      {/* Add Page Button */}{" "}
      {!readOnly && (
        <button
          onClick={onPageCreate}
          className="flex-shrink-0 p-2 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          title="Add new page"
        >
          {" "}
          <Plus size={14} />{" "}
        </button>
      )}{" "}
    </div>
  );
};
