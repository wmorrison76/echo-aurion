import { useState, useCallback } from "react";
import { Save, Trash2, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { DesignerState } from "../hooks";

export interface DesignVersion {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  state: DesignerState;
}

interface VersioningDialogProps {
  versions: DesignVersion[];
  onSaveVersion: (name: string, description: string) => void;
  onLoadVersion: (version: DesignerVersion) => void;
  onDeleteVersion: (versionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  currentState: DesignerState;
}

export function VersioningDialog({
  versions,
  onSaveVersion,
  onLoadVersion,
  onDeleteVersion,
  isOpen,
  onClose,
  currentState,
}: VersioningDialogProps) {
  const [versionName, setVersionName] = useState("");
  const [versionDescription, setVersionDescription] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const handleSaveVersion = useCallback(() => {
    if (versionName.trim()) {
      onSaveVersion(versionName.trim(), versionDescription.trim());
      setVersionName("");
      setVersionDescription("");
    }
  }, [versionName, versionDescription, onSaveVersion]);

  const handleLoadVersion = useCallback(() => {
    if (selectedVersionId) {
      const version = versions.find((v) => v.id === selectedVersionId);
      if (version) {
        onLoadVersion(version);
        onClose();
      }
    }
  }, [selectedVersionId, versions, onLoadVersion, onClose]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl shadow-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Design Versions</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex gap-4 p-4">
          {/* Save Version Panel */}
          <div className="w-80 flex flex-col gap-4 border-r border-gray-200 dark:border-gray-700 pr-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Create New Version</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Version Name</Label>
                  <Input
                    placeholder="e.g., v1.0, Client Review, Final"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Description (optional)</Label>
                  <Textarea
                    placeholder="Notes about this version..."
                    value={versionDescription}
                    onChange={(e) => setVersionDescription(e.target.value)}
                    className="mt-1 text-sm resize-none"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSaveVersion}
                  disabled={!versionName.trim()}
                  className="w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Version
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <p className="font-semibold mb-2">Current State:</p>
              <p>{currentState.elements.length} elements</p>
              <p>{currentState.documentName}</p>
            </div>
          </div>

          {/* Versions List Panel */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-sm font-semibold">Saved Versions</h3>
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No versions saved yet. Create one to get started!
                  </p>
                ) : (
                  versions.map((version) => (
                    <div
                      key={version.id}
                      onClick={() => setSelectedVersionId(version.id)}
                      className={`p-3 rounded border-2 cursor-pointer transition-all ${
                        selectedVersionId === version.id
                          ? "border-[#c8a97e] bg-amber-50 dark:bg-neutral-950/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{version.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(version.timestamp)}
                          </p>
                          {version.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                              {version.description}
                            </p>
                          )}
                          <Badge variant="outline" className="text-xs mt-2">
                            {version.state.elements.length} elements
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteVersion(version.id);
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {selectedVersionId && (
              <Button onClick={handleLoadVersion} className="w-full gap-2">
                <Clock className="h-4 w-4" />
                Load This Version
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
