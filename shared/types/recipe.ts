/**
 * Recipe domain types
 * Culinary recipes, ingredients, steps, costing, and nutrition
 */
import {
  StandardEntity,
  Nameable,
  UUID,
  Money,
  ISODate,
  Taggable,
  Versionable,
  Publishable,
  URL,
  Percentage
} from './base';

// ============================================================================
// RECIPE CORE TYPES
// ============================================================================

/**
 * Main recipe entity
 */
export interface Recipe extends
  StandardEntity,
  Nameable,
  Taggable,
  Versionable,
  Publishable {
  categoryId: UUID;
  subcategoryId?: UUID;

  // Timing
  prepTime: number; // minutes
  cookTime: number; // minutes
  totalTime: number; // minutes
  restTime?: number; // minutes (for resting dough, cooling, etc.)

  // Yield
  servings: number;
  servingSize?: string; // "1 plate", "8 oz", etc.
  yieldAmount?: number;
  yieldUnit?: string;

  // Difficulty & Skill
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  skillLevel?: string;

  // Cost & Pricing
  ingredientCost: Money;
  laborCost: Money;
  totalCost: Money;
  costPerServing: Money;
  suggestedPrice?: Money;
  targetFoodCostPercentage?: Percentage;

  // Chef Information
  chefId?: UUID;
  chefNotes?: string;
  platingInstructions?: string;

  // Status
  status: 'draft' | 'testing' | 'approved' | 'archived';
  approvedBy?: UUID;
  approvedAt?: ISODate;

  // Allergens & Dietary
  allergens?: string[]; // 'dairy', 'nuts', 'shellfish', etc.
  dietaryTags?: string[]; // 'vegan', 'gluten-free', 'keto', etc.

  // Media
  primaryPhotoUrl?: URL;
  videoUrl?: URL;

  // Usage tracking
  lastMadeDate?: ISODate;
  popularityScore?: number;
  customerRating?: number;
}

/**
 * Recipe ingredient with quantity and prep
 */
export interface RecipeIngredient extends StandardEntity {
  recipeId: UUID;
  inventoryItemId?: UUID; // Link to inventory

  // Ingredient details
  ingredientName: string; // "Chicken breast", "Olive oil"
  quantity: number;
  unit: string; // "oz", "cups", "each", "tbsp"

  // Preparation
  preparation?: string; // "diced", "julienned", "minced"
  isOptional: boolean;
  isGarnish: boolean;

  // Ordering
  sortOrder: number;
  section?: string; // "For marinade", "For sauce", etc.

  // Costing
  unitCost: Money;
  totalCost: Money;

  // Substitutions
  substitutions?: string; // "Can substitute with vegetable oil"
}

/**
 * Recipe cooking step/instruction
 */
export interface RecipeStep extends StandardEntity {
  recipeId: UUID;
  stepNumber: number;

  // Instruction
  instruction: string;
  duration?: number; // minutes

  // Cooking parameters
  temperature?: number; // degrees
  temperatureUnit?: 'F' | 'C';

  // Equipment
  equipment?: string[]; // "Sauté pan", "Food processor"

  // Media
  photoUrl?: URL;
  videoUrl?: URL;

  // Tips
  chefTip?: string;
  commonMistakes?: string;
}

/**
 * Recipe category/classification
 */
export interface RecipeCategory extends StandardEntity, Nameable {
  parentCategoryId?: UUID; // For hierarchical categories
  sortOrder: number;

  // Display
  icon?: string;
  color?: string;

  // Metadata
  isActive: boolean;
}

/**
 * Recipe nutritional information
 */
export interface RecipeNutrition extends StandardEntity {
  recipeId: UUID;

  // Per serving
  servingSize: string;
  calories: number;

  // Macronutrients (grams)
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  sugar?: number;

  // Micronutrients (mg)
  sodium?: number;
  cholesterol?: number;

  // Percentages (% daily value)
  vitaminA?: Percentage;
  vitaminC?: Percentage;
  calcium?: Percentage;
  iron?: Percentage;

  // Allergen information
  containsDairy: boolean;
  containsEggs: boolean;
  containsNuts: boolean;
  containsShellfish: boolean;
  containsGluten: boolean;
  containsSoy: boolean;

  // Dietary compliance
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isKeto: boolean;
  isPaleo: boolean;
  isDairyFree: boolean;
}

/**
 * Recipe version history
 */
export interface RecipeVersion extends StandardEntity, Versionable {
  recipeId: UUID;

  // Version info
  versionNotes: string;
  changedBy: UUID;
  changedAt: ISODate;

  // What changed
  changesSummary?: string;
  majorChanges: boolean; // vs minor tweaks

  // Snapshot of recipe at this version
  recipeSnapshot: string; // JSON string of full recipe
}

/**
 * Recipe photo/media
 */
export interface RecipePhoto extends StandardEntity {
  recipeId: UUID;

  // Image
  imageUrl: URL;
  thumbnailUrl?: URL;
  caption?: string;

  // Ordering
  isPrimary: boolean;
  sortOrder: number;

  // Metadata
  photographer?: string;
  uploadedBy: UUID;
}

/**
 * Recipe costing breakdown
 */
export interface RecipeCost extends StandardEntity {
  recipeId: UUID;

  // Ingredient costs
  totalIngredientCost: Money;
  ingredientCostPerServing: Money;

  // Labor costs
  prepLaborCost: Money;
  cookLaborCost: Money;
  totalLaborCost: Money;
  laborCostPerServing: Money;

  // Total
  totalRecipeCost: Money;
  costPerServing: Money;

  // Pricing analysis
  suggestedPrice: Money;
  targetFoodCostPercent: Percentage;
  actualFoodCostPercent: Percentage;

  // Last calculated
  calculatedAt: ISODate;
}
