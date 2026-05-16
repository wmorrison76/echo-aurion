/**
 * Builder.io Culinary Knowledge Fetchers
 * Allows Echo to query culinary terms and recipes stored in Builder.io
 */

interface CulinaryTerm {
  term: string;
  slug: string;
  letter: string;
  definition: string;
  categories: string[];
  aliases: string[];
  source_work: string;
  source_page?: number;
  confidence_score?: number;
  updated_at: string;
  status: "verified" | "auto-imported";
}

interface EchoRecipe {
  title: string;
  slug: string;
  ingredients: string[];
  steps: string[];
  source_work?: string;
  source_page?: number;
  updated_at: string;
  status: "verified" | "auto-imported";
}

interface BuilderContent<T> {
  id: string;
  data: T;
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

interface BuilderQueryResult<T> {
  results: BuilderContent<T>[];
  limit: number;
  offset: number;
  total: number;
}

/**
 * Fetch a single culinary term by exact match
 */
export async function fetchCulinaryTerm(
  term: string,
): Promise<CulinaryTerm | null> {
  try {
    const builderKey = import.meta.env.VITE_BUILDER_PUBLIC_API_KEY;
    if (!builderKey) {
      console.warn(
        "VITE_BUILDER_PUBLIC_API_KEY not set, cannot fetch culinary terms",
      );
      return null;
    }

    const url = new URL(
      `https://cdn.builder.io/api/v3/content/echoculinaryterm`,
    );
    url.searchParams.set("apiKey", builderKey);
    url.searchParams.set("query.term", term);
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const json = (await response.json()) as BuilderQueryResult<CulinaryTerm>;
    return json.results?.[0]?.data || null;
  } catch (error) {
    console.error("Failed to fetch culinary term:", error);
    return null;
  }
}

/**
 * Fetch a recipe by slug
 */
export async function fetchRecipe(slug: string): Promise<EchoRecipe | null> {
  try {
    const builderKey = import.meta.env.VITE_BUILDER_PUBLIC_API_KEY;
    if (!builderKey) {
      console.warn("VITE_BUILDER_PUBLIC_API_KEY not set, cannot fetch recipes");
      return null;
    }

    const url = new URL(`https://cdn.builder.io/api/v3/content/echorecipe`);
    url.searchParams.set("apiKey", builderKey);
    url.searchParams.set("query.slug", slug);
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const json = (await response.json()) as BuilderQueryResult<EchoRecipe>;
    return json.results?.[0]?.data || null;
  } catch (error) {
    console.error("Failed to fetch recipe:", error);
    return null;
  }
}

/**
 * Search for culinary terms by letter (for glossary browsing)
 */
export async function fetchTermsByLetter(
  letter: string,
): Promise<CulinaryTerm[]> {
  try {
    const builderKey = import.meta.env.VITE_BUILDER_PUBLIC_API_KEY;
    if (!builderKey) return [];

    const url = new URL(
      `https://cdn.builder.io/api/v3/content/echoculinaryterm`,
    );
    url.searchParams.set("apiKey", builderKey);
    url.searchParams.set("query.letter", letter);
    url.searchParams.set("limit", "100");

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const json = (await response.json()) as BuilderQueryResult<CulinaryTerm>;
    return json.results?.map((r) => r.data) || [];
  } catch (error) {
    console.error("Failed to fetch terms by letter:", error);
    return [];
  }
}

/**
 * Search terms by category
 */
export async function fetchTermsByCategory(
  category: string,
): Promise<CulinaryTerm[]> {
  try {
    const builderKey = import.meta.env.VITE_BUILDER_PUBLIC_API_KEY;
    if (!builderKey) return [];

    const url = new URL(
      `https://cdn.builder.io/api/v3/content/echoculinaryterm`,
    );
    url.searchParams.set("apiKey", builderKey);
    url.searchParams.set("query.categories", category);
    url.searchParams.set("limit", "100");

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const json = (await response.json()) as BuilderQueryResult<CulinaryTerm>;
    return json.results?.map((r) => r.data) || [];
  } catch (error) {
    console.error("Failed to fetch terms by category:", error);
    return [];
  }
}

/**
 * Get all recipes (paginated)
 */
export async function fetchAllRecipes(
  limit: number = 50,
  offset: number = 0,
): Promise<EchoRecipe[]> {
  try {
    const builderKey = import.meta.env.VITE_BUILDER_PUBLIC_API_KEY;
    if (!builderKey) return [];

    const url = new URL(`https://cdn.builder.io/api/v3/content/echorecipe`);
    url.searchParams.set("apiKey", builderKey);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const json = (await response.json()) as BuilderQueryResult<EchoRecipe>;
    return json.results?.map((r) => r.data) || [];
  } catch (error) {
    console.error("Failed to fetch recipes:", error);
    return [];
  }
}

/**
 * Utility: Explain an ingredient or technique using culinary database
 * Returns a friendly explanation for Echo to use in responses
 */
export async function explainCulinaryTerm(
  term: string,
): Promise<string | null> {
  const termData = await fetchCulinaryTerm(term);
  if (!termData) return null;

  const categoryString = termData.categories.join(", ");
  return `${term} (${categoryString}): ${termData.definition}`;
}

/**
 * Utility: Get ingredient substitutions by searching for similar ingredients
 * This is a simple implementation; you could enhance with fuzzy matching
 */
export async function findIngredientSubstitutes(
  ingredient: string,
): Promise<CulinaryTerm[]> {
  // Search for terms in ingredient category
  const terms = await fetchTermsByCategory("ingredient");

  // Filter for similar terms (very basic matching)
  const normalizedInput = ingredient.toLowerCase();
  return terms.filter(
    (t) =>
      t.term.toLowerCase().includes(normalizedInput) ||
      normalizedInput.includes(t.term.toLowerCase()),
  );
}
