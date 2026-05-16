import React, { useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface PolygonSelectionToolProps {
  canvas: HTMLCanvasElement | null;
  isActive: boolean;
  onSelectionCreate: (selectionData: {
    mask: ImageData;
    bounds: { x: number; y: number; width: number; height: number };
    polygon: Point[];
  }) => void;
  onCancel?: () => void;
}

export default function PolygonSelectionTool({
  canvas,
  isActive,
  onSelectionCreate,
  onCancel,
}: PolygonSelectionToolProps) {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const hoverPointRef = useRef<Point | null>(null);
  const [marchOffset, setMarchOffset] = useState(0);
  const marcharef = useRef<number | null>(null);
  const [, setRedraw] = useState(0);

  // Animate marching ants
  useEffect(() => {
    if (!isActive || points.length === 0) return;

    const animate = () => {
      setMarchOffset((prev) => (prev + 1) % 8);
      marcharef.current = requestAnimationFrame(animate);
    };

    marcharef.current = requestAnimationFrame(animate);

    return () => {
      if (marcharef.current) {
        cancelAnimationFrame(marcharef.current);
      }
    };
  }, [isActive, points]);

  // Draw polygon and marching ants
  useEffect(() => {
    if (!overlayCanvasRef.current || !canvas || !isActive) return;

    const ctx = overlayCanvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length > 0) {
      // Draw lines between points
      ctx.strokeStyle = "#c8a97e";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -marchOffset;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      // Draw line to hover point if exists
      if (hoverPointRef.current) {
        ctx.lineTo(hoverPointRef.current.x, hoverPointRef.current.y);
      }

      ctx.stroke();
      ctx.setLineDash([]);

      // Draw points as circles
      ctx.fillStyle = "#c8a97e";
      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Highlight first point to show where to close
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [points, marchOffset, isActive, canvas]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvas || !isActive) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking near the first point to close the polygon
    if (points.length > 2) {
      const firstPoint = points[0];
      const distance = Math.sqrt(
        Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2),
      );

      if (distance < 10) {
        // Close the polygon and create selection
        createSelection(points);
        return;
      }
    }

    // Add new point
    setPoints([...points, { x, y }]);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvas || !isActive || points.length < 3) return;

    e.preventDefault();
    createSelection(points);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvas || !isActive || points.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    hoverPointRef.current = { x, y };
    setRedraw((prev) => prev + 1);

    // Change cursor if near start point
    if (points.length > 2) {
      const firstPoint = points[0];
      const distance = Math.sqrt(
        Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2),
      );

      if (distance < 10) {
        canvas.style.cursor = "crosshair";
      } else {
        canvas.style.cursor = "crosshair";
      }
    }
  };

  const createSelection = (polygonPoints: Point[]) => {
    if (!canvas || polygonPoints.length < 3) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create selection mask
    const selectionMask = ctx.createImageData(canvas.width, canvas.height);
    const maskData = selectionMask.data;

    // Use canvas path for polygon rasterization
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Draw polygon fill on temp canvas
    tempCtx.fillStyle = "white";
    tempCtx.beginPath();
    tempCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
      tempCtx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    tempCtx.closePath();
    tempCtx.fill();

    // Get filled area
    const tempImageData = tempCtx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const tempData = tempImageData.data;

    // Convert to selection mask
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;

    for (let i = 0; i < tempData.length; i += 4) {
      if (tempData[i] > 128) {
        // White pixel = selected
        const pixelIndex = i / 4;
        const px = pixelIndex % canvas.width;
        const py = Math.floor(pixelIndex / canvas.width);

        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);

        // Mark as selected in mask
        maskData[i + 3] = 255;
      } else {
        maskData[i + 3] = 0;
      }
    }

    // Clear points and notify
    setPoints([]);
    setHoverPoint(null);

    onSelectionCreate({
      mask: selectionMask,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      },
      polygon: polygonPoints,
    });
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isActive) {
      setPoints([]);
      setHoverPoint(null);
      onCancel?.();
    }
  };

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onCancel]);

  if (!isActive || !canvas) return null;

  return (
    <>
      {/* Overlay canvas for polygon drawing */}
      <canvas
        ref={overlayCanvasRef}
        width={canvas.width}
        height={canvas.height}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onMouseMove={handleMouseMove}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor: "crosshair",
          zIndex: 10,
        }}
      />

      {/* Status display */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          border: "1px solid #c8a97e",
          borderRadius: "8px",
          padding: "12px 16px",
          color: "#c8a97e",
          fontSize: "12px",
          zIndex: 1001,
        }}
      >
        <div style={{ marginBottom: "8px" }}>Polygon Selection</div>
        <div style={{ fontSize: "11px", opacity: 0.7 }}>
          Points: {points.length}
        </div>
        <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>
          {points.length < 3
            ? "Click to add points (minimum 3)"
            : "Double-click or click first point (green) to close"}
        </div>
        <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>
          Press ESC to cancel
        </div>
      </div>
    </>
  );
}
