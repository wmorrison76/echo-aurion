import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type ServerNote,
  type ServerNoteRecipe,
  createEmptyServerNote,
} from "../../shared/server-notes";
import type { LanguageCode, LanguageOption } from "@/i18n/config";
import { extractRecipeAllergens } from "@/lib/allergens";

const cookbookLabels: Record<LanguageCode, {
  cookbookTitle: string;
  subtitle: string;
  preparedFor: string;
  generatedOn: string;
  index: string;
  ingredients: string;
  instructions: string;
  allergens: string;
  noAllergens: string;
  course: string;
  cuisine: string;
  totalTime: string;
  totalRecipes: string;
  yield: string;
  language: string;
  generate: string;
  print: string;
  download: string;
  empty: string;
}> = {
  "en-US": {
    cookbookTitle: "Cook's Recipe Book",
    subtitle: "Build a printable package with title page, index, and full recipes.",
    preparedFor: "Prepared for",
    generatedOn: "Generated on",
    index: "Index",
    ingredients: "Ingredients",
    instructions: "Instructions",
    allergens: "Allergens",
    noAllergens: "No allergens reported",
    course: "Course",
    cuisine: "Cuisine",
    totalTime: "Total Time",
    yield: "Yield",
    language: "Language",
    totalRecipes: "Recipes",
    generate: "Generate Cookbook",
    print: "Print Cookbook",
    download: "Download HTML",
    empty: "Add recipes to Step 2 to enable the cookbook export.",
  },
  "fr-FR": {
    cookbookTitle: "Carnet de Recettes",
    subtitle: "Créez un dossier imprimable avec page de titre, index et recettes complètes.",
    preparedFor: "Préparé pour",
    generatedOn: "Généré le",
    index: "Index",
    ingredients: "Ingrédients",
    instructions: "Instructions",
    allergens: "Allergènes",
    noAllergens: "Aucun allergène signalé",
    course: "Service",
    cuisine: "Cuisine",
    totalTime: "Temps total",
    yield: "Rendement",
    language: "Langue",
    totalRecipes: "Recettes",
    generate: "Générer le carnet",
    print: "Imprimer le carnet",
    download: "Télécharger HTML",
    empty: "Ajoutez des recettes à l’étape 2 pour activer l’export du carnet.",
  },
  "it-IT": {
    cookbookTitle: "Ricettario della Cucina",
    subtitle: "Crea un pacchetto stampabile con copertina, indice e ricette complete.",
    preparedFor: "Preparato per",
    generatedOn: "Generato il",
    index: "Indice",
    ingredients: "Ingredienti",
    instructions: "Istruzioni",
    allergens: "Allergeni",
    noAllergens: "Nessun allergene segnalato",
    course: "Portata",
    cuisine: "Cucina",
    totalTime: "Tempo totale",
    yield: "Resa",
    language: "Lingua",
    totalRecipes: "Ricette",
    generate: "Genera ricettario",
    print: "Stampa ricettario",
    download: "Scarica HTML",
    empty: "Aggiungi ricette al passaggio 2 per abilitare l’esportazione del ricettario.",
  },
  "es-ES": {
    cookbookTitle: "Libro de Recetas",
    subtitle: "Crea un paquete imprimible con portada, índice y recetas completas.",
    preparedFor: "Preparado para",
    generatedOn: "Generado el",
    index: "Índice",
    ingredients: "Ingredientes",
    instructions: "Instrucciones",
    allergens: "Alérgenos",
    noAllergens: "Sin alérgenos registrados",
    course: "Servicio",
    cuisine: "Cocina",
    totalTime: "Tiempo total",
    yield: "Rendimiento",
    language: "Idioma",
    totalRecipes: "Recetas",
    generate: "Generar libro",
    print: "Imprimir libro",
    download: "Descargar HTML",
    empty: "Agrega recetas al paso 2 para habilitar la exportación del libro.",
  },
  "pt-BR": {
    cookbookTitle: "Livro de Receitas",
    subtitle: "Crie um pacote imprimível com capa, índice e receitas completas.",
    preparedFor: "Preparado para",
    generatedOn: "Gerado em",
    index: "Índice",
    ingredients: "Ingredientes",
    instructions: "Instruções",
    allergens: "Alergênicos",
    noAllergens: "Nenhum alergênico informado",
    course: "Serviço",
    cuisine: "Culinária",
    totalTime: "Tempo total",
    yield: "Rendimento",
    language: "Idioma",
    totalRecipes: "Receitas",
    generate: "Gerar livro",
    print: "Imprimir livro",
    download: "Baixar HTML",
    empty: "Adicione receitas à etapa 2 para habilitar a exportação do livro.",
  },
  "de-DE": {
    cookbookTitle: "Rezeptbuch",
    subtitle: "Erstelle ein druckbares Paket mit Titelseite, Index und vollständigen Rezepten.",
    preparedFor: "Erstellt für",
    generatedOn: "Erstellt am",
    index: "Inhaltsverzeichnis",
    ingredients: "Zutaten",
    instructions: "Anweisungen",
    allergens: "Allergene",
    noAllergens: "Keine Allergene gemeldet",
    course: "Gang",
    cuisine: "Küche",
    totalTime: "Gesamtzeit",
    yield: "Ertrag",
    language: "Sprache",
    totalRecipes: "Rezepte",
    generate: "Rezeptbuch erstellen",
    print: "Rezeptbuch drucken",
    download: "HTML herunterladen",
    empty: "Füge Rezepte in Schritt 2 hinzu, um den Rezeptbuch-Export zu aktivieren.",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCookbookHtml(
  recipes: ServerNoteRecipe[],
  note: ServerNote,
  language: LanguageCode,
  labels: (typeof cookbookLabels)[LanguageCode],
  languageLabel: string,
): string {
  const entries = [...recipes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const formatDate = (input: string) => {
    try {
      return new Date(input).toLocaleDateString(language);
    } catch {
      return input;
    }
  };
  const indexItems = entries
    .map(
      (entry, idx) =>
        `<li><span>${escapeHtml(entry.recipe.title || labels.cookbookTitle)}</span><span>${idx + 3}</span></li>`,
    )
    .join("");

  const recipeSections = entries
    .map((entry, idx) => {
      const anchor = `recipe-${idx + 1}`;
      const description = entry.recipe.description
        ? `<p class="description">${escapeHtml(entry.recipe.description)}</p>`
        : "";
      const ingredients = Array.isArray(entry.recipe.ingredients)
        ? entry.recipe.ingredients
            .map((line) => `<li>${escapeHtml(String(line))}</li>`)
            .join("")
        : "";
      const instructions = Array.isArray(entry.recipe.instructions)
        ? entry.recipe.instructions
            .map((line) => `<li>${escapeHtml(String(line))}</li>`)
            .join("")
        : "";
      const allergens = extractRecipeAllergens(entry);
      const allergenBlock =
        allergens.length > 0
          ? `<ul class="allergen-list">${allergens
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul>`
          : `<p class="muted">${labels.noAllergens}</p>`;

      const metaParts: string[] = [];
      if (entry.recipe.course) metaParts.push(`${labels.course}: ${escapeHtml(entry.recipe.course)}`);
      if (entry.recipe.cuisine) metaParts.push(`${labels.cuisine}: ${escapeHtml(entry.recipe.cuisine)}`);
      const total = (entry.recipe.prepTime ?? 0) + (entry.recipe.cookTime ?? 0);
      if (total > 0) metaParts.push(`${labels.totalTime}: ${total} min`);

      const extra = entry.recipe.extra ?? {};
      const yieldQty = (extra as any)?.yieldQty ?? (extra as any)?.portionCount;
      const yieldUnit = (extra as any)?.yieldUnit ?? (extra as any)?.portionUnit;
      if (yieldQty) {
        metaParts.push(`${labels.yield}: ${yieldQty}${yieldUnit ? ` ${escapeHtml(String(yieldUnit))}` : ""}`);
      }

      const metaLine = metaParts.length ? `<p class="meta">${metaParts.join(" • ")}</p>` : "";

      return `<section id="${anchor}" class="recipe-section">
        <header>
          <h2>${escapeHtml(entry.recipe.title || `${labels.cookbookTitle} ${idx + 1}`)}</h2>
          ${metaLine}
        </header>
        ${description}
        <div class="columns">
          <div class="column">
            <h3>${labels.ingredients}</h3>
            <ul class="bullet-list">${ingredients}</ul>
          </div>
          <div class="column">
            <h3>${labels.instructions}</h3>
            <ol class="numbered-list">${instructions}</ol>
          </div>
        </div>
        <div class="allergens">
          <h3>${labels.allergens}</h3>
          ${allergenBlock}
        </div>
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(note.title || labels.cookbookTitle)}</title>
  <style>
    body { font-family: "Inter", "Helvetica", sans-serif; color: #111827; background: #f8fafc; margin: 0; }
    .page { page-break-after: always; padding: 2.5rem 2rem; background: white; min-height: 100vh; box-sizing: border-box; }
    .title-page { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1.2rem; text-align: center; }
    .title-page h1 { font-size: 2.75rem; letter-spacing: 0.12em; text-transform: uppercase; margin: 0; }
    .title-page .subtitle { font-size: 1rem; color: #4b5563; letter-spacing: 0.35em; text-transform: uppercase; }
    .title-page .meta { font-size: 0.95rem; color: #374151; }
    .index-page h2 { font-size: 1.4rem; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.2em; }
    .index-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.65rem; }
    .index-list li { display: flex; justify-content: space-between; font-size: 0.95rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.4rem; }
    .recipe-section { page-break-after: always; padding: 2rem 1.5rem; }
    .recipe-section header h2 { font-size: 1.8rem; margin: 0; text-transform: uppercase; letter-spacing: 0.08em; }
    .recipe-section .meta { color: #6b7280; font-size: 0.85rem; margin-top: 0.4rem; }
    .recipe-section .description { margin-top: 1rem; font-size: 1rem; color: #1f2937; }
    .columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
    .columns h3 { font-size: 1rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.18em; }
    .bullet-list, .numbered-list { margin: 0; padding-left: 1.25rem; font-size: 0.95rem; display: grid; gap: 0.4rem; }
    .numbered-list { counter-reset: step; }
    .numbered-list li { counter-increment: step; position: relative; padding-left: 0.4rem; }
    .allergens { margin-top: 1.75rem; }
    .allergen-list { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; padding: 0; margin: 0; }
    .allergen-list li { background: #fee2e2; color: #991b1b; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; }
    .muted { color: #6b7280; font-size: 0.9rem; }
    @media print {
      body { background: white; }
      .page { box-shadow: none; }
    }
  </style>
</head>
<body>
  <section class="page title-page">
    <h1>${escapeHtml(labels.cookbookTitle)}</h1>
    <div class="subtitle">${escapeHtml(note.title || labels.cookbookTitle)}</div>
    <p class="meta">${labels.preparedFor} ${escapeHtml(note.companyName || "")}${note.outletName ? ` • ${escapeHtml(note.outletName)}` : ""}</p>
    <p class="meta">${labels.language}: ${escapeHtml(languageLabel)}</p>
    <p class="meta">${labels.generatedOn} ${formatDate(new Date().toISOString())}</p>
    <p class="meta">${labels.totalRecipes}: ${entries.length}</p>
  </section>
  <section class="page index-page">
    <h2>${labels.index}</h2>
    <ul class="index-list">${indexItems}</ul>
  </section>
  ${recipeSections}
</body>
</html>`;
}

function revoke(url: string | null) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

type CooksRecipeBookGeneratorProps = {
  recipes: any[];
  language: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
  languageOptions: LanguageOption[];
  note?: ServerNote;
  onGeneratedHtml?: (html: string) => void;
};

export function CooksRecipeBookGenerator({
  recipes,
  language,
  onLanguageChange,
  languageOptions,
  note,
  onGeneratedHtml,
}: CooksRecipeBookGeneratorProps) {
  const labels = useMemo(
    () => cookbookLabels[language] ?? cookbookLabels["en-US"],
    [language],
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<string[]>([]);
  const [htmlDocument, setHtmlDocument] = useState<string | null>(null);
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);

  useEffect(() => () => revoke(htmlUrl), [htmlUrl]);

  const languageLabel = useMemo(() => {
    return languageOptions.find((option) => option.code === language)?.label || language;
  }, [language, languageOptions]);

  const generate = async () => {
    if (!recipes.length) return;
    setIsGenerating(true);
    setGeneratedRecipes([]);

    try {
      const defaultNote: ServerNote = createEmptyServerNote();

      // Simulate collecting recipes one by one
      for (let i = 0; i < recipes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 150));
        setGeneratedRecipes(prev => [...prev, recipes[i].name || `Recipe ${i + 1}`]);
      }

      const html = buildCookbookHtml(recipes, note || defaultNote, language, labels, languageLabel);
      revoke(htmlUrl);
      const blob = new Blob([html], { type: "text/html" });
      setHtmlDocument(html);
      setHtmlUrl(URL.createObjectURL(blob));
      if (onGeneratedHtml) {
        onGeneratedHtml(html);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!htmlDocument) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(htmlDocument);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownload = () => {
    if (!htmlUrl) return;
    const link = document.createElement("a");
    link.href = htmlUrl;
    link.download = `cookbook-${language}-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="space-y-3 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-[#c8a97e]/20 dark:bg-slate-950/70"
      data-cookbook-content={htmlDocument ? "true" : undefined}
    >
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em]">
          {labels.cookbookTitle}
        </h3>
        <p className="text-xs text-muted-foreground">
          {labels.subtitle}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={generate}
          disabled={isGenerating || recipes.length === 0}
          className="flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          {isGenerating ? `${labels.generate}…` : labels.generate}
        </Button>
        <Button
          variant="outline"
          onClick={handlePrint}
          disabled={!htmlDocument}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          {labels.print}
        </Button>
      </div>

      {/* Generated recipes list */}
      {isGenerating && generatedRecipes.length > 0 && (
        <div className="space-y-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
            Recipes collected: {generatedRecipes.length} / {recipes.length}
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {generatedRecipes.map((name, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-200">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {htmlDocument && (
        <iframe
          srcDoc={htmlDocument}
          className="w-full border-0 rounded"
          style={{ minHeight: "600px" }}
          title="Cookbook Preview"
        />
      )}
      {recipes.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {labels.empty}
        </p>
      )}
    </div>
  );
}
