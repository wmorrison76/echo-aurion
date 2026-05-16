export type AdjustmentType =
  | "curves"
  | "levels"
  | "hue-saturation"
  | "color-balance"
  | "exposure"
  | "brightness-contrast"
  | "vibrance"
  | "saturation"
  | "temperature";

export interface CurvePoint {
  x: number;
  y: number;
}

export interface CurvesAdjustment {
  type: "curves";
  id: string;
  enabled: boolean;
  name: string;
  redCurve: CurvePoint[];
  greenCurve: CurvePoint[];
  blueCurve: CurvePoint[];
  allChannelsCurve: CurvePoint[];
}

export interface LevelsAdjustment {
  type: "levels";
  id: string;
  enabled: boolean;
  name: string;
  blackPoint: number;
  whitePoint: number;
  gamma: number;
  outputBlack: number;
  outputWhite: number;
}

export interface HueSaturationAdjustment {
  type: "hue-saturation";
  id: string;
  enabled: boolean;
  name: string;
  hue: number;
  saturation: number;
  lightness: number;
  colorRange: "master" | "red" | "green" | "blue" | "cyan" | "magenta" | "yellow";
}

export interface ColorBalanceAdjustment {
  type: "color-balance";
  id: string;
  enabled: boolean;
  name: string;
  shadows: { cyan_red: number; magenta_green: number; yellow_blue: number };
  midtones: { cyan_red: number; magenta_green: number; yellow_blue: number };
  highlights: { cyan_red: number; magenta_green: number; yellow_blue: number };
  preserveLuminosity: boolean;
}

export interface ExposureAdjustment {
  type: "exposure";
  id: string;
  enabled: boolean;
  name: string;
  exposure: number;
  offset: number;
  gamma: number;
}

export interface BrightnessContrastAdjustment {
  type: "brightness-contrast";
  id: string;
  enabled: boolean;
  name: string;
  brightness: number;
  contrast: number;
  useLinearContrast: boolean;
}

export interface VibranceAdjustment {
  type: "vibrance";
  id: string;
  enabled: boolean;
  name: string;
  vibrance: number;
  saturation: number;
}

export type AdjustmentLayer =
  | CurvesAdjustment
  | LevelsAdjustment
  | HueSaturationAdjustment
  | ColorBalanceAdjustment
  | ExposureAdjustment
  | BrightnessContrastAdjustment
  | VibranceAdjustment;

export class AdjustmentLayerEngine {
  private adjustmentLayers: AdjustmentLayer[] = [];

  addAdjustmentLayer(adjustment: AdjustmentLayer): void {
    this.adjustmentLayers.push(adjustment);
  }

  removeAdjustmentLayer(id: string): void {
    this.adjustmentLayers = this.adjustmentLayers.filter((a) => a.id !== id);
  }

  updateAdjustmentLayer(id: string, updates: Partial<AdjustmentLayer>): void {
    const index = this.adjustmentLayers.findIndex((a) => a.id === id);
    if (index !== -1) {
      this.adjustmentLayers[index] = {
        ...this.adjustmentLayers[index],
        ...updates,
      };
    }
  }

  getAdjustmentLayer(id: string): AdjustmentLayer | undefined {
    return this.adjustmentLayers.find((a) => a.id === id);
  }

  getAllAdjustmentLayers(): AdjustmentLayer[] {
    return [...this.adjustmentLayers];
  }

  toggleAdjustmentLayer(id: string): void {
    const adjustment = this.getAdjustmentLayer(id);
    if (adjustment) {
      adjustment.enabled = !adjustment.enabled;
    }
  }

  applyAdjustments(imageData: ImageData, canvas: HTMLCanvasElement): ImageData {
    let result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height,
    );

    for (const adjustment of this.adjustmentLayers) {
      if (!adjustment.enabled) continue;

      switch (adjustment.type) {
        case "curves":
          result = this.applyCurves(result, adjustment as CurvesAdjustment);
          break;
        case "levels":
          result = this.applyLevels(result, adjustment as LevelsAdjustment);
          break;
        case "hue-saturation":
          result = this.applyHueSaturation(
            result,
            adjustment as HueSaturationAdjustment,
          );
          break;
        case "color-balance":
          result = this.applyColorBalance(
            result,
            adjustment as ColorBalanceAdjustment,
          );
          break;
        case "exposure":
          result = this.applyExposure(result, adjustment as ExposureAdjustment);
          break;
        case "brightness-contrast":
          result = this.applyBrightnessContrast(
            result,
            adjustment as BrightnessContrastAdjustment,
          );
          break;
        case "vibrance":
          result = this.applyVibrance(result, adjustment as VibranceAdjustment);
          break;
      }
    }

    return result;
  }

  private applyCurves(
    imageData: ImageData,
    adjustment: CurvesAdjustment,
  ): ImageData {
    const data = imageData.data;
    const redLut = this.generateLUT(adjustment.redCurve);
    const greenLut = this.generateLUT(adjustment.greenCurve);
    const blueLut = this.generateLUT(adjustment.blueCurve);
    const allChannelsLut = this.generateLUT(adjustment.allChannelsCurve);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = redLut[allChannelsLut[r]];
      data[i + 1] = greenLut[allChannelsLut[g]];
      data[i + 2] = blueLut[allChannelsLut[b]];
    }

    return imageData;
  }

  private applyLevels(
    imageData: ImageData,
    adjustment: LevelsAdjustment,
  ): ImageData {
    const data = imageData.data;
    const blackPoint = adjustment.blackPoint;
    const whitePoint = adjustment.whitePoint;
    const gamma = 1 / Math.max(0.01, adjustment.gamma);
    const outputBlack = adjustment.outputBlack;
    const outputWhite = adjustment.outputWhite;
    const inputRange = whitePoint - blackPoint;
    const outputRange = outputWhite - outputBlack;

    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let value = data[i + j];
        value = (value - blackPoint) / inputRange;
        value = Math.max(0, Math.min(1, value));
        value = Math.pow(value, gamma);
        value = value * outputRange + outputBlack;
        data[i + j] = Math.round(Math.max(0, Math.min(255, value)));
      }
    }

    return imageData;
  }

  private applyHueSaturation(
    imageData: ImageData,
    adjustment: HueSaturationAdjustment,
  ): ImageData {
    const data = imageData.data;
    const hueShift = adjustment.hue;
    const saturationMultiplier = 1 + adjustment.saturation / 100;
    const lightnessMultiplier = 1 + adjustment.lightness / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

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

      h = (h + hueShift / 360) % 1;
      s = Math.max(0, Math.min(1, s * saturationMultiplier));

      const hsl2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      const newR = hsl2rgb(p, q, h + 1 / 3);
      const newG = hsl2rgb(p, q, h);
      const newB = hsl2rgb(p, q, h - 1 / 3);

      data[i] = Math.round(newR * 255 * lightnessMultiplier);
      data[i + 1] = Math.round(newG * 255 * lightnessMultiplier);
      data[i + 2] = Math.round(newB * 255 * lightnessMultiplier);
    }

    return imageData;
  }

  private applyColorBalance(
    imageData: ImageData,
    adjustment: ColorBalanceAdjustment,
  ): ImageData {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let tone = "midtones";
      const brightness = (r + g + b) / 3 / 255;
      if (brightness < 0.25) tone = "shadows";
      else if (brightness > 0.75) tone = "highlights";

      const balance =
        adjustment[tone as "shadows" | "midtones" | "highlights"];

      let newR = r + (balance.cyan_red / 100) * 255;
      let newG = g + (balance.magenta_green / 100) * 255;
      let newB = b + (balance.yellow_blue / 100) * 255;

      data[i] = Math.max(0, Math.min(255, newR));
      data[i + 1] = Math.max(0, Math.min(255, newG));
      data[i + 2] = Math.max(0, Math.min(255, newB));
    }

    return imageData;
  }

  private applyExposure(
    imageData: ImageData,
    adjustment: ExposureAdjustment,
  ): ImageData {
    const data = imageData.data;
    const exposureMultiplier = Math.pow(2, adjustment.exposure);
    const offsetValue = adjustment.offset * 255;
    const gammaValue = 1 / Math.max(0.01, adjustment.gamma);

    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let value = data[i + j] / 255;
        value = Math.pow(value, gammaValue);
        value = value * exposureMultiplier + offsetValue / 255;
        value = Math.max(0, Math.min(1, value));
        data[i + j] = Math.round(value * 255);
      }
    }

    return imageData;
  }

  private applyBrightnessContrast(
    imageData: ImageData,
    adjustment: BrightnessContrastAdjustment,
  ): ImageData {
    const data = imageData.data;
    const brightness = adjustment.brightness;
    const contrast = adjustment.contrast;

    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let value = data[i + j];

        value = (value + brightness) / 255;

        if (adjustment.useLinearContrast) {
          value = (value - 0.5) * (1 + contrast / 100) + 0.5;
        } else {
          if (value < 0.5) {
            value = 0.5 *
              Math.pow(value * 2, 1 + contrast / 100);
          } else {
            value =
              1 -
              0.5 *
                Math.pow(
                  (1 - value) * 2,
                  1 + contrast / 100,
                );
          }
        }

        data[i + j] = Math.round(
          Math.max(0, Math.min(255, value * 255)),
        );
      }
    }

    return imageData;
  }

  private applyVibrance(
    imageData: ImageData,
    adjustment: VibranceAdjustment,
  ): ImageData {
    const data = imageData.data;
    const vibrance = adjustment.vibrance;
    const saturation = adjustment.saturation;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      const s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);

      let factor = 1 + (vibrance / 100) * (1 - s);
      factor *= 1 + saturation / 100;

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      const newR = gray + (r - gray) * factor;
      const newG = gray + (g - gray) * factor;
      const newB = gray + (b - gray) * factor;

      data[i] = Math.round(Math.max(0, Math.min(255, newR * 255)));
      data[i + 1] = Math.round(Math.max(0, Math.min(255, newG * 255)));
      data[i + 2] = Math.round(Math.max(0, Math.min(255, newB * 255)));
    }

    return imageData;
  }

  private generateLUT(curve: CurvePoint[]): Uint8ClampedArray {
    const lut = new Uint8ClampedArray(256);

    if (curve.length < 2) {
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }

    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      let y = 0;

      for (let j = 0; j < curve.length - 1; j++) {
        const p0 = curve[j];
        const p1 = curve[j + 1];

        if (x >= p0.x && x <= p1.x) {
          const t = (x - p0.x) / (p1.x - p0.x);
          y = p0.y + t * (p1.y - p0.y);
          break;
        }
      }

      lut[i] = Math.round(Math.max(0, Math.min(255, y * 255)));
    }

    return lut;
  }
}
