/** * Shared code between client and server * Useful to share types between client and server * and/or small pure JS functions that can be used on both client and server */ /** * Example response type for /api/demo */
export interface DemoResponse {
  message: string;
} /** * Wine tasting profile with major taste attributes */
export interface TasteProfile {
  acidity: number;
  tannin: number;
  alcohol: number;
  sweetness: number;
  body: number;
  aromaticIntensity: number;
} /** * Wine aroma wheel segment */
export interface AromaSegment {
  label: string;
  color: string;
  intensity: number;
} /** * Individual wine pairing recommendation */
export interface WinePairing {
  id: string;
  name: string;
  region: string;
  varietal: string;
  vintage?: string;
  score: number;
  tasteProfile: TasteProfile;
  aromas: AromaSegment[];
  paringReason: string;
  balanceIndex: number;
  molecularAffinity: number;
  regionalAuthenticity: number;
  emotionalResonance: number;
} /** * Wine pairing request */
export interface WinePairingRequest {
  recipeId: string;
  recipeName?: string;
  ingredients?: string[];
  cookingMethod?: string;
  fatContent?: number;
  saltContent?: number;
  acidContent?: number;
  autoSuggest?: boolean;
} /** * Wine pairing response */
export interface WinePairingResponse {
  pairings: WinePairing[];
  recipeId: string;
  suggestions: WinePairing[];
  manual: WinePairing[];
  error?: string;
}
