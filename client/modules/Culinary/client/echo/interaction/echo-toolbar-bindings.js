/**
 * EchoAi³ Toolbar Bindings
 * ------------------------
 * Declarative description of toolbar buttons and their actions.
 * Builder.io can bind to this configuration to auto-render the toolbar.
 */

import { EchoToolbarEvents } from "./echo-ui-hooks.js";

export const echoToolbarConfig = [
  {
    id: "echo-optimize-layout",
    label: "Optimize Layout",
    icon: "wand-2",
    handler: async (state) => {
      return EchoToolbarEvents.optimizeLayout(state);
    },
  },
  {
    id: "echo-debug",
    label: "Inspect",
    icon: "radar",
    handler: async (state) => {
      const summary = {
        moduleName: state.moduleName || "UnknownModule",
        keys: Object.keys(state || {}),
      };
      state.echoDebugSummary = summary;
      return summary;
    },
  },
];

// R&D-specific toolbar config
export const echoRDLabsToolbarConfig = [
  ...echoToolbarConfig,
  {
    id: "echo-analyze-recipe",
    label: "Analyze Recipe",
    icon: "microscope",
    handler: async (state) => {
      return EchoToolbarEvents.analyzeRecipe(state, state.currentRecipe || {});
    },
  },
  {
    id: "echo-experiment-guide",
    label: "Experiment Guide",
    icon: "flask",
    handler: async (state) => {
      return EchoToolbarEvents.guideExperiment(
        state,
        state.experimentQuestion || ""
      );
    },
  },
  {
    id: "echo-ingredient-reason",
    label: "Analyze Ingredient",
    icon: "leaf",
    handler: async (state) => {
      return EchoToolbarEvents.reasonIngredient(
        state,
        state.selectedIngredient || ""
      );
    },
  },
  {
    id: "echo-predict",
    label: "Predict Outcome",
    icon: "target",
    handler: async (state) => {
      return EchoToolbarEvents.predictOutcome(
        state,
        state.proposedModification || ""
      );
    },
  },
];

/**
 * Helper for invoking a toolbar action by id.
 */
export async function runToolbarAction(id, state) {
  const item = echoToolbarConfig.find((b) => b.id === id);
  if (!item) return;
  return item.handler(state);
}

/**
 * Helper for R&D-specific toolbar actions.
 */
export async function runRDLabsToolbarAction(id, state) {
  const item = echoRDLabsToolbarConfig.find((b) => b.id === id);
  if (!item) return;
  return item.handler(state);
}
