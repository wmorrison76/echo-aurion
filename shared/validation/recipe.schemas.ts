import { z } from 'zod';
import { uuidSchema, isoDateSchema, moneySchema, percentageSchema, urlSchema } from './schema-helpers';

/**
 * Recipe schemas
 */
const recipeBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  version: z.number().int().positive(),
  previousVersionId: uuidSchema.optional(),
  publishedAt: isoDateSchema.optional(),
  publishedBy: uuidSchema.optional(),
  isDraft: z.boolean(),
  categoryId: uuidSchema,
  subcategoryId: uuidSchema.optional(),
  prepTime: z.number().int().nonnegative('Prep time must be non-negative'),
  cookTime: z.number().int().nonnegative('Cook time must be non-negative'),
  totalTime: z.number().int().nonnegative('Total time must be non-negative'),
  restTime: z.number().int().nonnegative().optional(),
  servings: z.number().int().positive('Servings must be positive'),
  servingSize: z.string().optional(),
  yieldAmount: z.number().positive().optional(),
  yieldUnit: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  skillLevel: z.string().optional(),
  ingredientCost: moneySchema,
  laborCost: moneySchema,
  totalCost: moneySchema,
  costPerServing: moneySchema,
  suggestedPrice: moneySchema.optional(),
  targetFoodCostPercentage: percentageSchema.optional(),
  chefId: uuidSchema.optional(),
  chefNotes: z.string().max(2000).optional(),
  platingInstructions: z.string().max(2000).optional(),
  status: z.enum(['draft', 'testing', 'approved', 'archived']),
  approvedBy: uuidSchema.optional(),
  approvedAt: isoDateSchema.optional(),
  allergens: z.array(z.string()).optional(),
  dietaryTags: z.array(z.string()).optional(),
  primaryPhotoUrl: urlSchema.optional(),
  videoUrl: urlSchema.optional(),
  lastMadeDate: isoDateSchema.optional(),
  popularityScore: z.number().min(0).max(100).optional(),
  customerRating: z.number().min(1).max(5).optional()
});

export const recipeCreateSchema = recipeBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true,
  previousVersionId: true
});

export const recipeUpdateSchema = recipeCreateSchema.partial();

/**
 * RecipeIngredient schemas
 */
const recipeIngredientBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  recipeId: uuidSchema,
  inventoryItemId: uuidSchema.optional(),
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  preparation: z.string().optional(),
  isOptional: z.boolean(),
  isGarnish: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  section: z.string().optional(),
  unitCost: moneySchema,
  totalCost: moneySchema,
  substitutions: z.string().optional()
});

export const recipeIngredientCreateSchema = recipeIngredientBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const recipeIngredientUpdateSchema = recipeIngredientCreateSchema.partial();

/**
 * RecipeStep schemas
 */
const recipeStepBase = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: uuidSchema,
  updatedBy: uuidSchema,
  recipeId: uuidSchema,
  stepNumber: z.number().int().positive(),
  instruction: z.string().min(1, 'Instruction is required'),
  duration: z.number().int().nonnegative().optional(),
  temperature: z.number().optional(),
  temperatureUnit: z.enum(['F', 'C']).optional(),
  equipment: z.array(z.string()).optional(),
  photoUrl: urlSchema.optional(),
  videoUrl: urlSchema.optional(),
  chefTip: z.string().optional(),
  commonMistakes: z.string().optional()
});

export const recipeStepCreateSchema = recipeStepBase.omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const recipeStepUpdateSchema = recipeStepCreateSchema.partial();

