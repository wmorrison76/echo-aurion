/**
 * Auto-crop canvas to remove transparent padding
 * Finds the bounding box of all non-transparent pixels
 */
export function getTransparentBounds(
  canvas: HTMLCanvasElement,
): { x: number; y: number; width: number; height: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let hasNonTransparent = false;

  // Find bounds of non-transparent pixels
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]; // Alpha channel
    if (alpha > 0) {
      const pixelIndex = i / 4;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      hasNonTransparent = true;
    }
  }

  if (!hasNonTransparent) {
    return null; // Entire canvas is transparent
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Apply auto-crop by removing transparent padding
 */
export function autoCropCanvas(
  canvas: HTMLCanvasElement,
): HTMLCanvasElement | null {
  const bounds = getTransparentBounds(canvas);
  if (!bounds) return null;

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = bounds.width;
  croppedCanvas.height = bounds.height;

  const croppedCtx = croppedCanvas.getContext("2d");
  if (!croppedCtx) return null;

  const imageData = canvas
    .getContext("2d")
    ?.getImageData(0, 0, canvas.width, canvas.height);
  if (!imageData) return null;

  const croppedImageData = croppedCtx.createImageData(
    bounds.width,
    bounds.height,
  );
  const croppedData = croppedImageData.data;
  const originalData = imageData.data;

  // Copy the relevant pixels
  for (let y = 0; y < bounds.height; y++) {
    for (let x = 0; x < bounds.width; x++) {
      const sourceIndex = ((y + bounds.y) * canvas.width + (x + bounds.x)) * 4;
      const destIndex = (y * bounds.width + x) * 4;

      croppedData[destIndex] = originalData[sourceIndex];
      croppedData[destIndex + 1] = originalData[sourceIndex + 1];
      croppedData[destIndex + 2] = originalData[sourceIndex + 2];
      croppedData[destIndex + 3] = originalData[sourceIndex + 3];
    }
  }

  croppedCtx.putImageData(croppedImageData, 0, 0);
  return croppedCanvas;
}
