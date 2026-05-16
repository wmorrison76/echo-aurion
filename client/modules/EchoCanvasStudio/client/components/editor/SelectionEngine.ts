export type SelectionToolType =
  | "rect-select"
  | "ellipse-select"
  | "lasso"
  | "magic-wand"
  | "quick-select";

export interface SelectionPath {
  type: "rect" | "ellipse" | "path";
  points: [number, number][];
}

export class SelectionEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private selectionCanvas: HTMLCanvasElement;
  private selectionCtx: CanvasRenderingContext2D;
  private isSelecting = false;
  private startX = 0;
  private startY = 0;
  private currentSelection: SelectionPath | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    this.ctx = ctx;

    // Create a separate canvas for rendering the selection outline
    this.selectionCanvas = document.createElement("canvas");
    this.selectionCanvas.width = canvas.width;
    this.selectionCanvas.height = canvas.height;
    const selectionCtx = this.selectionCanvas.getContext("2d");
    if (!selectionCtx)
      throw new Error("Failed to get selection canvas context");
    this.selectionCtx = selectionCtx;
  }

  /**
   * Start rectangular selection
   */
  startRectSelection(x: number, y: number) {
    this.isSelecting = true;
    this.startX = x;
    this.startY = y;
    this.currentSelection = { type: "rect", points: [[x, y]] };
  }

  /**
   * Update rectangular selection
   */
  updateRectSelection(x: number, y: number) {
    if (!this.isSelecting || this.currentSelection?.type !== "rect") return;

    this.drawSelectionOutline("rect", this.startX, this.startY, x, y);
  }

  /**
   * End rectangular selection
   */
  endRectSelection(x: number, y: number) {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    this.currentSelection = {
      type: "rect",
      points: [
        [this.startX, this.startY],
        [x, y],
      ],
    };
  }

  /**
   * Start elliptical selection
   */
  startEllipseSelection(x: number, y: number) {
    this.isSelecting = true;
    this.startX = x;
    this.startY = y;
    this.currentSelection = { type: "ellipse", points: [[x, y]] };
  }

  /**
   * Update elliptical selection
   */
  updateEllipseSelection(x: number, y: number) {
    if (!this.isSelecting || this.currentSelection?.type !== "ellipse") return;

    this.drawSelectionOutline("ellipse", this.startX, this.startY, x, y);
  }

  /**
   * End elliptical selection
   */
  endEllipseSelection(x: number, y: number) {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    this.currentSelection = {
      type: "ellipse",
      points: [
        [this.startX, this.startY],
        [x, y],
      ],
    };
  }

  /**
   * Start lasso selection (free-form)
   */
  startLassoSelection(x: number, y: number) {
    this.isSelecting = true;
    this.startX = x;
    this.startY = y;
    this.currentSelection = { type: "path", points: [[x, y]] };
  }

  /**
   * Add point to lasso selection
   */
  addLassoPoint(x: number, y: number) {
    if (!this.isSelecting || this.currentSelection?.type !== "path") return;

    this.currentSelection.points.push([x, y]);
    this.drawLassoOutline();
  }

  /**
   * End lasso selection
   */
  endLassoSelection() {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    this.drawLassoOutline();
  }

  /**
   * Magic wand selection (select by color)
   */
  magicWandSelect(x: number, y: number, tolerance: number = 30) {
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

    const selectedPixels = new Set<number>();
    this.floodSelectColor(data, x, y, targetColor, tolerance, selectedPixels);

    this.currentSelection = {
      type: "path",
      points: this.getPointsFromPixelSet(selectedPixels),
    };

    this.drawPixelSelection(selectedPixels);
  }

  /**
   * Quick select tool (intelligent edge detection)
   */
  quickSelect(x: number, y: number, tolerance: number = 30) {
    // Simplified version - real Photoshop uses edge detection and ML
    this.magicWandSelect(x, y, tolerance);
  }

  /**
   * Draw selection outline (animated marching ants)
   */
  private drawSelectionOutline(
    type: "rect" | "ellipse",
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) {
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const minX = Math.min(startX, endX);
    const minY = Math.min(startY, endY);

    // Clear and redraw on main canvas
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineWidth = 1;

    if (type === "rect") {
      this.ctx.strokeRect(minX, minY, width, height);
    } else if (type === "ellipse") {
      this.drawEllipse(
        this.ctx,
        minX + width / 2,
        minY + height / 2,
        width / 2,
        height / 2,
      );
    }

    this.ctx.restore();
  }

  /**
   * Draw lasso outline
   */
  private drawLassoOutline() {
    if (!this.currentSelection || this.currentSelection.type !== "path") return;

    this.ctx.save();
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    const points = this.currentSelection.points;
    if (points.length > 0) {
      this.ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i][0], points[i][1]);
      }
      // Close the path
      this.ctx.lineTo(points[0][0], points[0][1]);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Draw ellipse with center and radii
   */
  private drawEllipse(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
  ) {
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }

  /**
   * Flood fill selection by color
   */
  private floodSelectColor(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    targetColor: { r: number; g: number; b: number; a: number },
    tolerance: number,
    selectedPixels: Set<number>,
  ) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const queue: [number, number][] = [[x, y]];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;

      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

      const pixelIndex = (cy * width + cx) * 4;

      if (selectedPixels.has(pixelIndex)) continue;

      const pixelColor = {
        r: data[pixelIndex],
        g: data[pixelIndex + 1],
        b: data[pixelIndex + 2],
        a: data[pixelIndex + 3],
      };

      if (!this.colorMatch(pixelColor, targetColor, tolerance)) continue;

      selectedPixels.add(pixelIndex);
      queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  }

  /**
   * Check if colors match within tolerance
   * Includes intelligent alpha handling for opaque pixels
   */
  private colorMatch(
    color1: { r: number; g: number; b: number; a: number },
    color2: { r: number; g: number; b: number; a: number },
    tolerance: number,
  ): boolean {
    const rgbMatch =
      Math.abs(color1.r - color2.r) <= tolerance &&
      Math.abs(color1.g - color2.g) <= tolerance &&
      Math.abs(color1.b - color2.b) <= tolerance;

    if (!rgbMatch) return false;

    // For alpha channel: be more lenient if both pixels are opaque or both are fully transparent
    // This fixes issues selecting pure black and other dark colors
    const alphaThreshold = Math.min(tolerance * 2, 50); // Use doubled tolerance for alpha
    const bothOpaque = color1.a > 200 && color2.a > 200;
    const bothTransparent = color1.a < 50 && color2.a < 50;

    if (bothOpaque || bothTransparent) {
      // Don't require strict alpha match for opaque/transparent pixels
      return true;
    }

    // Otherwise check alpha within tolerance
    return Math.abs(color1.a - color2.a) <= alphaThreshold;
  }

  /**
   * Get points array from pixel set (for rendering)
   */
  private getPointsFromPixelSet(
    selectedPixels: Set<number>,
  ): [number, number][] {
    const points: [number, number][] = [];
    selectedPixels.forEach((index) => {
      const pixelIndex = index / 4;
      const y = Math.floor(pixelIndex / this.canvas.width);
      const x = pixelIndex % this.canvas.width;
      points.push([x, y]);
    });
    return points;
  }

  /**
   * Draw selected pixels with marching ants outline
   */
  private drawPixelSelection(selectedPixels: Set<number>) {
    // Find the boundary of selected pixels
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineWidth = 1;

    // Draw outline around selected region
    const boundary = this.getSelectionBoundary(selectedPixels);
    if (boundary.length > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(boundary[0][0], boundary[0][1]);
      for (let i = 1; i < boundary.length; i++) {
        this.ctx.lineTo(boundary[i][0], boundary[i][1]);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * Get boundary points of selection
   */
  private getSelectionBoundary(
    selectedPixels: Set<number>,
  ): [number, number][] {
    const boundary: [number, number][] = [];

    selectedPixels.forEach((index) => {
      const pixelIndex = index / 4;
      const y = Math.floor(pixelIndex / this.canvas.width);
      const x = pixelIndex % this.canvas.width;

      // Check if pixel is on boundary
      const neighbors = [
        (y - 1) * this.canvas.width + x,
        (y + 1) * this.canvas.width + x,
        y * this.canvas.width + (x - 1),
        y * this.canvas.width + (x + 1),
      ].map((p) => p * 4);

      const isBoundary = neighbors.some((n) => !selectedPixels.has(n));
      if (isBoundary) {
        boundary.push([x, y]);
      }
    });

    return boundary;
  }

  /**
   * Clear selection (only clear selection visual, not the main canvas)
   */
  clearSelection() {
    this.currentSelection = null;
    // Do NOT clear the main canvas - this is handled by the Canvas component
    // Only clear selection visual indicators if we had a separate selection canvas
    if (this.selectionCtx) {
      this.selectionCtx.clearRect(
        0,
        0,
        this.selectionCanvas.width,
        this.selectionCanvas.height,
      );
    }
  }

  /**
   * Get current selection
   */
  getSelection(): SelectionPath | null {
    return this.currentSelection;
  }

  /**
   * Check if point is within selection
   */
  isPointInSelection(x: number, y: number): boolean {
    if (!this.currentSelection) return false;

    const path = this.currentSelection;
    if (path.type === "rect" && path.points.length >= 2) {
      const [x1, y1] = path.points[0];
      const [x2, y2] = path.points[1];
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    return false;
  }
}
