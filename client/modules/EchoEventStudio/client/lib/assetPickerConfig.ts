import { EchoLayoutObject } from "@/scenes/EchoLayoutScene";
export interface AssetConfig {
  id: string;
  name: string;
  category: string;
  icon?: string;
  modelFactory?: (props: any) => any;
  defaultProps?: {
    scale?: number;
    color?: string;
    width?: number;
    length?: number;
  };
} /** * Asset picker configuration for available items */
export const ASSET_CONFIGS: Record<string, AssetConfig> = {
  table_round_60in: {
    id: "table_round_60in",
    name: 'Round Table 60"',
    category: "tables",
    defaultProps: { scale: 1, color: "#d4af87" },
  },
  table_round_72in: {
    id: "table_round_72in",
    name: 'Round Table 72"',
    category: "tables",
    defaultProps: { scale: 1, color: "#d4af87" },
  },
  table_rect_6ft: {
    id: "table_rect_6ft",
    name: "Rectangular Table 6ft",
    category: "tables",
    defaultProps: { scale: 1, color: "#d4af87" },
  },
  table_cocktail: {
    id: "table_cocktail",
    name: "Cocktail Table",
    category: "tables",
    defaultProps: { scale: 1, color: "#2a2a2a" },
  },
  chair_chiavari_gold: {
    id: "chair_chiavari_gold",
    name: "Chiavari Chair (Gold)",
    category: "seating",
    defaultProps: { scale: 1.5, color: "#d4af87" },
  },
  chair_banquet_fold: {
    id: "chair_banquet_fold",
    name: "Folding Chair",
    category: "seating",
    defaultProps: { scale: 1.5, color: "#4a4a4a" },
  },
  chafer_full: {
    id: "chafer_full",
    name: "Chafer (Full)",
    category: "buffet",
    defaultProps: { scale: 1, color: "#8e9aa9" },
  },
  chafer_half: {
    id: "chafer_half",
    name: "Chafer (Half)",
    category: "buffet",
    defaultProps: { scale: 1, color: "#8e9aa9" },
  },
  heat_lamp_double: {
    id: "heat_lamp_double",
    name: "Heat Lamp (Double)",
    category: "buffet",
    defaultProps: { scale: 1, color: "#c0a060" },
  },
  carving_station_double: {
    id: "carving_station_double",
    name: "Carving Station",
    category: "buffet",
    defaultProps: { scale: 1, color: "#8e9aa9" },
  },
  beverage_station: {
    id: "beverage_station",
    name: "Beverage Station",
    category: "buffet",
    defaultProps: { scale: 1, color: "#8e9aa9" },
  },
  plant_large: {
    id: "plant_large",
    name: "Large Plant",
    category: "decor",
    defaultProps: { scale: 1, color: "#2d5016" },
  },
  plant_small: {
    id: "plant_small",
    name: "Small Plant",
    category: "decor",
    defaultProps: { scale: 1, color: "#2d5016" },
  },
  tree_arched: {
    id: "tree_arched",
    name: "Arched Tree",
    category: "decor",
    defaultProps: { scale: 1, color: "#1a3a1a" },
  },
  tree_spiral: {
    id: "tree_spiral",
    name: "Spiral Tree",
    category: "decor",
    defaultProps: { scale: 1, color: "#1a3a1a" },
  },
  centerpiece_low: {
    id: "centerpiece_low",
    name: "Centerpiece (Low)",
    category: "decor",
    defaultProps: { scale: 1, color: "#d4416b" },
  },
  centerpiece_tall: {
    id: "centerpiece_tall",
    name: "Centerpiece (Tall)",
    category: "decor",
    defaultProps: { scale: 1, color: "#d4416b" },
  },
  uplighting: {
    id: "uplighting",
    name: "Uplighting",
    category: "decor",
    defaultProps: { scale: 1, color: "#ff00ff" },
  },
  stanchion: {
    id: "stanchion",
    name: "Stanchion",
    category: "decor",
    defaultProps: { scale: 1, color: "#333333" },
  },
  dance_floor: {
    id: "dance_floor",
    name: "Dance Floor",
    category: "decor",
    defaultProps: { scale: 1, color: "#1a1a2e", width: 4, length: 4 },
  },
}; /** * Get assets by category */
export function getAssetsByCategory(category: string): AssetConfig[] {
  return Object.values(ASSET_CONFIGS).filter(
    (asset) => asset.category === category,
  );
} /** * Get all categories */
export function getCategories(): string[] {
  const categories = new Set(
    Object.values(ASSET_CONFIGS).map((asset) => asset.category),
  );
  return Array.from(categories);
} /** * Create layout object from asset config */
export function createLayoutObjectFromAsset(
  assetId: string,
  position: [number, number, number] = [0, 0, 0],
  metadata: Record<string, any> = {},
): EchoLayoutObject | null {
  const config = ASSET_CONFIGS[assetId];
  if (!config) return null; // Map asset ID to layout object type const typeMap: Record<string, string> = { table_round_60in: 'table_round', table_round_72in: 'table_round', table_rect_6ft: 'table_rect', table_cocktail: 'cocktail', chair_chiavari_gold: 'equipment', chair_banquet_fold: 'equipment', chafer_full: 'equipment', chafer_half: 'equipment', heat_lamp_double: 'equipment', carving_station_double: 'buffet', beverage_station: 'buffet', plant_large: 'equipment', plant_small: 'equipment', tree_arched: 'equipment', tree_spiral: 'equipment', centerpiece_low: 'equipment', centerpiece_tall: 'equipment', uplighting: 'equipment', stanchion: 'equipment', dance_floor: 'dance_floor', }; const type = typeMap[assetId] || 'equipment'; const defaults = config.defaultProps || {}; return { id: `${assetId}-${Date.now()}`, type, position, rotation: [0, 0, 0], seats: defaults.width ? undefined : 0, meta: { equipment: assetId, color: defaults.color, ...metadata, }, dimensions: defaults.width ? { width: defaults.width, length: defaults.length, } : undefined, size: defaults.width ? [defaults.width || 1, 1, defaults.length || 1] : undefined, };
} /** * Get asset display name */
export function getAssetDisplayName(assetId: string): string {
  return ASSET_CONFIGS[assetId]?.name || assetId;
} /** * Get asset category */
export function getAssetCategory(assetId: string): string {
  return ASSET_CONFIGS[assetId]?.category || "unknown";
} /** * Filter assets by search query */
export function searchAssets(query: string): AssetConfig[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(ASSET_CONFIGS).filter(
    (asset) =>
      asset.name.toLowerCase().includes(lowerQuery) ||
      asset.category.toLowerCase().includes(lowerQuery) ||
      asset.id.toLowerCase().includes(lowerQuery),
  );
} /** * Get similar assets */
export function getSimilarAssets(
  assetId: string,
  limit: number = 5,
): AssetConfig[] {
  const asset = ASSET_CONFIGS[assetId];
  if (!asset) return [];
  return Object.values(ASSET_CONFIGS)
    .filter((a) => a.category === asset.category && a.id !== assetId)
    .slice(0, limit);
} /** * Validate asset placement */
export function validateAssetPlacement(
  assetId: string,
  position: [number, number, number],
  roomDimensions: { width: number; length: number },
): { valid: boolean; message?: string } {
  // Check if position is within room bounds const padding = 0.5; if (Math.abs(position[0]) > roomDimensions.width / 2 - padding) { return { valid: false, message: 'Asset too close to left/right wall' }; } if (Math.abs(position[2]) > roomDimensions.length / 2 - padding) { return { valid: false, message: 'Asset too close to front/back wall' }; } return { valid: true };
}
