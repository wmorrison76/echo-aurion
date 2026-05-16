import React, { useEffect, useRef, useState } from "react";

interface MagicWandToolProps {
  canvas: HTMLCanvasElement | null;
  isActive: boolean;
  onSelectionCreate: (selectionData: {
    mask: ImageData;
    bounds: { x: number; y: number; width: number; height: number };
    invertColor: boolean;
  }) => void;
  onCancel?: () => void;
}

export default function MagicWandTool({
  canvas,
  isActive,
  onSelectionCreate,
  onCancel,
}: MagicWandToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [marchOffset, setMarchOffset] = useState(0);
  const [selectionMask, setSelectionMask] = useState<ImageData | null>(null);
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });

  if (!isActive || !canvas) return null;

  // Update container dimensions
  useEffect(() => {
    const canvasRect = canvas.parentElement?.getBoundingClientRect();
    if (canvasRect) {
      setContainerDims({
        width: canvasRect.width,
        height: canvasRect.height,
      });
    }
  }, [canvas, isActive]);

  // Handle ESC key to cancel
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onCancel]);

  // Animate marching ants
  useEffect(() => {
    if (!isActive || !selectionMask) return;

    let frameId: number | null = null;
    const animate = () => {
      setMarchOffset((prev) => (prev + 1) % 8);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isActive, selectionMask]);

  // Draw marching ants animation
  useEffect(() => {
    if (!selectionMask || !overlayCanvasRef.current) return;

    const overlayCanvas = overlayCanvasRef.current;
    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Get the boundary of selected pixels
    const data = selectionMask.data;
    const width = selectionMask.width;
    const height = selectionMask.height;

    // Draw animated outline around selected pixels
    ctx.strokeStyle = "#c8a97e";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -marchOffset * 2;

    // Find edge pixels
    const edgePixels: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isSelected = data[idx + 3] > 128;

        if (!isSelected) continue;

        // Check if this is an edge pixel
        const topSelected =
          y > 0 ? data[((y - 1) * width + x) * 4 + 3] > 128 : false;
        const bottomSelected =
          y < height - 1 ? data[((y + 1) * width + x) * 4 + 3] > 128 : false;
        const leftSelected =
          x > 0 ? data[(y * width + (x - 1)) * 4 + 3] > 128 : false;
        const rightSelected =
          x < width - 1 ? data[(y * width + (x + 1)) * 4 + 3] > 128 : false;

        // If any neighbor is unselected, this is an edge
        if (
          !topSelected ||
          !bottomSelected ||
          !leftSelected ||
          !rightSelected
        ) {
          edgePixels.push({ x, y });
        }
      }
    }

    // Draw all edge pixels
    if (edgePixels.length > 0) {
      ctx.beginPath();
      for (const pixel of edgePixels) {
        ctx.strokeRect(pixel.x - 0.5, pixel.y - 0.5, 1, 1);
      }
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [selectionMask, marchOffset]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvas || !isActive) return;

    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    // Get click position relative to overlay canvas
    const rect = overlayCanvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    // Clamp to canvas bounds
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get pixel color at click location
    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b, a] = Array.from(imageData.data);
    const clickedColor = { r, g, b, a };

    // Create selection mask
    const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = fullImageData.data;

    const tolerance = 30;
    const newSelectionMask = ctx.createImageData(canvas.width, canvas.height);
    const maskData = newSelectionMask.data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    let hasSelection = false;

    // Inverse selection: select everything EXCEPT the clicked color
    for (let i = 0; i < data.length; i += 4) {
      const pixelR = data[i];
      const pixelG = data[i + 1];
      const pixelB = data[i + 2];
      const pixelA = data[i + 3];

      const colorDiff =
        Math.abs(pixelR - clickedColor.r) +
        Math.abs(pixelG - clickedColor.g) +
        Math.abs(pixelB - clickedColor.b);

      // If color is different from clicked color, it's selected
      const isSelected = colorDiff > tolerance && pixelA > 128;

      if (isSelected) {
        hasSelection = true;
        const pixelIndex = i / 4;
        const px = pixelIndex % canvas.width;
        const py = Math.floor(pixelIndex / canvas.width);

        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);

        // Mark selected pixels with high alpha
        maskData[i] = 0;
        maskData[i + 1] = 0;
        maskData[i + 2] = 0;
        maskData[i + 3] = 255;
      } else {
        maskData[i + 3] = 0;
      }
    }

    if (!hasSelection) {
      return;
    }

    // Store the selection mask and color
    setSelectionMask(newSelectionMask);
    const hexColor = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
    setSelectedColor(hexColor);

    console.log("Magic Wand selection created:", {
      pixelsSelected: hasSelection,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      },
      color: hexColor,
    });

    // Notify parent of selection
    onSelectionCreate({
      mask: newSelectionMask,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      },
      invertColor: true,
    });
  };

  // Get canvas position for overlay
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
        overflow: "hidden",
      }}
    >
      <canvas
        ref={overlayCanvasRef}
        width={canvas.width}
        height={canvas.height}
        onClick={handleCanvasClick}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "block",
          width: "100%",
          height: "100%",
          cursor: "crosshair",
          zIndex: 10,
        }}
        title="Click on a color to select everything except that color"
      />

      {selectedColor && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: 20,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            border: "2px solid #c8a97e",
            borderRadius: "6px",
            padding: "12px 16px",
            color: "#c8a97e",
            fontSize: "12px",
            zIndex: 1001,
            fontFamily: "monospace",
            boxShadow: "0 0 10px rgba(0, 240, 255, 0.3)",
          }}
        >
          <div style={{ marginBottom: "8px", fontWeight: "bold" }}>
            ✓ Selection Active
          </div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>
            Selected: Everything except{" "}
            <span style={{ color: selectedColor, fontWeight: "bold" }}>
              {selectedColor}
            </span>
          </div>
          <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "6px" }}>
            Press{" "}
            <kbd style={{ background: "#c8a97e20", padding: "2px 4px" }}>
              DELETE
            </kbd>{" "}
            to remove or{" "}
            <kbd style={{ background: "#c8a97e20", padding: "2px 4px" }}>
              CTRL+C
            </kbd>{" "}
            to copy
          </div>
        </div>
      )}
    </div>
  );
}
