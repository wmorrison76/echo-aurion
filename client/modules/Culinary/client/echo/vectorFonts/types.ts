/**
 * Vector Font Engine Types
 * Core type definitions for advanced typography manipulation
 */

// Font axis types for variable fonts
export type FontAxisType = "weight" | "width" | "italic" | "slant" | "optical-size" | "grade";

export interface FontAxis {
  tag: string; // e.g., "wght", "wdth"
  name: string; // e.g., "Weight", "Width"
  type: FontAxisType;
  min: number;
  max: number;
  default: number;
  step: number;
}

export interface FontVariation {
  weight?: number; // 100-900
  width?: number; // 75-125 (percentage)
  italic?: number; // 0-1
  slant?: number; // -90 to 90 degrees
  opticalSize?: number; // font size in points
  grade?: number; // -200 to 200
}

// Font outline manipulation
export interface FontOutlineProperties {
  strokeWidth: number; // 0-10px
  strokeColor?: string;
  fillColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowColor?: string;
  textDecoration?: "none" | "underline" | "overline" | "line-through";
}

// Font morphing/transformation
export interface FontMorphing {
  sourceFontId: string;
  targetFontId: string;
  progress: number; // 0-1
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

// Complete font definition
export interface VectorFont {
  id: string;
  name: string;
  category: FontCategory;
  variants: FontVariant[];
  axes?: FontAxis[];
  tags: string[];
  isVariable: boolean;
  isCustom: boolean;
  source: "google-fonts" | "user-import" | "generated" | "system";
  fontFamily: string;
  cssUrl?: string;
  woff2Url?: string;
  fallbacks: string[];
  designer?: string;
  description?: string;
  cuisine?: string[];
  mood?: string[];
  pairingWith?: string[]; // IDs of fonts that pair well
}

export interface FontVariant {
  style: "normal" | "italic";
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  filename?: string;
}

export type FontCategory =
  | "serif"
  | "sans-serif"
  | "monospace"
  | "display"
  | "handwriting"
  | "decorative"
  | "system";

// Font pairing recommendation
export interface FontPairingRecommendation {
  headingFont: VectorFont;
  bodyFont: VectorFont;
  accentFont?: VectorFont;
  confidence: number; // 0-1
  reason: string;
  bestFor: string[]; // ["luxury", "bistro", "casual"]
}

// Font effect/preset
export interface FontPreset {
  id: string;
  name: string;
  description: string;
  variations: FontVariation;
  outline: FontOutlineProperties;
  baseFont: string;
  tags: string[];
}

// Canvas font state
export interface CanvasFontState {
  elementId: string;
  fontId: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  variations: FontVariation;
  outline: FontOutlineProperties;
  morphing?: FontMorphing;
}

// Font library
export interface FontLibrary {
  fonts: VectorFont[];
  presets: FontPreset[];
  pairings: FontPairingRecommendation[];
  customFonts: VectorFont[];
  lastUpdated: Date;
}

// Font export options
export interface FontExportOptions {
  format: "ttf" | "otf" | "woff2" | "woff";
  includeVariations: boolean;
  includeMetadata: boolean;
  compression: "none" | "gzip";
}

// Font analysis result
export interface FontAnalysisResult {
  fontId: string;
  readability: number; // 0-100
  accessibility: number; // 0-100
  brandAlignment: number; // 0-100
  hierarchy: number; // 0-100
  suggestions: string[];
}
