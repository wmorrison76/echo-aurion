/**
 * Decoration Types
 * Extends CakeLayer with decoration-specific metadata and positioning
 */

import type { CakeLayer } from "@/shared/types";

export type DecorationType =
  | "text-piping"
  | "sprinkles"
  | "pearls"
  | "fondant-flower"
  | "chocolate-shards"
  | "custom";

/**
 * Text piping decoration with positioning and style options
 */
export interface TextPipingDecoration {
  id: string;
  type: "text-piping";
  text: string;
  style: "script" | "bold" | "elegant" | "playful" | "modern" | "calligraphy";
  color: string;
  backgroundColor?: string;
  fontSize: "small" | "medium" | "large";
  position: { x: number; y: number; z?: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  opacity: number;
  imageUrl: string;
  prompt: string;
  generationStatus: "pending" | "generating" | "completed" | "failed";
  generatedAt?: string;
}

/**
 * Sprinkles decoration with distribution options
 */
export interface SprinklesDecoration {
  id: string;
  type: "sprinkles";
  sprinkleType:
    | "rainbow"
    | "chocolate"
    | "pearl"
    | "nonpareils"
    | "jimmies"
    | "sanding";
  density: "light" | "medium" | "heavy";
  color?: string;
  pattern: "scattered" | "pattern" | "border" | "swirl";
  position: { x: number; y: number; z?: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  opacity: number;
  imageUrl: string;
  prompt: string;
  generationStatus: "pending" | "generating" | "completed" | "failed";
  generatedAt?: string;
}

/**
 * Fondant flower decoration
 */
export interface FondantFlowerDecoration {
  id: string;
  type: "fondant-flower";
  flowerType: string;
  color: string;
  quantity: number;
  position: { x: number; y: number; z?: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  opacity: number;
  imageUrl: string;
  prompt: string;
  generationStatus: "pending" | "generating" | "completed" | "failed";
  generatedAt?: string;
}

/**
 * Chocolate shards/curls decoration
 */
export interface ChocolateShardsDecoration {
  id: string;
  type: "chocolate-shards";
  style: "shards" | "curls" | "chunks" | "wafers";
  color: "dark" | "milk" | "white";
  quantity: number;
  position: { x: number; y: number; z?: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  opacity: number;
  imageUrl: string;
  prompt: string;
  generationStatus: "pending" | "generating" | "completed" | "failed";
  generatedAt?: string;
}

/**
 * Generic custom decoration
 */
export interface CustomDecoration {
  id: string;
  type: "custom";
  customType: string;
  customPrompt: string;
  position: { x: number; y: number; z?: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  opacity: number;
  imageUrl: string;
  prompt: string;
  generationStatus: "pending" | "generating" | "completed" | "failed";
  generatedAt?: string;
}

/**
 * Union type of all decoration types
 */
export type Decoration =
  | TextPipingDecoration
  | SprinklesDecoration
  | FondantFlowerDecoration
  | ChocolateShardsDecoration
  | CustomDecoration;

/**
 * Extended CakeLayer with decoration support
 */
export interface DecoratedCakeLayer extends CakeLayer {
  metadata?: {
    width: number;
    height: number;
    hasAlpha: boolean;
    fileSize: number;
    generatedAt: string;
    generationTimeMs: number;
    tierIndex?: number;
    decorationType?: DecorationType;
    decorationConfig?: any;
  };
}

/**
 * Decoration state management
 */
export interface DecorationState {
  activeDecoration?: string; // ID of selected decoration
  decorations: Decoration[];
  isGenerating: boolean;
  lastError?: string;
}

/**
 * Decoration queue item for batch generation
 */
export interface DecorationQueueItem {
  id: string;
  type: DecorationType;
  prompt: string;
  config: any;
  priority: number; // 0-10, higher = more important
  retries: number;
  maxRetries: number;
  createdAt: string;
  status: "pending" | "generating" | "completed" | "failed";
}

/**
 * Convert Decoration to CakeLayer for 3D rendering
 */
export function decorationToCakeLayer(decoration: Decoration): CakeLayer {
  return {
    id: decoration.id,
    type: "decoration",
    imageUrl: decoration.imageUrl,
    seed: "",
    generatedWith: "sdxl",
    prompt: decoration.prompt,
    opacity: decoration.opacity,
    position: {
      x: decoration.position.x,
      y: decoration.position.y,
    },
    zIndex: 1000,
    metadata: {
      width: 512,
      height: 512,
      hasAlpha: true,
      fileSize: 0,
      generatedAt: decoration.generatedAt || new Date().toISOString(),
      generationTimeMs: 0,
      decorationType: decoration.type,
      decorationConfig: decoration,
    },
  };
}

/**
 * Create a new text piping decoration
 */
export function createTextPipingDecoration(
  text: string,
  style: TextPipingDecoration["style"] = "elegant",
  color: string = "#ffffff",
  position: { x: number; y: number } = { x: 0, y: 0 },
): TextPipingDecoration {
  return {
    id: `text-piping-${Date.now()}`,
    type: "text-piping",
    text,
    style,
    color,
    fontSize: "medium",
    position: { ...position, z: 100 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
    opacity: 1,
    imageUrl: "",
    prompt: "",
    generationStatus: "pending",
  };
}

/**
 * Create a new sprinkles decoration
 */
export function createSprinklesDecoration(
  sprinkleType: SprinklesDecoration["sprinkleType"] = "rainbow",
  position: { x: number; y: number } = { x: 0, y: 0 },
): SprinklesDecoration {
  return {
    id: `sprinkles-${Date.now()}`,
    type: "sprinkles",
    sprinkleType,
    density: "medium",
    pattern: "scattered",
    position: { ...position, z: 50 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
    opacity: 1,
    imageUrl: "",
    prompt: "",
    generationStatus: "pending",
  };
}
