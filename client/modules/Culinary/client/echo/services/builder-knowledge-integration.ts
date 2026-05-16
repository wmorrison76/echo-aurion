/**
 * Echo Service Integration with Builder.io Culinary Knowledge
 *
 * This service enriches Echo's responses by fetching real culinary
 * definitions, recipes, and techniques from Builder.io
 */

import {
  fetchCulinaryTerm,
  fetchRecipe,
  explainCulinaryTerm,
  findIngredientSubstitutes,
  fetchTermsByCategory,
  fetchTermsByLetter,
} from "@/lib/builder-culinary-knowledge";

/**
 * Enriches Echo's knowledge with culinary definitions
 * Called when Echo needs to explain a term or ingredient
 */
export async function enrichEchoWithCulinaryKnowledge(
  term: string,
): Promise<string | null> {
  try {
    const explanation = await explainCulinaryTerm(term);
    if (explanation) {
      return `📖 From culinary database: ${explanation}`;
    }
    return null;
  } catch (error) {
    console.error("Failed to enrich Echo knowledge:", error);
    return null;
  }
}

/**
 * Generate ingredient substitution suggestions
 * Useful when a recipe is missing an ingredient
 */
export async function suggestIngredientSubstitutes(
  ingredient: string,
): Promise<string> {
  try {
    const substitutes = await findIngredientSubstitutes(ingredient);

    if (substitutes.length === 0) {
      return `No substitutes found for "${ingredient}" in database.`;
    }

    const suggestions = substitutes
      .slice(0, 3)
      .map((s) => `• **${s.term}**: ${s.definition.substring(0, 100)}...`)
      .join("\n");

    return `Possible substitutes for **${ingredient}**:\n${suggestions}`;
  } catch (error) {
    console.error("Failed to suggest substitutes:", error);
    return `Could not find substitutes for "${ingredient}".`;
  }
}

/**
 * Get a full recipe from the culinary database
 * Useful for "what's this recipe" or "how to make..." questions
 */
export async function getRecipeFromDatabase(
  slug: string,
): Promise<string | null> {
  try {
    const recipe = await fetchRecipe(slug);

    if (!recipe) {
      return null;
    }

    const ingredientsList = recipe.ingredients.map((i) => `• ${i}`).join("\n");
    const stepsList = recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

    return `
# ${recipe.title}

## Ingredients
${ingredientsList}

## Instructions
${stepsList}

${recipe.source_work ? `📖 Source: ${recipe.source_work}` : ""}
    `.trim();
  } catch (error) {
    console.error("Failed to fetch recipe:", error);
    return null;
  }
}

/**
 * Get glossary terms by category for Echo to reference
 * Useful for training and context
 */
export async function getCulinaryTermsByCategory(
  category: string,
): Promise<Array<{ term: string; definition: string }>> {
  try {
    const terms = await fetchTermsByCategory(category);
    return terms.map((t) => ({
      term: t.term,
      definition: t.definition,
    }));
  } catch (error) {
    console.error("Failed to fetch terms:", error);
    return [];
  }
}

/**
 * Build a glossary index (A-Z) for Echo reference
 */
export async function buildGlossaryIndex(): Promise<Record<string, number>> {
  try {
    const index: Record<string, number> = {};

    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")) {
      const terms = await fetchTermsByLetter(letter);
      index[letter] = terms.length;
    }

    return index;
  } catch (error) {
    console.error("Failed to build glossary index:", error);
    return {};
  }
}

/**
 * Example: Echo context enhancement
 * Call this to prepare Echo with relevant culinary knowledge
 * before processing a user query about cooking/recipes
 */
export async function prepareEchoForCulinaryQuery(userQuery: string): Promise<{
  enrichedContext: string;
  relevantTerms: string[];
  relevantRecipes: string[];
}> {
  const context: string[] = [];
  const relevantTerms: string[] = [];
  const relevantRecipes: string[] = [];

  try {
    // Extract potential terms from query
    const potentialTerms = extractPotentialTerms(userQuery);

    for (const term of potentialTerms.slice(0, 3)) {
      const termData = await fetchCulinaryTerm(term);
      if (termData) {
        context.push(`${term}: ${termData.definition.substring(0, 150)}...`);
        relevantTerms.push(term);
      }
    }

    return {
      enrichedContext: context.join("\n\n"),
      relevantTerms,
      relevantRecipes,
    };
  } catch (error) {
    console.error("Failed to prepare Echo context:", error);
    return {
      enrichedContext: "",
      relevantTerms: [],
      relevantRecipes: [],
    };
  }
}

/**
 * Simple term extraction from user query
 * Could be enhanced with NLP or keyword matching
 */
function extractPotentialTerms(query: string): string[] {
  // Very basic: split on spaces and capitalize
  return query
    .split(/[\s,]+/)
    .filter((word) => word.length > 3)
    .slice(0, 5)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/**
 * Format culinary knowledge for Echo's response
 */
export function formatCulinaryKnowledgeForEcho(
  term: string,
  definition: string,
  categories: string[],
): string {
  const categoryBadges = categories.map((c) => `[${c}]`).join(" ");
  return `**${term}** ${categoryBadges}\n\n${definition}`;
}

/**
 * Check if a query is about culinary topics
 * Determines if Echo should fetch from the culinary database
 */
export function isCulinaryQuery(query: string): boolean {
  const culinaryKeywords = [
    "recipe",
    "cook",
    "ingredient",
    "technique",
    "bake",
    "roast",
    "simmer",
    "glossary",
    "definition",
    "what is",
    "how to make",
    "substitute",
    "ingredient",
    "flavor",
    "taste",
    "prepare",
    "cuisine",
    "culinary",
  ];

  const lowerQuery = query.toLowerCase();
  return culinaryKeywords.some((keyword) => lowerQuery.includes(keyword));
}
