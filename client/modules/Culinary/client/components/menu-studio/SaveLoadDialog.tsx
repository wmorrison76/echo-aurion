import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Trash2, Clock, X, AlertCircle } from "lucide-react";
import type { MenuDesignData } from "@/lib/menu-studio-storage";

type SaveLoadDialogProps = {
  onSave: (name: string) => void;
  onLoad: (design: MenuDesignData) => void;
  savedDesigns: MenuDesignData[];
  onDeleteDesign: (id: string) => void;
  currentName: string;
  isOpen: boolean;
  onClose: () => void;
};

export function SaveLoadDialog({
  onSave,
  onLoad,
  savedDesigns,
  onDeleteDesign,
  currentName,
  isOpen,
  onClose,
}: SaveLoadDialogProps) {
  const [activeTab, setActiveTab] = useState<"save" | "load">("load");
  const [designName, setDesignName] = useState(currentName);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);

  if (!isOpen) return null;

  const existingDesignWithName = savedDesigns.find(d => d.name === designName.trim());

  const handleSave = () => {
    if (!designName.trim()) return;

    // Check if design name already exists
    if (existingDesignWithName && !showConfirmOverwrite) {
      setShowConfirmOverwrite(true);
      return;
    }

    onSave(designName);
    setShowConfirmOverwrite(false);
    onClose();
  };

  const handleLoad = (design: MenuDesignData) => {
    // Validate design before loading
    try {
      if (!design || typeof design !== "object") {
        throw new Error("Invalid design object");
      }
      if (!design.id || !design.name) {
        throw new Error("Design is missing required properties (id or name)");
      }
      onLoad(design);
      onClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to load design:", errorMsg);
      // Fallback: reload designs from storage
      window.location.reload();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] max-h-[700px] w-full max-w-2xl flex-col gap-4 rounded-3xl border border-slate-300/50 dark:border-slate-700/60 bg-white dark:bg-slate-950 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {activeTab === "save" ? "Save design" : "Load design"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {activeTab === "save"
                ? "Save your current design to browser storage"
                : `${savedDesigns.length} design${savedDesigns.length !== 1 ? "s" : ""} saved`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 px-6">
          <button
            onClick={() => setActiveTab("load")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition",
              activeTab === "load"
                ? "border-[#c8a97e] text-[#c8a97e] dark:text-[#c8a97e]"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Load
          </button>
          <button
            onClick={() => setActiveTab("save")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition",
              activeTab === "save"
                ? "border-[#c8a97e] text-[#c8a97e] dark:text-[#c8a97e]"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Save
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-6">
          {activeTab === "save" ? (
            <div className="flex flex-col gap-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Design name
                </label>
                <Input
                  value={designName}
                  onChange={(e) => {
                    setDesignName(e.target.value);
                    setShowConfirmOverwrite(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  placeholder="Enter design name..."
                  className="mt-2"
                  autoFocus
                />
              </div>
              {existingDesignWithName && showConfirmOverwrite && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Design already exists
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                      "{designName}" will be overwritten with the current design.
                    </p>
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  💾 Your design will be automatically saved to this browser's local storage. You can load it anytime from the Load tab.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              {savedDesigns.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-center py-8">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      No saved designs yet
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Save a design to get started
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-4 pr-4">
                  {savedDesigns.map((design) => (
                    <button
                      key={design.id}
                      onClick={() => handleLoad(design)}
                      className="group w-full rounded-xl border border-slate-300/50 dark:border-slate-700/60 bg-white dark:bg-slate-900/30 p-4 text-left transition hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {design.name}
                          </p>
                          <div className="mt-1 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(design.updatedAt)}
                            </span>
                            <span>{design.pageSize?.width}x{design.pageSize?.height}px</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDesign(design.id);
                          }}
                          className="opacity-0 transition group-hover:opacity-100 text-red-500 hover:text-red-600"
                          aria-label="Delete design"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowConfirmOverwrite(false);
              onClose();
            }}
          >
            Cancel
          </Button>
          {activeTab === "save" && (
            <Button
              onClick={handleSave}
              disabled={!designName.trim()}
              variant={showConfirmOverwrite ? "destructive" : "default"}
            >
              {showConfirmOverwrite ? "Overwrite design" : "Save design"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
