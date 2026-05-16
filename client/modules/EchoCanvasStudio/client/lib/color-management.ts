/**
 * Color Management System
 * Handles ICC profiles, color space conversions, and CMYK support
 */

export type ColorSpace = "RGB" | "CMYK" | "LAB" | "GRAYSCALE" | "SRGB";
export type RenderingIntent =
  | "perceptual"
  | "relative"
  | "saturation"
  | "absolute";

export interface ICCProfile {
  id: string;
  name: string;
  colorSpace: ColorSpace;
  pcs: string;
  version: string;
  data: Uint8Array;
}

export interface ColorManagementSettings {
  workingSpace: ColorSpace;
  displayProfile: ICCProfile | null;
  printerProfile: ICCProfile | null;
  renderingIntent: RenderingIntent;
  blackPointCompensation: boolean;
}

export interface CMYKColor {
  cyan: number;
  magenta: number;
  yellow: number;
  black: number;
}

export interface RGBColor {
  red: number;
  green: number;
  blue: number;
}

export interface LABColor {
  lightness: number;
  a: number;
  b: number;
}

export class ColorManagementEngine {
  private profiles: Map<string, ICCProfile> = new Map();
  private settings: ColorManagementSettings = {
    workingSpace: "SRGB",
    displayProfile: null,
    printerProfile: null,
    renderingIntent: "perceptual",
    blackPointCompensation: true,
  };

  registerProfile(profile: ICCProfile): void {
    this.profiles.set(profile.id, profile);
  }

  getProfile(id: string): ICCProfile | undefined {
    return this.profiles.get(id);
  }

  setWorkingSpace(colorSpace: ColorSpace): void {
    this.settings.workingSpace = colorSpace;
  }

  setDisplayProfile(profile: ICCProfile | null): void {
    this.settings.displayProfile = profile;
  }

  setPrinterProfile(profile: ICCProfile | null): void {
    this.settings.printerProfile = profile;
  }

  getSettings(): ColorManagementSettings {
    return { ...this.settings };
  }

  /**
   * Convert RGB to CMYK
   */
  rgbToCmyk(rgb: RGBColor): CMYKColor {
    const r = rgb.red / 255;
    const g = rgb.green / 255;
    const b = rgb.blue / 255;

    const k = 1 - Math.max(r, g, b);
    if (k === 1) {
      return { cyan: 0, magenta: 0, yellow: 0, black: 100 };
    }

    const cyan = ((1 - r - k) / (1 - k)) * 100;
    const magenta = ((1 - g - k) / (1 - k)) * 100;
    const yellow = ((1 - b - k) / (1 - k)) * 100;
    const black = k * 100;

    return {
      cyan: Math.round(cyan),
      magenta: Math.round(magenta),
      yellow: Math.round(yellow),
      black: Math.round(black),
    };
  }

  /**
   * Convert CMYK to RGB
   */
  cmykToRgb(cmyk: CMYKColor): RGBColor {
    const c = cmyk.cyan / 100;
    const m = cmyk.magenta / 100;
    const y = cmyk.yellow / 100;
    const k = cmyk.black / 100;

    const red = Math.round(255 * (1 - c) * (1 - k));
    const green = Math.round(255 * (1 - m) * (1 - k));
    const blue = Math.round(255 * (1 - y) * (1 - k));

    return {
      red: Math.min(255, Math.max(0, red)),
      green: Math.min(255, Math.max(0, green)),
      blue: Math.min(255, Math.max(0, blue)),
    };
  }

  /**
   * Convert RGB to LAB
   */
  rgbToLab(rgb: RGBColor): LABColor {
    const r = this.linearizeComponent(rgb.red / 255);
    const g = this.linearizeComponent(rgb.green / 255);
    const b = this.linearizeComponent(rgb.blue / 255);

    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
    const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
    const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;

    const lightness = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b_value = 200 * (fy - fz);

    return {
      lightness: Math.round(lightness),
      a: Math.round(a),
      b: Math.round(b_value),
    };
  }

  /**
   * Convert LAB to RGB
   */
  labToRgb(lab: LABColor): RGBColor {
    const fy = (lab.lightness + 16) / 116;
    const fx = lab.a / 500 + fy;
    const fz = fy - lab.b / 200;

    const x =
      (fx * fx * fx > 0.008856 ? fx * fx * fx : (fx - 16 / 116) / 7.787) *
      0.95047;
    const y =
      (fy * fy * fy > 0.008856 ? fy * fy * fy : (fy - 16 / 116) / 7.787) * 1.0;
    const z =
      (fz * fz * fz > 0.008856 ? fz * fz * fz : (fz - 16 / 116) / 7.787) *
      1.08883;

    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b = x * 0.0557 + y * -0.204 + z * 1.057;

    r = this.delinearizeComponent(r);
    g = this.delinearizeComponent(g);
    b = this.delinearizeComponent(b);

    return {
      red: Math.min(255, Math.max(0, Math.round(r * 255))),
      green: Math.min(255, Math.max(0, Math.round(g * 255))),
      blue: Math.min(255, Math.max(0, Math.round(b * 255))),
    };
  }

  /**
   * Apply color profile transformation
   */
  transformColor(
    rgb: RGBColor,
    sourceProfile: ICCProfile | null,
    targetProfile: ICCProfile | null,
  ): RGBColor {
    // For now, use basic RGB handling
    // In production, integrate with a color management library like littleCMS.js
    if (sourceProfile && sourceProfile.colorSpace === "CMYK") {
      const cmyk = this.rgbToCmyk(rgb);
      return this.cmykToRgb(cmyk);
    }
    return rgb;
  }

  /**
   * Convert ImageData with color profile
   */
  transformImageData(
    imageData: ImageData,
    sourceSpace: ColorSpace,
    targetSpace: ColorSpace,
  ): ImageData {
    const data = imageData.data;
    const result = new ImageData(imageData.width, imageData.height);
    const resultData = result.data;

    for (let i = 0; i < data.length; i += 4) {
      const rgb: RGBColor = {
        red: data[i],
        green: data[i + 1],
        blue: data[i + 2],
      };

      let transformed = rgb;

      if (sourceSpace === "CMYK" && targetSpace === "RGB") {
        const cmyk = this.rgbToCmyk(rgb);
        transformed = this.cmykToRgb(cmyk);
      } else if (sourceSpace === "RGB" && targetSpace === "CMYK") {
        const cmyk = this.rgbToCmyk(rgb);
        transformed = this.cmykToRgb(cmyk);
      } else if (sourceSpace === "LAB") {
        const lab = this.rgbToLab(rgb);
        transformed = this.labToRgb(lab);
      }

      resultData[i] = transformed.red;
      resultData[i + 1] = transformed.green;
      resultData[i + 2] = transformed.blue;
      resultData[i + 3] = data[i + 3];
    }

    return result;
  }

  /**
   * Get color separation for print preview
   */
  getColorSeparation(imageData: ImageData): {
    cyan: ImageData;
    magenta: ImageData;
    yellow: ImageData;
    black: ImageData;
  } {
    const data = imageData.data;
    const cyan = new ImageData(imageData.width, imageData.height);
    const magenta = new ImageData(imageData.width, imageData.height);
    const yellow = new ImageData(imageData.width, imageData.height);
    const black = new ImageData(imageData.width, imageData.height);

    for (let i = 0; i < data.length; i += 4) {
      const rgb: RGBColor = {
        red: data[i],
        green: data[i + 1],
        blue: data[i + 2],
      };

      const cmyk = this.rgbToCmyk(rgb);

      cyan.data[i] =
        cyan.data[i + 1] =
        cyan.data[i + 2] =
          Math.round(255 * (1 - cmyk.cyan / 100));
      cyan.data[i + 3] = data[i + 3];

      magenta.data[i] =
        magenta.data[i + 1] =
        magenta.data[i + 2] =
          Math.round(255 * (1 - cmyk.magenta / 100));
      magenta.data[i + 3] = data[i + 3];

      yellow.data[i] =
        yellow.data[i + 1] =
        yellow.data[i + 2] =
          Math.round(255 * (1 - cmyk.yellow / 100));
      yellow.data[i + 3] = data[i + 3];

      black.data[i] =
        black.data[i + 1] =
        black.data[i + 2] =
          Math.round(255 * (1 - cmyk.black / 100));
      black.data[i + 3] = data[i + 3];
    }

    return { cyan, magenta, yellow, black };
  }

  /**
   * Convert canvas to CMYK for export
   */
  canvasToCmykData(canvas: HTMLCanvasElement): {
    width: number;
    height: number;
    cmyk: CMYKColor[];
  } {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const cmyk: CMYKColor[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const rgb: RGBColor = {
        red: data[i],
        green: data[i + 1],
        blue: data[i + 2],
      };
      cmyk.push(this.rgbToCmyk(rgb));
    }

    return {
      width: canvas.width,
      height: canvas.height,
      cmyk,
    };
  }

  private linearizeComponent(value: number): number {
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  }

  private delinearizeComponent(value: number): number {
    return value <= 0.0031308
      ? 12.92 * value
      : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  }
}

export const colorManagementEngine = new ColorManagementEngine();
