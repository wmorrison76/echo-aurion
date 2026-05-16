import { z } from "zod";

// ============================================================================
// Common Validators
// ============================================================================

const positiveNumber = z.number().positive("Must be greater than 0");
const nonNegativeNumber = z.number().nonnegative("Cannot be negative");
const stringNotEmpty = z.string().min(1, "Cannot be empty");
const urlString = z.string().url("Invalid URL").optional();
const emailString = z.string().email("Invalid email").optional();
const dateTime = z.coerce.date().optional();
const currencyCode = z.enum(["USD", "CAD", "AUD", "EUR", "GBP", "JPY", "CHF", "INR", "CNY"]);

// ============================================================================
// Ingredient & Recipe Schemas
// ============================================================================

export const IngredientRowSchema = z.object({
  type: z.enum(["ingredient", "divider"]).default("ingredient"),
  qty: z.string(),
  unit: z.string(),
  item: stringNotEmpty,
  prep: z.string().default(""),
  yield: z.string().default(""),
  cost: z.string().default(""),
  subId: z.string().optional(),
  costPerUnit: z.number().nullable().default(null),
  supplierId: z.string().nullable().default(null),
  supplierName: z.string().nullable().default(null),
  supplierSku: z.string().nullable().default(null),
  inventoryId: z.string().nullable().optional(),
  inventoryName: z.string().nullable().optional(),
  mappingConfidence: z.number().min(0).max(1).optional(),
  totalCost: z.number().nullable().optional(),
  costVariance: z.number().nullable().optional(),
  costPerServing: z.number().nullable().optional(),
  lastUpdatedAt: z.number().optional(),
});

export type IngredientRowType = z.infer<typeof IngredientRowSchema>;

export const RecipeNutritionSchema = z.object({
  calories: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  fiber: z.number().nonnegative().optional(),
  sugars: z.number().nonnegative().optional(),
  sodium: z.number().nonnegative().optional(),
  cholesterol: z.number().nonnegative().optional(),
});

export type RecipeNutritionType = z.infer<typeof RecipeNutritionSchema>;

export const RecipeSchema = z.object({
  id: stringNotEmpty,
  title: stringNotEmpty,
  description: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  imageNames: z.array(z.string()).optional(),
  imageDataUrls: z.array(z.string()).optional(),
  image: z.string().optional(),
  course: z.string().optional(),
  cuisine: z.string().optional(),
  prepTime: z.number().nonnegative().optional(),
  cookTime: z.number().nonnegative().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  nutrition: RecipeNutritionSchema.nullable().optional(),
  createdAt: z.number(),
  sourceFile: z.string().optional(),
  extra: z.record(z.unknown()).optional(),
  favorite: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  deletedAt: z.number().nullable().optional(),
  components: z.array(z.string()).optional(),
  techniques: z.array(z.string()).optional(),
  cuisineType: z.string().optional(),
  // Global Recipe System
  isGlobal: z.boolean().default(false),
  createdBy: z.string().optional(),
  globalSourceId: z.string().optional(),
  lastModifiedBy: z.string().optional(),
  lastModifiedAt: z.number().optional(),
  requiresChefApproval: z.boolean().default(false),
  pendingApprovalFrom: z.string().nullable().optional(),
});

export type RecipeType = z.infer<typeof RecipeSchema>;

export const RecipeCreateSchema = RecipeSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  createdAt: z.number().optional(),
});

export type RecipeCreateType = z.infer<typeof RecipeCreateSchema>;

// ============================================================================
// Supplier & Inventory Schemas
// ============================================================================

export const SupplierProfileSchema = z.object({
  id: stringNotEmpty,
  name: stringNotEmpty,
  territory: z.string(),
  contact: z.string().optional(),
  email: emailString,
  phone: z.string().optional(),
  reliability: z.number().min(0).max(1).default(0.9),
  sustainabilityScore: z.number().min(0).max(1).default(0.7),
});

export type SupplierProfileType = z.infer<typeof SupplierProfileSchema>;

export const SupplierCatalogLinkSchema = z.object({
  supplierId: stringNotEmpty,
  supplierName: stringNotEmpty,
  sku: stringNotEmpty,
  packSize: positiveNumber,
  packUnit: stringNotEmpty,
  pricePerPack: positiveNumber,
  currency: currencyCode.default("USD"),
  leadTimeDays: z.number().nonnegative().default(1),
});

export type SupplierCatalogLinkType = z.infer<typeof SupplierCatalogLinkSchema>;

export const CostHistoryEntrySchema = z.object({
  date: z.number(),
  supplierId: stringNotEmpty,
  supplierName: stringNotEmpty,
  costPerUnit: positiveNumber,
  source: z.enum(["order", "quote", "catalog"]),
});

export type CostHistoryEntryType = z.infer<typeof CostHistoryEntrySchema>;

export const InventoryItemSchema = z.object({
  id: stringNotEmpty,
  canonicalName: stringNotEmpty,
  description: z.string().optional(),
  category: z.enum(["protein", "vegetable", "fruit", "dairy", "pantry", "spice", "other"]),
  primaryUnit: stringNotEmpty,
  supplierLinks: z.array(SupplierCatalogLinkSchema),
  costHistory: z.array(CostHistoryEntrySchema),
  lastOrderDate: z.number().optional(),
  currentStock: z.number().nonnegative().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  usedInRecipes: z
    .array(
      z.object({
        recipeId: stringNotEmpty,
        recipeTitle: stringNotEmpty,
        qty: positiveNumber,
        unit: stringNotEmpty,
      }),
    )
    .optional(),
});

export type InventoryItemType = z.infer<typeof InventoryItemSchema>;

export const InventoryItemCreateSchema = InventoryItemSchema.omit({
  id: true,
  costHistory: true,
}).extend({
  id: stringNotEmpty.optional(),
  costHistory: z.array(CostHistoryEntrySchema).optional(),
});

export type InventoryItemCreateType = z.infer<typeof InventoryItemCreateSchema>;

// ============================================================================
// Order & Purchasing Schemas
// ============================================================================

export const OrderLineItemSchema = z.object({
  inventoryId: stringNotEmpty,
  inventoryName: stringNotEmpty,
  supplierId: stringNotEmpty,
  supplierName: stringNotEmpty,
  sku: stringNotEmpty,
  quantity: positiveNumber,
  packSize: positiveNumber,
  packUnit: stringNotEmpty,
  unitPrice: positiveNumber,
  totalPrice: positiveNumber,
  leadTimeDays: z.number().nonnegative(),
  notes: z.string().optional(),
});

export type OrderLineItemType = z.infer<typeof OrderLineItemSchema>;

export const OrderSchema = z.object({
  id: stringNotEmpty,
  orderNumber: stringNotEmpty.optional(),
  supplierId: stringNotEmpty,
  supplierName: stringNotEmpty,
  status: z.enum(["draft", "submitted", "confirmed", "shipped", "received", "cancelled"]).default("draft"),
  orderDate: z.coerce.date(),
  expectedDelivery: z.coerce.date().optional(),
  actualDelivery: z.coerce.date().optional(),
  lineItems: z.array(OrderLineItemSchema),
  totalCost: positiveNumber,
  currency: currencyCode.default("USD"),
  notes: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type OrderType = z.infer<typeof OrderSchema>;

export const OrderCreateSchema = OrderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: stringNotEmpty.optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type OrderCreateType = z.infer<typeof OrderCreateSchema>;

// ============================================================================
// Production Schemas
// ============================================================================

export const ProductionComponentSchema = z.object({
  componentId: stringNotEmpty,
  recipeId: stringNotEmpty.optional(),
  label: stringNotEmpty,
  quantity: z.coerce.number().positive(),
  unit: stringNotEmpty,
  notes: z.string().optional(),
  status: z.enum(["pending", "in-progress", "completed", "cancelled"]).default("pending"),
});

export type ProductionComponentType = z.infer<typeof ProductionComponentSchema>;

export const ProductionSheetSchema = z.object({
  id: stringNotEmpty,
  menuId: stringNotEmpty,
  menuTitle: stringNotEmpty,
  date: z.coerce.date(),
  service: stringNotEmpty,
  components: z.array(ProductionComponentSchema),
  notes: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ProductionSheetType = z.infer<typeof ProductionSheetSchema>;

export const ProductionSheetCreateSchema = ProductionSheetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProductionSheetCreateType = z.infer<typeof ProductionSheetCreateSchema>;

// ============================================================================
// Nutrition Schemas
// ============================================================================

export const USDANutrientSchema = z.object({
  fdcId: stringNotEmpty,
  description: stringNotEmpty,
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
  sodium: z.number().nonnegative(),
  servingSize: z.number().positive(),
  servingUnit: stringNotEmpty,
  lastUpdated: z.coerce.date().optional(),
});

export type USDANutrientType = z.infer<typeof USDANutrientSchema>;

export const NutritionAnalysisSchema = z.object({
  recipeId: stringNotEmpty,
  totalCalories: z.number().nonnegative(),
  totalProtein: z.number().nonnegative(),
  totalFat: z.number().nonnegative(),
  totalCarbs: z.number().nonnegative(),
  totalFiber: z.number().nonnegative(),
  totalSodium: z.number().nonnegative(),
  perPortionCalories: z.number().nonnegative(),
  perPortionProtein: z.number().nonnegative(),
  perPortionFat: z.number().nonnegative(),
  perPortionCarbs: z.number().nonnegative(),
  allergens: z.array(stringNotEmpty),
  usedaItems: z.array(USDANutrientSchema).optional(),
  updatedAt: z.number(),
});

export type NutritionAnalysisType = z.infer<typeof NutritionAnalysisSchema>;

// ============================================================================
// Server Notes Schemas
// ============================================================================

export const ServerNotesDishComponentSchema = z.object({
  qty: z.string(),
  component: stringNotEmpty,
  notes: z.string().optional(),
});

export type ServerNotesDishComponentType = z.infer<typeof ServerNotesDishComponentSchema>;

export const ServerNotesAllergenSchema = z.object({
  itemName: stringNotEmpty,
  allergen: stringNotEmpty,
  modify: z.boolean().default(false),
  alternative: z.string().optional(),
});

export type ServerNotesAllergenType = z.infer<typeof ServerNotesAllergenSchema>;

export const ServerNotesWinePairingSchema = z.object({
  itemName: stringNotEmpty,
  year: z.string().optional(),
  location: z.string().optional(),
  country: z.string().optional(),
});

export type ServerNotesWinePairingType = z.infer<typeof ServerNotesWinePairingSchema>;

export const ServerNotesDishSchema = z.object({
  dishName: stringNotEmpty,
  description: z.string().optional(),
  menuDescription: z.string().optional(),
  serverNotes: z.string().optional(),
  serviceware: z.string().optional(),
  components: z.array(ServerNotesDishComponentSchema),
  allergens: z.array(ServerNotesAllergenSchema),
  winePairings: z.array(ServerNotesWinePairingSchema),
  imageSrc: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ServerNotesDishType = z.infer<typeof ServerNotesDishSchema>;

export const ServerNotesDishCreateSchema = ServerNotesDishSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export type ServerNotesDishCreateType = z.infer<typeof ServerNotesDishCreateSchema>;

// ============================================================================
// Composite Schemas for Forms
// ============================================================================

export const RecipeFormSchema = z.object({
  title: stringNotEmpty,
  description: z.string().optional(),
  course: z.string().optional(),
  cuisine: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  prepTime: z.coerce.number().nonnegative().optional(),
  cookTime: z.coerce.number().nonnegative().optional(),
  ingredients: z.array(IngredientRowSchema),
  instructions: z.string().optional(),
  tags: z.array(z.string()).optional(),
  nutrition: RecipeNutritionSchema.nullable().optional(),
});

export type RecipeFormType = z.infer<typeof RecipeFormSchema>;

export const OrderFormSchema = z.object({
  supplierId: stringNotEmpty,
  orderDate: z.coerce.date(),
  expectedDelivery: z.coerce.date().optional(),
  lineItems: z.array(OrderLineItemSchema).min(1, "At least one item required"),
  notes: z.string().optional(),
  currency: currencyCode.default("USD"),
});

export type OrderFormType = z.infer<typeof OrderFormSchema>;

export const ProductionSheetFormSchema = z.object({
  menuTitle: stringNotEmpty,
  date: z.coerce.date(),
  service: stringNotEmpty,
  components: z.array(ProductionComponentSchema).min(1, "At least one component required"),
  notes: z.string().optional(),
});

export type ProductionSheetFormType = z.infer<typeof ProductionSheetFormSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

export function validateRecipe(data: unknown): { success: boolean; data?: RecipeType; error?: string } {
  try {
    const validated = RecipeSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Unknown validation error" };
  }
}

export function validateInventoryItem(data: unknown): { success: boolean; data?: InventoryItemType; error?: string } {
  try {
    const validated = InventoryItemSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Unknown validation error" };
  }
}

export function validateOrder(data: unknown): { success: boolean; data?: OrderType; error?: string } {
  try {
    const validated = OrderSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Unknown validation error" };
  }
}

export function validateSupplier(data: unknown): { success: boolean; data?: SupplierProfileType; error?: string } {
  try {
    const validated = SupplierProfileSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Unknown validation error" };
  }
}
