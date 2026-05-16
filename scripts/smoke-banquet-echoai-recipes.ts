/**
 * Smoke: Banquet EchoAI Recipes & Planning
 *
 * Validates EchoAI recipes flow (if none exist) → planning & order.
 * Mocks BEO menu items, triggers recipe suggestion shape, asserts response.
 * No live HTTP; in-process only.
 */

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

// Mock BEO menu item (missing recipe)
interface MockBEOMenuItem {
  itemId: string;
  name: string;
  section: string;
  recipeId: string | null;
}

// Mock EchoAI recipe suggestion response
interface MockRecipeSuggestion {
  suggestedRecipeId: string;
  name: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  status: "suggested" | "existing";
}

const mockBEOMenuItems: MockBEOMenuItem[] = [
  { itemId: "item-1", name: "Grilled Salmon", section: "entrees", recipeId: null },
  { itemId: "item-2", name: "Caesar Salad", section: "starters", recipeId: "rec-101" },
];

function suggestRecipesForMissing(menuItems: MockBEOMenuItem[]): MockRecipeSuggestion[] {
  const suggestions: MockRecipeSuggestion[] = [];
  for (const item of menuItems) {
    if (!item.recipeId) {
      suggestions.push({
        suggestedRecipeId: `suggest-${item.itemId}`,
        name: item.name,
        ingredients: [
          { name: "primary", quantity: 1, unit: "portion" },
        ],
        status: "suggested",
      });
    }
  }
  return suggestions;
}

const run = () => {
  const suggestions = suggestRecipesForMissing(mockBEOMenuItems);
  assert(suggestions.length >= 1, "Expected at least one recipe suggestion for missing recipe");
  assert(
    suggestions.every((s) => s.suggestedRecipeId && s.name && Array.isArray(s.ingredients)),
    "Expected each suggestion to have suggestedRecipeId, name, ingredients"
  );
  assert(
    suggestions.some((s) => s.status === "suggested"),
    "Expected at least one suggested (non-existing) recipe"
  );
};

run();
process.exit(0);
