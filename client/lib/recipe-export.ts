/**
 * Recipe export for LUCCCA – TXT, JSON, ZIP, Email, SMS.
 * Export format is re-import compatible (same system).
 */

export interface ExportableRecipe {
  id: string;
  name: string;
  description?: string;
  ingredients?: string[] | { quantity?: string; unit?: string; name?: string; prep?: string }[];
  instructions?: string[];
  tags?: string[];
  status?: string;
  totalCost?: number;
  costPerServing?: number;
  recipeAccess?: string[];
  isGlobal?: boolean;
}

/** LUCCCA import format (same as export so round-trip works) */
export interface LUCCCARecipeImport {
  title: string;
  name?: string;
  ingredients?: string[] | { quantity?: string; unit?: string; name?: string; prep?: string }[];
  instructions?: string[];
  steps?: string[];
  description?: string;
  tags?: string[];
  extra?: Record<string, unknown>;
}

function ingredientsToLines(ing: ExportableRecipe["ingredients"]): string[] {
  if (!ing?.length) return [];
  return ing.map((line) => {
    if (typeof line === "string") return line;
    const o = line as { quantity?: string; unit?: string; name?: string; prep?: string };
    const parts = [o.quantity, o.unit, o.name].filter(Boolean);
    const base = parts.join(" ").trim();
    return o.prep ? `${base} (${o.prep})` : base;
  });
}

function instructionsToLines(inst: string[] | undefined): string[] {
  if (!inst?.length) return [];
  return inst;
}

/** Plain text for one recipe (human-readable, re-parseable) */
export function recipeToTxt(r: ExportableRecipe): string {
  const lines: string[] = [];
  lines.push(r.name || "Untitled Recipe");
  lines.push("");
  if (r.description?.trim()) {
    lines.push(r.description.trim());
    lines.push("");
  }
  const ing = ingredientsToLines(r.ingredients);
  if (ing.length) {
    lines.push("Ingredients");
    lines.push("----------");
    ing.forEach((l) => lines.push(`  ${l}`));
    lines.push("");
  }
  const steps = instructionsToLines(r.instructions);
  if (steps.length) {
    lines.push("Instructions");
    lines.push("-----------");
    steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    lines.push("");
  }
  if (r.tags?.length) lines.push(`Tags: ${r.tags.join(", ")}`);
  if (r.recipeAccess?.length) lines.push(`Access: ${r.recipeAccess.join(", ")}`);
  if (r.isGlobal) lines.push("Global: yes");
  return lines.join("\n");
}

/** JSON object for one recipe (LUCCCA import format) */
export function recipeToLUCCCAJson(r: ExportableRecipe): LUCCCARecipeImport {
  return {
    title: r.name || "Untitled Recipe",
    name: r.name || undefined,
    description: r.description || undefined,
    ingredients: r.ingredients,
    instructions: instructionsToLines(r.instructions).length ? r.instructions : undefined,
    steps: r.instructions,
    tags: r.tags?.length ? r.tags : undefined,
    extra: {
      status: r.status,
      totalCost: r.totalCost,
      costPerServing: r.costPerServing,
      recipeAccess: r.recipeAccess,
      isGlobal: r.isGlobal,
    },
  };
}

/** Text body for email (plain text) */
export function recipeForEmail(r: ExportableRecipe, subject?: string): { subject: string; body: string } {
  const subj = subject ?? `Recipe: ${r.name || "Untitled"}`;
  const body = recipeToTxt(r);
  return { subject: subj, body };
}

/** Short text for SMS (truncated if needed, or link) */
export function recipeForSms(r: ExportableRecipe, baseUrl?: string, maxLen = 160): string {
  const title = r.name || "Untitled Recipe";
  const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}/recipe/${r.id}/view` : "";
  const short = `${title}${url ? ` ${url}` : ""}`;
  if (short.length <= maxLen) return short;
  return url ? url : short.slice(0, maxLen - 3) + "...";
}

/** Download TXT file */
export function downloadRecipeTxt(r: ExportableRecipe, filename?: string): void {
  const text = recipeToTxt(r);
  const name = (filename || (r.name || "recipe").replace(/[^a-z0-9-_]/gi, "_")) + ".txt";
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Build ZIP with recipes (LUCCCA format: recipes.json + optional per-recipe TXT) */
export async function exportRecipesToZip(
  recipes: ExportableRecipe[],
  options?: { includeTxt?: boolean; zipFilename?: string }
): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const luccaRecipes = recipes.map(recipeToLUCCCAJson);
  zip.file("recipes.json", JSON.stringify(luccaRecipes, null, 2));
  zip.file(
    "metadata.json",
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        recipeCount: recipes.length,
        format: "LUCCCA",
      },
      null,
      2
    )
  );
  if (options?.includeTxt) {
    recipes.forEach((r) => {
      const safeName = (r.name || "recipe").replace(/[^a-z0-9-_]/gi, "_");
      zip.file(`${safeName}.txt`, recipeToTxt(r));
    });
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const name = options?.zipFilename ?? `lucca-recipes-${new Date().toISOString().slice(0, 10)}.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Open mailto: with recipe */
export function openRecipeEmail(r: ExportableRecipe): void {
  const { subject, body } = recipeForEmail(r);
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailto);
}

/** Open sms: with recipe link/text */
export function openRecipeSms(r: ExportableRecipe, baseUrl?: string): void {
  const text = recipeForSms(r, baseUrl);
  const sms = `sms:?&body=${encodeURIComponent(text)}`;
  window.open(sms);
}
