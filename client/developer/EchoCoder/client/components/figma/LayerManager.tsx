import { useState } from "react";
import { canvasEngine, type CanvasElement } from "@/services/CanvasEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Lock, LockOpen, Layers, Trash2 } from "lucide-react";

interface LayerManagerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function LayerManager({
  selectedIds,
  onSelectionChange,
}: LayerManagerProps) {
  const state = canvasEngine.getState();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const toggleGroupExpansion = (id: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedGroups(newExpanded);
  };

  const handleLayerClick = (id: string, ctrlKey: boolean) => {
    if (ctrlKey) {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((sid) => sid !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    } else {
      onSelectionChange([id]);
    }
  };

  const handleRename = (id: string, newName: string) => {
    canvasEngine.updateElement(id, { name: newName });
  };

  const handleToggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const element = state.elements.find((el) => el.id === id);
    if (element) {
      canvasEngine.updateElement(id, { visible: !element.visible });
    }
  };

  const handleToggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const element = state.elements.find((el) => el.id === id);
    if (element) {
      canvasEngine.updateElement(id, { locked: !element.locked });
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    canvasEngine.deleteElement(id);
  };

  const renderElement = (element: CanvasElement, depth: number = 0) => {
    const isSelected = selectedIds.includes(element.id);
    const isGroup = element.type === "group";
    const isExpanded = expandedGroups.has(element.id);

    return (
      <div key={element.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors ${
            isSelected
              ? "bg-primary/20 border border-primary/40"
              : "hover:bg-secondary/40 border border-transparent"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={(e) => handleLayerClick(element.id, e.ctrlKey)}
          draggable
          onDragStart={() => setDraggedId(element.id)}
          onDragEnd={() => setDraggedId(null)}
        >
          {/* Expand/Collapse Icon */}
          {isGroup && element.children && element.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupExpansion(element.id);
              }}
              className="p-0.5 hover:bg-secondary rounded"
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
          {!isGroup && <div className="w-3" />}

          {/* Element Icon */}
          <div className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground">
            {element.type === "rectangle" && "▭"}
            {element.type === "circle" && "●"}
            {element.type === "text" && "T"}
            {element.type === "image" && "🖼"}
            {element.type === "group" && "📁"}
          </div>

          {/* Element Name */}
          <input
            type="text"
            value={element.name}
            onChange={(e) => handleRename(element.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-xs bg-transparent outline-none truncate"
          />

          {/* Visibility Toggle */}
          <button
            onClick={(e) => handleToggleVisibility(element.id, e)}
            className="p-0.5 hover:bg-secondary rounded"
            title={element.visible ? "Hide" : "Show"}
          >
            {element.visible ? (
              <Eye className="w-3 h-3 text-muted-foreground" />
            ) : (
              <EyeOff className="w-3 h-3 text-muted-foreground opacity-50" />
            )}
          </button>

          {/* Lock Toggle */}
          <button
            onClick={(e) => handleToggleLock(element.id, e)}
            className="p-0.5 hover:bg-secondary rounded"
            title={element.locked ? "Unlock" : "Lock"}
          >
            {element.locked ? (
              <Lock className="w-3 h-3 text-muted-foreground" />
            ) : (
              <LockOpen className="w-3 h-3 text-muted-foreground opacity-50" />
            )}
          </button>

          {/* Delete */}
          <button
            onClick={(e) => handleDelete(element.id, e)}
            className="p-0.5 hover:bg-destructive/20 rounded hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Render Children */}
        {isGroup && isExpanded && element.children && (
          <div>
            {element.children.map((child) => renderElement(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border border-primary/20 bg-background/75 backdrop-blur h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Layers ({state.elements.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {state.elements.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">No layers</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mr-4 pr-4">
            <div className="space-y-0.5">
              {state.elements
                .slice()
                .reverse()
                .map((element) => renderElement(element))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
