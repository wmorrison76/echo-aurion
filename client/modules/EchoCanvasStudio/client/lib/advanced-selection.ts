/**
 * Advanced Selection System
 * Includes ML-based subject selection, refine edge, and segmentation
 */

export interface SelectionMask {
  canvas: HTMLCanvasElement;
  data: Uint8ClampedArray;
  width: number;
  height: number;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface SelectionMetadata {
  type: "subject" | "object" | "color-range" | "edge" | "custom";
  confidence: number;
  timestamp: number;
}

export interface RefineEdgeParams {
  radius: number;
  contrast: number;
  smooth: number;
  feather: number;
  shift: number;
  mode: "contract" | "expand" | "smooth" | "feather";
}

export interface SegmentationResult {
  mask: SelectionMask;
  metadata: SelectionMetadata;
  boundingBoxes?: Array<{
    label: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
}

export class AdvancedSelectionEngine {
  private segmentationApi = "/api/ai/segment-subject";
  private refinementApi = "/api/ai/refine-edge";

  /**
   * Select subject using ML-based segmentation
   */
  async selectSubject(canvas: HTMLCanvasElement): Promise<SegmentationResult> {
    const imageData = canvas
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) throw new Error("Failed to get canvas image data");

    const blob = await this.canvasToBlob(canvas);
    const formData = new FormData();
    formData.append("image", blob);

    try {
      const response = await fetch(this.segmentationApi, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Segmentation API failed");

      const result = await response.json();
      const maskCanvas = await this.base64ToCanvas(result.maskBase64);

      return {
        mask: this.extractMaskFromCanvas(maskCanvas),
        metadata: {
          type: "subject",
          confidence: result.confidence || 0.95,
          timestamp: Date.now(),
        },
        boundingBoxes: result.boundingBoxes,
      };
    } catch (error) {
      console.error("Select subject failed:", error);
      throw error;
    }
  }

  /**
   * Refine edges of a selection using ML
   */
  async refineEdges(
    selectionMask: SelectionMask,
    canvas: HTMLCanvasElement,
    params: RefineEdgeParams,
  ): Promise<SelectionMask> {
    const imageData = canvas
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) throw new Error("Failed to get canvas image data");

    const maskBlob = await this.maskToBlob(selectionMask);
    const imageBlob = await this.canvasToBlob(canvas);

    const formData = new FormData();
    formData.append("image", imageBlob);
    formData.append("mask", maskBlob);
    formData.append("params", JSON.stringify(params));

    try {
      const response = await fetch(this.refinementApi, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Refinement API failed");

      const result = await response.json();
      const refinedCanvas = await this.base64ToCanvas(result.refinedMaskBase64);

      return this.extractMaskFromCanvas(refinedCanvas);
    } catch (error) {
      console.error("Refine edges failed:", error);
      throw error;
    }
  }

  /**
   * Expand or contract selection
   */
  modifySelection(
    mask: SelectionMask,
    operation: "expand" | "contract" | "feather" | "smooth",
    amount: number,
  ): SelectionMask {
    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = mask.width;
    resultCanvas.height = mask.height;
    const ctx = resultCanvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.putImageData(new ImageData(mask.data, mask.width, mask.height), 0, 0);

    switch (operation) {
      case "expand":
        return this.expandSelection(mask, amount);
      case "contract":
        return this.contractSelection(mask, amount);
      case "feather":
        return this.featherSelection(mask, amount);
      case "smooth":
        return this.smoothSelection(mask, amount);
      default:
        return mask;
    }
  }

  /**
   * Invert selection
   */
  invertSelection(mask: SelectionMask): SelectionMask {
    const data = new Uint8ClampedArray(mask.data.length);
    for (let i = 0; i < mask.data.length; i += 4) {
      data[i] = 255 - mask.data[i];
      data[i + 1] = 255 - mask.data[i + 1];
      data[i + 2] = 255 - mask.data[i + 2];
      data[i + 3] = mask.data[i + 3];
    }

    const canvas = document.createElement("canvas");
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.putImageData(new ImageData(data, mask.width, mask.height), 0, 0);

    return {
      canvas,
      data,
      width: mask.width,
      height: mask.height,
      bbox: mask.bbox,
    };
  }

  /**
   * Combine two selections (union)
   */
  combineSelections(mask1: SelectionMask, mask2: SelectionMask): SelectionMask {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(mask1.width, mask2.width);
    canvas.height = Math.max(mask1.height, mask2.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);

    for (let i = 0; i < Math.min(mask1.data.length, data.length); i += 4) {
      data[i] = Math.max(mask1.data[i], mask2.data[i] || 0);
      data[i + 1] = Math.max(mask1.data[i + 1], mask2.data[i + 1] || 0);
      data[i + 2] = Math.max(mask1.data[i + 2], mask2.data[i + 2] || 0);
      data[i + 3] = 255;
    }

    ctx.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);

    return this.extractMaskFromCanvas(canvas);
  }

  /**
   * Intersect two selections
   */
  intersectSelections(
    mask1: SelectionMask,
    mask2: SelectionMask,
  ): SelectionMask {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(mask1.width, mask2.width);
    canvas.height = Math.max(mask1.height, mask2.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);

    for (let i = 0; i < Math.min(mask1.data.length, data.length); i += 4) {
      data[i] = Math.min(mask1.data[i], mask2.data[i] || 0);
      data[i + 1] = Math.min(mask1.data[i + 1], mask2.data[i + 1] || 0);
      data[i + 2] = Math.min(mask1.data[i + 2], mask2.data[i + 2] || 0);
      data[i + 3] = 255;
    }

    ctx.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);

    return this.extractMaskFromCanvas(canvas);
  }

  private expandSelection(mask: SelectionMask, amount: number): SelectionMask {
    return this.dilateSelection(mask, amount);
  }

  private contractSelection(
    mask: SelectionMask,
    amount: number,
  ): SelectionMask {
    return this.erodeSelection(mask, amount);
  }

  private featherSelection(mask: SelectionMask, radius: number): SelectionMask {
    const canvas = document.createElement("canvas");
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.putImageData(new ImageData(mask.data, mask.width, mask.height), 0, 0);

    ctx.filter = `blur(${radius}px)`;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);

    return this.extractMaskFromCanvas(canvas);
  }

  private smoothSelection(mask: SelectionMask, amount: number): SelectionMask {
    const kernel = this.getBoxBlurKernel(amount);
    return this.applyKernelToMask(mask, kernel);
  }

  private dilateSelection(mask: SelectionMask, radius: number): SelectionMask {
    const data = new Uint8ClampedArray(mask.data.length);
    data.set(mask.data);

    const threshold = 128;
    for (let i = 0; i < data.length; i += 4) {
      const isWhite = data[i] > threshold;
      if (isWhite) {
        for (let y = -radius; y <= radius; y++) {
          for (let x = -radius; x <= radius; x++) {
            const dist = Math.sqrt(x * x + y * y);
            if (dist <= radius) {
              const pixelIndex = i + (y * mask.width + x) * 4;
              if (pixelIndex >= 0 && pixelIndex < data.length) {
                data[pixelIndex] = 255;
              }
            }
          }
        }
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.putImageData(new ImageData(data, mask.width, mask.height), 0, 0);

    return this.extractMaskFromCanvas(canvas);
  }

  private erodeSelection(mask: SelectionMask, radius: number): SelectionMask {
    const data = new Uint8ClampedArray(mask.data.length);

    const threshold = 128;
    for (let i = 0; i < data.length; i += 4) {
      let isEroded = false;
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          const dist = Math.sqrt(x * x + y * y);
          if (dist <= radius) {
            const pixelIndex = i + (y * mask.width + x) * 4;
            if (pixelIndex < 0 || pixelIndex >= data.length) {
              isEroded = true;
              break;
            }
            if (mask.data[pixelIndex] < threshold) {
              isEroded = true;
              break;
            }
          }
        }
        if (isEroded) break;
      }
      data[i] = isEroded ? 0 : 255;
      data[i + 1] = isEroded ? 0 : 255;
      data[i + 2] = isEroded ? 0 : 255;
      data[i + 3] = 255;
    }

    const canvas = document.createElement("canvas");
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.putImageData(new ImageData(data, mask.width, mask.height), 0, 0);

    return this.extractMaskFromCanvas(canvas);
  }

  private applyKernelToMask(
    mask: SelectionMask,
    kernel: number[][],
  ): SelectionMask {
    const size = kernel.length;
    const offset = Math.floor(size / 2);
    const data = new Uint8ClampedArray(mask.data.length);

    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        let sum = 0;
        let weight = 0;
        for (let ky = 0; ky < size; ky++) {
          for (let kx = 0; kx < size; kx++) {
            const px = x + kx - offset;
            const py = y + ky - offset;
            if (px >= 0 && px < mask.width && py >= 0 && py < mask.height) {
              const idx = (py * mask.width + px) * 4;
              sum += mask.data[idx] * kernel[ky][kx];
              weight += kernel[ky][kx];
            }
          }
        }
        const idx = (y * mask.width + x) * 4;
        const value = Math.round(sum / weight);
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.putImageData(new ImageData(data, mask.width, mask.height), 0, 0);

    return this.extractMaskFromCanvas(canvas);
  }

  private getBoxBlurKernel(radius: number): number[][] {
    const size = radius * 2 + 1;
    const kernel: number[][] = [];
    const weight = 1 / (size * size);
    for (let i = 0; i < size; i++) {
      kernel[i] = new Array(size).fill(weight);
    }
    return kernel;
  }

  private extractMaskFromCanvas(canvas: HTMLCanvasElement): SelectionMask {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width,
      minY = canvas.height,
      maxX = 0,
      maxY = 0;

    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 128) {
        const pixelIndex = i / 4;
        const x = pixelIndex % canvas.width;
        const y = Math.floor(pixelIndex / canvas.width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    return {
      canvas,
      data: imageData.data,
      width: canvas.width,
      height: canvas.height,
      bbox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
    };
  }

  private async canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to convert canvas to blob"));
      }, "image/png");
    });
  }

  private async maskToBlob(mask: SelectionMask): Promise<Blob> {
    return this.canvasToBlob(mask.canvas);
  }

  private async base64ToCanvas(base64: string): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = base64;

    return new Promise((resolve) => {
      img.onload = () => resolve(canvas);
    });
  }
}

export const advancedSelectionEngine = new AdvancedSelectionEngine();
