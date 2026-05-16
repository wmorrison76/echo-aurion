import type { Recipe } from "@shared/recipes";
import { extractRecipeLearningData } from "./recipe-export-import";

/**
 * Recipe learning data structure for AI/Pinecone storage
 */
export interface RecipeLearningData {
  id: string;
  title: string;
  tags: string[];
  ingredientPatterns: IngredientPattern[];
  cookingMethods: string[];
  flavorProfile: FlavorProfile;
  nutritionEstimate: NutritionEstimate;
  difficulty: "easy" | "medium" | "hard";
  totalTime: number;
  cuisine: string[];
  diet: string[];
  embedding?: number[]; // For vector storage in Pinecone
}

export interface IngredientPattern {
  name: string;
  type: "protein" | "carb" | "vegetable" | "fruit" | "dairy" | "spice" | "oil" | "other";
  commonAmounts: number[];
  commonUnits: string[];
  frequency: number;
}

export interface FlavorProfile {
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  spicy: number;
}

export interface NutritionEstimate {
  estimatedCalories: number;
  macroRatio: {
    protein: number;
    carbs: number;
    fat: number;
  };
  highFiber: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
}

/**
 * Extract ingredient patterns for AI learning
 */
export function extractIngredientPatterns(recipes: Recipe[]): Map<string, IngredientPattern> {
  const patterns = new Map<string, IngredientPattern>();

  recipes.forEach((recipe) => {
    const ingredients = recipe.ingredients || [];
    ingredients.forEach((ing) => {
      const parsed = parseIngredient(ing);
      if (!parsed) return;

      const existing = patterns.get(parsed.name) || {
        name: parsed.name,
        type: classifyIngredient(parsed.name),
        commonAmounts: [],
        commonUnits: [],
        frequency: 0,
      };

      if (parsed.amount) {
        existing.commonAmounts.push(parsed.amount);
      }
      if (parsed.unit) {
        existing.commonUnits.push(parsed.unit);
      }
      existing.frequency += 1;

      patterns.set(parsed.name, existing);
    });
  });

  // Average amounts
  patterns.forEach((pattern) => {
    if (pattern.commonAmounts.length > 0) {
      const avg = pattern.commonAmounts.reduce((a, b) => a + b) / pattern.commonAmounts.length;
      pattern.commonAmounts = [Math.round(avg * 100) / 100];
    }
  });

  return patterns;
}

/**
 * Parse ingredient string to extract amount, unit, and name
 */
export function parseIngredient(ing: string): { amount?: number; unit?: string; name: string } | null {
  const match = ing.match(/^([\d.]+)\s*(\w+)\s+(.+)$/);
  if (match) {
    return {
      amount: parseFloat(match[1]),
      unit: match[2],
      name: match[3],
    };
  }

  const nameMatch = ing.match(/^(.+)$/);
  return nameMatch ? { name: nameMatch[1] } : null;
}

/**
 * Classify ingredient type
 */
export function classifyIngredient(
  ingredient: string
): "protein" | "carb" | "vegetable" | "fruit" | "dairy" | "spice" | "oil" | "other" {
  const lower = ingredient.toLowerCase();

  if (
    [
      "chicken",
      "beef",
      "pork",
      "fish",
      "shrimp",
      "egg",
      "tofu",
      "tempeh",
      "lentil",
      "bean",
      "meat",
    ].some((w) => lower.includes(w))
  ) {
    return "protein";
  }
  if (
    [
      "rice",
      "pasta",
      "bread",
      "flour",
      "grain",
      "oat",
      "quinoa",
      "potato",
      "corn",
      "barley",
    ].some((w) => lower.includes(w))
  ) {
    return "carb";
  }
  if (
    [
      "carrot",
      "celery",
      "onion",
      "garlic",
      "spinach",
      "broccoli",
      "tomato",
      "pepper",
      "lettuce",
      "cucumber",
      "vegetable",
    ].some((w) => lower.includes(w))
  ) {
    return "vegetable";
  }
  if (
    [
      "apple",
      "banana",
      "orange",
      "lemon",
      "lime",
      "strawberry",
      "blueberry",
      "fruit",
    ].some((w) => lower.includes(w))
  ) {
    return "fruit";
  }
  if (
    [
      "milk",
      "cheese",
      "butter",
      "cream",
      "yogurt",
      "parmesan",
      "mozzarella",
      "dairy",
    ].some((w) => lower.includes(w))
  ) {
    return "dairy";
  }
  if (
    [
      "salt",
      "pepper",
      "cumin",
      "paprika",
      "basil",
      "oregano",
      "thyme",
      "cinnamon",
      "ginger",
      "spice",
    ].some((w) => lower.includes(w))
  ) {
    return "spice";
  }
  if (["oil", "olive", "vegetable", "coconut"].some((w) => lower.includes(w))) {
    return "oil";
  }
  return "other";
}

/**
 * Analyze flavor profile based on ingredients
 */
export function analyzeFlavorProfile(ingredients: string[]): FlavorProfile {
  const text = ingredients.join(" ").toLowerCase();

  const flavorIndicators = {
    sweet: [
      "sugar",
      "honey",
      "maple",
      "caramel",
      "chocolate",
      "vanilla",
      "fruit",
      "berry",
      "apple",
      "orange",
    ],
    salty: ["salt", "soy", "anchovy", "bacon", "ham", "salami"],
    sour: ["lemon", "lime", "vinegar", "yogurt", "buttermilk", "sour cream"],
    bitter: ["bitter greens", "endive", "radicchio", "coffee", "cocoa"],
    umami: ["mushroom", "tomato", "parmesan", "soy sauce", "miso", "anchovy"],
    spicy: [
      "chili",
      "cayenne",
      "jalapeño",
      "sriracha",
      "wasabi",
      "pepper",
      "hot",
    ],
  };

  const profile: FlavorProfile = {
    sweet: 0,
    salty: 0,
    sour: 0,
    bitter: 0,
    umami: 0,
    spicy: 0,
  };

  Object.entries(flavorIndicators).forEach(([flavor, indicators]) => {
    const count = indicators.filter((ind) => text.includes(ind)).length;
    profile[flavor as keyof FlavorProfile] = Math.min(count * 0.2, 1);
  });

  return profile;
}

/**
 * Estimate nutrition from recipe
 */
export function estimateNutrition(recipe: Recipe): NutritionEstimate {
  const ingredients = recipe.ingredients || [];
  const text = ingredients.join(" ").toLowerCase();

  // Basic calorie estimation (very rough)
  const baseCalories = ingredients.length * 30;
  const oilAdjustment = (text.match(/oil|butter|cream/g) || []).length * 50;
  const meatAdjustment = (text.match(/chicken|beef|pork|fish/g) || []).length * 60;
  const estimatedCalories = Math.round(baseCalories + oilAdjustment + meatAdjustment);

  return {
    estimatedCalories,
    macroRatio: {
      protein: text.match(/protein|meat|egg|tofu|bean/g) ? 0.3 : 0.15,
      carbs: text.match(/grain|rice|pasta|bread/g) ? 0.5 : 0.3,
      fat: text.match(/oil|butter|cream|cheese/g) ? 0.35 : 0.15,
    },
    highFiber:
      (text.match(/bean|lentil|vegetable|grain|seed|nut/g) || []).length > 2,
    isGlutenFree: !text.match(/wheat|barley|rye|flour/),
    isDairyFree: !text.match(/milk|cheese|butter|cream|yogurt/),
    isNutFree: !text.match(/peanut|almond|walnut|cashew|pistachio/),
  };
}

/**
 * Generate embedding vector for recipe (simplified)
 * In production, this would use OpenAI or similar
 */
export function generateRecipeEmbedding(data: RecipeLearningData): number[] {
  const embedding = new Array(1536).fill(0);

  // Simple embedding generation based on recipe characteristics
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  };

  // Seed embedding with recipe features
  const features = [
    `title:${data.title}`,
    ...data.tags,
    ...data.cookingMethods,
    `difficulty:${data.difficulty}`,
    ...data.cuisine,
    ...data.diet,
  ];

  features.forEach((feature, idx) => {
    const hash = hashString(feature);
    const seedIdx = Math.abs(hash) % embedding.length;
    embedding[seedIdx] += 0.1 * (1 / (idx + 1));
  });

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0));
  return embedding.map((v) => magnitude > 0 ? v / magnitude : 0);
}

/**
 * Create comprehensive learning data from recipe
 */
export function createRecipeLearningData(recipe: Recipe): RecipeLearningData {
  const flavorProfile = analyzeFlavorProfile(recipe.ingredients || []);
  const nutrition = estimateNutrition(recipe);

  const data: RecipeLearningData = {
    id: recipe.id,
    title: recipe.title,
    tags: recipe.tags || [],
    ingredientPatterns: Array.from(
      extractIngredientPatterns([recipe]).values()
    ),
    cookingMethods: extractCookingMethods((recipe.instructions || []).join(" ")),
    flavorProfile,
    nutritionEstimate: nutrition,
    difficulty: estimateDifficulty(
      (recipe.ingredients || []).length,
      (recipe.instructions || []).length,
      (recipe.prepTime || 0) + (recipe.cookTime || 0)
    ),
    totalTime:
      (recipe.prepTime || 0) + (recipe.cookTime || 0),
    cuisine: detectCuisine(recipe),
    diet: detectDiet(recipe),
  };

  // Generate embedding for Pinecone
  data.embedding = generateRecipeEmbedding(data);

  return data;
}

/**
 * Extract cooking methods from instruction text
 */
export function extractCookingMethods(text: string): string[] {
  const methods = [
    "bake",
    "boil",
    "braise",
    "broil",
    "fry",
    "grill",
    "roast",
    "sauté",
    "simmer",
    "steam",
    "stir",
    "fold",
    "knead",
    "whip",
    "blend",
    "puree",
  ];
  const lowerText = text.toLowerCase();
  return methods.filter((m) => lowerText.includes(m));
}

/**
 * Estimate recipe difficulty
 */
export function estimateDifficulty(
  ingredientCount: number,
  instructionCount: number,
  totalTime: number
): "easy" | "medium" | "hard" {
  const score = ingredientCount * 0.3 + instructionCount * 0.4 + (totalTime / 60) * 0.3;
  if (score < 5) return "easy";
  if (score < 10) return "medium";
  return "hard";
}

/**
 * Detect cuisine type from recipe
 */
export function detectCuisine(recipe: Recipe): string[] {
  const text = [recipe.title, ...(recipe.tags || [])].join(" ").toLowerCase();
  const cuisines: { [key: string]: string[] } = {
    Italian: ["pasta", "risotto", "italian"],
    French: ["french", "beurre", "sauce"],
    Asian: ["asian", "soy", "ginger", "sesame", "wok"],
    Mexican: ["mexican", "taco", "enchilada", "salsa", "cilantro"],
    Indian: ["indian", "curry", "tandoor", "naan"],
    Mediterranean: ["mediterranean", "olive", "feta", "greek"],
  };

  return Object.entries(cuisines)
    .filter(([_, keywords]) => keywords.some((kw) => text.includes(kw)))
    .map(([cuisine]) => cuisine);
}

/**
 * Detect diet compatibility
 */
export function detectDiet(recipe: Recipe): string[] {
  const ingredients = recipe.ingredients || [];
  const text = ingredients.join(" ").toLowerCase();
  const diets = [];

  if (!text.match(/meat|chicken|beef|pork|fish|shrimp/)) {
    diets.push("vegetarian");
  }

  if (
    !text.match(/meat|chicken|beef|pork|fish|shrimp|milk|cheese|butter|egg|cream|dairy/)
  ) {
    diets.push("vegan");
  }

  if (!text.match(/wheat|barley|rye|gluten|flour/)) {
    diets.push("gluten-free");
  }

  if (!text.match(/milk|cheese|butter|cream|yogurt|lactose/)) {
    diets.push("dairy-free");
  }

  if (!text.match(/peanut|almond|walnut|cashew|pistachio|nut/)) {
    diets.push("nut-free");
  }

  return diets;
}
