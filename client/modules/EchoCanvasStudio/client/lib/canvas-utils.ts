/**
 * Canvas utility functions for common operations
 * Reduces code duplication across Editor, CanvasEngine, and FilterEngine
 */

/**
 * Create a new temporary canvas with given dimensions
 */
export function createTempCanvas(
  width: number,
  height: number
): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context from canvas");
  return ctx;
}

/**
 * Copy a canvas to a temporary canvas
 */
export function copyCanvasToTemp(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  const tempCtx = createTempCanvas(canvas.width, canvas.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context from source canvas");
  tempCtx.drawImage(canvas, 0, 0);
  return tempCtx;
}

/**
 * Convert an image or ImageData to a canvas context
 */
export function imageToCanvas(
  image: HTMLImageElement | ImageData
): CanvasRenderingContext2D {
  if (image instanceof ImageData) {
    const ctx = createTempCanvas(image.width, image.height);
    ctx.putImageData(image, 0, 0);
    return ctx;
  } else {
    const ctx = createTempCanvas(image.width, image.height);
    ctx.drawImage(image, 0, 0);
    return ctx;
  }
}

/**
 * Get ImageData from a canvas context
 */
export function canvasToImageData(
  ctx: CanvasRenderingContext2D
): ImageData {
  return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Load an image from URL asynchronously
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Crop canvas to remove transparent borders
 */
export function cropCanvasToContent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context");

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width,
    minY = canvas.height;
  let maxX = 0,
    maxY = 0;
  let hasContent = false;

  // Find bounding box of non-transparent pixels
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) {
      hasContent = true;
      const index = i / 4;
      const x = index % canvas.width;
      const y = Math.floor(index / canvas.width);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!hasContent) return canvas;

  // Create new canvas with cropped content
  const newCanvas = document.createElement("canvas");
  newCanvas.width = maxX - minX + 1;
  newCanvas.height = maxY - minY + 1;
  const newCtx = newCanvas.getContext("2d");
  if (!newCtx) throw new Error("Failed to create new canvas");

  newCtx.drawImage(canvas, -minX, -minY);
  return newCanvas;
}

/**
 * Get the bounding box of non-transparent content
 */
export function getTransparentBounds(
  canvas: HTMLCanvasElement
): { x: number; y: number; width: number; height: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width,
    minY = canvas.height;
  let maxX = 0,
    maxY = 0;
  let hasContent = false;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) {
      hasContent = true;
      const index = i / 4;
      const x = index % canvas.width;
      const y = Math.floor(index / canvas.width);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!hasContent) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Create a thumbnail from canvas (used for layer thumbnails)
 */
export function createCanvasThumbnail(
  canvas: HTMLCanvasElement,
  size: number = 80
): HTMLCanvasElement {
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = size;
  thumbCanvas.height = size;

  const ctx = thumbCanvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context for thumbnail");

  // Calculate aspect ratio and draw scaled image
  const scale = Math.min(size / canvas.width, size / canvas.height);
  const scaledWidth = canvas.width * scale;
  const scaledHeight = canvas.height * scale;
  const x = (size - scaledWidth) / 2;
  const y = (size - scaledHeight) / 2;

  ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
  return thumbCanvas;
}
