/**
 * EchoAi³ UI Hooks
 * ----------------
 * Simple hooks that Builder.io or React components can use
 * to wire Echo into panels, toolbars, or floating assistants.
 */

import { EchoAI3 } from "../core/echo-core.js";
import { buildCognitiveRequest, runCognitiveAction } from "../cognition/echo-cognition-engine.js";

/**
 * Generic handler for "run Echo query from a Builder action".
 */
export async function handleEchoAction(state, actionConfig = {}) {
  const module = state.moduleName || actionConfig.module || "UnknownModule";
  const prompt =
    state.userInput ||
    state.prompt ||
    actionConfig.prompt ||
    "Explain what I am looking at in this module.";

  const response = await EchoAI3.ask({
    prompt,
    module,
    context: { state },
  });

  state.echoResponse = response;
  return response;
}

/**
 * R&D-specific: Handle ingredient reasoning queries
 */
export async function handleIngredientQuery(state, ingredient) {
  const cognitiveRequest = await buildCognitiveRequest({
    prompt: `Analyze ${ingredient}`,
    module: state.moduleName || "RDLabs",
    context: { ingredient, state },
  });

  const result = await runCognitiveAction("ingredient-reasoning", {
    ingredient,
    technique: state.currentTechnique,
    quantity: state.selectedQuantity,
    temperature: state.temperature,
  });

  state.echoIngredientResult = result;
  return result;
}

/**
 * R&D-specific: Handle experiment guidance queries
 */
export async function handleExperimentQuestion(state, question) {
  const result = await runCognitiveAction("experiment-guidance", {
    question,
    currentRecipe: state.currentRecipe,
    constraints: state.constraints,
  });

  state.echoExperimentGuidance = result;
  return result;
}

/**
 * Minimal event bridge for toolbar buttons.
 */
export const EchoToolbarEvents = {
  async optimizeLayout(state) {
    const module = state.moduleName || "UnknownModule";
    const msg =
      "Suggest layout improvements for module " + module + " based on current state.";
    return handleEchoAction(state, { module, prompt: msg });
  },

  async explainNumbers(state) {
    const module = state.moduleName || "UnknownModule";
    const msg =
      "Explain the key metrics visible on screen in simple language for a manager.";
    return handleEchoAction(state, { module, prompt: msg });
  },

  // R&D specific events
  async analyzeRecipe(state, recipe) {
    const msg = `Provide detailed analysis of this recipe: ${recipe.title}. Consider: ingredients, yields, allergens, production complexity.`;
    return handleEchoAction(state, {
      module: "RDLabs",
      prompt: msg,
    });
  },

  async guideExperiment(state, question) {
    return handleExperimentQuestion(state, question);
  },

  async reasonIngredient(state, ingredient) {
    return handleIngredientQuery(state, ingredient);
  },

  async predictOutcome(state, modification) {
    const result = await runCognitiveAction("predict-outcome", {
      modification,
      baseRecipe: state.currentRecipe,
    });
    state.echoPrediction = result;
    return result;
  },
};
