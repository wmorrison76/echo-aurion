/**
 * Domain types for Menu entities used by MenuBuilder and menu-packs.
 */

export interface Menu {
  id: string;
  title: string;
  description?: string;
  language?: string;
  secondaryLanguage?: string;
  serviceStyle?: string;
  mealPeriod?: string;
  items: MenuItemBinding[];
  createdAt: number;
  updatedAt?: number;
  versionId?: string;
}

export interface MenuItemBinding {
  id: string;
  recipeId: string;
  title: string;
  description?: string;
  menuDescription?: string;
  price?: number;
  currency?: string;
  course?: string;
  station?: string;
  allergens?: string[];
  dietaryTags?: string[];
  pairings?: string[];
  upsells?: string[];
  prepNotes?: string;
  yieldFactor?: number;
  costPerPortion?: number;
  sortOrder?: number;
}

export type MenuPackKind =
  | "allergen-matrix"
  | "prep-list"
  | "station-breakdown"
  | "upsell-notes"
  | "pairing-guide"
  | "yield-scaling"
  | "cost-rollup"
  | "bilingual-menu";

export interface MenuPack {
  id: string;
  menuId: string;
  versionId: string;
  kind: MenuPackKind;
  title: string;
  content: string;
  generatedAt: number;
  items: MenuItemBinding[];
}
