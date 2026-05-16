import { useEffect, useRef, useState } from "react";
import {
  canvasEngine,
  type CanvasElement,
  type CanvasState,
  type Vector2,
} from "@/services/CanvasEngine";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface CanvasRendererProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function CanvasRenderer({
  zoom,
  onZoomChange,
  selectedIds,
  onSelectionChange,
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>(
    canvasEngine.getState(),
  );
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Vector2 | null>(null);

  // Listen to engine changes
  useEffect(() => {
    const handleChange = (state: CanvasState) => {
      setCanvasState(state);
    };
    canvasEngine.on("change", handleChange);
    return () => canvasEngine.off("change", handleChange);
  }, []);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    if (canvasState.showGrid) {
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += canvasState.gridSize * zoom) {
        ctx.beginPath();
        ctx.moveTo(x + canvasState.pan.x * zoom, 0);
        ctx.lineTo(x + canvasState.pan.x * zoom, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += canvasState.gridSize * zoom) {
        ctx.beginPath();
        ctx.moveTo(0, y + canvasState.pan.y * zoom);
        ctx.lineTo(canvas.width, y + canvasState.pan.y * zoom);
        ctx.stroke();
      }
    }

    // Draw elements
    canvasState.elements.forEach((element) => {
      const isSelected = selectedIds.includes(element.id);
      drawElement(
        ctx,
        element,
        zoom,
        canvasState.pan,
        isSelected,
        canvas.width,
        canvas.height,
      );
    });
  }, [canvasState, zoom, selectedIds]);

  const drawElement = (
    ctx: CanvasRenderingContext2D,
    element: CanvasElement,
    zoom: number,
    pan: Vector2,
    isSelected: boolean,
    canvasWidth: number,
    canvasHeight: number,
  ) => {
    const x = (element.bounds.x + pan.x) * zoom;
    const y = (element.bounds.y + pan.y) * zoom;
    const w = element.bounds.width * zoom;
    const h = element.bounds.height * zoom;

    ctx.save();
    ctx.globalAlpha = element.opacity;

    // Draw shape
    if (element.type === "rectangle") {
      ctx.fillStyle = element.fill?.color || "#3B82F6";
      ctx.fillRect(x, y, w, h);
    } else if (element.type === "circle") {
      ctx.fillStyle = element.fill?.color || "#10B981";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (element.type === "text") {
      const style = element.textStyle!;
      ctx.font = `${style.fontWeight} ${style.fontSize * zoom}px ${style.fontFamily}`;
      ctx.fillStyle = style.color;
      ctx.textAlign = style.textAlign as CanvasTextAlign;
      ctx.fillText(element.textContent || "Text", x, y + h / 2);
    } else if (element.type === "image" && element.imageUrl) {
      // Image rendering would be implemented here
      ctx.fillStyle = "#D1D5DB";
      ctx.fillRect(x, y, w, h);
    }

    // Draw stroke
    if (element.stroke) {
      ctx.strokeStyle = element.stroke.color;
      ctx.lineWidth = element.stroke.width * zoom;
      if (element.type === "rectangle") {
        ctx.strokeRect(x, y, w, h);
      } else if (element.type === "circle") {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Draw selection border
    if (isSelected) {
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);

      // Draw resize handles
      const handleSize = 8;
      ctx.fillStyle = "#3B82F6";
      const handles = [
        { x: x - handleSize / 2, y: y - handleSize / 2 }, // top-left
        { x: x + w - handleSize / 2, y: y - handleSize / 2 }, // top-right
        { x: x - handleSize / 2, y: y + h - handleSize / 2 }, // bottom-left
        { x: x + w - handleSize / 2, y: y + h - handleSize / 2 }, // bottom-right
      ];
      handles.forEach((handle) => {
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - canvasState.pan.x;
    const y = (e.clientY - rect.top) / zoom - canvasState.pan.y;

    // Find clicked element
    for (let i = canvasState.elements.length - 1; i >= 0; i--) {
      const element = canvasState.elements[i];
      if (
        x >= element.bounds.x &&
        x <= element.bounds.x + element.bounds.width &&
        y >= element.bounds.y &&
        y <= element.bounds.y + element.bounds.height
      ) {
        setDraggingElement(element.id);
        setDragStart({ x: e.clientX, y: e.clientY });
        onSelectionChange([element.id]);
        return;
      }
    }

    // Empty space clicked
    onSelectionChange([]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingElement || !dragStart) return;

    const deltaX = (e.clientX - dragStart.x) / zoom;
    const deltaY = (e.clientY - dragStart.y) / zoom;

    canvasEngine.moveElements([draggingElement], { x: deltaX, y: deltaY });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
    setDragStart(null);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onZoomChange(Math.min(zoom + 0.25, 4))}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" className="min-w-[80px]">
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onZoomChange(Math.max(zoom - 0.25, 0.25))}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onZoomChange(1)}
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 border border-primary/20 rounded-lg overflow-hidden bg-background/50">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-crosshair bg-white"
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
}
