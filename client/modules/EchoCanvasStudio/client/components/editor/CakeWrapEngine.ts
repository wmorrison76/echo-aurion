export type CakeWrapMode = "cylindrical-wrap" | "flat-wrap" | "topper" | "side-wrap";

export interface CakeConfig {
  id: string;
  diameter: number;
  height: number;
  layers: number;
  shape: "cylinder" | "rectangular" | "irregular";
  customShape?: string;
}

export interface WrapConfig {
  id: string;
  mode: CakeWrapMode;
  designImageUrl: string;
  cakeConfig: CakeConfig;
  horizontalScale: number;
  verticalScale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  transparencyBlend: number;
  perspectiveStrength: number;
}

export interface TopperConfig {
  id: string;
  designImageUrl: string;
  width: number;
  height: number;
  rotation: number;
  positionX: number;
  positionY: number;
  elevation: number;
  shadowStrength: number;
}

export class CakeWrapEngine {
  private wrapConfigs: Map<string, WrapConfig> = new Map();
  private topperConfigs: Map<string, TopperConfig> = new Map();

  addWrap(config: WrapConfig): void {
    this.wrapConfigs.set(config.id, config);
  }

  removeWrap(id: string): void {
    this.wrapConfigs.delete(id);
  }

  getWrap(id: string): WrapConfig | undefined {
    return this.wrapConfigs.get(id);
  }

  updateWrap(id: string, updates: Partial<WrapConfig>): void {
    const config = this.wrapConfigs.get(id);
    if (config) {
      this.wrapConfigs.set(id, { ...config, ...updates });
    }
  }

  addTopper(config: TopperConfig): void {
    this.topperConfigs.set(config.id, config);
  }

  removeTopper(id: string): void {
    this.topperConfigs.delete(id);
  }

  getTopper(id: string): TopperConfig | undefined {
    return this.topperConfigs.get(id);
  }

  updateTopper(id: string, updates: Partial<TopperConfig>): void {
    const config = this.topperConfigs.get(id);
    if (config) {
      this.topperConfigs.set(id, { ...config, ...updates });
    }
  }

  getAllWraps(): WrapConfig[] {
    return Array.from(this.wrapConfigs.values());
  }

  getAllToppers(): TopperConfig[] {
    return Array.from(this.topperConfigs.values());
  }

  generateCylindricalWrap(
    designCanvas: HTMLCanvasElement,
    cakeConfig: CakeConfig,
    options: {
      horizontalScale?: number;
      verticalScale?: number;
      rotation?: number;
      offsetX?: number;
      offsetY?: number;
    } = {},
  ): HTMLCanvasElement {
    const hScale = options.horizontalScale || 1;
    const vScale = options.verticalScale || 1;
    const rotation = (options.rotation || 0) * (Math.PI / 180);
    const offsetX = options.offsetX || 0;
    const offsetY = options.offsetY || 0;

    const circumference = cakeConfig.diameter * Math.PI;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = Math.round(circumference * hScale);
    outputCanvas.height = Math.round(cakeConfig.height * vScale);

    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return outputCanvas;

    ctx.save();
    ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
    ctx.rotate(rotation);
    ctx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);

    const scaledWidth = designCanvas.width * hScale;
    const scaledHeight = designCanvas.height * vScale;

    ctx.drawImage(
      designCanvas,
      (outputCanvas.width - scaledWidth) / 2 + offsetX,
      (outputCanvas.height - scaledHeight) / 2 + offsetY,
      scaledWidth,
      scaledHeight,
    );

    ctx.restore();
    return outputCanvas;
  }

  generateFlatWrap(
    designCanvas: HTMLCanvasElement,
    cakeConfig: CakeConfig,
    options: {
      scale?: number;
      positionX?: number;
      positionY?: number;
    } = {},
  ): HTMLCanvasElement {
    const scale = options.scale || 1;
    const posX = options.positionX || 0;
    const posY = options.positionY || 0;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = cakeConfig.diameter;
    outputCanvas.height = cakeConfig.diameter;

    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return outputCanvas;

    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    const scaledWidth = designCanvas.width * scale;
    const scaledHeight = designCanvas.height * scale;
    const centerX = outputCanvas.width / 2;
    const centerY = outputCanvas.height / 2;

    ctx.drawImage(
      designCanvas,
      centerX - scaledWidth / 2 + posX,
      centerY - scaledHeight / 2 + posY,
      scaledWidth,
      scaledHeight,
    );

    this.makeCircular(ctx, outputCanvas.width);

    return outputCanvas;
  }

  private makeCircular(
    ctx: CanvasRenderingContext2D,
    size: number,
  ): void {
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2;

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const y = Math.floor(pixelIndex / size);
      const x = pixelIndex % size;

      const distance = Math.sqrt(
        (x - centerX) ** 2 + (y - centerY) ** 2,
      );

      if (distance > radius) {
        data[i + 3] = 0;
      } else if (distance > radius - 2) {
        const falloff = (radius - distance) / 2;
        data[i + 3] = Math.round(data[i + 3] * falloff);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  generateTopperPreview(
    designCanvas: HTMLCanvasElement,
    cakeConfig: CakeConfig,
    topperConfig: TopperConfig,
  ): HTMLCanvasElement {
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = 400;
    previewCanvas.height = 400;

    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return previewCanvas;

    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

    const centerX = previewCanvas.width / 2;
    const centerY = previewCanvas.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    const topperWidth = topperConfig.width;
    const topperHeight = topperConfig.height;
    const elevation = topperConfig.elevation || 20;

    ctx.globalAlpha = 1 - topperConfig.shadowStrength * 0.3;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.ellipse(0, elevation, topperWidth / 2, topperHeight / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.rotate((topperConfig.rotation * Math.PI) / 180);

    const shadowBlur = 4 + topperConfig.shadowStrength * 2;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowOffsetY = 2;

    ctx.drawImage(
      designCanvas,
      -topperWidth / 2,
      -topperHeight / 2 - elevation,
      topperWidth,
      topperHeight,
    );

    ctx.restore();

    return previewCanvas;
  }

  generateFullCakePreview(
    wrapCanvas: HTMLCanvasElement | null,
    topperCanvas: HTMLCanvasElement | null,
    cakeConfig: CakeConfig,
  ): HTMLCanvasElement {
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = 500;
    previewCanvas.height = 600;

    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return previewCanvas;

    ctx.fillStyle = "#f5f5dc";
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

    const centerX = previewCanvas.width / 2;
    const baseY = previewCanvas.height * 0.65;
    const cakeRadius = 80;
    const cakeHeight = 120;

    ctx.save();

    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    if (wrapCanvas && wrapCanvas.width > 0) {
      const wrapAspect = wrapCanvas.height / wrapCanvas.width;
      const displayWidth = cakeRadius * 2;
      const displayHeight = displayWidth * wrapAspect * 0.6;

      ctx.drawImage(
        wrapCanvas,
        centerX - displayWidth / 2,
        baseY - displayHeight / 2,
        displayWidth,
        displayHeight,
      );
    }

    ctx.ellipse(centerX, baseY + cakeHeight / 2, cakeRadius, cakeRadius / 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200, 100, 50, 0.1)";
    ctx.fill();

    if (topperCanvas && topperCanvas.width > 0) {
      const topperWidth = 100;
      const topperHeight = 100;
      ctx.drawImage(
        topperCanvas,
        centerX - topperWidth / 2,
        baseY - cakeHeight / 2 - 80,
        topperWidth,
        topperHeight,
      );
    }

    ctx.restore();

    return previewCanvas;
  }

  detectCakeDimensions(imageUrl: string): Promise<CakeConfig> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;

        const detectedConfig: CakeConfig = {
          id: `cake-${Date.now()}`,
          diameter: 200,
          height: Math.round(200 / aspectRatio),
          layers: aspectRatio > 1.2 ? 3 : 2,
          shape: "cylinder",
        };

        resolve(detectedConfig);
      };
      img.src = imageUrl;
    });
  }

  async generateWrappedCakeImage(
    wrapConfig: WrapConfig,
    designImage: HTMLImageElement,
  ): Promise<Blob> {
    const wrappedCanvas = this.generateCylindricalWrap(
      this.imageToCanvas(designImage),
      wrapConfig.cakeConfig,
      {
        horizontalScale: wrapConfig.horizontalScale,
        verticalScale: wrapConfig.verticalScale,
        rotation: wrapConfig.rotation,
        offsetX: wrapConfig.offsetX,
        offsetY: wrapConfig.offsetY,
      },
    );

    return new Promise((resolve) => {
      wrappedCanvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, "image/png");
    });
  }

  private imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }
    return canvas;
  }
}
