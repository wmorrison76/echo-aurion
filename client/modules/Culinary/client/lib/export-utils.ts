import type { LanguageCode } from "@/i18n/config";
import type { ServerNote, ServerNoteRecipe } from "@shared/server-notes";
import { dictionaries } from "@/i18n/dictionaries";
import { downloadBlob } from "@/lib/download-utils";

export type ExportFormat = "pdf" | "json" | "csv";

export interface ExportOptions {
  filename: string;
  format: ExportFormat;
  language: LanguageCode;
}

function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string,
) {
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: mimeType })
      : content;
  downloadBlob(blob, filename);
}

function t(key: string, language: LanguageCode, fallback: string): string {
  return dictionaries[language]?.[key] ?? fallback;
}

export function exportServerNotesAsJSON(
  notes: ServerNote,
  options: ExportOptions,
): void {
  const data = {
    title:
      notes.title ||
      t("export.serverNotes.defaultTitle", options.language, "Server Notes"),
    company: notes.companyName,
    outlet: notes.outletName,
    distributionDate: notes.distributionNotes,
    recipes: notes.selectedRecipes,
    layout: notes.layout,
    colorScheme: notes.colorScheme,
    language: options.language,
    exportedAt: new Date().toISOString(),
  };

  downloadFile(
    JSON.stringify(data, null, 2),
    `${options.filename}.json`,
    "application/json",
  );
}

export function exportServerNotesAsCSV(
  notes: ServerNote,
  options: ExportOptions,
): void {
  const lines: string[] = [];

  lines.push(
    t("export.serverNotes.csvTitle", options.language, "Server Notes Export"),
  );
  lines.push(
    `${t("export.common.title", options.language, "Title")},${notes.title || t("common.untitled", options.language, "Untitled")}`,
  );
  lines.push(
    `${t("export.common.company", options.language, "Company")},${notes.companyName}`,
  );
  lines.push(
    `${t("export.common.outlet", options.language, "Outlet")},${notes.outletName}`,
  );
  lines.push(
    `${t("export.common.distributionDate", options.language, "Distribution Date")},${notes.distributionNotes}`,
  );
  lines.push("");
  lines.push(t("export.common.recipes", options.language, "Recipes"));
  lines.push(
    `${t("export.common.recipeName", options.language, "Recipe Name")},${t("export.common.course", options.language, "Course")},${t("export.common.cuisine", options.language, "Cuisine")},${t("export.common.portions", options.language, "Portions")}`,
  );

  notes.selectedRecipes.forEach((noteRecipe) => {
    const recipe = noteRecipe.recipe;
    const course = recipe.course || "";
    const cuisine = recipe.cuisine || "";
    const portions = "";
    lines.push(`"${recipe.title}","${course}","${cuisine}","${portions}"`);
  });

  downloadFile(
    lines.join("\n"),
    `${options.filename}.csv`,
    "text/csv;charset=utf-8",
  );
}

export interface CooksRecipe {
  name: string;
  ingredients: string[];
  instructions: string;
  cookTime?: string;
  prepTime?: string;
  yield?: string;
  allergens?: string[];
}

export function exportCooksRecipesAsJSON(
  recipes: CooksRecipe[],
  options: ExportOptions,
): void {
  const data = {
    title: t(
      "export.cooksRecipes.defaultTitle",
      options.language,
      "Cook's Recipe Book",
    ),
    language: options.language,
    totalRecipes: recipes.length,
    recipes,
    exportedAt: new Date().toISOString(),
  };

  downloadFile(
    JSON.stringify(data, null, 2),
    `${options.filename}.json`,
    "application/json",
  );
}

export function exportCooksRecipesAsCSV(
  recipes: CooksRecipe[],
  options: ExportOptions,
): void {
  const lines: string[] = [];

  lines.push("Cook's Recipe Book");
  lines.push(`Total Recipes,${recipes.length}`);
  lines.push("");
  lines.push("Recipe Name,Prep Time,Cook Time,Yield,Allergens");

  recipes.forEach((recipe) => {
    const prepTime = recipe.prepTime || "";
    const cookTime = recipe.cookTime || "";
    const recipeYield = recipe.yield || "";
    const allergens = recipe.allergens?.join("; ") || "";
    lines.push(
      `"${recipe.name}","${prepTime}","${cookTime}","${recipeYield}","${allergens}"`,
    );
  });

  downloadFile(
    lines.join("\n"),
    `${options.filename}.csv`,
    "text/csv;charset=utf-8",
  );
}

export interface AllergenItem {
  name: string;
  allergens: string[];
  course?: string;
  dish?: string;
}

export function exportAllergenSheetAsJSON(
  items: AllergenItem[],
  options: ExportOptions,
): void {
  const data = {
    title: "Allergen Sheet",
    language: options.language,
    totalItems: items.length,
    items,
    exportedAt: new Date().toISOString(),
  };

  downloadFile(
    JSON.stringify(data, null, 2),
    `${options.filename}.json`,
    "application/json",
  );
}

export function exportAllergenSheetAsCSV(
  items: AllergenItem[],
  options: ExportOptions,
): void {
  const lines: string[] = [];

  lines.push("Allergen Sheet");
  lines.push(`Total Items,${items.length}`);
  lines.push("");
  lines.push("Item Name,Course,Dish,Allergens");

  items.forEach((item) => {
    const course = item.course || "";
    const dish = item.dish || "";
    const allergens = item.allergens.join("; ");
    lines.push(`"${item.name}","${course}","${dish}","${allergens}"`);
  });

  downloadFile(
    lines.join("\n"),
    `${options.filename}.csv`,
    "text/csv;charset=utf-8",
  );
}

export function exportAsHTML(
  title: string,
  content: Record<string, unknown>,
  options: ExportOptions,
): void {
  const htmlContent = `
<!DOCTYPE html>
<html lang="${options.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            background: #f9fafb;
        }
        .header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        h1 {
            margin: 0 0 10px 0;
            color: #111827;
        }
        .meta {
            font-size: 14px;
            color: #6b7280;
        }
        .section {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f3f4f6;
            font-weight: 600;
        }
        tr:hover {
            background: #f9fafb;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <div class="meta">
            <p>Language: ${options.language}</p>
            <p>Exported: ${new Date().toLocaleString()}</p>
        </div>
    </div>
    <div class="content">
        ${JSON.stringify(content, null, 2)}
    </div>
</body>
</html>
  `;

  downloadFile(
    htmlContent,
    `${options.filename}.html`,
    "text/html;charset=utf-8",
  );
}
