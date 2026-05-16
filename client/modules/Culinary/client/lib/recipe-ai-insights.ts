import type { Recipe } from "@shared/recipes";

/**
 * Comprehensive recipe insights for AI learning
 */
export interface RecipeInsights {
  ingredientRatios: Map<string, IngredientRatio>;
  flavorProfiles: FlavorProfileInsight[];
  cuisinePatterns: Map<string, CuisinePattern>;
  commonCombinations: IngredientCombination[];
  cookingMethods: Map<string, CookingMethodStats>;
  regionalPatterns: Map<string, RegionalPattern>;
}

export interface IngredientRatio {
  ingredient1: string;
  ingredient2: string;
  ratio: number; // ingredient1 per ingredient2
  count: number; // how many times seen
  unit1?: string;
  unit2?: string;
}

export interface FlavorProfileInsight {
  recipeName: string;
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  spicy: number;
  flavorBalance: string; // e.g., "balanced", "sweet-heavy", "umami-forward"
}

export interface CuisinePattern {
  cuisine: string;
  commonIngredients: string[];
  flavorProfile: Record<string, number>;
  cookingMethods: string[];
  recipeCount: number;
  avgDifficulty: string;
}

export interface IngredientCombination {
  ingredients: string[];
  frequency: number;
  cuisines: string[];
  recipeCount: number;
}

export interface CookingMethodStats {
  method: string;
  frequency: number;
  avgTime: number;
  cuisines: string[];
  commonIngredients: string[];
}

export interface RegionalPattern {
  region: string;
  characteristics: string[];
  signature: {
    ingredients: string[];
    flavorProfile: Record<string, number>;
    cookingMethods: string[];
  };
}

/**
 * Extract all meaningful insights from a collection of recipes
 */
export function extractRecipeInsights(recipes: Recipe[]): RecipeInsights {
  const insights: RecipeInsights = {
    ingredientRatios: new Map(),
    flavorProfiles: [],
    cuisinePatterns: new Map(),
    commonCombinations: [],
    cookingMethods: new Map(),
    regionalPatterns: new Map(),
  };

  // Analyze each recipe
  recipes.forEach((recipe) => {
    const flavor = analyzeFlavorProfile(recipe.ingredients || []);
    insights.flavorProfiles.push({
      recipeName: recipe.title,
      ...flavor,
      flavorBalance: getFlavorBalance(flavor),
    });

    // Extract ingredient ratios
    const parsedIngredients = parseIngredientsWithQuantities(recipe.ingredients || []);
    extractIngredientRatios(parsedIngredients, insights.ingredientRatios);

    // Extract cooking methods
    extractCookingMethodStats(
      recipe.instructions || [],
      recipe.prepTime || 0,
      recipe.cookTime || 0,
      insights.cookingMethods
    );

    // Update cuisine patterns
    const cuisines = detectCuisine(recipe);
    cuisines.forEach((cuisine) => {
      updateCuisinePattern(cuisine, recipe, insights.cuisinePatterns);
    });
  });

  // Analyze ingredient combinations
  insights.commonCombinations = findCommonCombinations(recipes);

  // Analyze regional patterns
  insights.regionalPatterns = extractRegionalPatterns(recipes);

  return insights;
}

/**
 * Analyze flavor profile from ingredients with numeric values
 */
function analyzeFlavorProfile(ingredients: string[]): Omit<FlavorProfileInsight, "recipeName" | "flavorBalance"> {
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
      "cinnamon",
    ],
    salty: ["salt", "soy", "anchovy", "bacon", "ham", "salami", "miso"],
    sour: ["lemon", "lime", "vinegar", "yogurt", "buttermilk", "sour cream", "wine"],
    bitter: [
      "bitter greens",
      "endive",
      "radicchio",
      "coffee",
      "cocoa",
      "dark chocolate",
    ],
    umami: [
      "mushroom",
      "tomato",
      "parmesan",
      "soy sauce",
      "miso",
      "anchovy",
      "beef",
      "parmesan",
    ],
    spicy: [
      "chili",
      "cayenne",
      "jalapeño",
      "sriracha",
      "wasabi",
      "pepper",
      "hot sauce",
      "cumin",
    ],
  };

  const profile = {
    sweet: 0,
    salty: 0,
    sour: 0,
    bitter: 0,
    umami: 0,
    spicy: 0,
  };

  // Count flavor indicators weighted by ingredient count
  Object.entries(flavorIndicators).forEach(([flavor, indicators]) => {
    const matches = indicators.filter((ind) => text.includes(ind)).length;
    profile[flavor as keyof typeof profile] = Math.min((matches / indicators.length) * 10, 10);
  });

  return profile;
}

/**
 * Determine flavor balance from profile
 */
function getFlavorBalance(profile: Omit<FlavorProfileInsight, "recipeName" | "flavorBalance">): string {
  const entries = Object.entries(profile).sort((a, b) => b[1] - a[1]);
  const [top1, val1] = entries[0];
  const [top2, val2] = entries[1] || ["", 0];

  if (val1 < 2) return "subtle";
  if (val2 > val1 * 0.7) return "balanced";
  return `${top1}-forward`;
}

/**
 * Parse ingredients with quantities
 */
interface ParsedIngredient {
  name: string;
  amount?: number;
  unit?: string;
  type: IngredientType;
}

type IngredientType =
  | "protein"
  | "carb"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "spice"
  | "oil"
  | "leavening"
  | "other";

function parseIngredientsWithQuantities(ingredients: string[]): ParsedIngredient[] {
  return ingredients.map((ing) => {
    const match = ing.match(/^([\d.\s/]+)\s*(\w+)\s+(.+)$/);
    let amount: number | undefined;
    let unit: string | undefined;
    let name = ing;

    if (match) {
      const amountStr = match[1].trim();
      const parts = amountStr.split(/\s+/).filter(p => p);

      // Handle mixed numbers like "1 1/2"
      if (parts.length === 2) {
        const whole = parseFloat(parts[0]);
        const fraction = parts[1].split("/").map(Number);
        if (fraction.length === 2 && !isNaN(whole) && !isNaN(fraction[0]) && !isNaN(fraction[1])) {
          amount = whole + fraction[0] / fraction[1];
        } else {
          amount = parseFloat(amountStr);
        }
      } else if (parts[0].includes("/")) {
        const fraction = parts[0].split("/").map(Number);
        if (fraction.length === 2 && !isNaN(fraction[0]) && !isNaN(fraction[1])) {
          amount = fraction[0] / fraction[1];
        }
      } else {
        amount = parseFloat(amountStr);
      }

      unit = match[2];
      name = match[3];
    }

    return {
      name: name.toLowerCase().trim(),
      amount,
      unit,
      type: classifyIngredient(name),
    };
  });
}

/**
 * Classify ingredient type
 */
function classifyIngredient(ingredient: string): IngredientType {
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
    ["baking powder", "baking soda", "yeast", "leavening", "rise"].some((w) =>
      lower.includes(w)
    )
  ) {
    return "leavening";
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
  if (
    ["oil", "olive", "vegetable", "coconut", "ghee", "lard"].some((w) =>
      lower.includes(w)
    )
  ) {
    return "oil";
  }
  return "other";
}

/**
 * Extract ingredient ratios from parsed ingredients
 */
function extractIngredientRatios(
  ingredients: ParsedIngredient[],
  ratios: Map<string, IngredientRatio>
) {
  // Find key ratios: flour:liquid, eggs:flour, leavening:flour, etc.
  const keyPairs = [
    { name1: "flour", name2: "liquid", variants2: ["water", "milk", "buttermilk", "egg", "oil"] },
    { name1: "eggs", name2: "flour", variants2: [] },
    { name1: "leavening", name2: "flour", variants2: ["baking powder", "baking soda", "yeast"] },
    { name1: "sugar", name2: "flour", variants2: [] },
    { name1: "salt", name2: "flour", variants2: [] },
    { name1: "butter", name2: "sugar", variants2: [] },
  ];

  keyPairs.forEach(({ name1, name2, variants2 }) => {
    const ing1 = ingredients.find((i) => i.name.includes(name1));

    let ing2 = ingredients.find((i) => i.name.includes(name2));
    if (!ing2 && variants2.length > 0) {
      ing2 = ingredients.find((i) =>
        variants2.some((v) => i.name.includes(v))
      );
    }

    if (ing1?.amount && ing2?.amount) {
      const key = `${name1}:${name2}`;
      const ratio = ing1.amount / ing2.amount;
      const existing = ratios.get(key);

      if (existing) {
        // Average the ratios
        existing.ratio = (existing.ratio * existing.count + ratio) / (existing.count + 1);
        existing.count += 1;
      } else {
        ratios.set(key, {
          ingredient1: name1,
          ingredient2: name2,
          ratio,
          count: 1,
          unit1: ing1.unit,
          unit2: ing2.unit,
        });
      }
    }
  });
}

/**
 * Extract cooking method statistics
 */
function extractCookingMethodStats(
  instructions: string[],
  prepTime: number,
  cookTime: number,
  methods: Map<string, CookingMethodStats>
) {
  const cookingMethods = [
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
    "dice",
    "chop",
    "slice",
    "mince",
  ];

  const instructionText = instructions.join(" ").toLowerCase();

  cookingMethods.forEach((method) => {
    if (instructionText.includes(method)) {
      const existing = methods.get(method) || {
        method,
        frequency: 0,
        avgTime: 0,
        cuisines: [],
        commonIngredients: [],
      };

      existing.frequency += 1;
      existing.avgTime = (existing.avgTime + cookTime) / existing.frequency;

      methods.set(method, existing);
    }
  });
}

/**
 * Update cuisine pattern with recipe data
 */
function updateCuisinePattern(
  cuisine: string,
  recipe: Recipe,
  patterns: Map<string, CuisinePattern>
) {
  const existing = patterns.get(cuisine);
  const ingredients = recipe.ingredients || [];
  const ingredients_map = parseIngredientsWithQuantities(ingredients);
  const cookingMethods = extractCookingMethodsFromInstructions(
    recipe.instructions || []
  );

  if (existing) {
    existing.recipeCount += 1;
    // Merge ingredients
    const newIngredients = Array.from(
      new Set([...existing.commonIngredients, ...ingredients.map((i) => i.split(" ").pop() || i)])
    );
    existing.commonIngredients = newIngredients.slice(0, 10);
    existing.cookingMethods = Array.from(
      new Set([...existing.cookingMethods, ...cookingMethods])
    );
  } else {
    patterns.set(cuisine, {
      cuisine,
      commonIngredients: ingredients.map((i) => i.split(" ").pop() || i).slice(0, 10),
      flavorProfile: {
        sweet: 0,
        salty: 0,
        umami: 0,
        spicy: 0,
      },
      cookingMethods,
      recipeCount: 1,
      avgDifficulty: estimateDifficulty(
        ingredients.length,
        (recipe.instructions || []).length,
        (recipe.prepTime || 0) + (recipe.cookTime || 0)
      ),
    });
  }
}

/**
 * Extract cooking methods from instructions
 */
function extractCookingMethodsFromInstructions(instructions: string[]): string[] {
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
  const text = instructions.join(" ").toLowerCase();
  return methods.filter((m) => text.includes(m));
}

/**
 * Find common ingredient combinations
 */
function findCommonCombinations(recipes: Recipe[]): IngredientCombination[] {
  const combinationMap = new Map<string, IngredientCombination>();

  recipes.forEach((recipe) => {
    const ingredients = parseIngredientsWithQuantities(
      recipe.ingredients || []
    );
    const cuisines = detectCuisine(recipe);

    // Find pairs of key ingredients (more granular combinations)
    const mainIngredients = ingredients
      .filter(
        (i) =>
          i.type === "protein" ||
          i.type === "carb" ||
          i.type === "vegetable" ||
          i.type === "dairy" ||
          i.type === "spice"
      )
      .map((i) => i.name);

    // Create pairs
    for (let i = 0; i < mainIngredients.length; i++) {
      for (let j = i + 1; j < Math.min(i + 3, mainIngredients.length); j++) {
        const pair = [mainIngredients[i], mainIngredients[j]].sort();
        const key = pair.join("|");
        const existing = combinationMap.get(key);

        if (existing) {
          existing.frequency += 1;
          existing.cuisines = Array.from(new Set([...existing.cuisines, ...cuisines]));
          existing.recipeCount += 1;
        } else {
          combinationMap.set(key, {
            ingredients: pair,
            frequency: 1,
            cuisines,
            recipeCount: 1,
          });
        }
      }
    }
  });

  return Array.from(combinationMap.values())
    .filter((c) => c.frequency >= 2) // Only show combinations seen at least twice
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);
}

/**
 * Extract regional cooking patterns
 */
function extractRegionalPatterns(recipes: Recipe[]): Map<string, RegionalPattern> {
  const regions = new Map<string, RegionalPattern>();

  const regionCuisineMap: Record<string, string[]> = {
    Southern: ["southern", "soul", "creole", "cajun"],
    Mediterranean: ["mediterranean", "greek", "italian", "spanish"],
    Asian: ["asian", "chinese", "japanese", "thai", "vietnamese", "indian"],
    Mexican: ["mexican", "mexican"],
    French: ["french"],
    MiddleEastern: ["middle eastern", "lebanese", "moroccan", "persian"],
  };

  Object.entries(regionCuisineMap).forEach(([region, cuisines]) => {
    const regionRecipes = recipes.filter((r) => {
      const text = [r.title, ...(r.tags || [])].join(" ").toLowerCase();
      return cuisines.some((c) => text.includes(c));
    });

    if (regionRecipes.length > 0) {
      const allIngredients = regionRecipes.flatMap((r) => r.ingredients || []);
      const flavorProfiles = regionRecipes.map((r) =>
        analyzeFlavorProfile(r.ingredients || [])
      );
      const avgFlavor: Record<string, number> = {
        sweet: 0,
        salty: 0,
        umami: 0,
        spicy: 0,
      };

      flavorProfiles.forEach((fp) => {
        Object.entries(fp).forEach(([key, val]) => {
          if (key in avgFlavor) {
            avgFlavor[key] += val;
          }
        });
      });

      Object.keys(avgFlavor).forEach((key) => {
        avgFlavor[key] /= flavorProfiles.length;
      });

      regions.set(region, {
        region,
        characteristics: getRegionCharacteristics(region),
        signature: {
          ingredients: Array.from(new Set(allIngredients))
            .map((i) => i.split(" ").pop() || i)
            .slice(0, 10),
          flavorProfile: avgFlavor,
          cookingMethods: extractCookingMethodsFromInstructions(
            regionRecipes.flatMap((r) => r.instructions || [])
          ),
        },
      });
    }
  });

  return regions;
}

/**
 * Get region characteristics
 */
function getRegionCharacteristics(region: string): string[] {
  const characteristics: Record<string, string[]> = {
    Southern: ["comfort food", "fried", "slow-cooked", "meat-heavy", "biscuits"],
    Mediterranean: ["olive oil", "fresh herbs", "seafood", "light", "healthy"],
    Asian: ["umami-rich", "soy-based", "spiced", "quick cooking", "wok"],
    Mexican: ["spicy", "fresh cilantro", "lime", "bean-based", "corn"],
    French: ["technique-focused", "sauces", "butter-rich", "refined"],
    MiddleEastern: ["spiced", "chickpeas", "flatbreads", "herbs", "yogurt"],
  };

  return characteristics[region] || [];
}

/**
 * Estimate difficulty
 */
function estimateDifficulty(
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
function detectCuisine(recipe: Recipe): string[] {
  const text = [recipe.title, ...(recipe.tags || [])].join(" ").toLowerCase();
  const cuisines: Record<string, string[]> = {
    Italian: ["pasta", "risotto", "italian", "marinara", "basil"],
    French: ["french", "beurre", "sauce", "french", "coq"],
    Asian: ["asian", "soy", "ginger", "sesame", "wok", "stir"],
    Mexican: ["mexican", "taco", "enchilada", "salsa", "cilantro"],
    Indian: ["indian", "curry", "tandoor", "naan", "spice"],
    Mediterranean: ["mediterranean", "olive", "feta", "greek"],
    Southern: ["southern", "soul", "creole", "cajun", "biscuit"],
  };

  return Object.entries(cuisines)
    .filter(([_, keywords]) => keywords.some((kw) => text.includes(kw)))
    .map(([cuisine]) => cuisine);
}
