/**
 * Decoration Prompt Generator
 * Generates detailed AI prompts for cake decorations including text piping,
 * sprinkles, pearls, and other decorative elements
 */

import type { IntakeAnswers } from "@/modules/cake-builder/types";

export interface TextPipingOptions {
  text: string;
  style: "script" | "bold" | "elegant" | "playful" | "modern" | "calligraphy";
  color: string;
  backgroundColor?: string;
  fontSize: "small" | "medium" | "large";
}

export interface SprinckleOptions {
  type:
    | "rainbow"
    | "chocolate"
    | "pearl"
    | "nonpareils"
    | "jimmies"
    | "sanding";
  density: "light" | "medium" | "heavy";
  color?: string;
  pattern: "scattered" | "pattern" | "border" | "swirl";
}

export interface DecorationOptions {
  type:
    | "text-piping"
    | "sprinkles"
    | "pearls"
    | "fondant-flower"
    | "chocolate-shards";
  position?: { x: number; y: number };
  rotation?: number;
  scale?: number;
}

/**
 * Generate a prompt for text piping on a cake
 * Creates an AI prompt that describes how to render text as piping on a cake
 */
export function generateTextPipingPrompt(
  options: TextPipingOptions,
  themeNotes?: string,
): string {
  const styleDescriptions: Record<TextPipingOptions["style"], string> = {
    script: "elegant flowing script",
    bold: "bold blocky lettering",
    elegant: "sophisticated serif lettering",
    playful: "fun rounded playful letters",
    modern: "clean contemporary sans-serif",
    calligraphy: "beautiful calligraphic handwriting",
  };

  const fontSizeMap: Record<TextPipingOptions["fontSize"], string> = {
    small: "small delicate text",
    medium: "medium-sized lettering",
    large: "large prominent text",
  };

  const colorDescriptions: Record<string, string> = {
    "#ffffff": "white",
    "#000000": "black",
    "#ff0000": "red",
    "#ff69b4": "hot pink",
    "#ffd700": "gold",
    "#00ffff": "cyan",
    "#008000": "green",
    "#ffa500": "orange",
    "#9370db": "purple",
  };

  const colorName =
    colorDescriptions[options.color.toLowerCase()] || options.color;

  let prompt = `Professional cake piping text artwork: "${options.text}"`;
  prompt += `, rendered in ${styleDescriptions[options.style]}`;
  prompt += `, ${fontSizeMap[options.fontSize]} piping`;
  prompt += `, ${colorName} buttercream or royal icing`;

  if (options.backgroundColor) {
    const bgColor =
      colorDescriptions[options.backgroundColor.toLowerCase()] ||
      options.backgroundColor;
    prompt += `, on ${bgColor} frosting or fondant background`;
  }

  prompt += `, perfect sharp focus on the lettering`;
  prompt += `, realistic frosting texture with piping details`;
  prompt += `, professional bakery quality`;
  prompt += `, isolated on transparent or neutral background`;
  prompt += `, high resolution food photography`;
  prompt += `, suitable for cake decoration`;

  return prompt;
}

/**
 * Generate a prompt for sprinkles/decorative elements
 */
export function generateSprinklesPrompt(
  options: SprinckleOptions,
  cakeColor?: string,
): string {
  const typeDescriptions: Record<SprinckleOptions["type"], string> = {
    rainbow: "colorful rainbow sprinkles",
    chocolate: "chocolate sprinkles and shavings",
    pearl: "edible pearl sprinkles",
    nonpareils: "tiny round nonpareils",
    jimmies: "long rod-shaped jimmies",
    sanding: "sparkling sanding sugar crystals",
  };

  const densityMap: Record<SprinckleOptions["density"], string> = {
    light: "lightly scattered",
    medium: "moderately distributed",
    heavy: "densely packed",
  };

  const patternMap: Record<SprinckleOptions["pattern"], string> = {
    scattered: "scattered randomly across the surface",
    pattern: "arranged in a decorative pattern",
    border: "arranged as a border or stripe",
    swirl: "arranged in swirling patterns",
  };

  let prompt = `Professional cake sprinkles and decorative elements`;
  prompt += `: ${typeDescriptions[options.type]}`;
  prompt += `, ${densityMap[options.density]} and ${patternMap[options.pattern]}`;

  if (options.color) {
    const colorName = getColorName(options.color);
    prompt += `, ${colorName} color palette`;
  } else {
    prompt += `, vibrant multicolor`;
  }

  if (cakeColor) {
    prompt += `, complementing ${cakeColor} frosting`;
  }

  prompt += `, realistic texture with depth`;
  prompt += `, professional bakery presentation`;
  prompt += `, isolated on transparent background`;
  prompt += `, suitable for cake decoration`;
  prompt += `, high resolution food photography`;

  return prompt;
}

/**
 * Generate a prompt for fondant flowers
 */
export function generateFondantFlowerPrompt(
  flowerType: string = "rose",
  color: string = "#ff1493",
  quantity: number = 1,
): string {
  const flowerDescriptions: Record<string, string> = {
    rose: "realistic sugar roses",
    peony: "full lush peonies",
    daisy: "delicate daisies",
    tulip: "elegant tulips",
    sunflower: "bold sunflowers",
    hydrangea: "clustered hydrangea flowers",
  };

  const flowerName =
    flowerDescriptions[flowerType.toLowerCase()] || "sugar flowers";
  const colorName = getColorName(color);

  let prompt = `Professional edible sugar ${flowerName}`;
  prompt += `, ${colorName} color`;
  prompt += `, ${quantity} flower${quantity > 1 ? "s" : ""}`;
  prompt += `, realistic petal detail`;
  prompt += `, fondant and gum paste construction`;
  prompt += `, professional baker quality`;
  prompt += `, isolated on transparent background`;
  prompt += `, high resolution food photography`;
  prompt += `, suitable for wedding and celebration cakes`;

  return prompt;
}

/**
 * Generate a prompt for chocolate shards/elements
 */
export function generateChocolateShardsPrompt(
  style: "shards" | "curls" | "chunks" | "wafers" = "shards",
  color: "dark" | "milk" | "white" = "dark",
  quantity: number = 5,
): string {
  const styleDescriptions: Record<string, string> = {
    shards: "elegant chocolate shards",
    curls: "delicate chocolate curls",
    chunks: "artisanal chocolate chunks",
    wafers: "thin chocolate wafers",
  };

  const colorMap: Record<string, string> = {
    dark: "dark rich chocolate",
    milk: "milk chocolate",
    white: "white chocolate",
  };

  let prompt = `Professional cake decoration: ${styleDescriptions[style]}`;
  prompt += `, made from ${colorMap[color]}`;
  prompt += `, ${quantity} pieces`;
  prompt += `, realistic glossy texture`;
  prompt += `, precise definition and edges`;
  prompt += `, professional pastry chef quality`;
  prompt += `, isolated on transparent background`;
  prompt += `, high resolution food photography`;

  return prompt;
}

/**
 * Generate multiple decoration prompts for a complete cake design
 */
export function generateAllDecorationPrompts(
  textPiping?: TextPipingOptions,
  sprinkles?: SprinckleOptions,
  flowers?: { type: string; color: string; quantity: number },
  chocolateElements?: { style: string; color: string; quantity: number },
): {
  textPiping?: string;
  sprinkles?: string;
  flowers?: string;
  chocolateElements?: string;
} {
  const prompts: any = {};

  if (textPiping) {
    prompts.textPiping = generateTextPipingPrompt(textPiping);
  }

  if (sprinkles) {
    prompts.sprinkles = generateSprinklesPrompt(sprinkles);
  }

  if (flowers) {
    prompts.flowers = generateFondantFlowerPrompt(
      flowers.type,
      flowers.color,
      flowers.quantity,
    );
  }

  if (chocolateElements) {
    prompts.chocolateElements = generateChocolateShardsPrompt(
      chocolateElements.style as any,
      chocolateElements.color as any,
      chocolateElements.quantity,
    );
  }

  return prompts;
}

/**
 * Helper function to get color names
 */
function getColorName(color: string): string {
  const colorMap: Record<string, string> = {
    "#ffffff": "white",
    "#000000": "black",
    "#ff0000": "red",
    "#ff69b4": "hot pink",
    "#ffd700": "gold",
    "#00ffff": "cyan",
    "#008000": "green",
    "#ffa500": "orange",
    "#9370db": "purple",
    "#ffc0cb": "pink",
    "#a0522d": "brown",
    "#daa520": "goldenrod",
    "#20b2aa": "light sea green",
  };

  return colorMap[color.toLowerCase()] || color;
}

/**
 * Generate a comprehensive prompt for a fully decorated cake
 */
export function generateFullDecorationPrompt(
  baseDescription: string,
  decorations: Array<{
    type: string;
    options: any;
  }>,
): string {
  let prompt = baseDescription;

  prompt += `, enhanced with decorations including:`;

  for (const decoration of decorations) {
    if (decoration.type === "text-piping" && decoration.options.text) {
      prompt += ` "${decoration.options.text}"`;
    }
  }

  prompt += `. Professional bakery presentation. High quality food photography.`;

  return prompt;
}
