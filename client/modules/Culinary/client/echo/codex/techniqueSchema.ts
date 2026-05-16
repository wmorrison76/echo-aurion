export type TechniqueCategory =
  | "dry_heat"
  | "moist_heat"
  | "combo"
  | "cold_prep"
  | "fermentation"
  | "pastry"
  | "modernist";

export interface TechniqueCodexEntry {
  id: string;
  name: string;
  category: TechniqueCategory;
  typicalTemperatureC?: [number, number];
  typicalTimeRangeMin?: [number, number];
  equipment: string[];
  primaryEffects: string[];
  risks: string[];
  bestForIngredients: string[];
}
