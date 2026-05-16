/** * BlendingEngine - 30+ Professional Blending Modes * Implements Photoshop-compatible blending algorithms */ export type BlendMode =

    | "normal"
    | "multiply"
    | "screen"
    | "overlay"
    | "softLight"
    | "hardLight"
    | "colorDodge"
    | "colorBurn"
    | "darken"
    | "lighten"
    | "difference"
    | "exclusion"
    | "hue"
    | "saturation"
    | "color"
    | "luminosity"
    | "add"
    | "subtract"
    | "divide"
    | "vividLight"
    | "linearLight"
    | "pinLight"
    | "hardMix"
    | "reflect"
    | "glow"
    | "phoenix"
    | "linearBurn"
    | "linearDodge"
    | "screen2"
    | "screen3"
    | "grainExtract"
    | "grainMerge";
export class BlendingEngine {
  /** * Blend two color values using specified mode */ static blend(
    base: number,
    overlay: number,
    mode: BlendMode = "normal",
  ): number {
    const baseFactor = base / 255;
    const overlayFactor = overlay / 255;
    let result = 0;
    switch (mode) {
      case "normal":
        result = overlayFactor;
        break;
      case "multiply":
        result = baseFactor * overlayFactor;
        break;
      case "screen":
        result = 1 - (1 - baseFactor) * (1 - overlayFactor);
        break;
      case "overlay":
        result =
          baseFactor < 0.5
            ? 2 * baseFactor * overlayFactor
            : 1 - 2 * (1 - baseFactor) * (1 - overlayFactor);
        break;
      case "softLight":
        result =
          overlayFactor < 0.5
            ? baseFactor -
              (1 - 2 * overlayFactor) * baseFactor * (1 - baseFactor)
            : baseFactor +
              (2 * overlayFactor - 1) *
                (BlendingEngine.g(baseFactor) - baseFactor);
        break;
      case "hardLight":
        result =
          overlayFactor < 0.5
            ? 2 * baseFactor * overlayFactor
            : 1 - 2 * (1 - baseFactor) * (1 - overlayFactor);
        break;
      case "colorDodge":
        result =
          overlayFactor === 1
            ? 1
            : Math.min(1, baseFactor / (1 - overlayFactor));
        break;
      case "colorBurn":
        result =
          overlayFactor === 0
            ? 0
            : 1 - Math.min(1, (1 - baseFactor) / overlayFactor);
        break;
      case "darken":
        result = Math.min(baseFactor, overlayFactor);
        break;
      case "lighten":
        result = Math.max(baseFactor, overlayFactor);
        break;
      case "difference":
        result = Math.abs(baseFactor - overlayFactor);
        break;
      case "exclusion":
        result = baseFactor + overlayFactor - 2 * baseFactor * overlayFactor;
        break;
      case "add":
        result = Math.min(1, baseFactor + overlayFactor);
        break;
      case "subtract":
        result = Math.max(0, baseFactor - overlayFactor);
        break;
      case "divide":
        result =
          overlayFactor === 0 ? 0 : Math.min(1, baseFactor / overlayFactor);
        break;
      case "linearBurn":
        result = Math.max(0, baseFactor + overlayFactor - 1);
        break;
      case "linearDodge":
        result = Math.min(1, baseFactor + overlayFactor);
        break;
      case "linearLight":
        result =
          overlayFactor < 0.5
            ? Math.max(0, baseFactor + 2 * overlayFactor - 1)
            : Math.min(1, baseFactor + 2 * (overlayFactor - 0.5));
        break;
      case "vividLight":
        result =
          overlayFactor < 0.5
            ? overlayFactor === 0
              ? 0
              : Math.min(1, baseFactor / (2 * (1 - overlayFactor)))
            : overlayFactor === 1
              ? 1
              : Math.min(1, baseFactor / (2 * (1 - overlayFactor)));
        break;
      case "pinLight":
        result =
          overlayFactor < 0.5
            ? Math.min(baseFactor, 2 * overlayFactor)
            : Math.max(baseFactor, 2 * (overlayFactor - 0.5));
        break;
      case "hardMix":
        result =
          BlendingEngine.blend(baseFactor, overlayFactor, "vividLight") < 0.5
            ? 0
            : 1;
        break;
      case "reflect":
        result =
          baseFactor === 1
            ? 1
            : Math.min(1, (baseFactor * baseFactor) / (1 - overlayFactor));
        break;
      case "glow":
        result =
          overlayFactor === 1
            ? 1
            : Math.min(1, (overlayFactor * overlayFactor) / (1 - baseFactor));
        break;
      case "phoenix":
        result =
          Math.min(baseFactor, overlayFactor) -
          Math.max(baseFactor, overlayFactor) +
          1;
        break;
      case "screen2":
        result = 1 - (1 - baseFactor) * (1 - overlayFactor * 2);
        break;
      case "screen3":
        result = 1 - Math.pow(1 - baseFactor, overlayFactor);
        break;
      case "grainExtract":
        result = baseFactor - overlayFactor + 0.5;
        break;
      case "grainMerge":
        result = baseFactor + overlayFactor - 0.5;
        break;
      default:
        result = overlayFactor;
    }
    return Math.max(0, Math.min(1, result)) * 255;
  }
  /** * Helper function for SoftLight blend mode */ private static g(
    x: number,
  ): number {
    if (x <= 0.25) {
      return ((16 * x - 12) * x + 4) * x;
    } else {
      return Math.sqrt(x);
    }
  }
  /** * Blend RGB arrays using specified mode */ static blendRGB(
    base: [number, number, number],
    overlay: [number, number, number],
    mode: BlendMode = "normal",
  ): [number, number, number] {
    /* Handle special blending modes that work in color space */
    if (
      mode === "hue" ||
      mode === "saturation" ||
      mode === "color" ||
      mode === "luminosity"
    ) {
      return this.blendHSL(base, overlay, mode);
    }
    return [
      this.blend(base[0], overlay[0], mode),
      this.blend(base[1], overlay[1], mode),
      this.blend(base[2], overlay[2], mode),
    ];
  }
  /** * Blend colors in HSL space for specific modes */ private static blendHSL(
    base: [number, number, number],
    overlay: [number, number, number],
    mode: BlendMode,
  ): [number, number, number] {
    const baseHSL = this.rgbToHSL(base[0], base[1], base[2]);
    const overlayHSL = this.rgbToHSL(overlay[0], overlay[1], overlay[2]);
    let resultH = baseHSL.h;
    let resultS = baseHSL.s;
    let resultL = baseHSL.l;
    if (mode === "hue") {
      resultH = overlayHSL.h;
    } else if (mode === "saturation") {
      resultS = overlayHSL.s;
    } else if (mode === "color") {
      resultH = overlayHSL.h;
      resultS = overlayHSL.s;
    } else if (mode === "luminosity") {
      resultL = overlayHSL.l;
    }
    const [r, g, b] = this.hslToRGB(resultH, resultS, resultL);
    return [r, g, b];
  }
  /** * Convert RGB to HSL */ private static rgbToHSL(
    r: number,
    g: number,
    b: number,
  ): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
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
  /** * Convert HSL to RGB */ private static hslToRGB(
    h: number,
    s: number,
    l: number,
  ): [number, number, number] {
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
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }
}
