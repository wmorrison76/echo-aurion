import type {
  RecipeCodexMetadata,
  RecipeCategory,
  IngredientCodexEntry,
  TechniqueCodexEntry,
} from "../echo/codex";

/**
 * Convert an imported recipe from PDF to RecipeCodexMetadata
 * Used when storing recipes in Pinecone to enrich metadata for EchoChefBrain
 */
export function mapImportedRecipeToCodex(recipe: {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  sourceBook: string;
  sourcePage: number;
  cuisine?: string;
  course?: string;
  difficulty?: string;
  prepTime?: string;
  cookTime?: string;
  yield?: string;
  tags?: string[];
}): RecipeCodexMetadata {
  // Infer recipe category from course or title
  const category = inferRecipeCategory(recipe.course, recipe.title);

  // Infer complexity from difficulty or cooking time
  const complexity = inferComplexity(recipe.difficulty, recipe.cookTime);

  // Extract ingredients list from text
  const mainIngredients = extractMainIngredients(recipe.ingredients);

  // Detect techniques from instructions
  const primaryTechniques = detectTechniques(recipe.instructions);

  // Parse dietary tags and allergens
  const dietaryTags = parseFromTags(recipe.tags, "dietary");
  const allergens = detectAllergens(recipe.ingredients, recipe.tags);

  // Infer flavor profile from ingredients and description
  const flavorProfile = inferFlavorProfile(recipe.ingredients, recipe.title);

  return {
    id: recipe.id,
    title: recipe.title,
    category,
    cuisineRegion: recipe.cuisine,
    yieldDescription: recipe.yield,
    complexity,
    primaryTechniques,
    mainIngredients,
    dietaryTags,
    allergens,
    flavorProfile,
    serviceContext: inferServiceContext(recipe.course),
  };
}

function inferRecipeCategory(
  course: string | undefined,
  title: string,
): RecipeCategory {
  const lower = `${course} ${title}`.toLowerCase();

  if (lower.includes("appetizer") || lower.includes("starter"))
    return "appetizer";
  if (lower.includes("salad")) return "salad";
  if (lower.includes("soup")) return "soup";
  if (lower.includes("entree") || lower.includes("main")) return "entree";
  if (lower.includes("side")) return "side";
  if (
    lower.includes("dessert") ||
    lower.includes("cake") ||
    lower.includes("pie")
  )
    return "dessert";
  if (lower.includes("cocktail") || lower.includes("drink")) return "cocktail";
  if (lower.includes("bread")) return "bread";
  if (lower.includes("sauce") || lower.includes("dressing")) return "sauce";
  if (lower.includes("stock") || lower.includes("broth")) return "base";

  return "entree"; // default
}

function inferComplexity(
  difficulty: string | undefined,
  cookTime: string | undefined,
): 1 | 2 | 3 | 4 | 5 {
  if (difficulty) {
    const lower = difficulty.toLowerCase();
    if (lower.includes("beginner") || lower.includes("easy")) return 1;
    if (lower.includes("simple")) return 2;
    if (lower.includes("intermediate") || lower.includes("moderate")) return 3;
    if (lower.includes("advanced") || lower.includes("hard")) return 4;
    if (lower.includes("expert") || lower.includes("professional")) return 5;
  }

  // Estimate from cooking time
  if (cookTime) {
    const minutes = parseInt(cookTime);
    if (minutes < 15) return 1;
    if (minutes < 30) return 2;
    if (minutes < 60) return 3;
    if (minutes < 120) return 4;
    return 5;
  }

  return 3; // default to intermediate
}

function extractMainIngredients(ingredients: string[]): string[] {
  // Take the first few ingredients (typically the most important)
  return ingredients.slice(0, 5).map((ing) => ing.split(",")[0].trim());
}

function detectTechniques(instructions: string[]): string[] {
  const techniques: Set<string> = new Set();

  const techniquePatterns: { [key: string]: RegExp } = {
    "technique:pan_sear": /sear|sauté|pan[\s-]?fry/i,
    "technique:roast": /roast/i,
    "technique:bake": /bake/i,
    "technique:braise": /braise/i,
    "technique:steam": /steam/i,
    "technique:boil": /boil/i,
    "technique:grill": /grill|char/i,
    "technique:fry": /deep[\s-]?fry|fry/i,
    "technique:blanch": /blanch/i,
    "technique:poach": /poach/i,
  };

  instructions.forEach((instr) => {
    Object.entries(techniquePatterns).forEach(([technique, pattern]) => {
      if (pattern.test(instr)) {
        techniques.add(technique);
      }
    });
  });

  return Array.from(techniques);
}

function parseFromTags(tags: string[] | undefined, prefix: string): string[] {
  if (!tags) return [];
  return tags
    .filter((tag) => tag.startsWith(`${prefix}:`))
    .map((tag) => tag.replace(`${prefix}:`, ""));
}

function detectAllergens(
  ingredients: string[],
  tags: string[] | undefined,
): string[] {
  const allergens: Set<string> = new Set();

  // From tags if present
  if (tags) {
    parseFromTags(tags, "allergen").forEach((a) => allergens.add(a));
  }

  // From common allergen keywords in ingredients
  const allergenPatterns: { [key: string]: RegExp } = {
    dairy: /milk|cheese|butter|cream|yogurt|lactose/i,
    nuts: /nut|peanut|almond|walnut|cashew|pistachio|pecan/i,
    shellfish: /shrimp|crab|lobster|oyster|clam|mussel|scallop/i,
    fish: /fish|salmon|tuna|cod|halibut|anchovy/i,
    gluten: /wheat|barley|rye|oat|gluten/i,
    soy: /soy|tofu|edamame/i,
    sesame: /sesame/i,
    tree_nuts: /almond|walnut|cashew|pistachio|hazelnut|macadamia/i,
  };

  ingredients.forEach((ing) => {
    Object.entries(allergenPatterns).forEach(([allergen, pattern]) => {
      if (pattern.test(ing)) {
        allergens.add(allergen);
      }
    });
  });

  return Array.from(allergens);
}

function inferFlavorProfile(ingredients: string[], title: string): string[] {
  const profiles: Set<string> = new Set();

  const flavorKeywords: { [key: string]: RegExp } = {
    rich: /butter|cream|oil|fat|sauce/i,
    bright: /lemon|lime|vinegar|acid|citrus|fresh|herb/i,
    herbaceous: /herb|basil|oregano|thyme|rosemary|sage|mint/i,
    spicy: /chili|pepper|cayenne|sriracha|wasabi|hot/i,
    sweet: /sugar|honey|caramel|maple|fruit|berry/i,
    umami: /soy|miso|mushroom|parmesan|anchovy|tomato/i,
    smoky: /smoked|charred|grilled|smoke|BBQ/i,
    earthy: /mushroom|truffle|beet|carrot|root/i,
    light: /vegetable|salad|broth|clear/i,
  };

  const text = `${ingredients.join(" ")} ${title}`.toLowerCase();
  Object.entries(flavorKeywords).forEach(([profile, pattern]) => {
    if (pattern.test(text)) {
      profiles.add(profile);
    }
  });

  return Array.from(profiles);
}

function inferServiceContext(course: string | undefined): string | undefined {
  if (!course) return undefined;

  const lower = course.toLowerCase();
  if (lower.includes("banquet") || lower.includes("buffet"))
    return "banquet_plated";
  if (lower.includes("plat")) return "banquet_plated";
  if (lower.includes("buffet")) return "buffet";
  if (lower.includes("a la carte") || lower.includes("service"))
    return "a_la_carte";

  return undefined;
}
