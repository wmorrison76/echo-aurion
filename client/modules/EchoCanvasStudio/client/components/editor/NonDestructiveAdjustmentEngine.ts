/**
 * Non-Destructive Adjustment Engine
 * Evaluates and applies adjustment operation stacks to canvas without modifying source
 */

import {
  AdjustmentLayer,
  AdjustmentOperation,
  AdjustmentType,
  BrightnessContrastParams,
  LevelsParams,
  CurvesParams,
  HueSaturationParams,
  ColorBalanceParams,
  PosterizeParams,
  BlurParams,
  SharpenParams,
  ExposureParams,
  VibranceParams,
  TemperatureParams,
} from "../lib/adjustment-operations";

export class NonDestructiveAdjustmentEngine {
  private cache: Map<string, ImageData> = new Map();
  private cacheMaxSize = 50;

  applyAdjustmentLayers(
    sourceCanvas: HTMLCanvasElement,
    layers: AdjustmentLayer[],
  ): HTMLCanvasElement {
    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = sourceCanvas.width;
    resultCanvas.height = sourceCanvas.height;
    const resultCtx = resultCanvas.getContext("2d");
    if (!resultCtx) return sourceCanvas;

    resultCtx.drawImage(sourceCanvas, 0, 0);

    let currentImageData = resultCtx.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    );

    const visibleLayers = layers.filter((layer) => layer.visible);

    for (const layer of visibleLayers) {
      if (layer.operations.length === 0) continue;

      const layerCanvas = document.createElement("canvas");
      layerCanvas.width = sourceCanvas.width;
      layerCanvas.height = sourceCanvas.height;
      const layerCtx = layerCanvas.getContext("2d");
      if (!layerCtx) continue;

      layerCtx.putImageData(currentImageData, 0, 0);

      for (const operation of layer.operations) {
        if (!operation.enabled) continue;

        const opCanvas = this.applyOperation(layerCanvas, operation);
        const opCtx = opCanvas.getContext("2d");
        if (!opCtx) continue;

        currentImageData = opCtx.getImageData(
          0,
          0,
          opCanvas.width,
          opCanvas.height,
        );
      }

      const finalCtx = layerCanvas.getContext("2d");
      if (finalCtx) {
        finalCtx.putImageData(currentImageData, 0, 0);
        const blendCtx = document.createElement("canvas").getContext("2d");
        if (blendCtx) {
          blendCtx.canvas.width = sourceCanvas.width;
          blendCtx.canvas.height = sourceCanvas.height;
          blendCtx.putImageData(
            resultCtx.getImageData(
              0,
              0,
              sourceCanvas.width,
              sourceCanvas.height,
            ),
            0,
            0,
          );
          blendCtx.globalAlpha = layer.opacity / 100;
          blendCtx.globalCompositeOperation = (layer.blendMode ||
            "source-over") as GlobalCompositeOperation;
          blendCtx.drawImage(layerCanvas, 0, 0);
          currentImageData = blendCtx.getImageData(
            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height,
          );
          resultCtx.putImageData(currentImageData, 0, 0);
        }
      }
    }

    return resultCanvas;
  }

  private applyOperation(
    canvas: HTMLCanvasElement,
    operation: AdjustmentOperation,
  ): HTMLCanvasElement {
    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    const resultCtx = resultCanvas.getContext("2d");
    if (!resultCtx) return canvas;

    const sourceCtx = canvas.getContext("2d");
    if (!sourceCtx) return canvas;

    const imageData = sourceCtx.getImageData(0, 0, canvas.width, canvas.height);

    switch (operation.type) {
      case "brightness":
        this.applyBrightnessContrast(
          imageData,
          operation.params as BrightnessContrastParams,
        );
        break;
      case "contrast":
        this.applyBrightnessContrast(
          imageData,
          operation.params as BrightnessContrastParams,
        );
        break;
      case "levels":
        this.applyLevels(imageData, operation.params as LevelsParams);
        break;
      case "curves":
        this.applyCurves(imageData, operation.params as CurvesParams);
        break;
      case "hue-saturation":
        this.applyHueSaturation(
          imageData,
          operation.params as HueSaturationParams,
        );
        break;
      case "color-balance":
        this.applyColorBalance(
          imageData,
          operation.params as ColorBalanceParams,
        );
        break;
      case "desaturate":
        this.applyDesaturate(imageData);
        break;
      case "invert":
        this.applyInvert(imageData);
        break;
      case "posterize":
        this.applyPosterize(imageData, operation.params as PosterizeParams);
        break;
      case "blur":
        return this.applyBlur(canvas, operation.params as BlurParams);
      case "sharpen":
        this.applySharpen(imageData, operation.params as SharpenParams);
        break;
      case "exposure":
        this.applyExposure(imageData, operation.params as ExposureParams);
        break;
      case "vibrance":
        this.applyVibrance(imageData, operation.params as VibranceParams);
        break;
      case "temperature":
        this.applyTemperature(imageData, operation.params as TemperatureParams);
        break;
    }

    resultCtx.putImageData(imageData, 0, 0);
    return resultCanvas;
  }

  private applyBrightnessContrast(
    imageData: ImageData,
    params: BrightnessContrastParams,
  ): void {
    const { brightness, contrast } = params;
    const data = imageData.data;

    const brightnessFactor = brightness / 100;
    const contrastFactor = (contrast + 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      r = Math.min(
        255,
        Math.max(0, (r - 128) * contrastFactor + 128 + brightnessFactor * 255),
      );
      g = Math.min(
        255,
        Math.max(0, (g - 128) * contrastFactor + 128 + brightnessFactor * 255),
      );
      b = Math.min(
        255,
        Math.max(0, (b - 128) * contrastFactor + 128 + brightnessFactor * 255),
      );

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  private applyLevels(imageData: ImageData, params: LevelsParams): void {
    const { blackPoint, whitePoint, gamma } = params;
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let value = data[i + j];
        value = ((value - blackPoint) / (whitePoint - blackPoint)) * 255;
        value = Math.pow(value / 255, 1 / gamma) * 255;
        data[i + j] = Math.min(255, Math.max(0, value));
      }
    }
  }

  private applyCurves(imageData: ImageData, params: CurvesParams): void {
    const { red: redCurve, green: greenCurve, blue: blueCurve } = params;
    const data = imageData.data;

    const redLut = this.buildCurveLut(redCurve);
    const greenLut = this.buildCurveLut(greenCurve);
    const blueLut = this.buildCurveLut(blueCurve);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = redLut[data[i]];
      data[i + 1] = greenLut[data[i + 1]];
      data[i + 2] = blueLut[data[i + 2]];
    }
  }

  private buildCurveLut(
    points: Array<{ x: number; y: number }>,
  ): Uint8ClampedArray {
    const lut = new Uint8ClampedArray(256);
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    for (let i = 0; i < 256; i++) {
      let y = i;
      for (let j = 0; j < sortedPoints.length - 1; j++) {
        const p1 = sortedPoints[j];
        const p2 = sortedPoints[j + 1];
        if (i >= p1.x && i <= p2.x) {
          const t = (i - p1.x) / (p2.x - p1.x);
          y = p1.y + t * (p2.y - p1.y);
          break;
        }
      }
      lut[i] = Math.min(255, Math.max(0, y));
    }

    return lut;
  }

  private applyHueSaturation(
    imageData: ImageData,
    params: HueSaturationParams,
  ): void {
    const { hue, saturation, lightness, colorize } = params;
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);

      let newH = (h + hue / 360) % 1;
      if (newH < 0) newH += 1;

      let newS = Math.min(1, Math.max(0, s + saturation / 100));
      let newL = Math.min(1, Math.max(0, l + lightness / 100));

      const [r, g, b] = this.hslToRgb(newH, newS, newL);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  private applyColorBalance(
    imageData: ImageData,
    params: ColorBalanceParams,
  ): void {
    const { shadows, midtones, highlights } = params;
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3 / 255;

      let adjustmentTone = shadows;
      if (brightness > 0.33 && brightness < 0.66) {
        adjustmentTone = midtones;
      } else if (brightness >= 0.66) {
        adjustmentTone = highlights;
      }

      data[i] = Math.min(
        255,
        Math.max(0, r + (adjustmentTone.cyan - adjustmentTone.magenta) * 1.5),
      );
      data[i + 1] = Math.min(
        255,
        Math.max(0, g + adjustmentTone.magenta * 1.5),
      );
      data[i + 2] = Math.min(
        255,
        Math.max(0, b + (adjustmentTone.yellow - adjustmentTone.cyan) * 1.5),
      );
    }
  }

  private applyDesaturate(imageData: ImageData): void {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
      );
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }

  private applyInvert(imageData: ImageData): void {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  }

  private applyPosterize(imageData: ImageData, params: PosterizeParams): void {
    const { levels } = params;
    const data = imageData.data;
    const step = 256 / levels;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] / step) * step;
      data[i + 1] = Math.round(data[i + 1] / step) * step;
      data[i + 2] = Math.round(data[i + 2] / step) * step;
    }
  }

  private applyBlur(
    canvas: HTMLCanvasElement,
    params: BlurParams,
  ): HTMLCanvasElement {
    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    const resultCtx = resultCanvas.getContext("2d");
    if (!resultCtx) return canvas;

    resultCtx.filter = `blur(${params.radius}px)`;
    resultCtx.drawImage(canvas, 0, 0);
    return resultCanvas;
  }

  private applySharpen(imageData: ImageData, params: SharpenParams): void {
    const { amount, radius } = params;
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const kernel = this.buildSharpenKernel(radius, amount);
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const px = Math.min(width - 1, Math.max(0, x + kx));
              const py = Math.min(height - 1, Math.max(0, y + ky));
              const idx = (py * width + px) * 4 + c;
              sum += data[idx] * kernel[ky + 1][kx + 1];
            }
          }
          output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
        }
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = output[i];
    }
  }

  private buildSharpenKernel(radius: number, amount: number): number[][] {
    const kernel = [
      [0, -amount, 0],
      [-amount, 1 + 4 * amount, -amount],
      [0, -amount, 0],
    ];
    return kernel;
  }

  private applyExposure(imageData: ImageData, params: ExposureParams): void {
    const { exposure, offset, gammaCorrection } = params;
    const data = imageData.data;
    const exposureFactor = Math.pow(2, exposure);

    for (let i = 0; i < data.length; i += 4) {
      let r = (data[i] / 255) * exposureFactor + offset / 100;
      let g = (data[i + 1] / 255) * exposureFactor + offset / 100;
      let b = (data[i + 2] / 255) * exposureFactor + offset / 100;

      r = Math.pow(r, 1 / gammaCorrection) * 255;
      g = Math.pow(g, 1 / gammaCorrection) * 255;
      b = Math.pow(b, 1 / gammaCorrection) * 255;

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
  }

  private applyVibrance(imageData: ImageData, params: VibranceParams): void {
    const { vibrance, saturation } = params;
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const [h, s, l] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);
      const newS = Math.min(1, Math.max(0, s + (vibrance + saturation) / 100));
      const [r, g, b] = this.hslToRgb(h, newS, l);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  private applyTemperature(
    imageData: ImageData,
    params: TemperatureParams,
  ): void {
    const { temperature, tint } = params;
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (temperature > 0) {
        r = Math.min(255, r + temperature * 1.5);
        b = Math.max(0, b - temperature);
      } else {
        b = Math.min(255, b - temperature * 1.5);
        r = Math.max(0, r + temperature);
      }

      g = Math.min(255, Math.max(0, g + tint));

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return [h, s, l];
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  clearCache(): void {
    this.cache.clear();
  }
}
