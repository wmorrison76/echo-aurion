import React, { useState } from "react";
import { DrawingTool, WhiteboardToolState } from "./types";
import {
  MousePointer2,
  Pen,
  Eraser,
  Square,
  Circle,
  ArrowRight,
  Type,
  StickyNote,
  RotateCcw,
  RotateCw,
  Grid3x3,
  Ruler,
  ZoomIn,
  ZoomOut,
  Trash2,
  Download,
  ChevronDown,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/glass";

interface ToolbarProps {
  toolState: WhiteboardToolState;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onLineWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  onGridToggle: (show: boolean) => void;
  onRulersToggle: (show: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onZoom: (delta: number) => void;
  showGrid: boolean;
  showRulers: boolean;
  zoomLevel: number;
  readOnly?: boolean;
}

const TOOLS: Array<{ id: DrawingTool; icon: React.ReactNode; label: string }> = [
  { id: "select", icon: <MousePointer2 size={18} />, label: "Select" },
  { id: "pen", icon: <Pen size={18} />, label: "Pen" },
  { id: "eraser", icon: <Eraser size={18} />, label: "Eraser" },
  { id: "rectangle", icon: <Square size={18} />, label: "Rectangle" },
  { id: "circle", icon: <Circle size={18} />, label: "Circle" },
  { id: "arrow", icon: <ArrowRight size={18} />, label: "Arrow" },
  { id: "text", icon: <Type size={18} />, label: "Text" },
  { id: "sticky", icon: <StickyNote size={18} />, label: "Sticky Note" },
];

const getThemeColors = (): string[] => {
  if (typeof window === "undefined") {
    // Default fallback colors
    return [
      "#000000",
      "#FF0000",
      "#00FF00",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#FF00FF",
      "#00FFFF",
      "#FFA500",
      "#800080",
      "#FFC0CB",
      "#A52A2A",
      "#808080",
    ];
  }
  return [
    "#000000",
    "#FFFFFF",
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#6366F1",
    "#06B6D4",
    "#F97316",
    "#84CC16",
  ];
};

const COLORS = getThemeColors();

export const WhiteboardToolbar: React.FC<ToolbarProps> = ({
  toolState,
  onToolChange,
  onColorChange,
  onLineWidthChange,
  onOpacityChange,
  onGridToggle,
  onRulersToggle,
  onUndo,
  onRedo,
  onClear,
  onZoom,
  showGrid,
  showRulers,
  zoomLevel,
  readOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-2 left-2 md:bottom-4 md:left-4 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 z-40"
        title="Show toolbar"
      >
        ↑
      </button>
    );
  }

  return (
    <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex flex-col md:flex-row items-end md:items-center gap-2 z-40">
      <div
        className="flex flex-col md:flex-row items-center gap-2 p-2 rounded-xl shadow-2xl"
        style={{
          backgroundColor: "rgba(31, 33, 62, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Tools */}
        <div className="grid grid-cols-2 md:flex items-center gap-1 border-b md:border-b-0 md:border-r border-white/10 pb-2 md:pb-0 md:pr-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              disabled={readOnly && tool.id !== "select"}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center justify-center relative group",
                toolState.selectedTool === tool.id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/60 hover:bg-white/5",
              )}
              title={tool.label}
            >
              {tool.icon}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                {tool.label}
              </span>
            </button>
          ))}
        </div>

        {/* Style Controls */}
        <div className="flex items-center gap-2 pl-0 md:pl-2">
          {/* Color Picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner overflow-hidden"
                style={{ backgroundColor: toolState.selectedColor }}
                title="Stroke Color"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-2 grid grid-cols-4 gap-1 min-w-[120px]">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className="w-6 h-6 rounded-full border border-white/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Line Width */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-white/5 rounded-lg text-foreground/60">
                <div
                  className="w-4 h-0.5 bg-current"
                  style={{ height: `${Math.max(1, toolState.lineWidth / 2)}px` }}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-2 space-y-2 w-32">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                Line Width: {toolState.lineWidth}px
              </p>
              <input
                type="range"
                min="1"
                max="20"
                value={toolState.lineWidth}
                onChange={(e) => onLineWidthChange(parseInt(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
              />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Opacity */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-white/5 rounded-lg text-foreground/60">
                <Palette size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-2 space-y-2 w-32">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                Opacity: {Math.round(toolState.opacity * 100)}%
              </p>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={toolState.opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1 pl-0 md:pl-2 border-l border-white/10 hidden md:flex">
          <button
            onClick={() => onGridToggle(!showGrid)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showGrid ? "text-primary bg-primary/10" : "text-foreground/60",
            )}
            title="Toggle Grid"
          >
            <Grid3x3 size={18} />
          </button>
          <button
            onClick={() => onRulersToggle(!showRulers)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showRulers ? "text-primary bg-primary/10" : "text-foreground/60",
            )}
            title="Toggle Rulers"
          >
            <Ruler size={18} />
          </button>
        </div>

        {/* History */}
        <div className="flex items-center gap-1 pl-0 md:pl-2 border-l border-white/10">
          <button
            onClick={onUndo}
            className="p-2 hover:bg-white/5 rounded-lg text-foreground/60"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={onRedo}
            className="p-2 hover:bg-white/5 rounded-lg text-foreground/60"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw size={18} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 pl-0 md:pl-2 border-l border-white/10">
          <button
            onClick={onClear}
            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
            title="Clear Canvas"
          >
            <Trash2 size={18} />
          </button>
          <button
            className="p-2 hover:bg-white/5 rounded-lg text-foreground/60"
            title="Export"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div
        className="flex items-center gap-2 p-2 rounded-xl shadow-2xl"
        style={{
          backgroundColor: "rgba(31, 33, 62, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(8px)",
        }}
      >
        <button
          onClick={() => onZoom(-0.1)}
          className="p-2 hover:bg-white/5 rounded-lg text-foreground/60"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs font-mono text-foreground/70 min-w-[40px] text-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => onZoom(0.1)}
          className="p-2 hover:bg-white/5 rounded-lg text-foreground/60"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setIsOpen(false)}
        className="p-2 hover:bg-white/5 rounded-full text-foreground/40"
        title="Hide Toolbar"
      >
        ↓
      </button>
    </div>
  );
};

export default WhiteboardToolbar;
