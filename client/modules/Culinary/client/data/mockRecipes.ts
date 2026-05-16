import type { Recipe, RecipeExport, IngredientRow } from "@shared/recipes";
import { createFoodPlaceholder } from "@/lib/placeholders";
import { normalizeRecipe } from "@shared/recipes";

const now = Date.now();

const toIngredient = (
  qty: string,
  unit: string,
  item: string,
  prep = "",
  yieldText = "",
  cost = "",
): IngredientRow => ({ qty, unit, item, prep, yield: yieldText, cost });

const buildRecipe = (
  id: string,
  exportData: RecipeExport,
  options: {
    description: string;
    tags: string[];
    imageUrl?: string;
    course?: string;
    cuisine?: string;
    prepTime?: number;
    cookTime?: number;
    difficulty?: string;
    createdYearsAgo?: number;
  },
): Recipe => {
  const instructions = exportData.directions
    ? exportData.directions
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const ingredients = exportData.ingredients.map((row) =>
    [row.qty, row.unit, row.item, row.prep && `( ${row.prep} )`]
      .filter(Boolean)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );

  const createdAt = options.createdYearsAgo
    ? now - options.createdYearsAgo * 365 * 24 * 3600 * 1000
    : now;

  const image = options.imageUrl ?? exportData.imageDataUrl;

  return {
    id,
    title: exportData.title,
    description: options.description,
    ingredients,
    instructions,
    tags: options.tags,
    imageDataUrls: image ? [image] : undefined,
    image,
    course: options.course,
    cuisine: options.cuisine,
    prepTime: options.prepTime,
    cookTime: options.cookTime,
    difficulty: options.difficulty,
    nutrition: exportData.nutrition ?? undefined,
    createdAt,
    extra: {
      serverNotes: exportData,
    },
  } satisfies Recipe;
};

const meyerLemonExport = normalizeRecipe({
  recipeName: "Meyer Lemon Tart",
  ingredients: [
    toIngredient("180", "g", "all-purpose flour"),
    toIngredient("120", "g", "cold butter", "cubed"),
    toIngredient("60", "g", "powdered sugar"),
    toIngredient("2", "", "egg yolks"),
    toIngredient("320", "g", "meyer lemon juice"),
    toIngredient("220", "g", "granulated sugar"),
    toIngredient("6", "", "large eggs"),
    toIngredient("115", "g", "unsalted butter", "room temperature"),
  ],
  directions:
    "Blend flour, butter, and sugar until sandy.\nPulse in yolks, press into tart pan, and chill.\nBake shell at 375°F until golden.\nWhisk lemon juice, sugar, eggs over gentle heat until thick.\nMount with butter, strain, and pour into shell.\nChill 2 hours before slicing.",
  selectedAllergens: ["Egg", "Dairy"],
  selectedNationality: ["French"],
  selectedCourses: ["Dessert"],
  selectedRecipeType: ["Pastry"],
  selectedPrepMethod: ["Bake"],
  selectedCookingEquipment: ["Tart Pan", "Stand Mixer"],
  image: createFoodPlaceholder("Meyer Lemon Tart", "🍋", "#facc15", "#f97316"),
  yieldQty: 8,
  yieldUnit: "slices",
  portionCount: 8,
  portionUnit: "slice",
  currentCurrency: "USD",
  nutrition: {
    calories: 420,
    totalNutrients: {
      FAT: { quantity: 24 },
      CHOCDF: { quantity: 46 },
      PROCNT: { quantity: 6 },
      FIBTG: { quantity: 1.5 },
      SUGAR: { quantity: 32 },
      NA: { quantity: 140 },
      CHOLE: { quantity: 125 },
    },
  },
  fullRecipeCost: 14.8,
  portionCost: 1.85,
  cookTime: "18 minutes",
  cookTemp: "375°F",
  access: ["Front of House", "Pastry"],
});

const charredOctopusExport = normalizeRecipe({
  recipeName: "Charred Octopus with Romesco",
  ingredients: [
    toIngredient("2", "lb", "Spanish octopus", "cleaned"),
    toIngredient("1", "", "orange", "zested"),
    toIngredient("4", "cloves", "garlic"),
    toIngredient("2", "", "bay leaves"),
    toIngredient("120", "ml", "olive oil"),
    toIngredient("2", "", "roasted red peppers"),
    toIngredient("60", "g", "toasted almonds"),
    toIngredient("25", "ml", "sherry vinegar"),
  ],
  directions:
    "Simmer octopus gently with citrus, garlic, and bay until tender.\nChill in cooking liquid.\nBlend peppers, almonds, oil, and vinegar into romesco sauce.\nGrill octopus over hardwood until charred and warm.\nSlice, season, and present over romesco with herbs.",
  selectedAllergens: ["Tree Nuts"],
  selectedNationality: ["Spanish"],
  selectedCourses: ["Appetizer"],
  selectedRecipeType: ["Seafood"],
  selectedPrepMethod: ["Poach", "Grill"],
  selectedCookingEquipment: ["Grill", "Blender"],
  image: createFoodPlaceholder("Charred Octopus", "🐙", "#38bdf8", "#0ea5e9"),
  yieldQty: 6,
  yieldUnit: "plates",
  portionCount: 6,
  portionUnit: "plate",
  currentCurrency: "USD",
  nutrition: {
    calories: 290,
    totalNutrients: {
      FAT: { quantity: 16 },
      CHOCDF: { quantity: 7 },
      PROCNT: { quantity: 25 },
      FIBTG: { quantity: 2.4 },
      SUGAR: { quantity: 4 },
      NA: { quantity: 560 },
      CHOLE: { quantity: 130 },
    },
  },
  fullRecipeCost: 28.2,
  portionCost: 4.7,
  cookTime: "45 minutes",
  cookTemp: "Simmer 185°F",
  access: ["Front of House", "Seafood Station"],
});

const wagyuExport = normalizeRecipe({
  recipeName: "Wagyu Strip with Bone Marrow Bordelaise",
  ingredients: [
    toIngredient("6", "each", "Wagyu strip steaks", "12 oz"),
    toIngredient("3", "", "shallots", "minced"),
    toIngredient("350", "ml", "bordelaise sauce"),
    toIngredient("120", "g", "bone marrow", "roasted"),
    toIngredient("90", "ml", "cognac"),
    toIngredient("250", "g", "butter", "cold"),
    toIngredient("12", "", "baby potatoes", "blanched"),
    toIngredient("60", "g", "watercress"),
  ],
  directions:
    "Temper steaks, season aggressively, and hard sear in carbon steel.\nRoast to 125°F internal, rest 8 minutes.\nSweat shallots, flambé with cognac, reduce with bordelaise.\nWhisk in roasted marrow and cold butter to mount.\nGlaze baby potatoes in beef fat until lacquered.\nSlice steak, nappe with sauce, finish with watercress and smoked salt.",
  selectedAllergens: ["Dairy"],
  selectedNationality: ["French"],
  selectedCourses: ["Entree"],
  selectedRecipeType: ["Meat"],
  selectedPrepMethod: ["Sear", "Roast"],
  selectedCookingEquipment: ["Carbon Steel Pan", "Oven"],
  image: createFoodPlaceholder("Wagyu Strip", "🥩", "#fb7185", "#be123c"),
  yieldQty: 6,
  yieldUnit: "plates",
  portionCount: 6,
  portionUnit: "plate",
  currentCurrency: "USD",
  nutrition: {
    calories: 680,
    totalNutrients: {
      FAT: { quantity: 54 },
      CHOCDF: { quantity: 12 },
      PROCNT: { quantity: 42 },
      FIBTG: { quantity: 1.8 },
      SUGAR: { quantity: 4 },
      NA: { quantity: 880 },
      CHOLE: { quantity: 195 },
    },
  },
  fullRecipeCost: 162,
  portionCost: 27,
  cookTime: "30 minutes",
  cookTemp: "125°F internal",
  access: ["Front of House", "Grill"],
});

const veganExport = normalizeRecipe({
  recipeName: "Coal-Roasted Carrot Mosaic",
  ingredients: [
    toIngredient("18", "", "heirloom carrots", "peeled"),
    toIngredient("45", "ml", "maple syrup"),
    toIngredient("30", "ml", "sherry vinegar"),
    toIngredient("120", "g", "sprouted lentils"),
    toIngredient("80", "g", "pistachios", "toasted"),
    toIngredient("60", "ml", "black garlic vinaigrette"),
    toIngredient("6", "", "charred lemon segments"),
  ],
  directions:
    "Coal roast carrots until smoky-sweet.\nSlice into tiles for mosaic plating.\nGlaze with maple-sherry reduction.\nDress sprouted lentils with black garlic vinaigrette.\nLayer mosaic with lentils, pistachio crumble, and charred lemon.\nGarnish with carrot tops and sorrel.",
  selectedAllergens: ["Tree Nuts"],
  selectedNationality: ["Nordic"],
  selectedCourses: ["Vegetable", "Entree"],
  selectedRecipeType: ["Vegan"],
  selectedPrepMethod: ["Roast", "Glaze"],
  selectedCookingEquipment: ["Coal Grill", "Mandoline"],
  image:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=720&q=70",
  yieldQty: 6,
  yieldUnit: "plates",
  portionCount: 6,
  portionUnit: "plate",
  currentCurrency: "USD",
  nutrition: {
    calories: 320,
    totalNutrients: {
      FAT: { quantity: 18 },
      CHOCDF: { quantity: 34 },
      PROCNT: { quantity: 8 },
      FIBTG: { quantity: 7.2 },
      SUGAR: { quantity: 16 },
      NA: { quantity: 420 },
      CHOLE: { quantity: 0 },
    },
  },
  fullRecipeCost: 21,
  portionCost: 3.5,
  cookTime: "35 minutes",
  cookTemp: "Coal fire medium",
  access: ["Front of House", "Vegetable"],
});

const recipes: Recipe[] = [
  buildRecipe("demo-lemon-tart", meyerLemonExport, {
    description:
      "Silky Meyer lemon curd in a buttery pâte sucrée shell with torched meringue accents.",
    tags: ["pastry", "citrus", "classic"],
    imageUrl: meyerLemonExport.imageDataUrl,
    course: "Dessert",
    cuisine: "French",
    prepTime: 25,
    cookTime: 18,
    difficulty: "Intermediate",
    createdYearsAgo: 1,
  }),
  buildRecipe("demo-octopus-romesco", charredOctopusExport, {
    description:
      "Tender galician-style octopus kissed by flame over smoky romesco sauce.",
    tags: ["seafood", "tapas", "smoked"],
    imageUrl: charredOctopusExport.imageDataUrl,
    course: "Appetizer",
    cuisine: "Spanish",
    prepTime: 40,
    cookTime: 45,
    difficulty: "Advanced",
    createdYearsAgo: 2,
  }),
  buildRecipe("demo-wagyu-bordelaise", wagyuExport, {
    description:
      "Charred wagyu strip, bone marrow bordelaise, and glazed potatoes for the pass.",
    tags: ["beef", "luxury", "signature"],
    imageUrl: wagyuExport.imageDataUrl,
    course: "Entree",
    cuisine: "French",
    prepTime: 30,
    cookTime: 30,
    difficulty: "Advanced",
    createdYearsAgo: 1,
  }),
  buildRecipe("demo-carrot-mosaic", veganExport, {
    description:
      "Coal-roasted carrot mosaic with sprouted lentils, black garlic, and pistachio crunch.",
    tags: ["vegan", "vegetable", "seasonal"],
    imageUrl: veganExport.imageDataUrl,
    course: "Vegetable",
    cuisine: "Nordic",
    prepTime: 35,
    cookTime: 35,
    difficulty: "Intermediate",
    createdYearsAgo: 3,
  }),
];

export const mockRecipeExports: Record<string, RecipeExport> = {
  "demo-lemon-tart": meyerLemonExport,
  "demo-octopus-romesco": charredOctopusExport,
  "demo-wagyu-bordelaise": wagyuExport,
  "demo-carrot-mosaic": veganExport,
};

export default recipes;
