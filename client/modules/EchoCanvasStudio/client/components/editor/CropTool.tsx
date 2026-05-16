import React, { useState, useRef, useEffect } from "react";
import { X, RotateCw } from "lucide-react";

interface CropToolProps {
  canvas: HTMLCanvasElement | null;
  onCropApply: (cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onCancel: () => void;
  layers?: any[];
}

export default function CropTool({
  canvas,
  onCropApply,
  onCancel,
  layers = [],
}: CropToolProps) {
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cropArea, setCropArea] = useState({
    x: 50,
    y: 50,
    width: 300,
    height: 200,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<
    "move" | "resize-e" | "resize-s" | "resize-se" | null
  >(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1.5);

  const canvasWidth = canvas?.width || 1200;
  const canvasHeight = canvas?.height || 800;

  // Draw preview with crop area
  useEffect(() => {
    const cropCanvas = cropCanvasRef.current;
    if (!cropCanvas || !canvas) return;

    const ctx = cropCanvas.getContext("2d");
    if (!ctx) return;

    cropCanvas.width = canvasWidth;
    cropCanvas.height = canvasHeight;

    // Try to copy the current canvas content directly
    try {
      const sourceCtx = canvas.getContext("2d");
      if (sourceCtx) {
        const imageData = sourceCtx.getImageData(
          0,
          0,
          canvasWidth,
          canvasHeight,
        );
        ctx.putImageData(imageData, 0, 0);
      } else {
        // Fallback to white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    } catch (error) {
      // If we can't copy, just use white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Draw crop overlay after rendering background
    drawCropOverlay();

    function drawCropOverlay() {
      const currentCtx = cropCanvasRef.current?.getContext("2d");
      if (!currentCtx) return;

      // Draw darkened overlay
      currentCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
      currentCtx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Clear the crop area
      currentCtx.clearRect(
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
      );

      // Draw crop rectangle border
      currentCtx.strokeStyle = "#c8a97e";
      currentCtx.lineWidth = 2;
      currentCtx.strokeRect(
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
      );

      // Draw grid lines inside crop area
      currentCtx.strokeStyle = "rgba(0, 240, 255, 0.3)";
      currentCtx.lineWidth = 1;

      const gridX1 = cropArea.x + cropArea.width / 3;
      const gridX2 = cropArea.x + (cropArea.width * 2) / 3;
      const gridY1 = cropArea.y + cropArea.height / 3;
      const gridY2 = cropArea.y + (cropArea.height * 2) / 3;

      currentCtx.beginPath();
      currentCtx.moveTo(gridX1, cropArea.y);
      currentCtx.lineTo(gridX1, cropArea.y + cropArea.height);
      currentCtx.stroke();

      currentCtx.beginPath();
      currentCtx.moveTo(gridX2, cropArea.y);
      currentCtx.lineTo(gridX2, cropArea.y + cropArea.height);
      currentCtx.stroke();

      currentCtx.beginPath();
      currentCtx.moveTo(cropArea.x, gridY1);
      currentCtx.lineTo(cropArea.x + cropArea.width, gridY1);
      currentCtx.stroke();

      currentCtx.beginPath();
      currentCtx.moveTo(cropArea.x, gridY2);
      currentCtx.lineTo(cropArea.x + cropArea.width, gridY2);
      currentCtx.stroke();

      // Draw resize handles
      const handleSize = 8;
      const handles = [
        { x: cropArea.x - handleSize / 2, y: cropArea.y - handleSize / 2 },
        {
          x: cropArea.x + cropArea.width - handleSize / 2,
          y: cropArea.y - handleSize / 2,
        },
        {
          x: cropArea.x - handleSize / 2,
          y: cropArea.y + cropArea.height - handleSize / 2,
        },
        {
          x: cropArea.x + cropArea.width - handleSize / 2,
          y: cropArea.y + cropArea.height - handleSize / 2,
        },
      ];

      currentCtx.fillStyle = "#c8a97e";
      handles.forEach((handle) => {
        currentCtx.fillRect(handle.x, handle.y, handleSize, handleSize);
      });
    }
  }, [cropArea, canvasWidth, canvasHeight, layers]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = cropCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const handleSize = 12;
    const inHandle = (hx: number, hy: number) =>
      Math.abs(x - hx) < handleSize && Math.abs(y - hy) < handleSize;

    // Check resize handles
    if (inHandle(cropArea.x + cropArea.width, cropArea.y + cropArea.height)) {
      setDragMode("resize-se");
      setDragStart({ x, y });
      setIsDragging(true);
      return;
    }

    if (inHandle(cropArea.x + cropArea.width, cropArea.y)) {
      setDragMode("resize-e");
      setDragStart({ x, y });
      setIsDragging(true);
      return;
    }

    if (inHandle(cropArea.x, cropArea.y + cropArea.height)) {
      setDragMode("resize-s");
      setDragStart({ x, y });
      setIsDragging(true);
      return;
    }

    // Check if clicking inside crop area to move it
    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setDragMode("move");
      setDragStart({ x, y });
      setIsDragging(true);
      return;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const rect = cropCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (dragMode === "move") {
      const newX = Math.max(
        0,
        Math.min(cropArea.x + dx, canvasWidth - cropArea.width),
      );
      const newY = Math.max(
        0,
        Math.min(cropArea.y + dy, canvasHeight - cropArea.height),
      );

      setCropArea({
        ...cropArea,
        x: newX,
        y: newY,
      });
    } else if (dragMode === "resize-se") {
      let newWidth = Math.max(50, cropArea.width + dx);
      let newHeight = Math.max(50, cropArea.height + dy);

      if (aspectRatioLocked) {
        newHeight = newWidth / aspectRatio;
      }

      newWidth = Math.min(newWidth, canvasWidth - cropArea.x);
      newHeight = Math.min(newHeight, canvasHeight - cropArea.y);

      setCropArea({
        ...cropArea,
        width: newWidth,
        height: newHeight,
      });
    } else if (dragMode === "resize-e") {
      let newWidth = Math.max(50, cropArea.width + dx);
      if (aspectRatioLocked) {
        setCropArea({
          ...cropArea,
          width: newWidth,
          height: newWidth / aspectRatio,
        });
      } else {
        newWidth = Math.min(newWidth, canvasWidth - cropArea.x);
        setCropArea({
          ...cropArea,
          width: newWidth,
        });
      }
    } else if (dragMode === "resize-s") {
      let newHeight = Math.max(50, cropArea.height + dy);
      if (aspectRatioLocked) {
        setCropArea({
          ...cropArea,
          width: newHeight * aspectRatio,
          height: newHeight,
        });
      } else {
        newHeight = Math.min(newHeight, canvasHeight - cropArea.y);
        setCropArea({
          ...cropArea,
          height: newHeight,
        });
      }
    }

    setDragStart({ x, y });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  const handleReset = () => {
    setCropArea({
      x: 50,
      y: 50,
      width: canvasWidth - 100,
      height: canvasHeight - 100,
    });
  };

  const handleApply = () => {
    onCropApply({
      x: Math.round(cropArea.x),
      y: Math.round(cropArea.y),
      width: Math.round(cropArea.width),
      height: Math.round(cropArea.height),
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#0b0f1a",
          border: "1px solid #444",
          borderRadius: "8px",
          boxShadow: "0 12px 48px rgba(0, 0, 0, 0.8)",
          padding: "20px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#c8a97e",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            Crop Image
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              color: "#c8a97e",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Canvas */}
        <div
          style={{
            position: "relative",
            overflow: "auto",
            borderRadius: "4px",
            backgroundColor: "#000",
            maxHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <canvas
            ref={cropCanvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              cursor: "crosshair",
              userSelect: "none",
            }}
          />
        </div>

        {/* Controls */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: "#c8a97e",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              X Position
            </label>
            <input
              type="number"
              value={Math.round(cropArea.x)}
              onChange={(e) =>
                setCropArea({
                  ...cropArea,
                  x: Math.max(0, Number(e.target.value)),
                })
              }
              style={{
                width: "100%",
                padding: "6px",
                backgroundColor: "#222",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#fff",
                fontSize: "12px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: "#c8a97e",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Y Position
            </label>
            <input
              type="number"
              value={Math.round(cropArea.y)}
              onChange={(e) =>
                setCropArea({
                  ...cropArea,
                  y: Math.max(0, Number(e.target.value)),
                })
              }
              style={{
                width: "100%",
                padding: "6px",
                backgroundColor: "#222",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#fff",
                fontSize: "12px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: "#c8a97e",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Width
            </label>
            <input
              type="number"
              value={Math.round(cropArea.width)}
              onChange={(e) => {
                const width = Math.max(50, Number(e.target.value));
                if (aspectRatioLocked) {
                  setCropArea({
                    ...cropArea,
                    width,
                    height: width / aspectRatio,
                  });
                } else {
                  setCropArea({ ...cropArea, width });
                }
              }}
              style={{
                width: "100%",
                padding: "6px",
                backgroundColor: "#222",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#fff",
                fontSize: "12px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: "#c8a97e",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Height
            </label>
            <input
              type="number"
              value={Math.round(cropArea.height)}
              onChange={(e) => {
                const height = Math.max(50, Number(e.target.value));
                if (aspectRatioLocked) {
                  setCropArea({
                    ...cropArea,
                    width: height * aspectRatio,
                    height,
                  });
                } else {
                  setCropArea({ ...cropArea, height });
                }
              }}
              style={{
                width: "100%",
                padding: "6px",
                backgroundColor: "#222",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#fff",
                fontSize: "12px",
              }}
            />
          </div>
        </div>

        {/* Aspect Ratio Lock */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <input
            type="checkbox"
            id="aspect-lock"
            checked={aspectRatioLocked}
            onChange={(e) => setAspectRatioLocked(e.target.checked)}
            style={{
              cursor: "pointer",
            }}
          />
          <label
            htmlFor="aspect-lock"
            style={{
              fontSize: "12px",
              color: "#ccc",
              cursor: "pointer",
            }}
          >
            Lock Aspect Ratio ({aspectRatio.toFixed(2)})
          </label>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleReset}
            style={{
              padding: "8px 16px",
              backgroundColor: "#333",
              border: "1px solid #555",
              borderRadius: "4px",
              color: "#ccc",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#444";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#333";
              e.currentTarget.style.color = "#ccc";
            }}
          >
            <RotateCw size={14} />
            Reset
          </button>

          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              backgroundColor: "#333",
              border: "1px solid #555",
              borderRadius: "4px",
              color: "#ccc",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#444";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#333";
              e.currentTarget.style.color = "#ccc";
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            style={{
              padding: "8px 16px",
              backgroundColor: "#c8a97e",
              border: "none",
              borderRadius: "4px",
              color: "#000",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#00d9dd";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#c8a97e";
            }}
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
