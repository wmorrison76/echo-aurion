import { useState, useMemo } from "react";
import { Eye, EyeOff, Lock, Unlock, Trash2, ChevronDown, ChevronRight, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DesignerElement } from "../hooks";

interface LayersPanelProps {
  elements: DesignerElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onRemoveElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<DesignerElement>) => void;
}

export function LayersPanel({
  elements,
  selectedElementId,
  onSelectElement,
  onRemoveElement,
  onUpdateElement,
}: LayersPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleLayerNameChange = (id: string, newName: string) => {
    onUpdateElement(id, { name: newName });
    setEditingLayerId(null);
  };

  const handleToggleVisibility = (id: string, element: DesignerElement) => {
    onUpdateElement(id, { opacity: element.opacity === 0 ? 1 : 0 });
  };

  const handleToggleLock = (id: string, element: DesignerElement) => {
    onUpdateElement(id, { locked: !element.locked });
  };

  const toggleGroupExpand = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Build a hierarchical layer structure for rendering
  const layerHierarchy = useMemo(() => {
    const elementMap = new Map(elements.map((el) => [el.id, el]));
    const rootLayers: Array<{ element: DesignerElement; depth: number }> = [];

    // Get top-level elements (not children of any group)
    const childIds = new Set<string>();
    elements.forEach((el) => {
      if (el.childElementIds) {
        el.childElementIds.forEach((id) => childIds.add(id));
      }
    });

    const topLevel = elements.filter((el) => !childIds.has(el.id));

    // Build hierarchy
    const processElement = (
      element: DesignerElement,
      depth: number
    ): Array<{ element: DesignerElement; depth: number }> => {
      const items: Array<{ element: DesignerElement; depth: number }> = [
        { element, depth },
      ];

      if (
        element.type === "group" &&
        element.childElementIds &&
        expandedGroups.has(element.id)
      ) {
        element.childElementIds.forEach((childId) => {
          const child = elementMap.get(childId);
          if (child) {
            items.push(...processElement(child, depth + 1));
          }
        });
      }

      return items;
    };

    topLevel.forEach((el) => {
      rootLayers.push(...processElement(el, 0));
    });

    return rootLayers.reverse(); // Reverse for top layer first
  }, [elements, expandedGroups]);

  const getElementIcon = (element: DesignerElement): string => {
    switch (element.type) {
      case "image":
        return "🖼️";
      case "text":
        return "T";
      case "heading":
        return "H";
      case "shape":
        return "■";
      case "divider":
        return "—";
      case "menu-item":
        return "🍽️";
      case "group":
        return "📦";
      case "component":
        return "⚙️";
      default:
        return "○";
    }
  };

  // Render layers in reverse order (top layer first)
  const sortedElements = [...elements].reverse();

  return (
    <div className="flex h-full flex-col border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Layers</h3>
      </div>

      {/* Layers List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {layerHierarchy.length === 0 ? (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
              No layers yet
            </div>
          ) : (
            layerHierarchy.map(({ element, depth }) => (
              <div
                key={element.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                  selectedElementId === element.id &&
                    "bg-amber-50 text-[#c8a97e]/30 dark:bg-neutral-950/30 dark:text-white/80"
                )}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
              >
                {/* Group Expand/Collapse Button */}
                {element.type === "group" && element.childElementIds && element.childElementIds.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupExpand(element.id);
                    }}
                    title={expandedGroups.has(element.id) ? "Collapse group" : "Expand group"}
                  >
                    {expandedGroups.has(element.id) ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </Button>
                ) : (
                  <div className="h-5 w-5 flex-shrink-0" />
                )}

                {/* Layer Icon */}
                <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                  {getElementIcon(element)}
                </div>

                {/* Layer Name */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelectElement(element.id)}
                  onDoubleClick={() => {
                    setEditingLayerId(element.id);
                    setEditingName(element.name);
                  }}
                >
                  {editingLayerId === element.id ? (
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleLayerNameChange(element.id, editingName)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleLayerNameChange(element.id, editingName);
                        } else if (e.key === "Escape") {
                          setEditingLayerId(null);
                        }
                      }}
                      className="h-6 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate text-gray-700 dark:text-gray-300">
                      {element.name}
                      {element.type === "group" && element.childElementIds && (
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                          ({element.childElementIds.length})
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleToggleVisibility(element.id, element)}
                    title={element.opacity === 0 ? "Show" : "Hide"}
                  >
                    {element.opacity === 0 ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleToggleLock(element.id, element)}
                    title={element.locked ? "Unlock" : "Lock"}
                  >
                    {element.locked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => onRemoveElement(element.id)}
                    title="Delete layer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
