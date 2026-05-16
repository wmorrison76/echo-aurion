import React, { useRef, useEffect, useState, useCallback } from "react";

interface CanvasBasedCropToolProps {
  canvas: HTMLCanvasElement | null;
  layers?: any[];
  isActive: boolean;
  onCropComplete: (cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onCancel: () => void;
}

export default function CanvasBasedCropTool({
  canvas,
  layers = [],
  isActive,
  onCropComplete,
  onCancel,
}: CanvasBasedCropToolProps) {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cropArea, setCropArea] = useState({
    x: 50,
    y: 50,
    width: 300,
    height: 200,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragModeRef = useRef<
    | "move"
    | "resize-nw"
    | "resize-ne"
    | "resize-sw"
    | "resize-se"
    | "resize-n"
    | "resize-s"
    | "resize-e"
    | "resize-w"
    | null
  >(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cropAreaRef = useRef(cropArea);
  const cursorRef = useRef("default");

  if (!isActive || !canvas) {
    return null;
  }

  const canvasWidth = canvas.width || 1200;
  const canvasHeight = canvas.height || 800;

  const containerRect = canvas.parentElement?.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  // Keep ref in sync with state
  useEffect(() => {
    cropAreaRef.current = cropArea;
  }, [cropArea]);

  useEffect(() => {
    if (!overlayCanvasRef.current || !containerRef.current) return;

    const overlayCanvas = overlayCanvasRef.current;
    const containerElement = containerRef.current;

    overlayCanvas.width = canvasWidth;
    overlayCanvas.height = canvasHeight;

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    ctx.strokeStyle = "#c8a97e";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
    ctx.lineWidth = 1;

    const gridX1 = cropArea.x + cropArea.width / 3;
    const gridX2 = cropArea.x + (cropArea.width * 2) / 3;
    const gridY1 = cropArea.y + cropArea.height / 3;
    const gridY2 = cropArea.y + (cropArea.height * 2) / 3;

    ctx.beginPath();
    ctx.moveTo(gridX1, cropArea.y);
    ctx.lineTo(gridX1, cropArea.y + cropArea.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(gridX2, cropArea.y);
    ctx.lineTo(gridX2, cropArea.y + cropArea.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cropArea.x, gridY1);
    ctx.lineTo(cropArea.x + cropArea.width, gridY1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cropArea.x, gridY2);
    ctx.lineTo(cropArea.x + cropArea.width, gridY2);
    ctx.stroke();

    const handleSize = 10;
    const handles = [
      { x: cropArea.x, y: cropArea.y, cursor: "nwse-resize" },
      { x: cropArea.x + cropArea.width, y: cropArea.y, cursor: "nesw-resize" },
      {
        x: cropArea.x,
        y: cropArea.y + cropArea.height,
        cursor: "nesw-resize",
      },
      {
        x: cropArea.x + cropArea.width,
        y: cropArea.y + cropArea.height,
        cursor: "nwse-resize",
      },
    ];

    ctx.fillStyle = "#c8a97e";
    handles.forEach((handle) => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize,
      );
    });

    ctx.fillStyle = "#c8a97e";
    ctx.font = "12px Arial";
    ctx.fillText("Drag to crop | Enter to apply | ESC to cancel", 10, 20);
  }, [cropArea, canvasWidth, canvasHeight]);

  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = overlayCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const handleSize = 15;

      if (
        Math.abs(x - cropArea.x) < handleSize &&
        Math.abs(y - cropArea.y) < handleSize
      ) {
        dragModeRef.current = "resize-nw";
        setIsDragging(true);
        dragStartRef.current = { x, y };
        return;
      }

      if (
        Math.abs(x - (cropArea.x + cropArea.width)) < handleSize &&
        Math.abs(y - cropArea.y) < handleSize
      ) {
        dragModeRef.current = "resize-ne";
        setIsDragging(true);
        dragStartRef.current = { x, y };
        return;
      }

      if (
        Math.abs(x - cropArea.x) < handleSize &&
        Math.abs(y - (cropArea.y + cropArea.height)) < handleSize
      ) {
        dragModeRef.current = "resize-sw";
        setIsDragging(true);
        dragStartRef.current = { x, y };
        return;
      }

      if (
        Math.abs(x - (cropArea.x + cropArea.width)) < handleSize &&
        Math.abs(y - (cropArea.y + cropArea.height)) < handleSize
      ) {
        dragModeRef.current = "resize-se";
        setIsDragging(true);
        dragStartRef.current = { x, y };
        return;
      }

      if (
        Math.abs(y - cropArea.y) < handleSize &&
        x > cropArea.x &&
        x < cropArea.x + cropArea.width
      ) {
        dragModeRef.current = "resize-n";
        setIsDragging(true);
        dragStartRef.current = { x, y };
        return;
      }

      if (
        Math.abs(y - (cropArea.y + cropArea.height)) < handleSize &&
        x > cropArea.x &&
        x < cropArea.x + cropArea.width
      ) {
        dragModeRef.current = "resize-s";
        setIsDragging(true);
        dragStartRef.current = { x, y };
        return;
      }

      if (
        Math.abs(x - cropArea.x) < handleSize &&
        y > cropArea.y &&
        y < cropArea.y + cropArea.height
      ) {
        dragModeRef.current = "resize-w";
        setIsDragging(true);
        dragStartRef.current = { x, y };
        return;
      }

      if (
        Math.abs(x - (cropArea.x + cropArea.width)) < handleSize &&
        y > cropArea.y &&
        y < cropArea.y + cropArea.height
      ) {
        dragModeRef.current = "resize-e";
        setIsDragging(true);
        dragStartRef.current = { x, y };
        return;
      }

      if (
        x > cropArea.x &&
        x < cropArea.x + cropArea.width &&
        y > cropArea.y &&
        y < cropArea.y + cropArea.height
      ) {
        dragModeRef.current = "move";
        setIsDragging(true);
        dragStartRef.current = { x, y };
        return;
      }

      setCropArea({
        x: Math.max(0, Math.min(x, canvasWidth - 50)),
        y: Math.max(0, Math.min(y, canvasHeight - 50)),
        width: 100,
        height: 100,
      });
      dragModeRef.current = "resize-se";
      setIsDragging(true);
      dragStartRef.current = { x, y };
    },
    [cropArea, canvasWidth, canvasHeight]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || dragModeRef.current === null) return;

      const rect = overlayCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;

      const dragMode = dragModeRef.current;
      const currentCropArea = cropAreaRef.current;

      let newCropArea = { ...currentCropArea };

      if (dragMode === "move") {
        newCropArea = {
          ...currentCropArea,
          x: Math.max(0, Math.min(currentCropArea.x + dx, canvasWidth - currentCropArea.width)),
          y: Math.max(
            0,
            Math.min(currentCropArea.y + dy, canvasHeight - currentCropArea.height),
          ),
        };
      } else if (dragMode === "resize-se") {
        newCropArea = {
          ...currentCropArea,
          width: Math.max(50, currentCropArea.width + dx),
          height: Math.max(50, currentCropArea.height + dy),
        };
      } else if (dragMode === "resize-sw") {
        newCropArea = {
          ...currentCropArea,
          x: Math.max(0, currentCropArea.x + dx),
          width: Math.max(50, currentCropArea.width - dx),
          height: Math.max(50, currentCropArea.height + dy),
        };
      } else if (dragMode === "resize-ne") {
        newCropArea = {
          ...currentCropArea,
          y: Math.max(0, currentCropArea.y + dy),
          width: Math.max(50, currentCropArea.width + dx),
          height: Math.max(50, currentCropArea.height - dy),
        };
      } else if (dragMode === "resize-nw") {
        newCropArea = {
          ...currentCropArea,
          x: Math.max(0, currentCropArea.x + dx),
          y: Math.max(0, currentCropArea.y + dy),
          width: Math.max(50, currentCropArea.width - dx),
          height: Math.max(50, currentCropArea.height - dy),
        };
      } else if (dragMode === "resize-n") {
        newCropArea = {
          ...currentCropArea,
          y: Math.max(0, currentCropArea.y + dy),
          height: Math.max(50, currentCropArea.height - dy),
        };
      } else if (dragMode === "resize-s") {
        newCropArea = {
          ...currentCropArea,
          height: Math.max(50, currentCropArea.height + dy),
        };
      } else if (dragMode === "resize-e") {
        newCropArea = {
          ...currentCropArea,
          width: Math.max(50, currentCropArea.width + dx),
        };
      } else if (dragMode === "resize-w") {
        newCropArea = {
          ...currentCropArea,
          x: Math.max(0, currentCropArea.x + dx),
          width: Math.max(50, currentCropArea.width - dx),
        };
      }

      setCropArea(newCropArea);
      dragStartRef.current = { x, y };
    },
    [isDragging, canvasWidth, canvasHeight]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragModeRef.current = null;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        onCropComplete(cropArea);
      }
    },
    [cropArea, onCropComplete, onCancel]
  );

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, handleMouseMove, handleMouseUp, handleKeyDown]);

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
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor: isDragging
            ? dragModeRef.current === "move"
              ? "grab"
              : dragModeRef.current === "resize-nw" ||
                  dragModeRef.current === "resize-se"
                ? "nwse-resize"
                : dragModeRef.current === "resize-ne" ||
                    dragModeRef.current === "resize-sw"
                  ? "nesw-resize"
                  : dragModeRef.current === "resize-n" ||
                      dragModeRef.current === "resize-s"
                    ? "ns-resize"
                    : dragModeRef.current === "resize-e" ||
                        dragModeRef.current === "resize-w"
                      ? "ew-resize"
                      : "default"
            : "default",
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
        <div>Crop Tool Active</div>
        <div>• Drag handles to resize</div>
        <div>• Drag inside to move</div>
        <div>• Press ENTER to apply</div>
        <div>• Press ESC to cancel</div>
      </div>
    </div>
  );
}
