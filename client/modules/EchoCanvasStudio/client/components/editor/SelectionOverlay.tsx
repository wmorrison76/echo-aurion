import React, { useRef, useEffect, useState } from "react";

interface SelectionOverlayProps {
  canvas: HTMLCanvasElement | null;
  selectionMask: ImageData | null;
  isActive?: boolean;
}

export default function SelectionOverlay({
  canvas,
  selectionMask,
  isActive = true,
}: SelectionOverlayProps) {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [marchOffset, setMarchOffset] = useState(0);

  // Animate marching ants
  useEffect(() => {
    if (!selectionMask) return;

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
  }, [selectionMask]);

  // Draw marching ants animation
  useEffect(() => {
    if (!canvas || !selectionMask || !overlayCanvasRef.current) return;

    const overlayCanvas = overlayCanvasRef.current;
    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Get the boundary of selected pixels
    const data = selectionMask.data;
    const width = selectionMask.width;
    const height = selectionMask.height;

    const boundary: Array<[number, number]> = [];
    const visited = new Set<number>();

    // Find boundary pixels (selected pixels adjacent to unselected)
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 128) {
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);

        let isBoundary = false;
        const neighbors = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            isBoundary = true;
            break;
          }
          const neighborIndex = (ny * width + nx) * 4;
          if (data[neighborIndex + 3] <= 128) {
            isBoundary = true;
            break;
          }
        }

        if (isBoundary) {
          boundary.push([x, y]);
        }
      }
    }

    // Draw marching ants outline
    ctx.strokeStyle = "rgba(0, 240, 255, 1)";
    ctx.lineWidth = 1;
    ctx.lineCap = "butt";
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -marchOffset;

    if (boundary.length > 0) {
      // Group boundary pixels into line segments for smoother rendering
      ctx.beginPath();

      // Sort boundary points to form a continuous line
      const sortedBoundary: Array<[number, number]> = [];
      const usedPixels = new Set<number>();

      if (boundary.length > 0) {
        let current = boundary[0];
        sortedBoundary.push(current);
        usedPixels.add(boundary.indexOf(current));

        while (sortedBoundary.length < boundary.length) {
          let nearest = boundary[0];
          let nearestDist = Infinity;
          let nearestIndex = 0;

          for (let i = 0; i < boundary.length; i++) {
            if (usedPixels.has(i)) continue;
            const [x, y] = boundary[i];
            const [cx, cy] = current;
            const dist = Math.hypot(x - cx, y - cy);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = [x, y];
              nearestIndex = i;
            }
          }

          if (nearestDist > 10) break;

          sortedBoundary.push(nearest);
          usedPixels.add(nearestIndex);
          current = nearest;
        }

        ctx.moveTo(sortedBoundary[0][0], sortedBoundary[0][1]);
        for (let i = 1; i < sortedBoundary.length; i++) {
          ctx.lineTo(sortedBoundary[i][0], sortedBoundary[i][1]);
        }
      }

      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [selectionMask, marchOffset, canvas]);

  if (!canvas || !selectionMask || !isActive) return null;

  const canvasRect = canvas.parentElement?.getBoundingClientRect();
  if (!canvasRect) return null;

  return (
    <canvas
      ref={overlayCanvasRef}
      style={{
        position: "fixed",
        left: canvasRect.left,
        top: canvasRect.top,
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
}
