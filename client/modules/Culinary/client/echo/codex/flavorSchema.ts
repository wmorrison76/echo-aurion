export interface FlavorBalance {
  sweet: number;
  sour: number;
  salty: number;
  bitter: number;
  umami: number;
  fat: number;
  spice: number;
  aromatic: number;
}

export interface FlavorCodexEntry {
  id: string;
  recipeId: string;
  balance: FlavorBalance;
  notes: string[];
}
