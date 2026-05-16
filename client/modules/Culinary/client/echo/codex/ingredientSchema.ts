export type FlavorNote =
  | "sweet"
  | "sour"
  | "salty"
  | "bitter"
  | "umami"
  | "fatty"
  | "spicy"
  | "aromatic"
  | "earthy"
  | "fresh"
  | "smoky";

export interface IngredientCodexEntry {
  id: string;
  name: string;
  altNames: string[];
  category: string;
  subcategory?: string;
  scientificName?: string;
  flavorProfile: FlavorNote[];
  typicalUses: string[];
  keyCompounds?: string[];
  waterContentEstimate?: number;
  fatContentEstimate?: number;
  acidityEstimate?: number;
  allergenTags: string[];
  substitutionHints?: string[];
}
