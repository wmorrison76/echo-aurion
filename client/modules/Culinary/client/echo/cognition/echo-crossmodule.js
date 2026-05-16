/**
 * EchoAi³ Cross-Module Awareness
 * ------------------------------
 * Utilities for describing how modules are related so Builder.io
 * can surface smart shortcuts (e.g., Scheduler → Forecast, BEO → Inventory).
 */

// Simple adjacency list. Replace with graph DB or API later.
const moduleGraph = new Map();

export function registerModuleLink(from, to, reason = "") {
  const existing = moduleGraph.get(from) || [];
  existing.push({ to, reason });
  moduleGraph.set(from, existing);
}

export function getLinkedModules(module) {
  return moduleGraph.get(module) || [];
}

// Some sensible defaults for LUCCCA
registerModuleLink("Scheduler", "EchoStratus", "Labor data flows into P&L.");
registerModuleLink("EchoRecipePro", "Inventory", "Recipe items consume stock.");
registerModuleLink("MaestroBQT", "EchoEventStudio", "BEO/REO sharing.");
registerModuleLink("Mixology", "SommelierSuite", "Shared bottle inventory.");
registerModuleLink("KitchenLibrary", "EchoRecipePro", "Recipe CRUD flows.");

// R&D Lab cross-module links
registerModuleLink("RDLabs", "KitchenLibrary", "Recipe inspiration & ingredient sourcing");
registerModuleLink("RDLabs", "EchoRecipePro", "Cost validation for new recipes");
registerModuleLink("RDLabs", "Inventory", "Ingredient availability checks");
registerModuleLink("RDLabs", "Scheduler", "Labor requirements for production");
registerModuleLink("RDLabs", "MaestroBQT", "Menu integration & event forecasting");

export function describeModuleGraph() {
  /** @type {Record<string, Array<string>>} */
  const snapshot = {};
  for (const [from, links] of moduleGraph.entries()) {
    snapshot[from] = links.map((l) => `${l.to}${l.reason ? ` (${l.reason})` : ""}`);
  }
  return snapshot;
}

/**
 * Find all modules that can influence R&D decisions
 */
export function getRDLabInfluencers() {
  return getLinkedModules("RDLabs").map((link) => ({
    module: link.to,
    influence: link.reason,
  }));
}

/**
 * Check if a module can access another module's knowledge
 */
export function canAccessModuleKnowledge(fromModule, toModule) {
  const links = getLinkedModules(fromModule);
  return links.some((link) => link.to === toModule);
}
