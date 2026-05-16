import { z } from "zod"; // Extended category system
export const ProteinCategory = z.enum([
  "beef",
  "pork",
  "chicken",
  "poultry_other",
  "fish",
  "shellfish",
  "seafood_other",
  "lamb",
  "veal",
  "game",
  "processed_meat",
]);
export const PortionType = z.enum([
  "whole",
  "half",
  "quarter",
  "eighth",
  "trim",
  "boneless",
  "bone_in",
  "skinless",
  "skin_on",
  "breast",
  "thigh",
  "drumstick",
  "wing",
  "leg",
  "loin",
  "rib",
  "chuck",
  "round",
  "ground",
  "filet",
  "steak",
  "chop",
]);
export const PackagingType = z.enum([
  "case",
  "pack",
  "carton",
  "tray",
  "vacuum_sealed",
  "frozen",
  "fresh",
  "cryovac",
]);
export const CostBasis = z.enum([
  "per_pound",
  "per_ounce",
  "per_gram",
  "per_kilogram",
  "per_case",
  "per_pack",
  "per_unit",
  "per_count",
]);
export const IngredientCategory = z.object({
  // Primary categorization primaryCategory: z.enum(["protein","produce","dairy","dry_goods","beverage","prepared","non_food","seafood", ]), // Protein-specific categories proteinCategory: ProteinCategory.optional(), portionTypes: z.array(PortionType).default([]), // Packaging information packagingType: PackagingType.optional(), caseSize: z.number().positive().optional(), caseSizeUom: z.string().optional(), packSize: z.number().positive().optional(), packSizeUom: z.string().optional(), // Pricing details costBasis: CostBasis.default("per_pound"), pricePerPound: z.number().nonnegative().optional(), pricePerOunce: z.number().nonnegative().optional(), pricePerUnit: z.number().nonnegative().optional(), pricePerCase: z.number().nonnegative().optional(), // Portion specifications portionWeight: z.number().positive().optional(), portionWeightUom: z.enum(["oz","g","lb"]).default("oz"), portionsPerCase: z.number().positive().optional(), // Quality/grade information grade: z.string().optional(), specification: z.string().optional(), // Allergen and dietary info allergens: z.array(z.string()).default([]), isDairyFree: z.boolean().default(false), isGlutenFree: z.boolean().default(false), isVegan: z.boolean().default(false), isOrganic: z.boolean().default(false), // Additional metadata notes: z.string().optional(),
});
export type ProteinCategory = z.infer<typeof ProteinCategory>;
export type PortionType = z.infer<typeof PortionType>;
export type PackagingType = z.infer<typeof PackagingType>;
export type CostBasis = z.infer<typeof CostBasis>;
export type IngredientCategory = z.infer<
  typeof IngredientCategory
>; /** * Helpers to compute pricing and portions */
export function calculatePricePerPound(
  price: number,
  quantity: number,
  unit: string,
): number {
  const ozPerUnit = { oz: 1, lb: 16, g: 0.035274, kg: 35.274 };
  const multiplier = ozPerUnit[unit as keyof typeof ozPerUnit] || 1;
  const totalOz = quantity * multiplier;
  const pricePerOz = price / totalOz;
  return pricePerOz * 16; // convert to per pound
}
export function calculatePortionsPerCase(
  caseSize: number,
  caseSizeUom: string,
  portionWeight: number,
  portionWeightUom: string,
): number {
  // Convert both to grams for calculation const gramsPerUnit = { oz: 28.3495, lb: 453.592, g: 1, kg: 1000, }; const caseSizeGrams = caseSize * (gramsPerUnit[caseSizeUom as keyof typeof gramsPerUnit] || 1); const portionGrams = portionWeight * (gramsPerUnit[portionWeightUom as keyof typeof gramsPerUnit] || 1); // Account for typical waste (trim, cooking loss) const wasteFactor = 1.15; // 15% waste return Math.floor(caseSizeGrams / (portionGrams * wasteFactor));
}
export function extractCategoryFromName(
  name: string,
): Partial<IngredientCategory> {
  const nameLower = name.toLowerCase();
  const category: Partial<IngredientCategory> = { portionTypes: [] }; // Detect primary category if ( nameLower.includes("chicken") || nameLower.includes("beef") || nameLower.includes("pork") || nameLower.includes("lamb") || nameLower.includes("turkey") ) { category.primaryCategory ="protein"; if ( nameLower.includes("chicken") || nameLower.includes("poultry") || nameLower.includes("turkey") ) { category.proteinCategory ="chicken"; } else if (nameLower.includes("beef")) { category.proteinCategory ="beef"; } else if (nameLower.includes("pork")) { category.proteinCategory ="pork"; } else if (nameLower.includes("lamb")) { category.proteinCategory ="lamb"; } // Detect portion types if (nameLower.includes("breast")) { category.portionTypes!.push("breast"); } if (nameLower.includes("thigh")) { category.portionTypes!.push("thigh"); } if (nameLower.includes("drumstick")) { category.portionTypes!.push("drumstick"); } if (nameLower.includes("wing")) { category.portionTypes!.push("wing"); } if (nameLower.includes("leg")) { category.portionTypes!.push("leg"); } if (nameLower.includes("ground")) { category.portionTypes!.push("ground"); } if (nameLower.includes("boneless")) { category.portionTypes!.push("boneless"); } if (nameLower.includes("bone in")) { category.portionTypes!.push("bone_in"); } if (nameLower.includes("skinless")) { category.portionTypes!.push("skinless"); } if (nameLower.includes("skin on")) { category.portionTypes!.push("skin_on"); } } else if ( nameLower.includes("fish") || nameLower.includes("salmon") || nameLower.includes("cod") || nameLower.includes("tuna") ) { category.primaryCategory ="seafood"; category.proteinCategory ="fish"; } else if ( nameLower.includes("shrimp") || nameLower.includes("lobster") || nameLower.includes("crab") || nameLower.includes("scallop") ) { category.primaryCategory ="seafood"; category.proteinCategory ="shellfish"; } else if ( nameLower.includes("milk") || nameLower.includes("cheese") || nameLower.includes("butter") || nameLower.includes("cream") ) { category.primaryCategory ="dairy"; } else if ( nameLower.includes("vegetable") || nameLower.includes("fruit") || nameLower.includes("produce") ) { category.primaryCategory ="produce"; } else if ( nameLower.includes("rice") || nameLower.includes("pasta") || nameLower.includes("flour") || nameLower.includes("grain") ) { category.primaryCategory ="dry_goods"; } else if ( nameLower.includes("juice") || nameLower.includes("water") || nameLower.includes("beverage") ) { category.primaryCategory ="beverage"; } // Detect packaging if (nameLower.includes("case")) { category.packagingType ="case"; } else if (nameLower.includes("pack")) { category.packagingType ="pack"; } // Detect cost basis if (nameLower.includes("per lb") || nameLower.includes("per pound")) { category.costBasis ="per_pound"; } else if (nameLower.includes("per oz") || nameLower.includes("per ounce")) { category.costBasis ="per_ounce"; } else if (nameLower.includes("case")) { category.costBasis ="per_case"; } return category;
}
