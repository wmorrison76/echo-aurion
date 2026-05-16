/**
 * EchoAi³ Knowledge Loader
 * ------------------------
 * Normalizes how modules declare and hydrate their "golden seed"
 * knowledge JSON (yields, GL codes, allergens, etc.).
 *
 * In Builder.io, you'll typically pass in preloaded JSON rather than
 * doing dynamic fetches.
 */

import { EchoAI3 } from "../core/echo-core.js";

/**
 * Register static knowledge payloads.
 * Example usage inside a module:
 *
 *  registerModuleKnowledge("KitchenLibrary", {
 *    yields: kitchenYieldsJson,
 *    allergens: allergenIndexJson,
 *  });
 */
export function registerModuleKnowledge(moduleName, payloads = {}) {
  if (!moduleName || typeof payloads !== "object") return;

  Object.entries(payloads).forEach(([key, value]) => {
    EchoAI3.registerKnowledge(moduleName, key, value);
  });
}

/**
 * Convenience for Builder.io data binding.
 */
export function buildKnowledgeSummary(moduleName) {
  const instance = EchoAI3.instance;
  if (!instance.getKnowledge) return {};
  const k = instance.getKnowledge(moduleName);
  return {
    module: moduleName,
    keys: Object.keys(k),
    preview: Object.fromEntries(
      Object.entries(k).map(([key, value]) => [
        key,
        typeof value === "object" ? "object" : typeof value,
      ])
    ),
  };
}

/**
 * R&D-specific: Register culinary knowledge
 * (yields, allergens, hydration, emulsification, spherification)
 */
export function registerCulinaryKnowledge(moduleName, culinaryData = {}) {
  const normalized = {
    yields: culinaryData.yields || {},
    allergens: culinaryData.allergens || {},
    techniques: culinaryData.techniques || {},
    ingredients: culinaryData.ingredients || {},
    constraints: culinaryData.constraints || {},
  };

  registerModuleKnowledge(moduleName, normalized);
}

/**
 * R&D-specific: Get culinary knowledge with defaults
 */
export function getCulinaryKnowledge(moduleName) {
  const instance = EchoAI3.instance;
  const knowledge = instance.getKnowledge(moduleName);

  return {
    yields: knowledge.yields || {},
    allergens: knowledge.allergens || {},
    techniques: knowledge.techniques || {},
    ingredients: knowledge.ingredients || {},
    constraints: knowledge.constraints || {},
  };
}
