export type ToolType =
  | "brush"
  | "pencil"
  | "eraser"
  | "clone-stamp"
  | "bucket-fill"
  | "gradient"
  | "smudge"
  | "blur-sharpen";

export interface DrawingState {
  isDrawing: boolean;
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  activeTool?: ToolType;
  activeOptions?: DrawingOptions;
}

export interface DrawingOptions {
  color: string;
  size: number;
  opacity: number;
  tool: ToolType;
  hardness?: number; // 0-100, softness of brush
  snapToGrid?: boolean;
  gridSize?: number;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drawingState: DrawingState = {
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
  };
  private imageData: ImageData | null = null;
  private history: ImageData[] = [];
  private maxHistorySteps = 50;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    this.ctx = ctx;
    this.saveSnapshot();
  }

  /** Save current canvas state to history */
  saveSnapshot() {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.history.push(imageData);
    if (this.history.length > this.maxHistorySteps) {
      this.history.shift();
    }
  }

  /** Undo last action */
  undo() {
    if (this.history.length > 1) {
      this.history.pop();
      const imageData = this.history[this.history.length - 1];
      this.ctx.putImageData(imageData, 0, 0);
    }
  }

  /** Start drawing */
  startDrawing(x: number, y: number, options: DrawingOptions) {
    this.drawingState.isDrawing = true;
    this.drawingState.lastX = x;
    this.drawingState.lastY = y;
    this.drawingState.startX = x;
    this.drawingState.startY = y;
    this.drawingState.activeTool = options.tool;
    this.drawingState.activeOptions = options;

    if (options.tool === "bucket-fill") {
      this.bucketFill(x, y, options);
      this.saveSnapshot();
    }
  }

  /** Draw or paint on canvas */
  draw(x: number, y: number, options: DrawingOptions) {
    if (!this.drawingState.isDrawing) return;
    let drawX = x;
    let drawY = y;
    let lastX = this.drawingState.lastX;
    let lastY = this.drawingState.lastY;

    // Snap to grid if enabled
    if (options.snapToGrid && options.gridSize) {
      drawX = Math.round(x / options.gridSize) * options.gridSize;
      drawY = Math.round(y / options.gridSize) * options.gridSize;
      lastX = Math.round(lastX / options.gridSize) * options.gridSize;
      lastY = Math.round(lastY / options.gridSize) * options.gridSize;
    }

    this.ctx.save();
    this.ctx.globalAlpha = options.opacity / 100;
    switch (options.tool) {
      case "brush":
        this.drawBrush(lastX, lastY, drawX, drawY, options);
        break;
      case "pencil":
        this.drawPencil(lastX, lastY, drawX, drawY, options);
        break;
      case "eraser":
        this.drawEraser(lastX, lastY, drawX, drawY, options);
        break;
      case "clone-stamp":
        this.drawCloneStamp(lastX, lastY, drawX, drawY, options);
        break;
      case "blur-sharpen":
        this.blurSharpen(lastX, lastY, drawX, drawY, options);
        break;
      case "smudge":
        this.smudge(lastX, lastY, drawX, drawY, options);
        break;
      case "gradient":
      case "bucket-fill":
        break;
    }
    this.ctx.restore();
    this.drawingState.lastX = drawX;
    this.drawingState.lastY = drawY;
  }

  /** Finish drawing */
  endDrawing() {
    if (!this.drawingState.isDrawing) return;

    if (
      this.drawingState.activeTool === "gradient" &&
      this.drawingState.activeOptions
    ) {
      this.applyGradient(
        this.drawingState.startX,
        this.drawingState.startY,
        this.drawingState.lastX,
        this.drawingState.lastY,
        this.drawingState.activeOptions,
      );
    }

    this.drawingState.isDrawing = false;
    this.drawingState.activeTool = undefined;
    this.drawingState.activeOptions = undefined;
    this.saveSnapshot();
  }

  /** Draw brush stroke with soft edges */
  private drawBrush(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: DrawingOptions,
  ) {
    const { color, size, hardness = 50 } = options;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    // Draw line from last point to current point
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    // Add soft brush effect with multiple passes for better effect
    const alpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = alpha * (hardness / 100);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size * 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
  }

  /** Draw hard-edged pencil stroke */
  private drawPencil(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: DrawingOptions,
  ) {
    const { color, size } = options;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.lineCap = "square";
    this.ctx.lineJoin = "bevel";
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
  }

  /** Erase pixels */
  private drawEraser(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: DrawingOptions,
  ) {
    const { size } = options;
    this.ctx.clearRect(fromX - size / 2, fromY - size / 2, size, size);
    this.ctx.clearRect(toX - size / 2, toY - size / 2, size, size);

    // Draw line of eraser
    this.ctx.lineWidth = size;
    this.ctx.lineCap = "round";
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    this.ctx.globalCompositeOperation = "source-over";
  }

  /** Clone stamp tool (copies pixels from one area to another) */
  private drawCloneStamp(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: DrawingOptions,
  ) {
    // This is a simplified version - in full Photoshop you'd sample from a marked location
    const { size } = options;
    const sampleX = fromX - 50; // Offset for sampling
    const sampleY = fromY - 50;
    const imageData = this.ctx.getImageData(
      sampleX - size / 2,
      sampleY - size / 2,
      size,
      size,
    );
    this.ctx.putImageData(imageData, toX - size / 2, toY - size / 2);
  }

  /** Bucket fill tool */
  private bucketFill(x: number, y: number, options: DrawingOptions) {
    const { color } = options;
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    const pixelIndex = (Math.floor(y) * this.canvas.width + Math.floor(x)) * 4;
    const targetColor = {
      r: data[pixelIndex],
      g: data[pixelIndex + 1],
      b: data[pixelIndex + 2],
      a: data[pixelIndex + 3],
    };
    const [r, g, b] = this.hexToRgb(color);
    const colorTolerance = 20;
    this.floodFill(
      data,
      x,
      y,
      targetColor,
      { r, g, b, a: 255 },
      colorTolerance,
    );
    this.ctx.putImageData(imageData, 0, 0);
  }

  /** Apply a linear gradient fill */
  private applyGradient(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: DrawingOptions,
  ) {
    const gradient = this.ctx.createLinearGradient(fromX, fromY, toX, toY);
    gradient.addColorStop(0, options.color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    this.ctx.save();
    this.ctx.globalAlpha = options.opacity / 100;
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  /** Flood fill algorithm for bucket fill */
  private floodFill(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    targetColor: { r: number; g: number; b: number; a: number },
    fillColor: { r: number; g: number; b: number; a: number },
    tolerance: number,
  ) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const queue: [number, number][] = [[x, y]];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

      const pixelIndex = (cy * width + cx) * 4;
      const pixelColor = {
        r: data[pixelIndex],
        g: data[pixelIndex + 1],
        b: data[pixelIndex + 2],
        a: data[pixelIndex + 3],
      };

      if (!this.colorMatch(pixelColor, targetColor, tolerance)) continue;
      data[pixelIndex] = fillColor.r;
      data[pixelIndex + 1] = fillColor.g;
      data[pixelIndex + 2] = fillColor.b;
      data[pixelIndex + 3] = fillColor.a;
      queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  }

  /** Check if colors match within tolerance */
  private colorMatch(
    color1: { r: number; g: number; b: number; a: number },
    color2: { r: number; g: number; b: number; a: number },
    tolerance: number,
  ): boolean {
    return (
      Math.abs(color1.r - color2.r) <= tolerance &&
      Math.abs(color1.g - color2.g) <= tolerance &&
      Math.abs(color1.b - color2.b) <= tolerance &&
      Math.abs(color1.a - color2.a) <= tolerance
    );
  }

  /** Blur/Sharpen tool */
  private blurSharpen(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: DrawingOptions,
  ) {
    // Simplified blur effect
    const { size } = options;
    this.ctx.filter = "blur(2px)";
    this.ctx.fillRect(toX - size / 2, toY - size / 2, size, size);
  }

  /** Smudge tool */
  private smudge(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: DrawingOptions,
  ) {
    const { size } = options;
    const imageData = this.ctx.getImageData(
      fromX - size / 2,
      fromY - size / 2,
      size,
      size,
    );
    this.ctx.putImageData(imageData, toX - size / 4, toY - size / 4);
  }

  /** Helper: Convert hex color to RGB */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  }

  /** Fill canvas with color */
  fillCanvas(color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.saveSnapshot();
  }

  /** Clear canvas */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.saveSnapshot();
  }

  /** Draw text on canvas */
  drawText(textData: {
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    alpha: number;
    textAlign: string;
    lineHeight: number;
    maxWidth?: number;
  }) {
    const fontStyle = `${textData.fontWeight} ${textData.fontSize}px ${textData.fontFamily}`;
    this.ctx.font = fontStyle;
    this.ctx.fillStyle = textData.color;
    this.ctx.globalAlpha = textData.alpha / 100;
    this.ctx.textAlign = textData.textAlign as CanvasTextAlign;
    this.ctx.textBaseline = "top";
    const lines = textData.text.split("\n");
    const lineHeightPx = textData.fontSize * textData.lineHeight;
    lines.forEach((line, index) => {
      const y = textData.y + index * lineHeightPx;
      this.ctx.fillText(line, textData.x, y, textData.maxWidth);
    });
    this.ctx.globalAlpha = 1;
    this.saveSnapshot();
  }

  /** Apply levels adjustment */
  applyLevels(
    inputMin: number,
    inputMax: number,
    gamma: number,
    outputMin: number,
    outputMax: number,
  ) {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = this.applyLevelsCurve(
        data[i],
        inputMin,
        inputMax,
        gamma,
        outputMin,
        outputMax,
      );
      const g = this.applyLevelsCurve(
        data[i + 1],
        inputMin,
        inputMax,
        gamma,
        outputMin,
        outputMax,
      );
      const b = this.applyLevelsCurve(
        data[i + 2],
        inputMin,
        inputMax,
        gamma,
        outputMin,
        outputMax,
      );
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.saveSnapshot();
  }

  /** Apply levels curve to a single value */
  private applyLevelsCurve(
    value: number,
    inputMin: number,
    inputMax: number,
    gamma: number,
    outputMin: number,
    outputMax: number,
  ): number {
    if (inputMax === inputMin) return outputMin;
    const normalized = (value - inputMin) / (inputMax - inputMin);
    const clipped = Math.max(0, Math.min(1, normalized));
    const gammaAdjusted = Math.pow(clipped, 1 / gamma);
    const output = outputMin + gammaAdjusted * (outputMax - outputMin);
    return output;
  }

  /** Apply curves adjustment */
  applyCurves(curve: number[]) {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = curve[data[i]];
      data[i + 1] = curve[data[i + 1]];
      data[i + 2] = curve[data[i + 2]];
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.saveSnapshot();
  }

  /** Apply brightness and contrast */
  applyBrightnessContrast(brightness: number, contrast: number) {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    const brightnessAmount = brightness / 100;
    const contrastAmount = (contrast + 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      r = (r - 0.5) * contrastAmount + 0.5 + brightnessAmount;
      g = (g - 0.5) * contrastAmount + 0.5 + brightnessAmount;
      b = (b - 0.5) * contrastAmount + 0.5 + brightnessAmount;

      data[i] = Math.max(0, Math.min(255, r * 255));
      data[i + 1] = Math.max(0, Math.min(255, g * 255));
      data[i + 2] = Math.max(0, Math.min(255, b * 255));
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.saveSnapshot();
  }

  /** Apply hue, saturation, and lightness adjustments */
  applyHueSaturation(hue: number, saturation: number, lightness: number) {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
      const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
      hsl.h = (hsl.h + hue) % 360;
      hsl.s = Math.max(0, Math.min(100, hsl.s + saturation));
      hsl.l = Math.max(0, Math.min(100, hsl.l + lightness));
      const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
      data[i] = newRgb.r;
      data[i + 1] = newRgb.g;
      data[i + 2] = newRgb.b;
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.saveSnapshot();
  }

  /** Convert RGB to HSL */
  private rgbToHsl(r: number, g: number, b: number) {
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

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /** Convert HSL to RGB */
  private hslToRgb(h: number, s: number, l: number) {
    h = h % 360;
    s = s / 100;
    l = l / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  /** Apply color balance */
  applyColorBalance(
    cyan_red: number,
    magenta_green: number,
    yellow_blue: number,
    tonalRange: string = "midtones",
  ) {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    const intensityFactor = this.getIntensityFactor(tonalRange);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const toneFactor = this.getToneFactor(luminance, tonalRange);
      const factor = intensityFactor * toneFactor;

      const newR = r + (cyan_red / 100) * factor;
      const newG = g + (magenta_green / 100) * factor;
      const newB = b + (yellow_blue / 100) * factor;

      data[i] = Math.max(0, Math.min(255, newR * 255));
      data[i + 1] = Math.max(0, Math.min(255, newG * 255));
      data[i + 2] = Math.max(0, Math.min(255, newB * 255));
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.saveSnapshot();
  }

  /** Get factor based on tonal range */
  private getToneFactor(luminance: number, tonalRange: string): number {
    switch (tonalRange) {
      case "shadows":
        return Math.max(0, 1 - luminance * 2);
      case "highlights":
        return Math.max(0, (luminance - 0.5) * 2);
      case "midtones":
      default:
        return 1 - Math.abs(luminance - 0.5) * 2;
    }
  }

  /** Get intensity factor for color balance */
  private getIntensityFactor(tonalRange: string): number {
    switch (tonalRange) {
      case "shadows":
      case "highlights":
        return 1.5;
      case "midtones":
      default:
        return 1.0;
    }
  }

  /** Invert colors */
  invert() {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.saveSnapshot();
  }

  /** Convert to grayscale (desaturate) */
  desaturate() {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.saveSnapshot();
  }

  /** Apply posterize effect (reduce to N levels) */
  posterize(levels: number) {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    const step = 256 / levels;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(data[i] / step) * step;
      data[i + 1] = Math.floor(data[i + 1] / step) * step;
      data[i + 2] = Math.floor(data[i + 2] / step) * step;
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.saveSnapshot();
  }

  /** Apply a layer mask to the canvas */
  applyLayerMask(
    maskCanvas: HTMLCanvasElement,
    maskOpacity: number = 100,
    inverted: boolean = false,
  ) {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;
    const maskImageData = maskCtx.getImageData(
      0,
      0,
      maskCanvas.width,
      maskCanvas.height,
    );
    const maskData = maskImageData.data;
    const opacityMultiplier = maskOpacity / 100;
    for (let i = 0; i < data.length; i += 4) {
      let maskAlpha = maskData[i];
      if (inverted) {
        maskAlpha = 255 - maskAlpha;
      }
      const maskValue = (maskAlpha / 255) * opacityMultiplier;
      data[i + 3] = Math.round(data[i + 3] * maskValue);
    }
    this.ctx.putImageData(imageData, 0, 0);
    this.saveSnapshot();
  }

  /** Draw a layer with mask applied */
  drawLayerWithMask(
    sourceCanvas: HTMLCanvasElement,
    x: number = 0,
    y: number = 0,
    opacity: number = 100,
    maskCanvas?: HTMLCanvasElement,
    maskOpacity: number = 100,
    maskInverted: boolean = false,
  ) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;
    tempCtx.drawImage(sourceCanvas, x, y);

    if (maskCanvas) {
      const imageData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height,
      );
      const data = imageData.data;
      const maskCtx = maskCanvas.getContext("2d");
      if (!maskCtx) return;
      const maskImageData = maskCtx.getImageData(
        0,
        0,
        maskCanvas.width,
        maskCanvas.height,
      );
      const maskData = maskImageData.data;
      const maskOpacityMultiplier = maskOpacity / 100;
      for (let i = 0; i < data.length; i += 4) {
        let maskAlpha = maskData[i];
        if (maskInverted) {
          maskAlpha = 255 - maskAlpha;
        }
        const maskValue = (maskAlpha / 255) * maskOpacityMultiplier;
        data[i + 3] = Math.round(data[i + 3] * maskValue);
      }
      tempCtx.putImageData(imageData, 0, 0);
    }

    this.ctx.globalAlpha = opacity / 100;
    this.ctx.drawImage(tempCanvas, 0, 0);
    this.ctx.globalAlpha = 1;
    this.saveSnapshot();
  }
}
