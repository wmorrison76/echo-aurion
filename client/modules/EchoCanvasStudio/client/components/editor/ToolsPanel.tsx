import { useState, useRef } from "react";
import { X, GripHorizontal } from "lucide-react";

interface ToolCategory {
  name: string;
  tools: { id: string; name: string; shortcut?: string }[];
}

interface ToolGroup {
  id: string;
  icon: React.ReactNode;
  name: string;
  tools: { id: string; name: string; shortcut?: string }[];
}

interface ToolsPanelProps {
  selectedTool: string;
  foregroundColor: string;
  backgroundColor: string;
  brushSize: number;
  brushOpacity: number;
  onToolSelect: (toolId: string) => void;
  onForegroundColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onBrushOpacityChange: (opacity: number) => void;
  toolCategories: ToolCategory[];
  getToolIcon: (toolId: string) => React.ReactNode;
  recentTools?: string[];
}

export default function ToolsPanel({
  selectedTool,
  foregroundColor,
  backgroundColor,
  brushSize,
  brushOpacity,
  onToolSelect,
  onForegroundColorChange,
  onBackgroundColorChange,
  onBrushSizeChange,
  onBrushOpacityChange,
  toolCategories,
  getToolIcon,
  recentTools = [],
}: ToolsPanelProps) {
  const [position, setPosition] = useState({ x: 220, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const [zIndex, setZIndex] = useState(500);
  const [expandedToolGroup, setExpandedToolGroup] = useState<string | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Tool groups that share the same icon
  const toolGroups: { [key: string]: string[] } = {
    "healing-tools": [
      "healing-brush",
      "spot-healing",
      "patch",
      "color-replace",
    ],
    "selection-wand": ["magic-wand", "quick-select", "object-select"],
    "lasso-tools": ["lasso", "poly-lasso"],
    "blur-adjust-tools": ["blur-sharpen", "smudge"],
    "eraser-tools": ["eraser", "magic-eraser", "background-eraser"],
    "clone-tools": ["clone-stamp", "pattern-stamp"],
    "paint-tools": ["brush", "mixer-brush"],
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Raise z-index to bring panel to front
    setZIndex(9999);

    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "140px",
        backgroundColor: "#0b0f1a",
        border: "1px solid #444",
        borderRadius: "8px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        zIndex: zIndex,
        userSelect: isDragging ? "none" : "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px",
          borderBottom: "1px solid #444",
          cursor: isDragging ? "grabbing" : "grab",
          backgroundColor: "rgba(200, 169, 126, 0.05)",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
        }}
      >
        <GripHorizontal size={12} style={{ color: "#c8a97e", opacity: 0.5 }} />
        <span
          style={{
            flex: 1,
            fontSize: "10px",
            fontWeight: "600",
            color: "#c8a97e",
          }}
        >
          TOOLS
        </span>
        <button
          onClick={() => setIsVisible(false)}
          data-no-drag
          style={{
            background: "none",
            border: "none",
            color: "#c8a97e",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          padding: "12px 6px",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxHeight: "600px",
        }}
        data-no-drag
      >
        {/* Color Swatches */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
          <input
            type="color"
            value={foregroundColor}
            onChange={(e) => onForegroundColorChange(e.target.value)}
            title="Foreground Color"
            style={{
              width: "35px",
              height: "35px",
              border: "2px solid #c8a97e",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          />
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            title="Background Color"
            style={{
              width: "35px",
              height: "35px",
              border: "2px solid #444",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Most Used Tools */}
        {recentTools.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontSize: "8px",
                fontWeight: "bold",
                color: "#c8a97e",
                textTransform: "uppercase",
                opacity: 0.7,
              }}
            >
              Recent
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "4px",
              }}
            >
              {Array.from(new Set(recentTools.slice(0, 6))).map((toolId) => {
                const toolName = toolCategories
                  .flatMap((cat) => cat.tools)
                  .find((t) => t.id === toolId)?.name;

                if (!toolName) return null;

                return (
                  <button
                    key={toolId}
                    onClick={() => onToolSelect(toolId)}
                    title={toolName}
                    style={{
                      padding: "4px",
                      borderRadius: "4px",
                      backgroundColor:
                        selectedTool === toolId
                          ? "rgba(200, 169, 126, 0.2)"
                          : "rgba(200, 169, 126, 0.08)",
                      border:
                        selectedTool === toolId
                          ? "1px solid #c8a97e"
                          : "1px solid #444",
                      color: "#c8a97e",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      transition: "all 0.2s",
                      width: "100%",
                    }}
                  >
                    {getToolIcon(toolId)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tool Categories */}
        {toolCategories.map((category) => (
          <div
            key={category.name}
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <label
              style={{
                fontSize: "8px",
                fontWeight: "bold",
                color: "#c8a97e",
                textTransform: "uppercase",
                opacity: 0.7,
              }}
            >
              {category.name}
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "4px",
              }}
            >
              {category.tools.map((tool) => {
                // Check if this tool is part of a group (but render only the first tool in the group)
                const groupKey = Object.keys(toolGroups).find(
                  (key) =>
                    toolGroups[key].includes(tool.id) &&
                    toolGroups[key][0] === tool.id,
                );
                const isGroupButton = groupKey !== undefined;
                const groupTools = groupKey ? toolGroups[groupKey] : [];
                const isHiddenByGroup = Object.keys(toolGroups).some(
                  (key) =>
                    toolGroups[key].includes(tool.id) &&
                    toolGroups[key][0] !== tool.id,
                );

                if (isHiddenByGroup) return null;

                return (
                  <div key={tool.id} style={{ position: "relative" }}>
                    <button
                      onClick={() => {
                        if (isGroupButton) {
                          setExpandedToolGroup(
                            expandedToolGroup === groupKey ? null : groupKey,
                          );
                        } else {
                          onToolSelect(tool.id);
                        }
                      }}
                      title={
                        isGroupButton
                          ? `${groupTools.map((t) => category.tools.find((ct) => ct.id === t)?.name).join(", ")}`
                          : tool.name
                      }
                      style={{
                        padding: "4px",
                        borderRadius: "4px",
                        backgroundColor:
                          selectedTool === tool.id ||
                          groupTools.includes(selectedTool)
                            ? "rgba(200, 169, 126, 0.2)"
                            : "rgba(200, 169, 126, 0.08)",
                        border:
                          selectedTool === tool.id ||
                          groupTools.includes(selectedTool)
                            ? "1px solid #c8a97e"
                            : "1px solid #444",
                        color: "#c8a97e",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        transition: "all 0.2s",
                        width: "100%",
                      }}
                    >
                      {getToolIcon(tool.id)}
                      {isGroupButton && (
                        <span style={{ fontSize: "10px", marginLeft: "2px" }}>
                          ▼
                        </span>
                      )}
                    </button>

                    {/* Dropdown for grouped tools */}
                    {isGroupButton && expandedToolGroup === groupKey && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          marginTop: "2px",
                          backgroundColor: "#0b0f1a",
                          border: "1px solid #444",
                          borderRadius: "4px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                          zIndex: 1000,
                          minWidth: "120px",
                        }}
                      >
                        {groupTools.map((groupToolId) => {
                          const groupTool = category.tools.find(
                            (t) => t.id === groupToolId,
                          );
                          return (
                            <button
                              key={groupToolId}
                              onClick={() => {
                                onToolSelect(groupToolId);
                                setExpandedToolGroup(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                backgroundColor:
                                  selectedTool === groupToolId
                                    ? "rgba(200, 169, 126, 0.2)"
                                    : "transparent",
                                border: "none",
                                color:
                                  selectedTool === groupToolId
                                    ? "#c8a97e"
                                    : "#ccc",
                                cursor: "pointer",
                                fontSize: "11px",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.backgroundColor =
                                  "rgba(200, 169, 126, 0.1)";
                              }}
                              onMouseLeave={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.backgroundColor =
                                  selectedTool === groupToolId
                                    ? "rgba(200, 169, 126, 0.2)"
                                    : "transparent";
                              }}
                            >
                              {getToolIcon(groupToolId)}
                              <span>{groupTool?.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Brush Settings */}
        <div style={{ borderTop: "1px solid #444", paddingTop: "12px" }}>
          <label
            style={{
              display: "block",
              fontSize: "8px",
              fontWeight: "bold",
              color: "#c8a97e",
              textTransform: "uppercase",
              marginBottom: "8px",
              opacity: 0.7,
            }}
          >
            Brush Size
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              backgroundColor: "rgba(200, 169, 126, 0.1)",
              outline: "none",
              cursor: "pointer",
              accentColor: "#c8a97e",
            }}
          />
          <div
            style={{
              fontSize: "9px",
              color: "#666",
              marginTop: "4px",
              textAlign: "center",
            }}
          >
            {brushSize}px
          </div>
        </div>

        {/* Opacity Settings */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "8px",
              fontWeight: "bold",
              color: "#c8a97e",
              textTransform: "uppercase",
              marginBottom: "8px",
              opacity: 0.7,
            }}
          >
            Opacity
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={brushOpacity}
            onChange={(e) => onBrushOpacityChange(Number(e.target.value))}
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              backgroundColor: "rgba(200, 169, 126, 0.1)",
              outline: "none",
              cursor: "pointer",
              accentColor: "#c8a97e",
            }}
          />
          <div
            style={{
              fontSize: "9px",
              color: "#666",
              marginTop: "4px",
              textAlign: "center",
            }}
          >
            {brushOpacity}%
          </div>
        </div>
      </div>
    </div>
  );
}
