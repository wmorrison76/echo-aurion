/**
 * EchoAi³ Module Context
 * ----------------------
 * Utility helpers to normalize how modules describe themselves
 * to EchoAi³ (role, purpose, key entities).
 */

/**
 * Build a normalized context descriptor for the active module.
 */
export function buildModuleContextDescriptor(moduleName, overrides = {}) {
  const base = {
    name: moduleName,
    role: "generic-module",
    description: "No description provided.",
    primaryEntities: [],
    criticalMetrics: [],
  };

  switch (moduleName) {
    case "KitchenLibrary":
      base.role = "culinary-recipe-hub";
      base.description =
        "Stores recipes, yields, allergens, and production specs for the property.";
      base.primaryEntities = ["recipes", "ingredients", "allergens"];
      base.criticalMetrics = ["food cost", "yield loss"];
      break;

    case "EchoRecipePro":
      base.role = "advanced-recipe-costing";
      base.description =
        "Handles detailed costing, vendor mapping, and GL code export per recipe.";
      base.primaryEntities = ["cost cards", "vendors", "GL codes"];
      base.criticalMetrics = ["plate cost", "margin"];
      break;

    case "Scheduler":
      base.role = "labor-scheduling";
      base.description =
        "Schedules team members, tracks shifts, and predicts labor cost vs budget.";
      base.primaryEntities = ["employees", "shifts", "departments"];
      base.criticalMetrics = ["labor %", "overtime risk"];
      break;

    case "MaestroBQT":
      base.role = "banquet-orchestration";
      base.description =
        "BEO/REO orchestration, seating layout, and event production details.";
      base.primaryEntities = ["events", "rooms", "menus"];
      base.criticalMetrics = ["guest count", "event revenue"];
      break;

    case "RDLabs":
    case "RDLabsWorkspace":
      base.role = "culinary-research-development";
      base.description =
        "AI-powered recipe innovation, experimentation, and predictive culinary intelligence.";
      base.primaryEntities = [
        "recipes",
        "experiments",
        "ingredients",
        "forecasts",
      ];
      base.criticalMetrics = [
        "cost-to-recipe",
        "yield-loss",
        "allergen-risk",
        "production-feasibility",
      ];
      break;

    default:
      break;
  }

  return { ...base, ...overrides };
}

/**
 * Get context descriptor for a module (convenience wrapper)
 */
export function getModuleContext(moduleName) {
  return buildModuleContextDescriptor(moduleName);
}

/**
 * R&D-specific: Enhanced context with culinary operations
 */
export function buildRDLabsContext(state = {}) {
  const base = buildModuleContextDescriptor("RDLabs");

  return {
    ...base,
    state,
    capabilities: [
      "ingredient-reasoning",
      "experiment-guidance",
      "cost-prediction",
      "allergen-analysis",
      "yield-optimization",
      "production-forecasting",
    ],
    constraints: {
      allergenFlags: state.allergenConstraints || [],
      budgetLimit: state.budgetLimit || null,
      timeConstraint: state.productionTime || null,
      equipmentAvailable: state.equipment || [],
    },
  };
}
