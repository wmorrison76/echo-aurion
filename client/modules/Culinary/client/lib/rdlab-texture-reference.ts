/**
 * Comprehensive texture reference and pairing system for R&D Labs
 */

export const TEXTURE_DEFINITIONS = {
  creamy: "Smooth, soft, and rich—often associated with dairy or emulsified bases.",
  crispy: "Brittle and dry with an audible crunch on bite.",
  chewy: "Requires prolonged biting and has elasticity.",
  flaky: "Separates into thin layers; commonly found in pastries.",
  airy: "Light and full of incorporated air, like a mousse or foam.",
  gelatinous: "Wobbly, slippery, and cohesive texture like jelly or aspic.",
  crunchy: "Firm and toothsome with water or fiber retention (carrots, nuts).",
  silken: "Incredibly smooth and delicate, like silk—often in custards.",
  velvety: "Soft with a non-grainy, luxurious mouthfeel.",
  tender: "Soft, easily broken down, melts in mouth.",
  springy: "Bouncy with structural integrity, holds shape.",
  sticky: "Adhesive quality, clings to palate.",
  glossy: "Shiny, wet appearance with smooth surface.",
  caramelized: "Browned, slightly crunchy exterior with soft interior.",
};

export const TEXTURE_PAIRINGS = {
  creamy: [
    "Crispy bacon",
    "Toasted breadcrumbs",
    "Acidic sauces",
    "Balsamic glaze",
    "Crispy chips",
    "Crunchy nuts",
  ],
  crispy: [
    "Soft custard",
    "Avocado mousse",
    "Poached egg",
    "Foamy hollandaise",
    "Silken tofu",
    "Creamy sauce",
  ],
  chewy: [
    "Crunchy nuts",
    "Juicy fruit",
    "Tender greens",
    "Pickled vegetables",
    "Crispy shell",
  ],
  flaky: [
    "Creamy cheese",
    "Sweet glaze",
    "Fruit preserves",
    "Herb oil",
    "Silken custard",
    "Soft ganache",
  ],
  airy: [
    "Dense ganache",
    "Fruit purée",
    "Crispy sugar",
    "Powdered citrus",
    "Crunchy caramel",
    "Tart coulis",
  ],
  gelatinous: [
    "Crunchy radish",
    "Herbal oil",
    "Vinegar pearls",
    "Caviar",
    "Crispy bread",
  ],
  crunchy: [
    "Smooth hummus",
    "Sweet gel",
    "Creamy dip",
    "Light espuma",
    "Silken sauce",
    "Velvety foam",
  ],
  silken: [
    "Crispy tuile",
    "Crunchy caramel",
    "Acidic fruit",
    "Bitter chocolate",
    "Toasted breadcrumb",
  ],
  velvety: [
    "Crispy element",
    "Acidic contrast",
    "Bright herb oil",
    "Textured crumb",
  ],
  tender: [
    "Crispy skin",
    "Crunchy vegetable",
    "Acidic sauce",
    "Glossy glaze",
  ],
};

export const TECHNIQUE_TO_TEXTURE = {
  emulsify: ["creamy", "silken", "velvety"],
  foam: ["airy", "light", "ethereal"],
  gel: ["gelatinous", "glossy"],
  caramelize: ["crispy", "caramelized", "bitter-sweet"],
  ferment: ["tangy", "umami", "complex"],
  sous_vide: ["tender", "silken", "juicy"],
  spherify: ["glossy", "burst-on-tongue"],
  dehydrate: ["crispy", "concentrated"],
  freeze: ["icy", "crystalline"],
  scoop: ["airy", "creamy"],
  crystallize: ["crunchy", "sharp-mouthfeel"],
  smoke: ["complex", "layered"],
  pressure_cook: ["tender", "silken"],
  clarify: ["clear", "refined"],
  centrifuge: ["separated", "pure"],
};

export const FLAVOR_TO_TEXTURE_AFFINITY = {
  umami: ["creamy", "gelatinous", "silken"],
  salty: ["crispy", "crunchy", "glossy"],
  sweet: ["airy", "silken", "velvety"],
  sour: ["crispy", "crunchy", "gelatinous"],
  bitter: ["silken", "velvety", "dense"],
  spicy: ["creamy", "silken", "gelatinous"],
};

/**
 * Get texture pairing suggestions for a given texture
 */
export function getTexturePairings(texture: string): string[] {
  return (
    TEXTURE_PAIRINGS[texture as keyof typeof TEXTURE_PAIRINGS] || []
  );
}

/**
 * Get texture definition
 */
export function getTextureDefinition(texture: string): string {
  return (
    TEXTURE_DEFINITIONS[texture as keyof typeof TEXTURE_DEFINITIONS] ||
    "Unknown texture"
  );
}

/**
 * Get textures produced by a technique
 */
export function getTexturesForTechnique(technique: string): string[] {
  return (
    TECHNIQUE_TO_TEXTURE[
      technique.toLowerCase().replace(/\s+/g, "_") as keyof typeof TECHNIQUE_TO_TEXTURE
    ] || []
  );
}

/**
 * Get best texture pairings for a flavor profile
 */
export function getTexturesForFlavor(flavor: string): string[] {
  return (
    FLAVOR_TO_TEXTURE_AFFINITY[flavor as keyof typeof FLAVOR_TO_TEXTURE_AFFINITY] ||
    []
  );
}

/**
 * Suggest texture improvements based on current experiment
 */
export function suggestTextureImprovements(
  currentTextures: string[],
  targetFlavors: string[]
): { suggestion: string; pairing: string; reason: string }[] {
  const suggestions: { suggestion: string; pairing: string; reason: string }[] = [];

  currentTextures.forEach((texture) => {
    const pairings = getTexturePairings(texture);
    pairings.slice(0, 2).forEach((pairing) => {
      suggestions.push({
        suggestion: `Add ${pairing} to contrast with ${texture}`,
        pairing,
        reason: "Classic contrast pairing",
      });
    });
  });

  targetFlavors.forEach((flavor) => {
    const affinities = getTexturesForFlavor(flavor);
    affinities.forEach((affinity) => {
      if (!currentTextures.includes(affinity)) {
        suggestions.push({
          suggestion: `Use ${affinity} texture to enhance ${flavor} flavor`,
          pairing: affinity,
          reason: `${flavor} flavor pairs well with ${affinity}`,
        });
      }
    });
  });

  return suggestions.slice(0, 4);
}

/**
 * All available textures
 */
export const ALL_TEXTURES = Object.keys(TEXTURE_DEFINITIONS);
