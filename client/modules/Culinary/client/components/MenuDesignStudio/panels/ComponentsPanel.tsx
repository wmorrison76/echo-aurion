import { useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ComponentDefinition, DesignerElement } from "../hooks";

interface ComponentsPanelProps {
  components: ComponentDefinition[];
  elements: DesignerElement[];
  onCreateInstance: (componentId: string, x: number, y: number) => void;
  onDeleteComponent: (componentId: string) => void;
  onUpdateComponent?: (componentId: string, updates: Partial<ComponentDefinition>) => void;
}

export function ComponentsPanel({
  components,
  elements,
  onCreateInstance,
  onDeleteComponent,
  onUpdateComponent,
}: ComponentsPanelProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const selectedComponent = components.find((c) => c.id === selectedComponentId);

  const getComponentInstanceCount = (componentId: string) => {
    return elements.filter((el) => el.componentId === componentId).length;
  };

  const handleCreateInstance = () => {
    if (selectedComponent) {
      onCreateInstance(selectedComponent.id, 100, 100);
    }
  };

  const handleDeleteComponent = () => {
    if (selectedComponent) {
      onDeleteComponent(selectedComponent.id);
      setSelectedComponentId(null);
    }
  };

  const handleUpdateName = () => {
    if (selectedComponent && onUpdateComponent && editingName.trim()) {
      onUpdateComponent(selectedComponent.id, { name: editingName });
      setIsEditingName(false);
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Components</h3>
      </div>

      {/* Components List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {components.length === 0 ? (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
              <p>No components yet</p>
              <p className="text-xs mt-2">Select elements and use Cmd+K to create a component</p>
            </div>
          ) : (
            components.map((component) => {
              const instanceCount = getComponentInstanceCount(component.id);
              const isSelected = selectedComponentId === component.id;

              return (
                <Card
                  key={component.id}
                  className={cn(
                    "p-3 cursor-pointer transition-colors",
                    isSelected
                      ? "bg-amber-50 border-[#c8a97e]/80 dark:bg-neutral-950/30 dark:border-[#c8a97e]/40"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                  onClick={() => setSelectedComponentId(component.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {component.name}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {component.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {instanceCount} {instanceCount === 1 ? "instance" : "instances"}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Created {new Date(component.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Selected Component Details */}
      {selectedComponent && (
        <div className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 p-4 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Component Name</Label>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUpdateName();
                    } else if (e.key === "Escape") {
                      setIsEditingName(false);
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleUpdateName}
                  className="h-8"
                >
                  Save
                </Button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setEditingName(selectedComponent.name);
                  setIsEditingName(true);
                }}
                className="text-sm p-2 rounded bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {selectedComponent.name}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Instances</Label>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {getComponentInstanceCount(selectedComponent.id)} instances in this design
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleCreateInstance}
              className="flex-1 h-8 text-sm gap-1"
            >
              <Copy className="h-3.5 w-3.5" />
              Create Instance
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteComponent}
              className="h-8 px-2"
              title="Delete this component"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
