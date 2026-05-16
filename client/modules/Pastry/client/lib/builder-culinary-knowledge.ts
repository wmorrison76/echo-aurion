/** * Builder.io Culinary Knowledge Fetchers * Allows Echo to query culinary terms and recipes stored in Builder.io */ interface CulinaryTerm {
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
} /** Builder.io removed app-wide. Returns null (no network call). */
export async function fetchCulinaryTerm(
  _term: string,
): Promise<CulinaryTerm | null> {
  return null;
} /** Builder.io removed app-wide. Returns null (no network call). */
export async function fetchRecipe(_slug: string): Promise<EchoRecipe | null> {
  return null;
} /** Builder.io removed app-wide. Returns [] (no network call). */
export async function fetchTermsByLetter(
  _letter: string,
): Promise<CulinaryTerm[]> {
  return [];
} /** Builder.io removed app-wide. Returns [] (no network call). */
export async function fetchTermsByCategory(
  _category: string,
): Promise<CulinaryTerm[]> {
  return [];
} /** Builder.io removed app-wide. Returns [] (no network call). */
export async function fetchAllRecipes(
  _limit: number = 50,
  _offset: number = 0,
): Promise<EchoRecipe[]> {
  return [];
} /** * Utility: Explain an ingredient or technique using culinary database * Returns a friendly explanation for Echo to use in responses */
export async function explainCulinaryTerm(
  term: string,
): Promise<string | null> {
  const termData = await fetchCulinaryTerm(term);
  if (!termData) return null;
  const categoryString = termData.categories.join(",");
  return `${term} (${categoryString}): ${termData.definition}`;
} /** * Utility: Get ingredient substitutions by searching for similar ingredients * This is a simple implementation; you could enhance with fuzzy matching */
export async function findIngredientSubstitutes(
  ingredient: string,
): Promise<CulinaryTerm[]> {
  // Search for terms in ingredient category const terms = await fetchTermsByCategory("ingredient"); // Filter for similar terms (very basic matching) const normalizedInput = ingredient.toLowerCase(); return terms.filter( (t) => t.term.toLowerCase().includes(normalizedInput) || normalizedInput.includes(t.term.toLowerCase()), );
}
