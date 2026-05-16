import { useState } from "react";
import { canvasEngine, type ToolType } from "@/services/CanvasEngine";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pointer,
  Square,
  Circle,
  Type,
  PenTool,
  Line,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Lock,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";

interface CanvasToolsPanelProps {
  selectedTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  selectedIds: string[];
  onElementsAdded: (elements: any[]) => void;
}

export default function CanvasToolsPanel({
  selectedTool,
  onToolChange,
  selectedIds,
}: CanvasToolsPanelProps) {
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [strokeColor, setStrokeColor] = useState("#1E40AF");

  const tools: { id: ToolType; label: string; icon: React.ReactNode }[] = [
    { id: "select", label: "Select", icon: <Pointer className="w-4 h-4" /> },
    {
      id: "rectangle",
      label: "Rectangle",
      icon: <Square className="w-4 h-4" />,
    },
    { id: "circle", label: "Circle", icon: <Circle className="w-4 h-4" /> },
    { id: "line", label: "Line", icon: <Line className="w-4 h-4" /> },
    { id: "pen", label: "Pen", icon: <PenTool className="w-4 h-4" /> },
    { id: "text", label: "Text", icon: <Type className="w-4 h-4" /> },
  ];

  const handleAddRectangle = () => {
    const rect = canvasEngine.createRectangle(
      { x: 100, y: 100, width: 200, height: 150 },
      { type: "solid", color: primaryColor, opacity: 1 },
      { color: strokeColor, width: 2, type: "solid" },
    );
    canvasEngine.addElement(rect);
    onToolChange("select");
  };

  const handleAddCircle = () => {
    const circle = canvasEngine.createCircle(
      { x: 100, y: 100, width: 150, height: 150 },
      { type: "solid", color: primaryColor, opacity: 1 },
      { color: strokeColor, width: 2, type: "solid" },
    );
    canvasEngine.addElement(circle);
    onToolChange("select");
  };

  const handleAddText = () => {
    const text = canvasEngine.createText(
      { x: 100, y: 100, width: 200, height: 50 },
      "Double-click to edit",
      {
        fontSize: 16,
        color: primaryColor,
        fontWeight: "400",
      },
    );
    canvasEngine.addElement(text);
    onToolChange("select");
  };

  const handleDelete = () => {
    selectedIds.forEach((id) => canvasEngine.deleteElement(id));
  };

  const handleCopy = () => {
    canvasEngine.copy(selectedIds);
  };

  const handlePaste = () => {
    const pasted = canvasEngine.paste();
    canvasEngine.selectElements(pasted.map((el) => el.id));
  };

  const handleDuplicate = () => {
    handleCopy();
    handlePaste();
  };

  const handleUndo = () => {
    canvasEngine.undo();
  };

  const handleRedo = () => {
    canvasEngine.redo();
  };

  const toggleLock = () => {
    selectedIds.forEach((id) => {
      const state = canvasEngine.getState();
      const element = state.elements.find((el) => el.id === id);
      if (element) {
        canvasEngine.updateElement(id, { locked: !element.locked });
      }
    });
  };

  const toggleVisibility = () => {
    selectedIds.forEach((id) => {
      const state = canvasEngine.getState();
      const element = state.elements.find((el) => el.id === id);
      if (element) {
        canvasEngine.updateElement(id, { visible: !element.visible });
      }
    });
  };

  return (
    <TooltipProvider>
      <div className="bg-background/75 backdrop-blur border border-primary/20 rounded-lg p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Tools */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
            Tools
          </p>
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedTool === tool.id ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => onToolChange(tool.id)}
                >
                  {tool.icon}
                  <span className="text-xs">{tool.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tool.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator />

        {/* Shape Creation */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
            Shapes
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleAddRectangle}
              >
                <Square className="w-4 h-4" />
                <span className="text-xs">Add Rectangle</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create Rectangle</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleAddCircle}
              >
                <Circle className="w-4 h-4" />
                <span className="text-xs">Add Circle</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create Circle</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleAddText}
              >
                <Type className="w-4 h-4" />
                <span className="text-xs">Add Text</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create Text</TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        {/* Colors */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
            Colors
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Fill</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border border-primary/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Stroke</label>
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border border-primary/20"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Edit Actions */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
            Edit
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleUndo}
              >
                <Undo2 className="w-4 h-4" />
                <span className="text-xs">Undo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleRedo}
              >
                <Redo2 className="w-4 h-4" />
                <span className="text-xs">Redo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        {/* Selection Actions */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
            Selection
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleCopy}
                disabled={selectedIds.length === 0}
              >
                <Copy className="w-4 h-4" />
                <span className="text-xs">Copy</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy (Ctrl+C)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleDuplicate}
                disabled={selectedIds.length === 0}
              >
                <Copy className="w-4 h-4" />
                <span className="text-xs">Duplicate</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate (Ctrl+D)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={toggleLock}
                disabled={selectedIds.length === 0}
              >
                <Lock className="w-4 h-4" />
                <span className="text-xs">Lock</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lock/Unlock</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={toggleVisibility}
                disabled={selectedIds.length === 0}
              >
                <Eye className="w-4 h-4" />
                <span className="text-xs">Hide</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show/Hide</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleDelete}
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs">Delete</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete (Del)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
