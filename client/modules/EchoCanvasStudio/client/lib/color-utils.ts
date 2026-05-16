/**
 * Color conversion utilities for consistent color handling
 * Used across Editor, FilterEngine, AdjustmentLayers, and other components
 */

/**
 * Convert hex color to RGB array
 * @example hexToRgb("#FF0000") => [255, 0, 0]
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Convert RGB to hex color
 * @example rgbToHex(255, 0, 0) => "#FF0000"
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert RGB to HSL
 * @returns [hue (0-360), saturation (0-100), lightness (0-100)]
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
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

  return [h * 360, s * 100, l * 100];
}

/**
 * Convert HSL to RGB
 * @param h hue (0-360)
 * @param s saturation (0-100)
 * @param l lightness (0-100)
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
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

/**
 * Create RGBA string from RGB values
 */
export function rgbaToString(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Create RGB string from RGB values
 */
export function rgbToString(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

/**
 * Parse color string and return RGB array
 * Supports: #FFF, #FFFFFF, rgb(...), rgba(...)
 */
export function parseColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    return hexToRgb(color);
  }

  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }

  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
  if (rgbaMatch) {
    return [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])];
  }

  throw new Error(`Cannot parse color: ${color}`);
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newL = Math.min(100, l + percent);
  const [newR, newG, newB] = hslToRgb(h, s, newL);
  return rgbToHex(newR, newG, newB);
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newL = Math.max(0, l - percent);
  const [newR, newG, newB] = hslToRgb(h, s, newL);
  return rgbToHex(newR, newG, newB);
}
