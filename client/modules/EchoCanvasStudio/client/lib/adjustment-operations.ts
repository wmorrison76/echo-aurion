/**
 * Non-destructive Adjustment Operation System
 * Allows stacking and re-evaluation of adjustments without destroying original pixels
 */

export type AdjustmentType =
  | "brightness"
  | "contrast"
  | "levels"
  | "curves"
  | "hue-saturation"
  | "color-balance"
  | "desaturate"
  | "invert"
  | "posterize"
  | "blur"
  | "sharpen"
  | "exposure"
  | "vibrance"
  | "temperature";

export interface LevelsParams {
  blackPoint: number;
  whitePoint: number;
  gamma: number;
  shadowInput: number;
  highlightInput: number;
  shadowOutput: number;
  highlightOutput: number;
}

export interface CurvesParams {
  red: Array<{ x: number; y: number }>;
  green: Array<{ x: number; y: number }>;
  blue: Array<{ x: number; y: number }>;
}

export interface BrightnessContrastParams {
  brightness: number;
  contrast: number;
}

export interface HueSaturationParams {
  hue: number;
  saturation: number;
  lightness: number;
  colorize: boolean;
}

export interface ColorBalanceParams {
  shadows: { cyan: number; magenta: number; yellow: number };
  midtones: { cyan: number; magenta: number; yellow: number };
  highlights: { cyan: number; magenta: number; yellow: number };
}

export interface PosterizeParams {
  levels: number;
}

export interface BlurParams {
  type: "gaussian" | "motion" | "radial";
  radius: number;
  angle?: number;
}

export interface SharpenParams {
  amount: number;
  radius: number;
  threshold: number;
}

export interface ExposureParams {
  exposure: number;
  offset: number;
  gammaCorrection: number;
}

export interface VibranceParams {
  vibrance: number;
  saturation: number;
}

export interface TemperatureParams {
  temperature: number;
  tint: number;
}

export type AdjustmentParams =
  | BrightnessContrastParams
  | LevelsParams
  | CurvesParams
  | HueSaturationParams
  | ColorBalanceParams
  | PosterizeParams
  | BlurParams
  | SharpenParams
  | ExposureParams
  | VibranceParams
  | TemperatureParams
  | Record<string, any>;

export interface AdjustmentOperation {
  id: string;
  type: AdjustmentType;
  params: AdjustmentParams;
  enabled: boolean;
  opacity: number;
  blendMode: CanvasComposite;
  timestamp: number;
}

export interface AdjustmentLayer {
  id: string;
  name: string;
  operations: AdjustmentOperation[];
  visible: boolean;
  opacity: number;
  blendMode: CanvasComposite;
  createdAt: number;
  updatedAt: number;
}

export type CanvasComposite =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export function createAdjustmentOperation(
  type: AdjustmentType,
  params: AdjustmentParams,
): AdjustmentOperation {
  return {
    id: `op-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type,
    params,
    enabled: true,
    opacity: 100,
    blendMode: "source-over",
    timestamp: Date.now(),
  };
}

export function createAdjustmentLayer(name: string): AdjustmentLayer {
  return {
    id: `adj-layer-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name,
    operations: [],
    visible: true,
    opacity: 100,
    blendMode: "normal" as CanvasComposite,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function addOperationToLayer(
  layer: AdjustmentLayer,
  operation: AdjustmentOperation,
): AdjustmentLayer {
  return {
    ...layer,
    operations: [...layer.operations, operation],
    updatedAt: Date.now(),
  };
}

export function removeOperationFromLayer(
  layer: AdjustmentLayer,
  operationId: string,
): AdjustmentLayer {
  return {
    ...layer,
    operations: layer.operations.filter((op) => op.id !== operationId),
    updatedAt: Date.now(),
  };
}

export function updateOperationInLayer(
  layer: AdjustmentLayer,
  operationId: string,
  updates: Partial<AdjustmentOperation>,
): AdjustmentLayer {
  return {
    ...layer,
    operations: layer.operations.map((op) =>
      op.id === operationId ? { ...op, ...updates } : op,
    ),
    updatedAt: Date.now(),
  };
}

export function toggleOperationInLayer(
  layer: AdjustmentLayer,
  operationId: string,
): AdjustmentLayer {
  return {
    ...layer,
    operations: layer.operations.map((op) =>
      op.id === operationId ? { ...op, enabled: !op.enabled } : op,
    ),
    updatedAt: Date.now(),
  };
}

export function reorderOperations(
  layer: AdjustmentLayer,
  sourceIndex: number,
  targetIndex: number,
): AdjustmentLayer {
  const ops = [...layer.operations];
  const [removed] = ops.splice(sourceIndex, 1);
  ops.splice(targetIndex, 0, removed);
  return {
    ...layer,
    operations: ops,
    updatedAt: Date.now(),
  };
}

export function cloneAdjustmentLayer(
  layer: AdjustmentLayer,
  newName?: string,
): AdjustmentLayer {
  return {
    ...layer,
    id: `adj-layer-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: newName || `${layer.name} copy`,
    operations: layer.operations.map((op) => ({ ...op })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function getDefaultParams(type: AdjustmentType): AdjustmentParams {
  switch (type) {
    case "brightness":
      return { brightness: 0, contrast: 0 } as BrightnessContrastParams;
    case "contrast":
      return { brightness: 0, contrast: 0 } as BrightnessContrastParams;
    case "levels":
      return {
        blackPoint: 0,
        whitePoint: 255,
        gamma: 1,
        shadowInput: 0,
        highlightInput: 255,
        shadowOutput: 0,
        highlightOutput: 255,
      } as LevelsParams;
    case "curves":
      return {
        red: [
          { x: 0, y: 0 },
          { x: 255, y: 255 },
        ],
        green: [
          { x: 0, y: 0 },
          { x: 255, y: 255 },
        ],
        blue: [
          { x: 0, y: 0 },
          { x: 255, y: 255 },
        ],
      } as CurvesParams;
    case "hue-saturation":
      return {
        hue: 0,
        saturation: 0,
        lightness: 0,
        colorize: false,
      } as HueSaturationParams;
    case "color-balance":
      return {
        shadows: { cyan: 0, magenta: 0, yellow: 0 },
        midtones: { cyan: 0, magenta: 0, yellow: 0 },
        highlights: { cyan: 0, magenta: 0, yellow: 0 },
      } as ColorBalanceParams;
    case "posterize":
      return { levels: 8 } as PosterizeParams;
    case "blur":
      return {
        type: "gaussian",
        radius: 5,
      } as BlurParams;
    case "sharpen":
      return {
        amount: 1,
        radius: 1,
        threshold: 0,
      } as SharpenParams;
    case "exposure":
      return {
        exposure: 0,
        offset: 0,
        gammaCorrection: 1,
      } as ExposureParams;
    case "vibrance":
      return {
        vibrance: 0,
        saturation: 0,
      } as VibranceParams;
    case "temperature":
      return {
        temperature: 0,
        tint: 0,
      } as TemperatureParams;
    default:
      return {};
  }
}
