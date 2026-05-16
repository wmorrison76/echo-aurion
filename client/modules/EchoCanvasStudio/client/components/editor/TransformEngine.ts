export interface TransformMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface TransformState {
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
  translateX: number;
  translateY: number;
  perspectiveX: number;
  perspectiveY: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface TransformHandle {
  id: string;
  name: string;
  x: number;
  y: number;
  cursor: string;
}

export class TransformEngine {
  private matrix: TransformMatrix = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0,
  };

  private state: TransformState = {
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    translateX: 0,
    translateY: 0,
    perspectiveX: 0,
    perspectiveY: 0,
  };

  private originalMatrix: TransformMatrix = { ...this.matrix };
  private originalState: TransformState = { ...this.state };
  private boundingBox: BoundingBox = {
    minX: 0,
    minY: 0,
    maxX: 100,
    maxY: 100,
    width: 100,
    height: 100,
  };

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
  ) {}

  setBoundingBox(x: number, y: number, width: number, height: number): void {
    this.boundingBox = {
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
      width,
      height,
    };
  }

  getBoundingBox(): BoundingBox {
    return { ...this.boundingBox };
  }

  getHandles(): TransformHandle[] {
    const { minX, minY, maxX, maxY, width, height } = this.boundingBox;
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    const corners = [
      { id: "tl", name: "Top-Left", x: minX, y: minY, cursor: "nwse-resize" },
      { id: "tr", name: "Top-Right", x: maxX, y: minY, cursor: "nesw-resize" },
      { id: "bl", name: "Bottom-Left", x: minX, y: maxY, cursor: "nesw-resize" },
      { id: "br", name: "Bottom-Right", x: maxX, y: maxY, cursor: "nwse-resize" },
    ];

    const edges = [
      { id: "t", name: "Top", x: centerX, y: minY, cursor: "ns-resize" },
      { id: "b", name: "Bottom", x: centerX, y: maxY, cursor: "ns-resize" },
      { id: "l", name: "Left", x: minX, y: centerY, cursor: "ew-resize" },
      { id: "r", name: "Right", x: maxX, y: centerY, cursor: "ew-resize" },
    ];

    const center = {
      id: "center",
      name: "Center",
      x: centerX,
      y: centerY,
      cursor: "move",
    };

    const rotate = {
      id: "rotate",
      name: "Rotate",
      x: centerX,
      y: minY - 50,
      cursor: "crosshair",
    };

    return [...corners, ...edges, center, rotate];
  }

  updateTransform(
    handleId: string,
    startPoint: Point,
    endPoint: Point,
    shiftKey: boolean = false,
  ): void {
    const { minX, minY, maxX, maxY, width, height } = this.boundingBox;
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;

    switch (handleId) {
      case "tl":
        this.scaleFromCorner("tl", dx, dy, shiftKey);
        break;
      case "tr":
        this.scaleFromCorner("tr", dx, dy, shiftKey);
        break;
      case "bl":
        this.scaleFromCorner("bl", dx, dy, shiftKey);
        break;
      case "br":
        this.scaleFromCorner("br", dx, dy, shiftKey);
        break;
      case "t":
        this.boundingBox.minY += dy;
        this.boundingBox.height -= dy;
        break;
      case "b":
        this.boundingBox.maxY += dy;
        this.boundingBox.height += dy;
        break;
      case "l":
        this.boundingBox.minX += dx;
        this.boundingBox.width -= dx;
        break;
      case "r":
        this.boundingBox.maxX += dx;
        this.boundingBox.width += dx;
        break;
      case "center":
        this.translate(dx, dy);
        break;
      case "rotate":
        this.rotate(startPoint, endPoint);
        break;
    }

    this.updateMatrix();
  }

  private scaleFromCorner(
    corner: string,
    dx: number,
    dy: number,
    maintainAspectRatio: boolean = false,
  ): void {
    const { minX, minY, maxX, maxY, width, height } = this.boundingBox;

    switch (corner) {
      case "tl":
        this.boundingBox.minX += dx;
        this.boundingBox.minY += dy;
        this.boundingBox.width -= dx;
        this.boundingBox.height -= dy;
        break;
      case "tr":
        this.boundingBox.maxX += dx;
        this.boundingBox.minY += dy;
        this.boundingBox.width += dx;
        this.boundingBox.height -= dy;
        break;
      case "bl":
        this.boundingBox.minX += dx;
        this.boundingBox.maxY += dy;
        this.boundingBox.width -= dx;
        this.boundingBox.height += dy;
        break;
      case "br":
        this.boundingBox.maxX += dx;
        this.boundingBox.maxY += dy;
        this.boundingBox.width += dx;
        this.boundingBox.height += dy;
        break;
    }

    if (maintainAspectRatio && width > 0) {
      const aspectRatio = height / width;
      this.boundingBox.height =
        this.boundingBox.width * aspectRatio;
    }

    if (this.boundingBox.width < 10) this.boundingBox.width = 10;
    if (this.boundingBox.height < 10) this.boundingBox.height = 10;
  }

  private rotate(startPoint: Point, endPoint: Point): void {
    const { width, height } = this.boundingBox;
    const centerX = this.boundingBox.minX + width / 2;
    const centerY = this.boundingBox.minY + height / 2;

    const angle1 = Math.atan2(
      startPoint.y - centerY,
      startPoint.x - centerX,
    );
    const angle2 = Math.atan2(endPoint.y - centerY, endPoint.x - centerX);

    const deltaAngle = angle2 - angle1;
    this.state.rotation += (deltaAngle * 180) / Math.PI;

    if (this.state.rotation > 360) this.state.rotation -= 360;
    if (this.state.rotation < -360) this.state.rotation += 360;
  }

  private translate(dx: number, dy: number): void {
    this.boundingBox.minX += dx;
    this.boundingBox.maxX += dx;
    this.boundingBox.minY += dy;
    this.boundingBox.maxY += dy;
    this.state.translateX += dx;
    this.state.translateY += dy;
  }

  applySkew(skewX: number, skewY: number): void {
    this.state.skewX = skewX;
    this.state.skewY = skewY;
    this.updateMatrix();
  }

  applyPerspective(perspectiveX: number, perspectiveY: number): void {
    this.state.perspectiveX = perspectiveX;
    this.state.perspectiveY = perspectiveY;
    this.updateMatrix();
  }

  setScale(scaleX: number, scaleY: number): void {
    this.state.scaleX = scaleX;
    this.state.scaleY = scaleY;
    this.updateMatrix();
  }

  setRotation(rotation: number): void {
    this.state.rotation = rotation;
    this.updateMatrix();
  }

  private updateMatrix(): void {
    const rotation = (this.state.rotation * Math.PI) / 180;
    const skewXRad = (this.state.skewX * Math.PI) / 180;
    const skewYRad = (this.state.skewY * Math.PI) / 180;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const a = this.state.scaleX * cos;
    const b = this.state.scaleX * sin;
    const c = -this.state.scaleY * sin;
    const d = this.state.scaleY * cos;

    this.matrix = {
      a: a * Math.cos(skewYRad),
      b: b + a * Math.sin(skewYRad),
      c: c + d * Math.sin(skewXRad),
      d: d * Math.cos(skewXRad),
      e: this.state.translateX,
      f: this.state.translateY,
    };
  }

  applyTransform(imageData: ImageData): ImageData {
    const { width, height } = imageData;
    const data = new Uint8ClampedArray(imageData.data);

    this.ctx.save();
    this.ctx.transform(
      this.matrix.a,
      this.matrix.b,
      this.matrix.c,
      this.matrix.d,
      this.matrix.e,
      this.matrix.f,
    );

    this.ctx.restore();

    return new ImageData(data, width, height);
  }

  drawTransformOutline(
    color: string = "#00f0ff",
    handleColor: string = "#00f0ff",
  ): void {
    const { minX, minY, maxX, maxY } = this.boundingBox;
    const handles = this.getHandles();

    this.ctx.save();

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.rect(minX, minY, maxX - minX, maxY - minY);
    this.ctx.stroke();

    this.ctx.setLineDash([]);

    handles.forEach((handle) => {
      this.ctx.fillStyle = handleColor;
      this.ctx.strokeStyle = "#1a1a1a";
      this.ctx.lineWidth = 2;

      if (handle.id === "rotate") {
        const centerX = minX + (maxX - minX) / 2;
        const line = this.ctx.createLinearGradient(
          centerX,
          minY,
          handle.x,
          handle.y,
        );
        this.ctx.strokeStyle = handleColor;
        this.ctx.setLineDash([2, 2]);
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, minY);
        this.ctx.lineTo(handle.x, handle.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      const size = 8;
      if (handle.id === "center") {
        this.ctx.beginPath();
        this.ctx.arc(handle.x, handle.y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      } else if (handle.id === "rotate") {
        this.ctx.beginPath();
        this.ctx.arc(handle.x, handle.y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        this.ctx.fillRect(
          handle.x - size / 2,
          handle.y - size / 2,
          size,
          size,
        );
        this.ctx.strokeRect(
          handle.x - size / 2,
          handle.y - size / 2,
          size,
          size,
        );
      }
    });

    this.ctx.restore();
  }

  getState(): TransformState {
    return { ...this.state };
  }

  setState(state: Partial<TransformState>): void {
    this.state = { ...this.state, ...state };
    this.updateMatrix();
  }

  reset(): void {
    this.state = { ...this.originalState };
    this.matrix = { ...this.originalMatrix };
    this.updateMatrix();
  }

  saveCheckpoint(): void {
    this.originalState = { ...this.state };
    this.originalMatrix = { ...this.matrix };
  }
}
