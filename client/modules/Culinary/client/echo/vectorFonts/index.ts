/**
 * Vector Fonts Module
 * Complete font management system with AI-powered recommendations
 * 
 * Exports:
 * - Type definitions
 * - Font library with 100+ fonts
 * - Vector Font Engine (variations, outlines, morphing)
 * - Font Pairing AI (intelligent recommendations)
 */

// Type exports
export type {
  FontAxisType,
  FontAxis,
  FontVariation,
  FontOutlineProperties,
  FontMorphing,
  VectorFont,
  FontVariant,
  FontCategory,
  FontPairingRecommendation,
  FontPreset,
  CanvasFontState,
  FontLibrary,
  FontExportOptions,
  FontAnalysisResult,
} from "./types";

// Font library exports
export { vectorFontLibrary, serifFonts, sansSerifFonts, displayFonts, monospaceFonts, allFonts } from "./fontLibrary";

// Vector Font Engine exports
export {
  VectorFontEngine,
  VariableFontEngine,
  FontOutlineEngine,
  FontMorphingEngine,
  FontPresetEngine,
  FontAnalysisEngine,
  FontExportEngine,
} from "./vectorFontEngine";

// Font Pairing AI exports
export { FontPairingAI } from "./fontPairingAI";

// Main facade
export const VectorFontsModule = {
  // Library
  library: () => vectorFontLibrary,

  // Engine systems
  Variable: require("./vectorFontEngine").VariableFontEngine,
  Outline: require("./vectorFontEngine").FontOutlineEngine,
  Morphing: require("./vectorFontEngine").FontMorphingEngine,
  Preset: require("./vectorFontEngine").FontPresetEngine,
  Analysis: require("./vectorFontEngine").FontAnalysisEngine,
  Export: require("./vectorFontEngine").FontExportEngine,

  // AI system
  AI: require("./fontPairingAI").FontPairingAI,

  // Utilities
  getFontById: (id: string) => {
    return vectorFontLibrary.fonts.find((f) => f.id === id);
  },

  searchFonts: (query: string) => {
    return require("./fontPairingAI").FontPairingAI.searchFonts(query);
  },

  recommendPairings: (brand: any) => {
    return require("./fontPairingAI").FontPairingAI.recommendPairings(brand);
  },

  analyzeFontState: (state: any) => {
    return require("./vectorFontEngine").FontAnalysisEngine.analyzeFontState(state);
  },
};

export default VectorFontsModule;
