/**
 * Layer Composition Engine
 * Combines transparent layer images into final composite cake image
 * 
 * Features:
 * - OffscreenCanvas for pixel-perfect composition
 * - Preserves transparency (PNG alpha channel)
 * - Supports opacity and positioning
 * - Exports as WebP or PNG
 * - Handles large images efficiently
 */

export interface CompositionLayer {
  imageUrl: string;
  x: number;
  y: number;
  opacity: number;
  zIndex: number;
  rotation?: number;
  scale?: number;
}

export interface CompositionConfig {
  baseWidth: number;
  baseHeight: number;
  layers: CompositionLayer[];
  backgroundColor?: string;
  format?: "png" | "webp";
  quality?: number;
}

export interface CompositionResult {
  blob: Blob;
  dataUrl: string;
  size: number;
  format: string;
  width: number;
  height: number;
  timestamp: string;
}

class LayerCompositor {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.canvas = new OffscreenCanvas(width, height);
    const ctx = this.canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    this.ctx = ctx;
  }

  /**
   * Set canvas background
   */
  setBackground(color: string = "transparent"): void {
    if (color === "transparent") {
      // Clear for transparency
      this.ctx.clearRect(0, 0, this.width, this.height);
    } else {
      // Fill with color
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Load image from URL
   */
  private async loadImage(url: string): Promise<CanvasImageSource> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        resolve(img);
      };

      img.onerror = (error) => {
        console.error("[LayerCompositor] Failed to load image:", url, error);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Draw single layer on canvas
   */
  private async drawLayer(layer: CompositionLayer): Promise<void> {
    try {
      const image = await this.loadImage(layer.imageUrl);

      this.ctx.save();

      // Apply opacity
      this.ctx.globalAlpha = layer.opacity;

      // Apply transformations
      if (layer.rotation || layer.scale) {
        const x = layer.x + (image as HTMLImageElement).width / 2;
        const y = layer.y + (image as HTMLImageElement).height / 2;

        this.ctx.translate(x, y);

        if (layer.rotation) {
          this.ctx.rotate((layer.rotation * Math.PI) / 180);
        }

        if (layer.scale) {
          this.ctx.scale(layer.scale, layer.scale);
        }

        this.ctx.translate(-x, -y);
      }

      // Draw image
      this.ctx.drawImage(
        image,
        layer.x,
        layer.y,
        (image as HTMLImageElement).width,
        (image as HTMLImageElement).height
      );

      this.ctx.restore();
    } catch (error) {
      console.error("[LayerCompositor] Failed to draw layer", error);
      throw error;
    }
  }

  /**
   * Compose all layers
   */
  async compose(layers: CompositionLayer[]): Promise<void> {
    // Sort by zIndex
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    // Draw each layer
    for (const layer of sortedLayers) {
      await this.drawLayer(layer);
    }
  }

  /**
   * Export as Blob
   */
  async export(
    format: "png" | "webp" = "png",
    quality: number = 0.95
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        if (format === "png") {
          this.canvas.convertToBlob({ type: "image/png" }).then(resolve);
        } else if (format === "webp") {
          this.canvas
            .convertToBlob({ type: "image/webp", quality })
            .then(resolve);
        } else {
          reject(new Error(`Unsupported format: ${format}`));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export as data URL (for preview)
   */
  async exportAsDataUrl(): Promise<string> {
    const blob = await this.export("webp", 0.9);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Clear canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}

/**
 * Compose layers into final image
 */
export async function composeLayers(
  config: CompositionConfig
): Promise<CompositionResult> {
  try {
    const compositor = new LayerCompositor(config.baseWidth, config.baseHeight);

    // Set background
    compositor.setBackground(config.backgroundColor);

    // Compose layers
    await compositor.compose(config.layers);

    // Export
    const blob = await compositor.export(
      config.format || "png",
      config.quality || 0.95
    );

    // Create data URL for preview
    const dataUrl = await compositor.exportAsDataUrl();

    return {
      blob,
      dataUrl,
      size: blob.size,
      format: config.format || "png",
      width: config.baseWidth,
      height: config.baseHeight,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[LayerComposition] Composition failed", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to compose layers");
  }
}

/**
 * Upload composed image to cloud storage
 */
export async function uploadComposedImage(
  blob: Blob,
  fileName: string,
  apiBaseUrl: string = "/api"
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", blob, fileName);

    const response = await fetch(`${apiBaseUrl}/upload-image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { url: string };
    return data.url;
  } catch (error) {
    console.error("[LayerComposition] Upload failed", error);
    throw error;
  }
}

/**
 * Helper: Generate file name with timestamp
 */
export function generateCompositionFileName(designId: string): string {
  const timestamp = new Date().getTime();
  return `cake-${designId}-${timestamp}.png`;
}

/**
 * Helper: Validate composition config
 */
export function validateCompositionConfig(
  config: Partial<CompositionConfig>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.baseWidth || config.baseWidth <= 0) {
    errors.push("baseWidth must be positive");
  }

  if (!config.baseHeight || config.baseHeight <= 0) {
    errors.push("baseHeight must be positive");
  }

  if (!Array.isArray(config.layers) || config.layers.length === 0) {
    errors.push("layers must be non-empty array");
  }

  if (config.layers) {
    config.layers.forEach((layer, idx) => {
      if (!layer.imageUrl) {
        errors.push(`Layer ${idx}: missing imageUrl`);
      }

      if (typeof layer.x !== "number" || typeof layer.y !== "number") {
        errors.push(`Layer ${idx}: missing x or y position`);
      }

      if (typeof layer.opacity !== "number" || layer.opacity < 0 || layer.opacity > 1) {
        errors.push(`Layer ${idx}: opacity must be 0-1`);
      }

      if (typeof layer.zIndex !== "number") {
        errors.push(`Layer ${idx}: missing zIndex`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper: Create composition from tiers
 */
export function createCompositionFromTiers(
  tierImages: Array<{ imageUrl: string; zIndex: number }>,
  baseWidth: number = 1024,
  baseHeight: number = 1024
): CompositionConfig {
  const layers: CompositionLayer[] = tierImages.map((tier) => ({
    imageUrl: tier.imageUrl,
    x: 0,
    y: 0,
    opacity: 1,
    zIndex: tier.zIndex,
  }));

  return {
    baseWidth,
    baseHeight,
    layers,
    backgroundColor: "transparent",
    format: "png",
    quality: 0.95,
  };
}

export default {
  LayerCompositor,
  composeLayers,
  uploadComposedImage,
  generateCompositionFileName,
  validateCompositionConfig,
  createCompositionFromTiers,
};
