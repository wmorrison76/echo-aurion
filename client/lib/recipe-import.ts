/**
 * Recipe import for LUCCCA – parse JSON, TXT, and PDF (with progress).
 * Output shape is compatible with POST /api/recipes/import.
 */

import type { LUCCCARecipeImport } from "./recipe-export";

export type ParsedRecipe = {
  title: string;
  name?: string;
  description?: string;
  ingredients?: string[] | Record<string, unknown>[];
  instructions?: string[];
  steps?: string[];
  tags?: string[];
  extra?: Record<string, unknown>;
};

/** Parse JSON file/string: array of recipes or single recipe (LUCCCA format) */
export function parseRecipeJson(content: string): ParsedRecipe[] {
  const raw = JSON.parse(content);
  if (Array.isArray(raw)) {
    return raw.map(normalizeImportItem);
  }
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.recipes)) return raw.recipes.map(normalizeImportItem);
    return [normalizeImportItem(raw)];
  }
  return [];
}

function normalizeImportItem(item: unknown): ParsedRecipe {
  const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  const title = [o.title, o.name].find((v) => typeof v === "string" && v.trim()) as string | undefined;
  return {
    title: (title || "Imported Recipe").trim(),
    name: title?.trim(),
    description: typeof o.description === "string" ? o.description : undefined,
    ingredients: Array.isArray(o.ingredients) ? o.ingredients : undefined,
    instructions: Array.isArray(o.instructions) ? (o.instructions as string[]) : undefined,
    steps: Array.isArray(o.steps) ? (o.steps as string[]) : undefined,
    tags: Array.isArray(o.tags) ? (o.tags as string[]) : undefined,
    extra: o.extra && typeof o.extra === "object" ? (o.extra as Record<string, unknown>) : undefined,
  };
}

/** Parse plain TXT: one recipe per block (title, then Ingredients / Instructions sections) */
export function parseRecipeTxt(content: string): ParsedRecipe[] {
  const blocks = content.split(/\n\s*\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  const recipes: ParsedRecipe[] = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim());
    const title = lines[0] || "Imported Recipe";
    let ingredients: string[] = [];
    let instructions: string[] = [];
    let section: "ingredients" | "instructions" | null = null;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^ingredients?\s*$/i.test(line) || /^-\s*$/.test(line)) {
        section = "ingredients";
        continue;
      }
      if (/^(instructions?|directions?|method|steps?)\s*$/i.test(line)) {
        section = "instructions";
        continue;
      }
      if (!line) continue;
      if (section === "ingredients") ingredients.push(line.replace(/^[\s•\-*]+\s*/, ""));
      else if (section === "instructions") instructions.push(line.replace(/^\d+[.)]\s*/, ""));
      else if (section === null && (line.startsWith("  ") || /^\d+[.)]/.test(line))) {
        instructions.push(line.replace(/^\d+[.)]\s*/, "").trim());
      }
    }
    recipes.push({
      title,
      name: title,
      ingredients: ingredients.length ? ingredients : undefined,
      instructions: instructions.length ? instructions : undefined,
      steps: instructions.length ? instructions : undefined,
    });
  }
  return recipes.length ? recipes : [{ title: "Imported Recipe", name: "Imported Recipe" }];
}

/** Convert parsed recipes to LUCCCA import payload for POST /api/recipes/import */
export function toImportPayload(recipes: ParsedRecipe[]): { recipes: LUCCCARecipeImport[] } {
  return {
    recipes: recipes.map((r) => ({
      title: r.title,
      name: r.name ?? r.title,
      description: r.description,
      ingredients: r.ingredients,
      instructions: r.instructions ?? r.steps,
      tags: r.tags,
      extra: r.extra,
    })),
  };
}

export type PdfImportProgress = {
  phase: "loading" | "pages" | "parsing" | "done";
  page?: number;
  totalPages?: number;
  recipesFound?: number;
  error?: string;
};

/**
 * Parse PDF and extract recipe-like blocks. Tags recipes with book title (filename).
 * Reports progress via onProgress. Returns parsed recipes for POST /api/recipes/import.
 */
export async function parsePdfWithProgress(
  file: File,
  onProgress: (p: PdfImportProgress) => void
): Promise<ParsedRecipe[]> {
  const bookTitle = file.name.replace(/\.pdf$/i, "").trim() || "PDF Import";
  onProgress({ phase: "loading" });

  const mod = await import("https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs").catch(() => null);
  const pdfjs = mod?.default ?? mod;
  if (!pdfjs?.getDocument) {
    onProgress({ phase: "done", error: "PDF library failed to load" });
    return [];
  }
  const workerSrc = "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const ab = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: ab }).promise;
  const totalPages = doc.numPages;
  const pageTexts: string[] = [];

  for (let p = 1; p <= totalPages; p++) {
    onProgress({ phase: "pages", page: p, totalPages });
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const text = (content.items as { str?: string }[]).map((i) => i.str ?? "").join(" ");
    pageTexts.push(text);
  }

  onProgress({ phase: "parsing" });
  const fullText = pageTexts.join("\n");
  const recipes = parseRecipeTxt(fullText);
  const tagged = recipes.map((r) => ({
    ...r,
    tags: [...(r.tags ?? []), bookTitle],
    extra: { ...r.extra, source: "pdf", bookTitle },
  }));
  onProgress({ phase: "done", recipesFound: tagged.length });
  return tagged;
}
