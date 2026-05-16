import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { DesignerElement, CanvasSettings, PageSize } from "../hooks";
import { CanvasElement } from "./CanvasElement";
import { AlignmentToolbar } from "../layout/AlignmentToolbar";
import { HorizontalRuler, VerticalRuler, RulerCorner } from "./Ruler";
import { applySnapping, type Guide } from "./snapUtils";

interface DesignerCanvasProps {
  elements: DesignerElement[];
  selectedElementId: string | null;
  selectedElementIds: string[];
  pageSize: PageSize;
  canvasSettings: CanvasSettings;
  onSelectElement: (id: string | null) => void;
  onSelectMultiple: (ids: string[]) => void;
  onAddToSelection: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onClearSelection: () => void;
  onUpdateElement: (id: string, updates: Partial<DesignerElement>) => void;
  onUpdateMultiple: (ids: string[], updates: Partial<DesignerElement>) => void;
  onStartDrag: (element: DesignerElement, clientX: number, clientY: number) => void;
  onUpdateDrag: (clientX: number, clientY: number) => { x: number; y: number };
  onEndDrag: () => void;
  onStartResize: (element: DesignerElement, handle: string, clientX: number, clientY: number) => void;
  onUpdateResize: (clientX: number, clientY: number, startClientX: number, startClientY: number) => any;
  onEndResize: () => void;
  onStartEditingText: (id: string) => void;
  onEndEditingText: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onAlignTop?: () => void;
  onAlignMiddle?: () => void;
  onAlignBottom?: () => void;
  onDistributeHorizontally?: () => void;
  onDistributeVertically?: () => void;
  onMatchWidth?: () => void;
  onMatchHeight?: () => void;
  dragState: any;
  resizeState: any;
  editingId: string | null;
  snapToGridEnabled?: boolean;
  snapToElementsEnabled?: boolean;
}

export function DesignerCanvas({
  elements,
  selectedElementId,
  selectedElementIds,
  pageSize,
  canvasSettings,
  onSelectElement,
  onSelectMultiple,
  onAddToSelection,
  onToggleSelection,
  onClearSelection,
  onUpdateElement,
  onUpdateMultiple,
  onStartDrag,
  onUpdateDrag,
  onEndDrag,
  onStartResize,
  onUpdateResize,
  onEndResize,
  onStartEditingText,
  onEndEditingText,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeHorizontally,
  onDistributeVertically,
  onMatchWidth,
  onMatchHeight,
  dragState,
  resizeState,
  editingId,
  snapToGridEnabled = true,
  snapToElementsEnabled = true,
}: DesignerCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const [dragSelectBox, setDragSelectBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isSelectingBox, setIsSelectingBox] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [activeGuides, setActiveGuides] = useState<Guide[]>([]);

  // Handle canvas drag
  useEffect(() => {
    if (!dragState) {
      setDragPosition(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) {
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }
      const { x, y } = onUpdateDrag(e.clientX, e.clientY);
      const draggedElement = elements.find((el) => el.id === dragState.id);

      if (draggedElement) {
        const otherElements = snapToElementsEnabled ? elements.filter((el) => !selectedElementIds.includes(el.id)) : [];
        const { x: snappedX, y: snappedY, activeGuides: newActiveGuides } = applySnapping(
          draggedElement,
          x,
          y,
          otherElements,
          guides,
          pageSize,
          snapToGridEnabled,
          canvasSettings.gridSize
        );

        setActiveGuides(newActiveGuides);

        if (selectedElementIds.includes(dragState.id) && selectedElementIds.length > 1) {
          // Dragging a multi-selected element - move all selected elements
          const dx = snappedX - draggedElement.x;
          const dy = snappedY - draggedElement.y;

          const updates: Record<string, any> = {};
          selectedElementIds.forEach((id) => {
            const el = elements.find((e) => e.id === id);
            if (el) {
              updates[id] = { x: el.x + dx, y: el.y + dy };
            }
          });

          // Apply updates to all selected elements
          Object.entries(updates).forEach(([id, update]) => {
            onUpdateElement(id, update);
          });
        } else {
          // Single element drag
          onUpdateElement(dragState.id, { x: snappedX, y: snappedY });
        }

        setDragPosition({ x: Math.round(snappedX), y: Math.round(snappedY), clientX: e.clientX, clientY: e.clientY });
      }
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      setDragPosition(null);
      onEndDrag();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, elements, onUpdateDrag, onUpdateElement, onEndDrag]);

  const scale = canvasSettings.zoom;
  const paddingX = 40;
  const paddingY = 40;

  const handleCreateGuideFromRuler = (position: number, type: "horizontal" | "vertical") => {
    const newGuide: Guide = {
      id: `guide-${Date.now()}`,
      type,
      position: Math.round(position / canvasSettings.gridSize) * canvasSettings.gridSize,
      name: type === "horizontal" ? `Horizontal ${guides.filter(g => g.type === "horizontal").length + 1}` : `Vertical ${guides.filter(g => g.type === "vertical").length + 1}`,
    };
    setGuides([...guides, newGuide]);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-canvas-element="true"]')) return;

    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setIsSelectingBox(true);
    setDragSelectBox({ startX, startY, endX: startX, endY: startY });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const endX = moveEvent.clientX - rect.left;
      const endY = moveEvent.clientY - rect.top;
      setDragSelectBox({ startX, startY, endX, endY });
    };

    const handleMouseUp = () => {
      setIsSelectingBox(false);
      if (dragSelectBox) {
        const minX = Math.min(dragSelectBox.startX, dragSelectBox.endX);
        const maxX = Math.max(dragSelectBox.startX, dragSelectBox.endX);
        const minY = Math.min(dragSelectBox.startY, dragSelectBox.endY);
        const maxY = Math.max(dragSelectBox.startY, dragSelectBox.endY);

        const selected = elements.filter((el) => {
          const elLeft = el.x * canvasSettings.zoom + 24;
          const elTop = el.y * canvasSettings.zoom + 24;
          const elRight = elLeft + el.width * canvasSettings.zoom;
          const elBottom = elTop + el.height * canvasSettings.zoom;

          return elLeft < maxX && elRight > minX && elTop < maxY && elBottom > minY;
        });

        if (selected.length > 0) {
          onSelectMultiple(selected.map((el) => el.id));
        } else {
          onClearSelection();
        }
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setDragSelectBox(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={canvasRef}
      className="relative h-full w-full overflow-auto bg-gray-200 dark:bg-gray-900"
      onMouseDown={handleCanvasMouseDown}
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100%",
        minWidth: "100%",
      }}
    >
      {/* Rulers Container */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
        {/* Top Ruler */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "24px",
            background: "#f0f0f0",
            borderBottom: "1px solid #ccc",
            display: "flex",
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: Math.ceil((pageSize.width * scale) / 50) }).map((_, i) => (
            <div
              key={`ruler-top-${i}`}
              style={{
                position: "absolute",
                left: `${i * 50}px`,
                width: "50px",
                height: "24px",
                borderRight: "1px solid #ddd",
                fontSize: "10px",
                color: "#666",
                display: "flex",
                alignItems: "flex-end",
                paddingBottom: "2px",
                paddingLeft: "2px",
              }}
            >
              {i * 50}
            </div>
          ))}
        </div>

        {/* Left Ruler */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "24px",
            bottom: 0,
            background: "#f0f0f0",
            borderRight: "1px solid #ccc",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: Math.ceil((pageSize.height * scale) / 50) }).map((_, i) => (
            <div
              key={`ruler-left-${i}`}
              style={{
                position: "absolute",
                top: `${i * 50}px`,
                height: "50px",
                width: "24px",
                borderBottom: "1px solid #ddd",
                fontSize: "10px",
                color: "#666",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                paddingRight: "2px",
                paddingTop: "2px",
              }}
            >
              {i * 50}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas Container */}
      <div
        className="relative bg-white shadow-xl"
        style={{
          width: pageSize.width * scale,
          height: pageSize.height * scale,
          transformOrigin: "center",
          overflow: "visible",
          zIndex: 2,
          position: "relative",
          marginTop: "24px",
          marginLeft: "24px",
        }}
      >
        {/* Grid Background (optional) */}
        {canvasSettings.showGrid && (
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(0deg, transparent calc(${canvasSettings.gridSize * scale}px - 1px), #888 calc(${canvasSettings.gridSize * scale}px - 1px)),
                linear-gradient(90deg, transparent calc(${canvasSettings.gridSize * scale}px - 1px), #888 calc(${canvasSettings.gridSize * scale}px - 1px))
              `,
              backgroundSize: `${canvasSettings.gridSize * scale}px ${canvasSettings.gridSize * scale}px`,
            }}
          />
        )}

        {/* Margins Display */}
        {canvasSettings.showMargins && (
          <div
            className="absolute border border-dashed border-blue-300 pointer-events-none"
            style={{
              top: canvasSettings.margin * scale,
              left: canvasSettings.margin * scale,
              right: canvasSettings.margin * scale,
              bottom: canvasSettings.margin * scale,
            }}
          />
        )}

        {/* Bleed Display */}
        {canvasSettings.showBleed && (
          <div
            className="absolute border border-dashed border-red-300 pointer-events-none"
            style={{
              top: -canvasSettings.bleed * scale,
              left: -canvasSettings.bleed * scale,
              right: -canvasSettings.bleed * scale,
              bottom: -canvasSettings.bleed * scale,
            }}
          />
        )}

        {/* Canvas Content */}
        <div
          className="relative overflow-hidden"
          style={{
            backgroundColor: canvasSettings.background,
            position: "relative",
            zIndex: 2,
            width: "100%",
            height: "100%",
          }}
        >
          {/* Render Elements */}
          {elements.map((element) => (
            <div
              key={element.id}
              data-canvas-element="true"
              data-element-id={element.id}
              style={{
                position: "absolute",
                left: element.x * scale,
                top: element.y * scale,
                width: element.width * scale,
                height: element.height * scale,
                transformOrigin: "top left",
              }}
            >
              <CanvasElement
                element={element}
                isSelected={selectedElementId === element.id || selectedElementIds.includes(element.id)}
                isMultiSelected={selectedElementIds.includes(element.id) && selectedElementIds.length > 1}
                isEditing={editingId === element.id}
                isDragging={dragState?.id === element.id}
                isResizing={resizeState?.id === element.id}
                onSelect={(e) => {
                  if (e.shiftKey) {
                    onAddToSelection(element.id);
                  } else if (e.ctrlKey || e.metaKey) {
                    onToggleSelection(element.id);
                  } else {
                    onSelectElement(element.id);
                  }
                }}
                onUpdateElement={(updates) => onUpdateElement(element.id, updates)}
                onStartDrag={(clientX, clientY) => onStartDrag(element, clientX, clientY)}
                onStartResize={(handle, clientX, clientY) =>
                  onStartResize(element, handle, clientX, clientY)
                }
                onStartEditingText={() => onStartEditingText(element.id)}
                onEndEditingText={onEndEditingText}
                scale={scale}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Alignment Toolbar */}
      {selectedElementIds.length > 1 && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10001,
          }}
        >
          <AlignmentToolbar
            selectedElements={elements.filter((el) => selectedElementIds.includes(el.id))}
            onAlignLeft={onAlignLeft || (() => {})}
            onAlignCenter={onAlignCenter || (() => {})}
            onAlignRight={onAlignRight || (() => {})}
            onAlignTop={onAlignTop || (() => {})}
            onAlignMiddle={onAlignMiddle || (() => {})}
            onAlignBottom={onAlignBottom || (() => {})}
            onDistributeHorizontally={onDistributeHorizontally || (() => {})}
            onDistributeVertically={onDistributeVertically || (() => {})}
            onMatchWidth={onMatchWidth || (() => {})}
            onMatchHeight={onMatchHeight || (() => {})}
          />
        </div>
      )}

      {/* Drag-select box visualization */}
      {dragSelectBox && isSelectingBox && (
        <div
          style={{
            position: "absolute",
            left: Math.min(dragSelectBox.startX, dragSelectBox.endX),
            top: Math.min(dragSelectBox.startY, dragSelectBox.endY),
            width: Math.abs(dragSelectBox.endX - dragSelectBox.startX),
            height: Math.abs(dragSelectBox.endY - dragSelectBox.startY),
            border: "2px dashed rgba(0, 122, 255, 0.5)",
            backgroundColor: "rgba(0, 122, 255, 0.1)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      )}

      {/* Smart Guides - Show alignment lines when snapping */}
      {activeGuides.map((guide) => (
        guide.type === "vertical" ? (
          <div
            key={guide.id}
            style={{
              position: "absolute",
              left: `${guide.position * scale + 24}px`,
              top: 0,
              width: "1px",
              height: "100%",
              backgroundColor: "#4F46E5",
              opacity: 0.6,
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
        ) : (
          <div
            key={guide.id}
            style={{
              position: "absolute",
              top: `${guide.position * scale + 24}px`,
              left: 0,
              width: "100%",
              height: "1px",
              backgroundColor: "#4F46E5",
              opacity: 0.6,
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
        )
      ))}

      {/* Custom Guides Display */}
      {guides.map((guide) => (
        guide.type === "vertical" ? (
          <div
            key={guide.id}
            style={{
              position: "absolute",
              left: `${guide.position * scale + 24}px`,
              top: 0,
              width: "1px",
              height: "100%",
              backgroundColor: "rgba(255, 100, 100, 0.5)",
              opacity: 0.4,
              pointerEvents: "none",
              zIndex: 1000,
              cursor: "col-resize",
            }}
            title={`Guide: ${guide.name || 'Vertical'}`}
          />
        ) : (
          <div
            key={guide.id}
            style={{
              position: "absolute",
              top: `${guide.position * scale + 24}px`,
              left: 0,
              width: "100%",
              height: "1px",
              backgroundColor: "rgba(255, 100, 100, 0.5)",
              opacity: 0.4,
              pointerEvents: "none",
              zIndex: 1000,
              cursor: "row-resize",
            }}
            title={`Guide: ${guide.name || 'Horizontal'}`}
          />
        )
      ))}

      {/* Position Tooltip during drag */}
      {dragPosition && (
        <div
          style={{
            position: "fixed",
            left: `${dragPosition.clientX + 10}px`,
            top: `${dragPosition.clientY + 10}px`,
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: "monospace",
            zIndex: 10000,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          X: {dragPosition.x} Y: {dragPosition.y}
        </div>
      )}
    </div>
  );
}
