import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Search } from "lucide-react";
import {
  useKeyboardShortcuts,
  DefaultShortcuts,
} from "@/hooks/useKeyboardShortcuts";
export interface ShortcutItem {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  category?: string;
}
interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts?: ShortcutItem[];
}
export function KeyboardShortcutsDialog({
  isOpen,
  onOpenChange,
  shortcuts: customShortcuts,
}: KeyboardShortcutsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredShortcuts, setFilteredShortcuts] = useState<ShortcutItem[]>(
    [],
  );
  const defaultShortcutsList: ShortcutItem[] = Object.entries(
    DefaultShortcuts,
  ).map(([key, shortcut]) => ({
    ...shortcut,
    category: categorizeShortcut(key),
  }));
  const allShortcuts = customShortcuts || defaultShortcutsList;
  useEffect(() => {
    const filtered = allShortcuts.filter(
      (shortcut) =>
        shortcut.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        shortcut.key.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredShortcuts(filtered);
  }, [searchQuery, allShortcuts]);
  const renderKeyCombo = (shortcut: ShortcutItem) => {
    const keys = [];
    if (shortcut.ctrl) keys.push("Ctrl");
    if (shortcut.shift) keys.push("Shift");
    if (shortcut.alt) keys.push("Alt");
    if (shortcut.meta) keys.push("Cmd");
    keys.push(shortcut.key);
    return keys.join(" + ");
  };
  const groupedShortcuts = filteredShortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, ShortcutItem[]>,
  );
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {" "}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle className="flex items-center gap-2">
            {" "}
            <Keyboard className="w-5 h-5" /> Keyboard Shortcuts{" "}
          </DialogTitle>{" "}
          <DialogDescription>
            {" "}
            Master these shortcuts to work faster in the layout editor{" "}
          </DialogDescription>{" "}
        </DialogHeader>{" "}
        <div className="space-y-4">
          {" "}
          <div className="relative">
            {" "}
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />{" "}
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />{" "}
          </div>{" "}
          {Object.entries(groupedShortcuts).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {" "}
              No shortcuts found matching"{searchQuery}"{" "}
            </div>
          ) : (
            <div className="space-y-6">
              {" "}
              {Object.entries(groupedShortcuts).map(([category, items]) => (
                <div key={category}>
                  {" "}
                  <h3 className="font-semibold text-sm text-foreground mb-3 capitalize">
                    {" "}
                    {category}{" "}
                  </h3>{" "}
                  <div className="grid gap-3 md:grid-cols-2">
                    {" "}
                    {items.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        {" "}
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          {shortcut.description}{" "}
                        </span>{" "}
                        <Badge
                          variant="secondary"
                          className="ml-2 font-mono text-xs whitespace-nowrap"
                        >
                          {" "}
                          {renderKeyCombo(shortcut)}{" "}
                        </Badge>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </div>{" "}
        <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
          {" "}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {" "}
            Close{" "}
          </Button>{" "}
        </div>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
function categorizeShortcut(key: string): string {
  if (["SAVE", "LOAD", "EXPORT_PNG"].includes(key)) return "File";
  if (["UNDO", "REDO", "DELETE", "DUPLICATE"].includes(key)) return "Editing";
  if (["TOGGLE_GRID", "TOGGLE_HELPERS", "FIT_VIEW", "RESET_VIEW"].includes(key))
    return "View";
  if (["FOCUS_SEARCH", "HELP", "ESCAPE"].includes(key)) return "Navigation";
  return "Other";
}
