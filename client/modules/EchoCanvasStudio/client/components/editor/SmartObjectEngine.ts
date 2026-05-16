export interface SmartObjectData {
  id: string;
  name: string;
  originalCanvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
}
export class SmartObjectEngine {
  static createSmartObject(
    canvas: HTMLCanvasElement,
    name: string = "Smart Object",
  ): SmartObjectData {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) throw new Error("Could not create smart object canvas");
    tempCtx.drawImage(canvas, 0, 0);
    return {
      id: `smart-${Date.now()}`,
      name,
      originalCanvas: tempCanvas,
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 100,
      visible: true,
    };
  }
  static renderSmartObject(
    ctx: CanvasRenderingContext2D,
    smartObject: SmartObjectData,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    if (!smartObject.visible) return;
    ctx.save();
    ctx.globalAlpha = smartObject.opacity / 100;
    const centerX =
      smartObject.x + (smartObject.width / 2) * smartObject.scaleX;
    const centerY =
      smartObject.y + (smartObject.height / 2) * smartObject.scaleY;
    ctx.translate(centerX, centerY);
    ctx.rotate((smartObject.rotation * Math.PI) / 180);
    ctx.scale(smartObject.scaleX, smartObject.scaleY);
    ctx.drawImage(
      smartObject.originalCanvas,
      -smartObject.width / 2,
      -smartObject.height / 2,
      smartObject.width,
      smartObject.height,
    );
    ctx.restore();
  }
  static scaleSmartObject(
    smartObject: SmartObjectData,
    scaleX: number,
    scaleY: number,
  ): SmartObjectData {
    return {
      ...smartObject,
      scaleX: Math.max(0.1, Math.min(10, scaleX)),
      scaleY: Math.max(0.1, Math.min(10, scaleY)),
    };
  }
  static rotateSmartObject(
    smartObject: SmartObjectData,
    rotation: number,
  ): SmartObjectData {
    return { ...smartObject, rotation: rotation % 360 };
  }
  static moveSmartObject(
    smartObject: SmartObjectData,
    x: number,
    y: number,
  ): SmartObjectData {
    return { ...smartObject, x, y };
  }
  static setSmartObjectOpacity(
    smartObject: SmartObjectData,
    opacity: number,
  ): SmartObjectData {
    return { ...smartObject, opacity: Math.max(0, Math.min(100, opacity)) };
  }
  static rasterizeSmartObject(
    smartObject: SmartObjectData,
    targetCanvas: HTMLCanvasElement,
  ) {
    const ctx = targetCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    this.renderSmartObject(
      ctx,
      smartObject,
      targetCanvas.width,
      targetCanvas.height,
    );
  }
  static duplicateSmartObject(smartObject: SmartObjectData): SmartObjectData {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = smartObject.originalCanvas.width;
    tempCanvas.height = smartObject.originalCanvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) throw new Error("Could not duplicate smart object");
    tempCtx.drawImage(smartObject.originalCanvas, 0, 0);
    return {
      ...smartObject,
      id: `smart-${Date.now()}`,
      originalCanvas: tempCanvas,
      name: `${smartObject.name} copy`,
    };
  }
  static getSmartObjectBounds(smartObject: SmartObjectData): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const scaledWidth = smartObject.width * Math.abs(smartObject.scaleX);
    const scaledHeight = smartObject.height * Math.abs(smartObject.scaleY);
    return {
      x: smartObject.x,
      y: smartObject.y,
      width: scaledWidth,
      height: scaledHeight,
    };
  }
  static isPointInSmartObject(
    smartObject: SmartObjectData,
    x: number,
    y: number,
  ): boolean {
    const bounds = this.getSmartObjectBounds(smartObject);
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }
}
