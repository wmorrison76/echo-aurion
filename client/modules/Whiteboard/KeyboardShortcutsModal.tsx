import React, { useState, useEffect } from "react";
import { Search, X, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";

interface Shortcut {
  category: string;
  action: string;
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    category: "Tools",
    action: "Select tool",
    keys: ["V", "1"],
    description: "Switch to select tool",
  },
  {
    category: "Tools",
    action: "Pen tool",
    keys: ["P", "2"],
    description: "Switch to pen tool",
  },
  {
    category: "Tools",
    action: "Eraser tool",
    keys: ["E", "3"],
    description: "Switch to eraser tool",
  },
  {
    category: "Tools",
    action: "Rectangle tool",
    keys: ["R", "4"],
    description: "Create a rectangle",
  },
  {
    category: "Tools",
    action: "Circle tool",
    keys: ["O", "5"],
    description: "Create a circle",
  },
  {
    category: "Tools",
    action: "Text tool",
    keys: ["T", "6"],
    description: "Insert text",
  },
  {
    category: "Tools",
    action: "Sticky note",
    keys: ["S", "7"],
    description: "Insert a sticky note",
  },

  {
    category: "Edit",
    action: "Undo",
    keys: ["Ctrl", "Z"],
    description: "Undo last action",
  },
  {
    category: "Edit",
    action: "Redo",
    keys: ["Ctrl", "Shift", "Z"],
    description: "Redo last action",
  },
  {
    category: "Edit",
    action: "Copy",
    keys: ["Ctrl", "C"],
    description: "Copy selected element",
  },
  {
    category: "Edit",
    action: "Paste",
    keys: ["Ctrl", "V"],
    description: "Paste element",
  },
  {
    category: "Edit",
    action: "Delete",
    keys: ["Del", "Backspace"],
    description: "Remove selected element",
  },

  {
    category: "Canvas",
    action: "Zoom In",
    keys: ["Ctrl", "+"],
    description: "Increase zoom level",
  },
  {
    category: "Canvas",
    action: "Zoom Out",
    keys: ["Ctrl", "-"],
    description: "Decrease zoom level",
  },
  {
    category: "Canvas",
    action: "Zoom to Fit",
    keys: ["Shift", "1"],
    description: "Zoom to fit all content",
  },
  {
    category: "Canvas",
    action: "Toggle Grid",
    keys: ["G"],
    description: "Show or hide grid",
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredShortcuts, setFilteredShortcuts] =
    useState<Shortcut[]>(SHORTCUTS);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredShortcuts(SHORTCUTS);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = SHORTCUTS.filter(
      (s) =>
        s.action.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query),
    );
    setFilteredShortcuts(filtered);
  }, [searchQuery]);

  if (!isOpen) return null;

  const categories = Array.from(new Set(SHORTCUTS.map((s) => s.category)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        style={{ animation: "scale-up 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Command size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-400">
                Speed up your workflow with these hotkeys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Search shortcuts..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {categories.map((category) => {
            const items = filteredShortcuts.filter(
              (s) => s.category === category,
            );
            if (items.length === 0) return null;

            return (
              <div key={category} className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500/40" />
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-200">
                          {item.action}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {item.keys.map((key) => (
                          <kbd
                            key={key}
                            className="px-2 py-1 min-w-[24px] text-center bg-slate-700 text-slate-200 rounded border border-slate-600 shadow-sm font-mono text-[10px] font-bold"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-500 italic">No shortcuts found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-600">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">?</kbd> at
            any time to toggle this modal
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
