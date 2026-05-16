/**
 * Cake Prompt Generator
 * Generates detailed AI prompts for cake tiers, frosting, and fillings based on intake form answers
 */

import type { IntakeAnswers } from "@/modules/cake-builder/types";

interface PromptGenerationConfig {
  style: "professional" | "artistic" | "rustic" | "elegant";
  detailLevel: "simple" | "moderate" | "intricate";
  lighting: "studio" | "natural" | "warm" | "bright";
}

const DEFAULT_CONFIG: PromptGenerationConfig = {
  style: "professional",
  detailLevel: "moderate",
  lighting: "studio",
};

/**
 * Generate a detailed prompt for a cake tier/layer
 */
export function generateCakeTierPrompt(
  answers: IntakeAnswers,
  tierIndex: number,
  config: PromptGenerationConfig = DEFAULT_CONFIG,
): string {
  const flavor =
    answers.flavors?.[tierIndex] || answers.flavors?.[0] || "vanilla";
  const baseShape = answers.tiersShape || "round";
  const isBottomTier = tierIndex === 0;
  const isTopTier = tierIndex === (answers.tierCount || 1) - 1;

  let prompt = `Exquisite ${baseShape} ${flavor} cake tier`;

  // Add size and positioning context
  if (isBottomTier) {
    prompt += ", bottom foundation tier, substantial diameter, impressive base";
  } else if (isTopTier) {
    prompt += ", elegant top tier, refined smaller diameter";
  } else {
    prompt += ", middle tier in multi-tiered arrangement";
  }

  // Add detailed texture descriptions
  if (answers.textureNotes) {
    prompt += `, ${answers.textureNotes} texture with visible detail`;
  } else {
    const detailMap: Record<string, string> = {
      simple: "pristinely smooth cake surface, flawless finish",
      moderate: "delicate crumb structure visible, professional bakery texture",
      intricate:
        "intricate crumb pattern, detailed surface relief, rich texture with depth",
    };
    prompt += `, ${detailMap[config.detailLevel]}`;
  }

  // Add color information with visual richness
  if (answers.themeNotes?.toLowerCase().includes("chocolate")) {
    prompt += ", deep rich chocolate brown with warm undertones";
  } else if (answers.themeNotes?.toLowerCase().includes("vanilla")) {
    prompt += ", golden vanilla with warm buttery tones";
  } else if (flavor.toLowerCase().includes("chocolate")) {
    prompt += ", luxurious chocolate brown with rich depth";
  } else if (flavor.toLowerCase().includes("vanilla")) {
    prompt += ", golden vanilla cake with buttery warmth";
  } else if (flavor.toLowerCase().includes("strawberry")) {
    prompt += ", delicate strawberry pink with natural tones";
  }

  // Add dietary considerations
  if (answers.dietaryPreferences?.includes("vegan")) {
    prompt += ", vegan cake with professional premium appearance";
  }
  if (answers.dietaryPreferences?.includes("gluten-free")) {
    prompt += ", gluten-free with fine refined crumb structure";
  }

  // Add design complexity with professional descriptors
  const complexityMap: Record<string, string> = {
    simple: "minimalist elegant design, refined simplicity",
    moderate: "professional bakery quality, polished appearance",
    intricate:
      "artisanal masterpiece, intricate surface details, complex design",
  };
  prompt += `, ${complexityMap[answers.designComplexity || "moderate"]}`;

  // Add professional lighting descriptions
  const lightingMap: Record<string, string> = {
    studio: "studio lighting with professional shadows, dramatic contrast",
    natural: "natural soft daylight with gentle shadows",
    warm: "warm golden hour lighting, elegant ambiance",
    bright: "bright professional lighting, high quality illumination",
  };
  prompt += `, ${lightingMap[config.lighting]}`;

  // Add professional photography descriptors optimized for DALL-E 3
  prompt +=
    ", professional bakery product photography, photorealistic, ultra high definition, sharp focus, detailed texture, studio lighting, isolated single cake component, no background clutter, commercial photography quality";

  return prompt;
}

/**
 * Generate a prompt for frosting/icing
 */
export function generateFrostingPrompt(
  answers: IntakeAnswers,
  frostingType: string | null,
  config: PromptGenerationConfig = DEFAULT_CONFIG,
): string {
  const frosting =
    frostingType ||
    answers.frostings?.[0] ||
    answers.cakeIcing ||
    "buttercream";

  let prompt = `Exquisite professional ${frosting} frosting`;

  // Add detailed color descriptions
  if (answers.themeNotes) {
    if (answers.themeNotes.toLowerCase().includes("white")) {
      prompt += ", pristine pure white, immaculate finish";
    } else if (answers.themeNotes.toLowerCase().includes("pink")) {
      prompt += ", delicate pastel pink, elegant soft tone";
    } else if (answers.themeNotes.toLowerCase().includes("chocolate")) {
      prompt += ", luxurious chocolate brown with rich depth";
    } else if (answers.themeNotes.toLowerCase().includes("gold")) {
      prompt += ", premium gold tone, luxurious elegant color";
    } else {
      prompt += ", premium luxury colors with sophisticated elegance";
    }
  } else {
    prompt += ", classic pristine white";
  }

  // Add detailed frosting type specifics
  const frostingDetails: Record<string, string> = {
    buttercream:
      "silky smooth, creamy luxurious texture, perfectly hand-applied, visible piping texture",
    fondant:
      "flawlessly smooth, polished elegant finish, professional rolled appearance, mirror-like quality",
    ganache:
      "glossy rich finish, deep luxurious appearance, professionally poured with precision",
    "cream-cheese":
      "soft delicate texture, artisanal charm, rustic elegance, natural appearance",
  };

  prompt += `, ${frostingDetails[frosting.toLowerCase()] || "smooth professional premium finish"}`;

  // Add complexity with detailed descriptions
  if (answers.designComplexity === "intricate") {
    prompt +=
      ", intricate piped details, varied texture patterns, professional decoration marks visible, complex design";
  } else if (answers.designComplexity === "simple") {
    prompt +=
      ", clean lines, minimalist elegant design, unadorned professional finish";
  } else {
    prompt += ", balanced decorative detail with refined professional finish";
  }

  // Outdoor/weather consideration
  if (answers.outdoorIcing) {
    prompt +=
      ", premium heat-resistant formula, professional bakery quality, outdoor-ready";
  }

  // Professional photography details optimized for DALL-E 3
  prompt +=
    ", professional close-up food photography, photorealistic, ultra high definition, perfect frosting texture visibility, studio lighting, isolated product shot, commercial bakery quality";

  return prompt;
}

/**
 * Generate a prompt for filling layer
 */
export function generateFillingPrompt(
  answers: IntakeAnswers,
  fillingType: string | null,
  config: PromptGenerationConfig = DEFAULT_CONFIG,
): string {
  const filling = fillingType || answers.fillings?.[0] || "vanilla cream";

  let prompt = `Exquisite ${filling} filling layer, delicious cross-section`;

  // Add detailed visual descriptors
  const fillingVisuals: Record<string, string> = {
    chocolate:
      "luxurious rich chocolate color, smooth glossy appearance, deep cocoa tones",
    vanilla:
      "creamy pristine vanilla/white color, silky luxurious appearance, premium quality",
    cream:
      "smooth dense cream filling, thick luxurious texture, premium appearance",
    berry:
      "vibrant natural berry color, fresh appearance with visible berry pieces, artisanal quality",
    fruit: "natural fresh fruit appearance, juicy look, visible fruit texture",
    lemon:
      "bright vibrant yellow color, fresh citrus appearance, zesty brightness",
    pistachio:
      "elegant light green color, sophisticated nutty appearance, premium tone",
    coffee:
      "rich sophisticated brown color, luxurious espresso tone, deep flavor appearance",
  };

  // Match filling type with detailed description
  let matched = false;
  for (const [key, visual] of Object.entries(fillingVisuals)) {
    if (filling.toLowerCase().includes(key)) {
      prompt += `, ${visual}`;
      matched = true;
      break;
    }
  }
  if (!matched) {
    prompt += ", premium professional bakery filling, luxurious appearance";
  }

  // Quality notes with detail
  if (answers.designComplexity === "intricate") {
    prompt +=
      ", with intricate visible layers or swirls, artisanal masterpiece quality";
  } else {
    prompt += ", smooth refined professional finish";
  }

  // Dietary considerations
  if (answers.dietaryPreferences?.includes("vegan")) {
    prompt += ", premium vegan-friendly filling, professional quality";
  }

  // Professional photography details optimized for DALL-E 3
  prompt +=
    ", cross-section layer view showing thickness and texture, professional food photography, photorealistic, ultra high definition, isolated product shot, studio lighting, commercial bakery quality";

  return prompt;
}

/**
 * Generate all prompts needed for a multi-tier cake
 */
export function generateAllCakePrompts(
  answers: IntakeAnswers,
  config: PromptGenerationConfig = DEFAULT_CONFIG,
): {
  tiers: string[];
  frostings: string[];
  fillings: string[];
} {
  const tierCount = answers.tierCount || 1;
  const tiers: string[] = [];
  const frostings: string[] = [];
  const fillings: string[] = [];

  for (let i = 0; i < tierCount; i++) {
    // Generate tier prompt
    tiers.push(generateCakeTierPrompt(answers, i, config));

    // Generate frosting prompt (one per tier)
    const frostingType = answers.frostings?.[i] || answers.cakeIcing || null;
    frostings.push(generateFrostingPrompt(answers, frostingType, config));

    // Generate filling prompt (one per tier, not for top tier)
    if (i < tierCount - 1) {
      const fillingType = answers.fillings?.[i] || null;
      fillings.push(generateFillingPrompt(answers, fillingType, config));
    }
  }

  return { tiers, frostings, fillings };
}

/**
 * Generate prompt configuration from intake answers
 */
export function getPromptConfig(
  answers: IntakeAnswers,
): PromptGenerationConfig {
  const styleMap: Record<
    string,
    "professional" | "artistic" | "rustic" | "elegant"
  > = {
    simple: "professional",
    intricate: "artistic",
    wedding: "elegant",
    birthday: "artistic",
    anniversary: "elegant",
  };

  const style: "professional" | "artistic" | "rustic" | "elegant" =
    styleMap[answers.designComplexity] ||
    styleMap[answers.occasion?.toLowerCase()] ||
    "professional";

  const detailLevel: "simple" | "moderate" | "intricate" =
    answers.designComplexity || "moderate";

  return {
    style,
    detailLevel,
    lighting: answers.outdoorIcing ? "bright" : "studio",
  };
}

/**
 * Format all prompts for display
 */
export function formatPromptsForDisplay(prompts: {
  tiers: string[];
  frostings: string[];
  fillings: string[];
}): {
  tiers: Array<{ index: number; prompt: string }>;
  frostings: Array<{ index: number; prompt: string }>;
  fillings: Array<{ index: number; prompt: string }>;
} {
  return {
    tiers: prompts.tiers.map((prompt, index) => ({ index, prompt })),
    frostings: prompts.frostings.map((prompt, index) => ({ index, prompt })),
    fillings: prompts.fillings.map((prompt, index) => ({ index, prompt })),
  };
}
