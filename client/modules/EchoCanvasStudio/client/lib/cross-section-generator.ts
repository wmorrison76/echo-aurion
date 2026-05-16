/**
 * Cross-Section & Crumb Generator
 * Generates AI prompts for realistic cake cross-sections and interior views
 */

import type { IntakeAnswers } from "@/modules/cake-builder/types";

/**
 * Generate prompt for cake cross-section view
 */
export function generateCrossSectionPrompt(
  answers: IntakeAnswers,
  tierIndex: number,
  flavor: string = "vanilla",
  fillingType: string = "vanilla cream",
): string {
  let prompt = `Professional cake cross-section view, cut perfectly in half, showing interior`;

  // Add flavor-specific descriptions
  const flavorDescriptions: Record<string, string> = {
    chocolate: "rich dark brown crumb with visible cocoa",
    vanilla: "light golden vanilla bean speckled crumb",
    "chocolate-vanilla": "swirled chocolate and vanilla crumb",
    strawberry: "pink-tinged moist crumb with visible strawberries",
    lemon: "bright yellow crumb with visible lemon zest",
    carrot: "orange-toned moist crumb with visible carrot pieces",
    "red velvet": "deep red velvet crumb color",
    coconut: "white crumb with visible coconut shreds",
    pistachio: "light green natural pistachio color",
  };

  const flavorKey = flavor.toLowerCase().replace(/\s+/g, "-");
  const crumbDescription =
    flavorDescriptions[flavorKey] || "professional cake crumb texture";
  prompt += `, ${crumbDescription}`;

  // Add filling layer description
  const fillingDescriptions: Record<string, string> = {
    chocolate: "thick dark chocolate filling layer between cake",
    vanilla: "smooth white vanilla cream filling",
    "vanilla cream": "rich vanilla pastry cream filling",
    raspberry: "vibrant raspberry jam with visible fruit pieces",
    "strawberry jam": "bright red strawberry filling",
    "lemon curd": "bright yellow lemon curd filling",
    "chocolate ganache": "glossy dark chocolate ganache layer",
    "cream cheese": "thick cream cheese filling",
    buttercream: "fluffy buttercream filling layer",
  };

  const fillingKey = fillingType.toLowerCase();
  const fillingDesc =
    fillingDescriptions[fillingKey] || "professional filling layer";
  prompt += `, ${fillingDesc} visible between cake layers`;

  // Add crumb quality based on complexity
  if (answers.designComplexity === "intricate") {
    prompt += ", professional bakery quality with perfect crumb structure";
  } else if (answers.designComplexity === "simple") {
    prompt += ", clean simple crumb without elaborate texture";
  } else {
    prompt += ", balanced professional crumb quality";
  }

  // Add dietary considerations
  if (answers.dietaryPreferences?.includes("vegan")) {
    prompt += ", vegan cake crumb with natural appearance";
  }
  if (answers.dietaryPreferences?.includes("gluten-free")) {
    prompt += ", gluten-free cake with fine crumb structure";
  }

  // Add moisture/texture notes
  if (answers.textureNotes?.toLowerCase().includes("moist")) {
    prompt += ", visibly moist crumb";
  } else if (answers.textureNotes?.toLowerCase().includes("dry")) {
    prompt += ", light airy crumb";
  }

  // Professional photography guidance
  prompt +=
    ", perfect clean cut showing layers, studio lighting with soft shadows, professional food photography";

  return prompt;
}

/**
 * Generate all cross-section prompts for a multi-tier cake
 */
export function generateAllCrossSectionPrompts(
  answers: IntakeAnswers,
  flavorArray: string[] = [],
  fillingArray: string[] = [],
): string[] {
  const tierCount = answers.tierCount || 1;
  const prompts: string[] = [];

  for (let i = 0; i < tierCount; i++) {
    const flavor = flavorArray[i] || answers.flavors?.[i] || "vanilla";
    const filling = fillingArray[i] || answers.fillings?.[i] || "vanilla cream";

    prompts.push(generateCrossSectionPrompt(answers, i, flavor, filling));
  }

  return prompts;
}

/**
 * Generate crumb texture closeup prompts
 */
export function generateCrumbTexturePrompt(
  flavor: string = "vanilla",
  quality: "fine" | "moderate" | "rustic" = "moderate",
): string {
  let prompt = `Close-up macro photography of ${flavor} cake crumb texture`;

  const qualityMap: Record<string, string> = {
    fine: "ultra fine, perfect crumb structure, professional bakery quality",
    moderate: "balanced crumb with visible structure, natural appearance",
    rustic: "rustic artisanal crumb with visible irregular texture",
  };

  prompt += `, ${qualityMap[quality]}`;

  // Add specific crumb characteristics
  const flavorCrumbMap: Record<string, string> = {
    chocolate: "with cocoa particles visible, rich dark color",
    vanilla: "with vanilla bean specks, golden color, light airy texture",
    carrot: "with visible vegetable pieces, moist texture",
    coconut: "with shredded coconut pieces throughout",
    strawberry: "with fresh strawberry pieces visible throughout",
    pistachio: "with visible pistachio pieces, natural green tone",
  };

  const flavorKey = flavor.toLowerCase();
  if (flavorCrumbMap[flavorKey]) {
    prompt += `, ${flavorCrumbMap[flavorKey]}`;
  }

  prompt +=
    ", professional macro lighting highlighting texture details, shallow depth of field, food photography";

  return prompt;
}

/**
 * Generate cross-section comparison prompts (multiple tiers side-by-side)
 */
export function generateCrossSectionComparisonPrompt(
  tierCount: number,
  flavors: string[],
): string {
  let prompt = `Professional cake cross-section comparison showing ${tierCount} different tiers`;

  const flavorDescriptions: Record<string, string> = {
    chocolate: "rich dark chocolate",
    vanilla: "light golden vanilla",
    strawberry: "pink strawberry",
    lemon: "bright yellow lemon",
    carrot: "orange carrot",
    "red velvet": "deep red velvet",
  };

  const tierDescriptions = flavors.map((f) => {
    const key = f.toLowerCase();
    return flavorDescriptions[key] || f;
  });

  prompt += `: ${tierDescriptions.join(", ")}`;

  prompt +=
    ", showing different fillings and crumb structures, studio lighting with soft shadows, professional food photography";

  return prompt;
}

/**
 * Generate cross-section interior fill texture
 */
export function generateInteriorFillTexture(
  fillColor: string,
  pattern: "smooth" | "swirled" | "spotted" = "smooth",
): string {
  let prompt = `Professional interior fill texture, ${fillColor} color`;

  const patternDescriptions: Record<string, string> = {
    smooth: "perfectly smooth finish, luxurious appearance",
    swirled: "swirled pattern with natural variation",
    spotted: "natural spotted or speckled appearance",
  };

  prompt += `, ${patternDescriptions[pattern]}`;

  prompt += ", professional bakery quality, food photography";

  return prompt;
}
