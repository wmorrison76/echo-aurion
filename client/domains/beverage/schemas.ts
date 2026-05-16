import { z } from "zod";

export const BeverageIngredientCategorySchema = z.enum([
  "spirit",
  "liqueur",
  "wine",
  "beer",
  "juice",
  "syrup",
  "bitters",
  "garnish",
  "mixer",
  "other",
]);

export const BeverageRecipeUnitSchema = z.enum([
  "oz",
  "ml",
  "dash",
  "slice",
  "splash",
  "drop",
]);

export const FlavorProfileSchema = z
  .object({
    primary: z.array(z.string()),
    secondary: z.array(z.string()),
    tertiary: z.array(z.string()),
    intensity: z.number(),
    complexity: z.number(),
    balance: z.number(),
    flavorAttributes: z.array(z.any()),
  })
  .passthrough();

export const BeverageIngredientSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: BeverageIngredientCategorySchema,
    abv: z.number().optional(),
    flavorProfile: FlavorProfileSchema.optional(),
    costPerOz: z.number(),
    inventoryItemId: z.string().optional(),
    available: z.boolean(),
    substitutions: z.array(z.string()).optional(),
  })
  .passthrough();

export const BeverageRecipeIngredientSchema = z
  .object({
    id: z.string(),
    ingredientId: z.string(),
    name: z.string(),
    quantity: z.number(),
    unit: BeverageRecipeUnitSchema,
    cost: z.number(),
    notes: z.string().optional(),
  })
  .passthrough();

export const CocktailRecipeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    ingredients: z.array(BeverageRecipeIngredientSchema),
    instructions: z.array(z.string()),
    garnish: z.string().optional(),
    glassware: z.string().optional(),
    abv: z.number().optional(),
    flavorProfile: FlavorProfileSchema,
    cost: z.number(),
    costPerOz: z.number(),
    sellingPrice: z.number().optional(),
    margin: z.number().optional(),
    version: z.string(),
    parentVersion: z.string().optional(),
  })
  .passthrough();
