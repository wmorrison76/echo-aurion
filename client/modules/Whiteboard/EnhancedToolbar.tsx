import React, { useState } from "react";
import { DrawingTool, WhiteboardToolState } from "./types";
import { TextPropertiesPanel } from "./TextPropertiesPanel";
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
  Layers,
  Share2,
  Monitor,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
  Copy,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/glass";
interface EnhancedToolbarProps {
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
  onShareDesktop: () => void;
  onShareWithGroup: () => void;
  onToggleLayers: (show: boolean) => void;
  onApplyTemplate: (templateId: string) => void;
  onExport: (format: "png" | "pdf" | "svg") => void;
  onAlignObjects: (
    alignment: "left" | "right" | "center" | "top" | "bottom" | "middle",
  ) => void;
  onDeleteSelection: () => void;
  canDeleteSelection: boolean;
  onZoomToFit: () => void;
  onZoomToSelection: () => void;
  onGroupSelection: () => void;
  onUngroupSelection: () => void;
  onDistributeHorizontal: () => void;
  onDistributeVertical: () => void;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  canDistributeSelection: boolean;
  snappingEnabled: boolean;
  onToggleSnapping: (enabled: boolean) => void;
  showGrid: boolean;
  showRulers: boolean;
  showLayers: boolean;
  zoomLevel: number;
  readOnly?: boolean;
  history: Array<{ action: string; timestamp: number }>;
  historyIndex: number;
  selectedTextElement?: {
    fontFamily: string;
    fontSize: number;
    color: string;
    fontWeight?: "normal" | "bold";
    isItalic?: boolean;
    isUnderline?: boolean;
    textAlign?: "left" | "center" | "right";
  };
  onTextFontFamilyChange?: (family: string) => void;
  onTextFontSizeChange?: (size: number) => void;
  onTextColorChange?: (color: string) => void;
  onTextFontWeightChange?: (weight: "normal" | "bold") => void;
  onTextItalicChange?: (isItalic: boolean) => void;
  onTextUnderlineChange?: (isUnderline: boolean) => void;
  onTextAlignChange?: (align: "left" | "center" | "right") => void;
}
const TOOLS: Array<{ id: DrawingTool; icon: React.ReactNode; label: string }> =
  [
    { id: "select", icon: <MousePointer2 size={18} />, label: "Select" },
    { id: "pen", icon: <Pen size={18} />, label: "Pen" },
    { id: "eraser", icon: <Eraser size={18} />, label: "Eraser" },
    { id: "rectangle", icon: <Square size={18} />, label: "Rectangle" },
    { id: "circle", icon: <Circle size={18} />, label: "Circle" },
    { id: "arrow", icon: <ArrowRight size={18} />, label: "Arrow" },
    {
      id: "line",
      icon: <div className="w-6 h-px bg-current" />,
      label: "Line",
    },
    { id: "text", icon: <Type size={18} />, label: "Text" },
    { id: "sticky", icon: <StickyNote size={18} />, label: "Sticky Note" },
  ];
const SHAPE_LIBRARY = [
  { id: "rectangle", name: "Rectangle", icon: "▭" },
  { id: "circle", name: "Circle", icon: "○" },
  { id: "triangle", name: "Triangle", icon: "△" },
  { id: "diamond", name: "Diamond", icon: "◇" },
  { id: "pentagon", name: "Pentagon", icon: "⬠" },
  { id: "hexagon", name: "Hexagon", icon: "⬡" },
  { id: "star", name: "Star", icon: "★" },
  { id: "heart", name: "Heart", icon: "♥" },
];
const TEMPLATES = [
  { id: "wireframe", name: "Wireframe", description: "UI/UX Wireframe" },
  { id: "flowchart", name: "Flowchart", description: "Process Flow" },
  { id: "mindmap", name: "Mind Map", description: "Brainstorming" },
  { id: "whiteboard", name: "Blank", description: "Empty Canvas" },
];
export const EnhancedWhiteboardToolbar: React.FC<EnhancedToolbarProps> = ({
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
  onShareDesktop,
  onShareWithGroup,
  onToggleLayers,
  onApplyTemplate,
  onExport,
  onAlignObjects,
  onDeleteSelection,
  canDeleteSelection,
  onZoomToFit,
  onZoomToSelection,
  onGroupSelection,
  onUngroupSelection,
  onDistributeHorizontal,
  onDistributeVertical,
  canGroupSelection,
  canUngroupSelection,
  canDistributeSelection,
  snappingEnabled,
  onToggleSnapping,
  showGrid,
  showRulers,
  showLayers,
  zoomLevel,
  readOnly = false,
  history,
  historyIndex,
  selectedTextElement,
  onTextFontFamilyChange,
  onTextFontSizeChange,
  onTextColorChange,
  onTextFontWeightChange,
  onTextItalicChange,
  onTextUnderlineChange,
  onTextAlignChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFontOptions, setShowFontOptions] = useState(false);
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="absolute right-2 top-2 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 z-40"
        title="Show toolbar"
      >
        {" "}
        <ChevronLeft size={20} />{" "}
      </button>
    );
  }
  return (
    <div
      className="absolute right-2 top-2 rounded-lg space-y-2 overflow-y-auto z-40 shadow-xl"
      style={{
        backgroundColor: "rgba(31, 33, 62, 0.98)",
        border: "1.5px solid rgba(44, 58, 204, 0.6)",
        backdropFilter: "blur(10px)",
        width: "260px",
        padding: "0 5px",
        maxHeight: "calc(100% - 16px)",
      }}
    >
      {" "}
      {/* Header */}{" "}
      <div
        className="flex items-start justify-center pb-2 border-b border-border/20 relative"
        style={{ marginBottom: "5px" }}
      >
        {" "}
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
          {" "}
          Toolkit{" "}
        </h3>{" "}
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-foreground/60 hover:text-primary text-xs p-0.5 transition-colors absolute right-2"
          title="Collapse toolbar"
        >
          {" "}
          <ChevronRight size={14} />{" "}
        </button>{" "}
      </div>{" "}
      {/* Tool Selection */}{" "}
      <div className="space-y-2">
        {" "}
        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
          {" "}
          Drawing{" "}
        </p>{" "}
        <div className="grid grid-cols-4 gap-1">
          {" "}
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              disabled={readOnly && tool.id !== "text"}
              className={cn(
                "p-2 rounded transition-all text-xs flex items-center justify-center",
                toolState.selectedTool === tool.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-foreground/70 hover:bg-secondary",
              )}
              title={tool.label}
            >
              {" "}
              {tool.icon}{" "}
            </button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* Shapes Library */}{" "}
      <div className="space-y-2 pt-1">
        {" "}
        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
          {" "}
          Shapes{" "}
        </p>{" "}
        <div className="grid grid-cols-4 gap-1">
          {" "}
          {SHAPE_LIBRARY.map((shape) => (
            <button
              key={shape.id}
              onClick={() => onToolChange(shape.id as DrawingTool)}
              className={cn(
                "rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-center",
                ["circle", "triangle", "hexagon", "heart"].includes(shape.id)
                  ? ""
                  : "p-2",
              )}
              title={shape.name}
            >
              {" "}
              {shape.icon}{" "}
            </button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* Color Picker */}{" "}
      {!readOnly && (
        <>
          {" "}
          <div className="space-y-2 pt-1">
            {" "}
            <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
              {" "}
              Color{" "}
            </p>{" "}
            <div className="flex items-center gap-2">
              {" "}
              <input
                type="color"
                value={toolState.selectedColor}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
                title="Pick a color"
              />{" "}
              <span className="text-xs text-foreground/70 flex-1 truncate">
                {" "}
                {toolState.selectedColor.toUpperCase()}{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          {/* Line Width */}{" "}
          <div className="space-y-2 pt-1">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
                {" "}
                Stroke{" "}
              </p>{" "}
              <span className="text-xs text-foreground/70 font-semibold">
                {" "}
                {toolState.lineWidth}px{" "}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="1"
              max="20"
              value={toolState.lineWidth}
              onChange={(e) => onLineWidthChange(parseInt(e.target.value))}
              className="w-full"
              title={`Line width: ${toolState.lineWidth}px`}
            />{" "}
            {/* Preset Widths */}{" "}
            <div className="grid grid-cols-4 gap-1">
              {" "}
              {[1, 2, 4, 8].map((width) => (
                <button
                  key={width}
                  onClick={() => onLineWidthChange(width)}
                  className={cn(
                    "p-2 rounded text-xs font-semibold transition-all flex items-center justify-center",
                    toolState.lineWidth === width
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-foreground/70 hover:bg-secondary",
                  )}
                  title={`Stroke ${width}px`}
                  style={{ borderTop: `${width}px solid currentColor` }}
                >
                  {" "}
                  {width}{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Opacity */}{" "}
          <div className="space-y-2 pt-1">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
                {" "}
                Opacity{" "}
              </p>{" "}
              <span className="text-xs text-foreground/70">
                {" "}
                {Math.round(toolState.opacity * 100)}%{" "}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={toolState.opacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-full"
            />{" "}
          </div>{" "}
          {/* Text Formatting Properties (when text is selected) */}{" "}
          {selectedTextElement && onTextFontFamilyChange && (
            <>
              {" "}
              <div className="border-t border-border/20 my-2" />{" "}
              <TextPropertiesPanel
                fontFamily={selectedTextElement.fontFamily}
                fontSize={selectedTextElement.fontSize}
                color={selectedTextElement.color}
                fontWeight={selectedTextElement.fontWeight}
                isItalic={selectedTextElement.isItalic}
                isUnderline={selectedTextElement.isUnderline}
                textAlign={selectedTextElement.textAlign}
                onFontFamilyChange={onTextFontFamilyChange}
                onFontSizeChange={onTextFontSizeChange}
                onColorChange={onTextColorChange}
                onFontWeightChange={onTextFontWeightChange}
                onItalicChange={onTextItalicChange}
                onUnderlineChange={onTextUnderlineChange}
                onTextAlignChange={onTextAlignChange}
              />{" "}
            </>
          )}{" "}
        </>
      )}{" "}
      {/* Layers Panel Toggle */}{" "}
      <div className="space-y-2 pt-1">
        {" "}
        <button
          onClick={() => onToggleLayers(!showLayers)}
          className={cn(
            "w-full p-2 rounded text-xs flex items-center gap-2 transition-all",
            showLayers
              ? "bg-primary/20 text-primary"
              : "bg-secondary/50 text-foreground/70 hover:bg-secondary",
          )}
        >
          {" "}
          <Layers size={16} /> <span>Layers</span>{" "}
          {showLayers && <span className="ml-auto text-xs">On</span>}{" "}
        </button>{" "}
      </div>{" "}
      {/* Templates */}{" "}
      <div className="space-y-2 pt-1">
        {" "}
        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
          {" "}
          Templates{" "}
        </p>{" "}
        <DropdownMenu>
          {" "}
          <DropdownMenuTrigger asChild>
            {" "}
            <button className="w-full rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-between">
              {" "}
              <span className="flex items-center gap-2">
                {" "}
                <Package size={14} /> Load Template{" "}
              </span>{" "}
              <ChevronDown size={14} />{" "}
            </button>{" "}
          </DropdownMenuTrigger>{" "}
          <DropdownMenuContent>
            {" "}
            {TEMPLATES.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => onApplyTemplate(template.id)}
              >
                {" "}
                <div className="flex flex-col">
                  {" "}
                  <span className="text-sm font-medium">
                    {template.name}
                  </span>{" "}
                  <span className="text-xs text-foreground/60">
                    {" "}
                    {template.description}{" "}
                  </span>{" "}
                </div>{" "}
              </DropdownMenuItem>
            ))}{" "}
          </DropdownMenuContent>{" "}
        </DropdownMenu>{" "}
      </div>{" "}
      {/* Alignment & Guides */}{" "}
      <div className="space-y-2 pt-1">
        {" "}
        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
          {" "}
          Align{" "}
        </p>{" "}
        <div className="grid grid-cols-3 gap-1">
          {" "}
          <button
            onClick={() => onAlignObjects("left")}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs"
            title="Align left"
          >
            {" "}
            ⬅{" "}
          </button>{" "}
          <button
            onClick={() => onAlignObjects("center")}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs"
            title="Align center"
          >
            {" "}
            ↔{" "}
          </button>{" "}
          <button
            onClick={() => onAlignObjects("right")}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs"
            title="Align right"
          >
            {" "}
            ➡{" "}
          </button>{" "}
        </div>{" "}
        <div className="grid grid-cols-3 gap-1">
          {" "}
          <button
            onClick={() => onAlignObjects("top")}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs"
            title="Align top"
          >
            {" "}
            ⬆{" "}
          </button>{" "}
          <button
            onClick={() => onAlignObjects("middle")}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs"
            title="Align middle"
          >
            {" "}
            ↕{" "}
          </button>{" "}
          <button
            onClick={() => onAlignObjects("bottom")}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs"
            title="Align bottom"
          >
            {" "}
            ⬇{" "}
          </button>{" "}
        </div>{" "}
        {!readOnly && (
          <button
            onClick={onDeleteSelection}
            disabled={!canDeleteSelection}
            className="w-full p-2 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            title="Delete selection (Delete / Backspace)"
          >
            {" "}
            <Trash2 size={16} /> <span>Delete Selection</span>{" "}
          </button>
        )}{" "}
      </div>{" "}
      {/* Arrange */}{" "}
      <div className="space-y-2 pt-1">
        {" "}
        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
          {" "}
          Arrange{" "}
        </p>{" "}
        <div className="grid grid-cols-2 gap-1">
          {" "}
          <button
            onClick={onGroupSelection}
            disabled={!canGroupSelection || readOnly}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            title="Group (Ctrl+G)"
          >
            {" "}
            <Copy size={14} /> <span>Group</span>{" "}
          </button>{" "}
          <button
            onClick={onUngroupSelection}
            disabled={!canUngroupSelection || readOnly}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            title="Ungroup (Ctrl+Shift+G)"
          >
            {" "}
            <Layers size={14} /> <span>Ungroup</span>{" "}
          </button>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-1">
          {" "}
          <button
            onClick={onDistributeHorizontal}
            disabled={!canDistributeSelection || readOnly}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            title="Distribute horizontally"
          >
            {" "}
            ↔<span>Space X</span>{" "}
          </button>{" "}
          <button
            onClick={onDistributeVertical}
            disabled={!canDistributeSelection || readOnly}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            title="Distribute vertically"
          >
            {" "}
            ↕<span>Space Y</span>{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Canvas Controls */}{" "}
      <div className="space-y-2 pt-1">
        {" "}
        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
          {" "}
          Canvas{" "}
        </p>{" "}
        <div className="space-y-1">
          {" "}
          <button
            onClick={() => onToggleSnapping(!snappingEnabled)}
            className={cn(
              "w-full rounded text-xs flex items-center gap-2 transition-all",
              snappingEnabled
                ? "bg-primary/20 text-primary"
                : "bg-secondary/50 text-foreground/70 hover:bg-secondary",
            )}
            title="Snap while moving"
          >
            {" "}
            <Grid3x3 size={16} /> <span>Snapping</span>{" "}
            {snappingEnabled && (
              <span className="ml-auto text-xs">On</span>
            )}{" "}
          </button>{" "}
          <button
            onClick={() => onGridToggle(!showGrid)}
            className={cn(
              "w-full rounded text-xs flex items-center gap-2 transition-all",
              showGrid
                ? "bg-primary/20 text-primary"
                : "bg-secondary/50 text-foreground/70 hover:bg-secondary",
            )}
          >
            {" "}
            <Grid3x3 size={16} /> <span>Grid</span>{" "}
            {showGrid && <span className="ml-auto text-xs">On</span>}{" "}
          </button>{" "}
          <button
            onClick={() => onRulersToggle(!showRulers)}
            className={cn(
              "w-full rounded text-xs flex items-center gap-2 transition-all",
              showRulers
                ? "bg-primary/20 text-primary"
                : "bg-secondary/50 text-foreground/70 hover:bg-secondary",
            )}
          >
            {" "}
            <Ruler size={16} /> <span>Rulers</span>{" "}
            {showRulers && <span className="ml-auto text-xs">On</span>}{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* History / Undo Redo */}{" "}
      <div className="space-y-2 pt-1">
        {" "}
        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
          {" "}
          History{" "}
        </p>{" "}
        <div className="flex gap-1">
          {" "}
          <button
            onClick={onUndo}
            disabled={historyIndex === 0}
            className="flex-1 p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs disabled:opacity-50 flex items-center justify-center gap-1"
            title="Undo"
          >
            {" "}
            <RotateCcw size={16} />{" "}
          </button>{" "}
          <button
            onClick={onRedo}
            disabled={historyIndex === history.length - 1}
            className="flex-1 p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs disabled:opacity-50 flex items-center justify-center gap-1"
            title="Redo"
          >
            {" "}
            <RotateCw size={16} />{" "}
          </button>{" "}
        </div>{" "}
        <div className="text-xs text-foreground/50 p-1 bg-secondary/30 rounded">
          {" "}
          <p>Actions: {history.length}</p>{" "}
          <p>Current: {historyIndex + 1}</p>{" "}
        </div>{" "}
      </div>{" "}
      {/* Zoom Controls */}{" "}
      <div className="space-y-2 pt-1">
        {" "}
        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
          {" "}
          View{" "}
        </p>{" "}
        {/* Zoom In/Out with Display */}{" "}
        <div className="flex gap-1">
          {" "}
          <button
            onClick={() => onZoom(-0.1)}
            className="flex-1 p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-center gap-1 transition-colors"
            title="Zoom out (Ctrl+Minus)"
          >
            {" "}
            <ZoomOut size={16} />{" "}
          </button>{" "}
          <span className="flex items-center justify-center text-xs text-foreground/70 min-w-12 bg-secondary/30 rounded font-semibold">
            {" "}
            {Math.round(zoomLevel * 100)}%{" "}
          </span>{" "}
          <button
            onClick={() => onZoom(0.1)}
            className="flex-1 p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-center gap-1 transition-colors"
            title="Zoom in (Ctrl+Plus)"
          >
            {" "}
            <ZoomIn size={16} />{" "}
          </button>{" "}
        </div>{" "}
        {/* Zoom Presets */}{" "}
        <div className="grid grid-cols-3 gap-1">
          {" "}
          {[50, 100, 150].map((preset) => {
            const isActive = Math.abs(zoomLevel * 100 - preset) < 5;
            return (
              <button
                key={preset}
                onClick={() => {
                  const delta = preset / 100 - zoomLevel;
                  onZoom(delta);
                }}
                className={cn(
                  "p-2 rounded text-xs font-semibold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-foreground/70 hover:bg-secondary",
                )}
                title={`Zoom to ${preset}%`}
              >
                {" "}
                {preset}%{" "}
              </button>
            );
          })}{" "}
        </div>{" "}
        {/* Zoom to Content */}{" "}
        <div className="grid grid-cols-2 gap-1">
          {" "}
          <button
            onClick={onZoomToFit}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-center gap-2 transition-colors"
            title="Fit all content in view (Shift+1)"
          >
            {" "}
            <Monitor size={14} /> <span>Fit</span>{" "}
          </button>{" "}
          <button
            onClick={onZoomToSelection}
            className="p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-center gap-2 transition-colors"
            title="Zoom to selection (Shift+2)"
          >
            {" "}
            <MousePointer2 size={14} /> <span>Focus</span>{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Sharing Features */}{" "}
      {!readOnly && (
        <div className="space-y-2 pt-1 border-t border-border/20">
          {" "}
          <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider pt-1">
            {" "}
            Share{" "}
          </p>{" "}
          <div className="space-y-1">
            {" "}
            <button
              onClick={onShareDesktop}
              className="w-full p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center gap-2"
            >
              {" "}
              <Monitor size={16} /> <span>Share Desktop</span>{" "}
            </button>{" "}
            <button
              onClick={onShareWithGroup}
              className="w-full p-2 rounded bg-primary/20 text-primary hover:bg-primary/30 text-xs flex items-center gap-2"
            >
              {" "}
              <Users size={16} /> <span>Share with Group</span>{" "}
            </button>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Export Options */}{" "}
      <div className="space-y-2 pt-1">
        {" "}
        <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">
          {" "}
          Export{" "}
        </p>{" "}
        <DropdownMenu>
          {" "}
          <DropdownMenuTrigger asChild>
            {" "}
            <button className="w-full p-2 rounded bg-secondary/50 text-foreground/70 hover:bg-secondary text-xs flex items-center justify-between">
              {" "}
              <span className="flex items-center gap-2">
                {" "}
                <Download size={14} /> Export As{" "}
              </span>{" "}
              <ChevronDown size={14} />{" "}
            </button>{" "}
          </DropdownMenuTrigger>{" "}
          <DropdownMenuContent>
            {" "}
            <DropdownMenuItem onClick={() => onExport("png")}>
              {" "}
              PNG Image{" "}
            </DropdownMenuItem>{" "}
            <DropdownMenuItem onClick={() => onExport("pdf")}>
              {" "}
              PDF Document{" "}
            </DropdownMenuItem>{" "}
            <DropdownMenuItem onClick={() => onExport("svg")}>
              {" "}
              SVG Vector{" "}
            </DropdownMenuItem>{" "}
          </DropdownMenuContent>{" "}
        </DropdownMenu>{" "}
      </div>{" "}
      {/* Clear Canvas */}{" "}
      {!readOnly && (
        <button
          onClick={onClear}
          className="w-full p-2 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 text-xs flex items-center justify-center gap-2"
          title="Clear all"
        >
          {" "}
          <Trash2 size={16} /> <span>Clear Canvas</span>{" "}
        </button>
      )}{" "}
    </div>
  );
};
