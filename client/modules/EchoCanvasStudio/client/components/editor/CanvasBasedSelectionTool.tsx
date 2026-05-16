import React, { useRef, useEffect, useState } from "react";

interface CanvasBasedSelectionToolProps {
  canvas: HTMLCanvasElement | null;
  isActive: boolean;
  selectionTool:
    | "rect-select"
    | "ellipse-select"
    | "lasso"
    | "magic-wand"
    | "quick-select";
  tolerance?: number;
  onSelectionComplete: (selectionData: {
    tool: string;
    points?: [number, number][];
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
  }) => void;
  onCancel: () => void;
}

export default function CanvasBasedSelectionTool({
  canvas,
  isActive,
  selectionTool,
  tolerance = 30,
  onSelectionComplete,
  onCancel,
}: CanvasBasedSelectionToolProps) {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const [pathPoints, setPathPoints] = useState<[number, number][]>([]);
  const [, setRedraw] = useState(0);

  if (!isActive || !canvas) return null;

  const canvasWidth = canvas.width || 1200;
  const canvasHeight = canvas.height || 800;

  useEffect(() => {
    if (!overlayCanvasRef.current || !containerRef.current) return;

    const overlayCanvas = overlayCanvasRef.current;
    overlayCanvas.width = canvasWidth;
    overlayCanvas.height = canvasHeight;

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (selectionTool === "rect-select" && isSelecting) {
      const width = currentPosRef.current.x - startPosRef.current.x;
      const height = currentPosRef.current.y - startPosRef.current.y;
      ctx.strokeStyle = "rgba(0, 240, 255, 1)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(startPosRef.current.x, startPosRef.current.y, width, height);
      ctx.setLineDash([]);
    } else if (selectionTool === "ellipse-select" && isSelecting) {
      const radiusX = Math.abs(currentPosRef.current.x - startPosRef.current.x) / 2;
      const radiusY = Math.abs(currentPosRef.current.y - startPosRef.current.y) / 2;
      const centerX = startPosRef.current.x + (currentPosRef.current.x - startPosRef.current.x) / 2;
      const centerY = startPosRef.current.y + (currentPosRef.current.y - startPosRef.current.y) / 2;
      ctx.strokeStyle = "rgba(0, 240, 255, 1)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (selectionTool === "lasso" && pathPoints.length > 0) {
      ctx.strokeStyle = "rgba(0, 240, 255, 1)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pathPoints[0][0], pathPoints[0][1]);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i][0], pathPoints[i][1]);
      }
      if (isSelecting) {
        ctx.lineTo(currentPosRef.current.x, currentPosRef.current.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    isSelecting,
    pathPoints,
    selectionTool,
    canvasWidth,
    canvasHeight,
  ]);

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayCanvasRef.current) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectionTool === "lasso") {
      if (!isSelecting) {
        setIsSelecting(true);
        setPathPoints([[x, y]]);
        startPosRef.current = { x, y };
        currentPosRef.current = { x, y };
      }
    } else if (
      selectionTool === "magic-wand" ||
      selectionTool === "quick-select"
    ) {
      onSelectionComplete({
        tool: selectionTool,
        startX: x,
        startY: y,
      });
    } else {
      setIsSelecting(true);
      startPosRef.current = { x, y };
      currentPosRef.current = { x, y };
      setRedraw((prev) => prev + 1);
    }
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayCanvasRef.current) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectionTool === "lasso" && isSelecting) {
      setPathPoints((prev) => [...prev, [x, y]]);
      currentPosRef.current = { x, y };
    } else if (isSelecting) {
      currentPosRef.current = { x, y };
      setRedraw((prev) => prev + 1);
    }
  };

  const handleOverlayMouseUp = () => {
    if (selectionTool === "lasso" && isSelecting) {
      setIsSelecting(false);
      onSelectionComplete({
        tool: "lasso",
        points: pathPoints,
      });
      setPathPoints([]);
    } else if (
      (selectionTool === "rect-select" || selectionTool === "ellipse-select") &&
      isSelecting
    ) {
      setIsSelecting(false);
      onSelectionComplete({
        tool: selectionTool,
        startX: startPosRef.current.x,
        startY: startPosRef.current.y,
        endX: currentPosRef.current.x,
        endY: currentPosRef.current.y,
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    } else if (
      e.key === "Enter" &&
      selectionTool === "lasso" &&
      pathPoints.length > 2
    ) {
      onSelectionComplete({
        tool: "lasso",
        points: pathPoints,
      });
      setPathPoints([]);
      setIsSelecting(false);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, pathPoints]);

  const canvasRect = canvas.parentElement?.getBoundingClientRect();

  if (!canvasRect) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: canvasRect.left,
        top: canvasRect.top,
        width: canvasRect.width,
        height: canvasRect.height,
        zIndex: 999,
        pointerEvents: "auto",
      }}
    >
      <canvas
        ref={overlayCanvasRef}
        onMouseDown={handleOverlayMouseDown}
        onMouseMove={handleOverlayMouseMove}
        onMouseUp={handleOverlayMouseUp}
        onMouseLeave={handleOverlayMouseUp}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor: "crosshair",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "#c8a97e",
          padding: "12px 16px",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 1000,
          fontFamily: "monospace",
        }}
      >
        <div>
          {selectionTool === "magic-wand"
            ? "Magic Wand Active"
            : selectionTool === "quick-select"
              ? "Quick Select Active"
              : selectionTool === "rect-select"
                ? "Rectangle Select Active"
                : selectionTool === "ellipse-select"
                  ? "Ellipse Select Active"
                  : "Lasso Active"}
        </div>
        {selectionTool === "lasso" && (
          <>
            <div>• Click to add points</div>
            <div>• Press ENTER to complete</div>
          </>
        )}
        {(selectionTool === "magic-wand" ||
          selectionTool === "quick-select") && (
          <div>• Click to select by color</div>
        )}
        {(selectionTool === "rect-select" ||
          selectionTool === "ellipse-select") && (
          <div>• Drag to create selection</div>
        )}
        <div>• Press ESC to cancel</div>
      </div>
    </div>
  );
}
