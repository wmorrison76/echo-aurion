export interface SafetyGuideline {
  id: string;
  description: string;
  minInternalTempC?: number;
  holdingTempMinC?: number;
  notes?: string;
}

export interface RecipeSafetyEntry {
  id: string;
  recipeId: string;
  guidelines: SafetyGuideline[];
}
