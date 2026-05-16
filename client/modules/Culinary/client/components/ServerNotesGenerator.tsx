import { useState } from "react";
import {
  FileText,
  Download,
  Save,
  Eye,
  Clock,
  ChefHat,
  Languages,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "../hooks/use-toast";
import type { RecipeExport, IngredientRow } from "../../shared/recipes";
import type { ServerNote, ServerNoteRecipe } from "../../shared/server-notes";
import { defaultLanguage, type LanguageCode } from "../i18n/config";
import { dictionaries } from "../i18n/dictionaries";
import { resolveMenuName, resolveMenuPrice } from "../lib/menu-metadata";
import {
  AlignmentType,
  BorderStyle,
  Document as DocxDocument,
  HeadingLevel,
  HeightRule,
  ImageRun,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from "docx";
import type { IImageOptions, ISectionOptions } from "docx";

export type ServerNotesGeneratorProps = {
  serverNote: ServerNote;
  onSave: (next: ServerNote) => void;
  language?: LanguageCode;
  languageName?: string;
};

export function ServerNotesGenerator({
  serverNote,
  onSave,
  language = defaultLanguage,
  languageName,
}: ServerNotesGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(
    null,
  );
  const [generatedDocxUrl, setGeneratedDocxUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const generateDocument = async () => {
    setIsGenerating(true);
    try {
      const blob = await createDocx(serverNote, language);
      if (generatedDocxUrl) URL.revokeObjectURL(generatedDocxUrl);
      const docxUrl = URL.createObjectURL(blob);
      setGeneratedDocxUrl(docxUrl);
      setGeneratedDocument(createDocumentHtml(serverNote, language));
      toast({
        title: "Document Generated",
        description: "Server notes document ready to print or download.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Generation Failed",
        description: "Unable to build the document. Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDocument = async () => {
    let docxDataUrl: string | undefined;
    if (generatedDocxUrl) {
      try {
        const response = await fetch(generatedDocxUrl);
        const blob = await response.blob();
        docxDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Failed to capture docx data", error);
      }
    }

    const next: ServerNote = {
      ...serverNote,
      docxDataUrl,
      updatedAt: new Date().toISOString(),
    };
    onSave(next);
    toast({
      title: "Server Notes Saved",
      description: `"${serverNote.title || "Untitled"}" stored successfully.`,
    });
  };

  const printDocument = () => {
    if (!generatedDocument) {
      toast({
        title: "Generate document first",
        description: "Build the document before printing or downloading.",
        variant: "destructive",
      });
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(generatedDocument);
    win.document.close();
    win.focus();
    win.print();
  };

  const openDocumentEditor = () => {
    if (!generatedDocument) {
      toast({
        title: "Generate document first",
        description: "Build the document before opening the editor.",
        variant: "destructive",
      });
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(generatedDocument);
    win.document.close();
    win.focus();
  };

  const downloadDocument = () => {
    if (!generatedDocxUrl) {
      toast({
        title: "No document yet",
        description: "Generate a document before downloading.",
        variant: "destructive",
      });
      return;
    }
    const link = document.createElement("a");
    link.href = generatedDocxUrl;
    link.download = `${serverNote.title || "server-notes"}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Server Notes Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryRow
            icon={<ChefHat className="h-4 w-4 text-primary" />}
            label="Recipes Selected"
            value={`${serverNote.selectedRecipes.length}`}
          />
          <SummaryRow
            icon={<Clock className="h-4 w-4 text-primary" />}
            label="Layout"
            value={serverNote.layout.name}
          />
          <SummaryRow
            icon={<Eye className="h-4 w-4 text-primary" />}
            label={
              serverNote.pageFormat === "standard"
                ? "Orientation"
                : "Card Format"
            }
            value={
              serverNote.pageFormat === "standard"
                ? serverNote.orientation
                : `${serverNote.cardsPerPage} cards / page`
            }
          />
          <SummaryRow
            icon={<Languages className="h-4 w-4 text-primary" />}
            label="Language"
            value={languageName || language}
          />
        </div>

        <div className="flex items-center gap-2 text-sm font-medium">
          <span>Color Scheme:</span>
          <div className="flex gap-1">
            <span
              className="h-4 w-4 rounded border"
              style={{ background: serverNote.colorScheme.primary }}
            />
            <span
              className="h-4 w-4 rounded border"
              style={{ background: serverNote.colorScheme.secondary }}
            />
            <span
              className="h-4 w-4 rounded border"
              style={{ background: serverNote.colorScheme.accent }}
            />
          </div>
          <Badge variant="outline">{serverNote.colorScheme.name}</Badge>
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <Button
            onClick={generateDocument}
            disabled={isGenerating || serverNote.selectedRecipes.length === 0}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Document"}
          </Button>
          <Button
            variant="outline"
            onClick={saveDocument}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          {generatedDocument ? (
            <Button
              variant="outline"
              onClick={openDocumentEditor}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Open Editor
            </Button>
          ) : null}
          {generatedDocument ? (
            <Button
              variant="outline"
              onClick={printDocument}
              className="flex items-center gap-2"
            >
              Print
            </Button>
          ) : null}
          {generatedDocxUrl ? (
            <Button
              variant="outline"
              onClick={downloadDocument}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Word (.docx)
            </Button>
          ) : null}
        </div>

        {serverNote.selectedRecipes.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 h-10 w-10 text-muted" />
            Select recipes to generate your server notes document.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SummaryRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function SummaryRow({ icon, label, value }: SummaryRowProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function createDocumentHtml(
  serverNote: ServerNote,
  lang: LanguageCode = defaultLanguage,
): string {
  if (serverNote.layout.id === "luccca-briefing") {
    return createLucccaHtml(serverNote, lang);
  }

  const { colorScheme, orientation, pageFormat, cardsPerPage } = serverNote;

  if (pageFormat === "index-card") {
    const perPage = Math.max(1, Math.min(2, cardsPerPage || 2));
    const fontSize =
      serverNote.layout.indexCardLayout.fontSize === "small" ? "12px" : "14px";

    const sheets: string[] = [];
    for (
      let cursor = 0;
      cursor < serverNote.selectedRecipes.length;
      cursor += perPage
    ) {
      const chunk = serverNote.selectedRecipes.slice(cursor, cursor + perPage);
      const cards = chunk
        .map((item) => {
          const ingredientsSection =
            serverNote.layout.indexCardLayout.contentPriority !== "instructions"
              ? `<div class="card-subtitle">Ingredients</div>
                 <ul class="tight-list">
                   ${
                     item.recipe.ingredients
                       ?.slice(0, 8)
                       .map((ing) => `<li>${ing}</li>`)
                       .join("") || ""
                   }
                 </ul>`
              : "";
          const instructionsSection =
            serverNote.layout.indexCardLayout.contentPriority !== "ingredients"
              ? `<div class="card-subtitle">Steps</div>
                 <ol class="tight-list">
                   ${
                     item.recipe.instructions
                       ?.slice(0, 6)
                       .map((step) => `<li>${step}</li>`)
                       .join("") || ""
                   }
                 </ol>`
              : "";
          const wineSection = item.wineSelection
            ? `<div class="card-subtitle">Wine</div><div class="small-note">${item.wineSelection}</div>`
            : "";
          const sellingSection = item.sellingNotes
            ? `<div class="card-subtitle">Selling Points</div><div class="small-note">${item.sellingNotes}</div>`
            : "";

          const imageHtml =
            serverNote.layout.indexCardLayout.includeImages && item.recipe.image
              ? `<img src="${item.recipe.image}" alt="${item.recipe.title}" class="card-image" />`
              : "";

          return `<div class="card">
            <div class="card-header">${item.recipe.title}</div>
            <div class="card-content">
              ${imageHtml}
              <div class="card-section">
                ${ingredientsSection}
                ${instructionsSection}
                ${wineSection}
                ${sellingSection}
              </div>
            </div>
          </div>`;
        })
        .join("");

      sheets.push(`<div class="sheet">${cards}</div>`);
    }

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${serverNote.title} - Server Notes</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    body { margin: 0; background: ${colorScheme.background}; color: ${colorScheme.text}; font-family: ${serverNote.layout.standardLayout.fontFamily}; }
    .sheet { page-break-after: always; display: grid; grid-template-rows: repeat(${perPage}, 1fr); gap: 0.5in; align-content: center; }
    .card { width: 5in; height: 3in; margin: 0 auto; border: 1px solid ${colorScheme.secondary}; border-radius: 8px; padding: 10px; box-sizing: border-box; }
    .card-header { font-weight: bold; color: ${colorScheme.primary}; border-bottom: 1px solid ${colorScheme.accent}; padding-bottom: 4px; margin-bottom: 6px; text-align: ${serverNote.layout.indexCardLayout.headerStyle === "centered" ? "center" : "left"}; }
    .card-content { font-size: ${fontSize}; line-height: 1.25; position: relative; }
    .card-image { width: 1.2in; height: 1in; object-fit: cover; border-radius: 4px; float: right; margin-left: 8px; }
    .card-subtitle { font-weight: 600; color: ${colorScheme.primary}; margin-top: 4px; }
    .tight-list { margin: 4px 0; padding-left: 16px; }
    .tight-list li { margin: 2px 0; }
    .small-note { font-style: italic; color: ${colorScheme.secondary}; }
  </style>
</head>
<body>
  ${sheets.join("")}
</body>
</html>`;
  }

  const pages = serverNote.selectedRecipes
    .map((item, index) => {
      const wineSection = item.wineSelection
        ? `<div class="section"><div class="section-title">Wine Pairing & Selection</div><div class="wine-notes">${item.wineSelection}</div></div>`
        : "";
      const sellingSection = item.sellingNotes
        ? `<div class="section"><div class="section-title">Server Selling Points</div><p>${item.sellingNotes}</p></div>`
        : "";
      const serviceSection = item.serviceInstructions
        ? `<div class="section"><div class="section-title">Service Instructions</div><p>${item.serviceInstructions}</p></div>`
        : "";
      const silverwareSection =
        item.silverwareRequired && item.silverwareRequired.length
          ? `<div class="section"><div class="section-title">Required Silverware</div><div class="silverware-list">${item.silverwareRequired
              .map((s) => `<span class="silverware-item">${s}</span>`)
              .join("")}</div></div>`
          : "";
      const allergenBlock = item.recipe.tags?.filter((tag) =>
        /gluten|dairy|nut|shellfish|soy|egg|sesame/i.test(tag),
      );
      const allergenSection =
        allergenBlock &&
        allergenBlock.length &&
        serverNote.layout.standardLayout.includeNutrition
          ? `<div class="section"><div class="section-title">Allergens</div><div class="wine-notes">${allergenBlock.join(", ")}</div></div>`
          : "";

      const imageHtml =
        serverNote.layout.standardLayout.includeImages && item.recipe.image
          ? `<img src="${item.recipe.image}" alt="${item.recipe.title}" class="recipe-image" />`
          : "";

      return `<div class="page recipe-item">
        <div class="recipe-header">${item.recipe.title}</div>
        <div class="recipe-content">
          ${imageHtml}
          <div class="recipe-description">"${item.recipe.description ?? ""}"</div>
          <div class="section"><div class="section-title">Ingredients & Quantities</div><div class="ingredients-list">${
            item.recipe.ingredients
              ?.map((ing) => `<div class="ingredient">• ${ing}</div>`)
              .join("") ?? ""
          }</div></div>
          <div class="section"><div class="section-title">Preparation Method</div><ol>${
            item.recipe.instructions
              ?.map((instruction) => `<li>${instruction}</li>`)
              .join("") ?? ""
          }</ol></div>
          ${wineSection}
          ${sellingSection}
          ${serviceSection}
          ${silverwareSection}
          ${allergenSection}
          <div class="meta">
            <strong>Course:</strong> ${item.recipe.course ?? "—"} •
            <strong> Cuisine:</strong> ${item.recipe.cuisine ?? "—"}
          </div>
        </div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${serverNote.title} - Server Notes</title>
  <style>
    @page { size: ${orientation === "horizontal" ? "landscape" : "portrait"}; margin: 0.75in; }
    body { font-family: '${serverNote.layout.standardLayout.fontFamily}'; color: ${colorScheme.text}; background-color: ${colorScheme.background}; line-height: 1.4; margin: 0; padding: 0; }
    .header { text-align: ${serverNote.layout.standardLayout.headerStyle === "centered" ? "center" : "left"}; border-bottom: 2px solid ${colorScheme.primary}; padding-bottom: 20px; margin-bottom: 30px; }
    .logo-container { display: flex; justify-content: center; gap: 20px; margin-bottom: 15px; }
    .logo { height: 60px; width: auto; }
    .company-name { font-size: 28px; font-weight: bold; color: ${colorScheme.primary}; margin: 10px 0; }
    .outlet-name { font-size: 18px; color: ${colorScheme.secondary}; margin: 5px 0; }
    .document-title { font-size: 24px; font-weight: bold; color: ${colorScheme.primary}; margin: 15px 0 5px 0; }
    .distribution-date { font-size: 14px; color: ${colorScheme.secondary}; margin-bottom: 20px; }
    .recipe-item { page-break-inside: avoid; margin-bottom: 30px; border: 1px solid ${colorScheme.secondary}; border-radius: 8px; overflow: hidden; }
    .recipe-header { background-color: ${colorScheme.primary}; color: white; padding: 15px; font-size: 20px; font-weight: bold; }
    .recipe-content { padding: 20px; position: relative; }
    .recipe-image { float: right; width: 150px; height: 120px; object-fit: cover; border-radius: 6px; margin-left: 20px; margin-bottom: 10px; }
    .recipe-description { font-style: italic; margin-bottom: 15px; color: ${colorScheme.secondary}; }
    .section { margin-bottom: 15px; }
    .section-title { font-weight: bold; color: ${colorScheme.primary}; border-bottom: 1px solid ${colorScheme.accent}; padding-bottom: 2px; margin-bottom: 5px; }
    .ingredients-list { ${serverNote.layout.standardLayout.recipeLayout === "two-column" ? "columns: 2; column-gap: 20px;" : ""} margin-bottom: 15px; }
    .ingredient { break-inside: avoid; margin-bottom: 3px; }
    .silverware-list { display: flex; flex-wrap: wrap; gap: 5px; }
    .silverware-item { background-color: ${colorScheme.accent}; color: ${colorScheme.text}; padding: 3px 8px; border-radius: 12px; font-size: 12px; }
    .wine-notes { background-color: ${colorScheme.background}; border-left: 4px solid ${colorScheme.accent}; padding: 10px; margin: 10px 0; font-style: italic; }
    .index-page { page-break-after: always; }
    .index-list { list-style: none; padding: 0; }
    .index-item { padding: 10px; border-bottom: 1px dotted ${colorScheme.secondary}; display: flex; justify-content: space-between; }
    .meta { margin-top: 16px; font-size: 12px; color: ${colorScheme.secondary}; border-top: 1px solid ${colorScheme.secondary}; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="page title-page">
    <div class="header">
      ${
        serverNote.logos.length
          ? `<div class="logo-container">${serverNote.logos
              .map((logo) => `<img src="${logo}" alt="Logo" class="logo" />`)
              .join("")}</div>`
          : ""
      }
      ${serverNote.companyName ? `<div class="company-name">${serverNote.companyName}</div>` : ""}
      ${serverNote.outletName ? `<div class="outlet-name">${serverNote.outletName}</div>` : ""}
      <div class="document-title">${serverNote.title}</div>
      <div class="distribution-date">Distribution Date: ${new Date(serverNote.distributionDate).toLocaleDateString()}</div>
    </div>
  </div>
  <div class="page index-page">
    <h2 style="color: ${colorScheme.primary}; border-bottom: 2px solid ${colorScheme.primary}; padding-bottom: 10px;">Menu Index</h2>
    <ul class="index-list">
      ${serverNote.selectedRecipes
        .map(
          (item, index) =>
            `<li class="index-item"><span>${item.recipe.title}</span><span>Page ${index + 3}</span></li>`,
        )
        .join("")}
    </ul>
  </div>
  ${pages}
</body>
</html>`;
}

type LucccaDishRow = {
  qty: string;
  component: string;
  notes: string;
};

type LucccaAllergenRow = {
  item: string;
  allergen: string;
  modify: string;
  alternative: string;
};

type LucccaBeverageRow = {
  item: string;
  year: string;
  location: string;
  country: string;
};

type LucccaPreparedEntry = {
  entry: ServerNoteRecipe;
  menuName: string;
  menuPrice: string | null;
  description: string;
  serverNotes: string;
  serviceware: string;
  dishComponents: LucccaDishRow[];
  allergens: LucccaAllergenRow[];
  beverages: LucccaBeverageRow[];
  imageSrc?: string;
};

const ALLERGEN_PATTERN =
  /gluten|dairy|milk|nut|peanut|tree nut|shellfish|fish|soy|egg|sesame|wheat/i;

const colorToHex = (value: string | undefined, fallback = "000000"): string => {
  if (!value) return fallback;
  const hex = value.replace("#", "").trim();
  return hex.length ? hex : fallback;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMultilineHtml = (value: string): string =>
  escapeHtml(value).replace(/\r?\n/g, "<br />");

const ensureRowCount = <T,>(rows: T[], min: number, filler: () => T): T[] => {
  const copy = [...rows];
  while (copy.length < min) {
    copy.push(filler());
  }
  return copy;
};

const splitLines = (value: string): string[] =>
  value
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

function prepareLucccaEntries(note: ServerNote): LucccaPreparedEntry[] {
  return note.selectedRecipes.map((entry) => {
    const extra = (entry.recipe.extra ?? {}) as { serverNotes?: RecipeExport };
    const exportData = extra.serverNotes ?? null;
    const ingredients = (exportData?.ingredients ?? []) as IngredientRow[];

    const dishComponents = ingredients.map((row) => ({
      qty: [row.qty, row.unit].filter(Boolean).join(" ").trim(),
      component: row.item ?? "",
      notes: [row.prep, row.yield].filter(Boolean).join(" ").trim(),
    }));

    if (!dishComponents.length && entry.recipe.ingredients?.length) {
      dishComponents.push(
        ...entry.recipe.ingredients.map((item) => ({
          qty: "",
          component: item,
          notes: "",
        })),
      );
    }

    const paddedComponents = ensureRowCount(dishComponents, 12, () => ({
      qty: "",
      component: "",
      notes: "",
    }));

    const allergenSource = exportData?.allergens?.length
      ? exportData.allergens
      : (entry.recipe.tags?.filter((tag) => ALLERGEN_PATTERN.test(tag)) ?? []);

    const allergenRows = allergenSource.length
      ? allergenSource.map((label) => ({
          item: entry.recipe.title,
          allergen: label,
          modify: "",
          alternative: "",
        }))
      : [
          {
            item: entry.recipe.title,
            allergen: "",
            modify: "",
            alternative: "",
          },
        ];

    const paddedAllergens = ensureRowCount(allergenRows, 6, () => ({
      item: "",
      allergen: "",
      modify: "",
      alternative: "",
    }));

    const beverageLines = entry.wineSelection
      ? splitLines(entry.wineSelection)
      : [];
    const beverageRows = beverageLines.map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        item: parts[0] || line,
        year: parts[1] || "",
        location: parts[2] || "",
        country: parts[3] || "",
      } satisfies LucccaBeverageRow;
    });

    const paddedBeverages = ensureRowCount(beverageRows, 5, () => ({
      item: "",
      year: "",
      location: "",
      country: "",
    }));

    const servicewareParts: string[] = [];
    if (entry.serviceInstructions?.trim()) {
      servicewareParts.push(entry.serviceInstructions.trim());
    }
    if (entry.silverwareRequired?.length) {
      servicewareParts.push(`Utensils: ${entry.silverwareRequired.join(", ")}`);
    }

    return {
      entry,
      menuName: resolveMenuName(entry.recipe),
      menuPrice: resolveMenuPrice(entry.recipe),
      description: entry.recipe.description?.trim() || "",
      serverNotes: entry.sellingNotes?.trim() || "",
      serviceware: servicewareParts.join("\n"),
      dishComponents: paddedComponents,
      allergens: paddedAllergens,
      beverages: paddedBeverages,
      imageSrc:
        entry.recipe.imageDataUrls?.[0] || entry.recipe.image || undefined,
    } satisfies LucccaPreparedEntry;
  });
}

function createLucccaHtml(note: ServerNote, lang: LanguageCode): string {
  const entries = prepareLucccaEntries(note);
  const { colorScheme } = note;
  const coverItems = entries
    .map(
      (item, index) =>
        `<li><span class="index-number">${index + 1}.</span><span contenteditable="true">${escapeHtml(item.menuName)}</span></li>`,
    )
    .join("");

  const logos = (note.logos || [])
    .slice(0, 2)
    .map((logo) => `<img src="${logo}" alt="Logo" />`)
    .join("");

  const cover = `<div class="page cover">
    <header class="cover-header">
      <div class="cover-meta" style="border-color: ${colorScheme.primary};">
        ${note.companyName ? `<h1 contenteditable="true">${escapeHtml(note.companyName)}</h1>` : ""}
        ${note.outletName ? `<h2 contenteditable="true">${escapeHtml(note.outletName)}</h2>` : ""}
        <p class="cover-title" contenteditable="true">${escapeHtml(note.title || "Service Briefing")}</p>
        <p class="cover-date" contenteditable="true">${escapeHtml(
          new Date(note.distributionDate).toLocaleDateString(),
        )}</p>
      </div>
      ${logos ? `<div class="cover-logos">${logos}</div>` : ""}
    </header>
    <section class="cover-body">
      <h3>Menu Overview</h3>
      <ul class="cover-list">
        ${coverItems || '<li contenteditable="true">Add menu items</li>'}
      </ul>
      ${
        note.distributionNotes
          ? `<div class="cover-notes"><h4>Distribution Notes</h4><p contenteditable="true">${formatMultilineHtml(
              note.distributionNotes,
            )}</p></div>`
          : '<div class="cover-notes"><h4>Distribution Notes</h4><p contenteditable="true">Add notes</p></div>'
      }
    </section>
  </div>`;

  const recipePages = entries
    .map((prepared, index) => {
      const image = prepared.imageSrc
        ? `<img src="${prepared.imageSrc}" alt="${escapeHtml(prepared.menuName)}" />`
        : '<div class="image-placeholder" contenteditable="true">Add Image</div>';

      const dishRows = prepared.dishComponents
        .map(
          (row) => `
            <tr>
              <td contenteditable="true">${escapeHtml(row.qty)}</td>
              <td contenteditable="true">${escapeHtml(row.component)}</td>
              <td contenteditable="true">${escapeHtml(row.notes)}</td>
            </tr>
          `,
        )
        .join("");

      const allergenRows = prepared.allergens
        .map(
          (row) => `
            <tr>
              <td contenteditable="true">${escapeHtml(row.item)}</td>
              <td contenteditable="true">${escapeHtml(row.allergen)}</td>
              <td contenteditable="true">${escapeHtml(row.modify)}</td>
              <td contenteditable="true">${escapeHtml(row.alternative)}</td>
            </tr>
          `,
        )
        .join("");

      const beverageRows = prepared.beverages
        .map(
          (row) => `
            <tr>
              <td contenteditable="true">${escapeHtml(row.item)}</td>
              <td contenteditable="true">${escapeHtml(row.year)}</td>
              <td contenteditable="true">${escapeHtml(row.location)}</td>
              <td contenteditable="true">${escapeHtml(row.country)}</td>
            </tr>
          `,
        )
        .join("");

      return `<div class="page recipe">
        <header class="recipe-header" style="background: ${colorScheme.primary}; color: ${colorScheme.background};">
          <div class="header-title" contenteditable="true">${escapeHtml(prepared.menuName)}</div>
          <div class="header-price" contenteditable="true">${prepared.menuPrice ? escapeHtml(prepared.menuPrice) : ""}</div>
        </header>
        <main class="recipe-body">
          <div class="left-column">
            <div class="hero-image">${image}</div>
            <table class="components-table">
              <thead style="background: ${colorScheme.secondary}; color: ${colorScheme.background};">
                <tr>
                  <th>Qty</th>
                  <th>Component</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${dishRows}
              </tbody>
            </table>
          </div>
          <div class="right-column">
            <section>
              <h4>Menu Description</h4>
              <div class="editable" contenteditable="true">${
                prepared.description
                  ? formatMultilineHtml(prepared.description)
                  : "Add description"
              }</div>
            </section>
            <section>
              <h4>Server Notes</h4>
              <div class="editable" contenteditable="true">${
                prepared.serverNotes
                  ? formatMultilineHtml(prepared.serverNotes)
                  : "Add notes"
              }</div>
            </section>
            <section>
              <h4>Serviceware</h4>
              <div class="editable" contenteditable="true">${
                prepared.serviceware
                  ? formatMultilineHtml(prepared.serviceware)
                  : "Add utensils needed"
              }</div>
            </section>
          </div>
        </main>
        <section class="full-width">
          <h4 style="background: ${colorScheme.accent};">Allergens</h4>
          <table class="allergen-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Allergy</th>
                <th>Modify</th>
                <th>Alternative</th>
              </tr>
            </thead>
            <tbody>
              ${allergenRows}
            </tbody>
          </table>
        </section>
        <section class="full-width">
          <h4 style="background: ${colorScheme.accent};">Wine & Beverage Pairings</h4>
          <table class="beverage-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Year</th>
                <th>Location</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              ${beverageRows}
            </tbody>
          </table>
        </section>
        <footer class="footer-meta">
          <span>Page ${index + 2}</span>
          <span contenteditable="true">${escapeHtml(note.companyName || "")}</span>
        </footer>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(note.title || "Server Notes")}</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    body { margin: 0; font-family: 'Arial', 'Helvetica', sans-serif; background: #0f172a; }
    .page { width: 7.5in; min-height: 10in; margin: 0.5in auto; background: #ffffff; padding: 0.6in; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35); box-sizing: border-box; position: relative; }
    .page:not(:last-child) { page-break-after: always; }
    [contenteditable="true"] { outline: none; }
    [contenteditable="true"]:hover { box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.4); }
    [contenteditable="true"]:focus { box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.7); }
    .cover { display: flex; flex-direction: column; gap: 24px; }
    .cover-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
    .cover-meta { border-left: 4px solid; padding-left: 18px; }
    .cover-meta h1 { margin: 0; font-size: 28px; }
    .cover-meta h2 { margin: 4px 0 12px; font-size: 18px; color: #475569; }
    .cover-title { font-size: 22px; font-weight: 600; margin: 0 0 6px; }
    .cover-date { margin: 0; color: #64748b; }
    .cover-logos img { max-height: 64px; margin-left: 12px; }
    .cover-body h3 { margin: 0 0 12px; font-size: 18px; }
    .cover-list { list-style: none; padding: 0; margin: 0 0 16px; }
    .cover-list li { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(148, 163, 184, 0.35); }
    .cover-list .index-number { font-weight: 600; color: ${colorScheme.primary}; }
    .cover-notes h4 { margin: 0 0 6px; font-size: 16px; }
    .cover-notes p { margin: 0; line-height: 1.4; }
    .recipe-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 12px; font-size: 20px; font-weight: 700; margin-bottom: 20px; color: ${colorScheme.background}; }
    .recipe-body { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .left-column { display: flex; flex-direction: column; gap: 16px; }
    .hero-image { border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 12px; padding: 6px; min-height: 200px; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
    .hero-image img { width: 100%; border-radius: 10px; object-fit: cover; }
    .image-placeholder { width: 100%; text-align: center; color: #64748b; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid rgba(148, 163, 184, 0.45); padding: 6px 8px; font-size: 12px; }
    th { text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; }
    .components-table thead { color: ${colorScheme.background}; }
    .right-column section { margin-bottom: 16px; }
    .right-column h4, .full-width h4 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; padding: 6px 10px; border-radius: 6px; background: rgba(148, 163, 184, 0.18); display: inline-block; }
    .editable { min-height: 70px; border: 1px dashed rgba(148, 163, 184, 0.45); border-radius: 8px; padding: 8px 10px; line-height: 1.45; font-size: 13px; }
    .full-width { margin-top: 20px; }
    .footer-meta { display: flex; justify-content: space-between; margin-top: 24px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  ${cover}
  ${recipePages}
</body>
</html>`;
}

async function createStandardDoc(
  note: ServerNote,
  language: LanguageCode = defaultLanguage,
): Promise<Blob> {
  const docStrings = getServerNotesDocStrings(language);
  const standard = note.pageFormat === "standard";
  const cardsPerPage = standard
    ? 1
    : Math.max(1, Math.min(2, note.cardsPerPage || 2));

  const pageSize = standard
    ? {
        width:
          note.orientation === "horizontal"
            ? convertInchesToTwip(11)
            : convertInchesToTwip(8.5),
        height:
          note.orientation === "horizontal"
            ? convertInchesToTwip(8.5)
            : convertInchesToTwip(11),
        orientation:
          note.orientation === "horizontal"
            ? PageOrientation.LANDSCAPE
            : PageOrientation.PORTRAIT,
      }
    : {
        width: convertInchesToTwip(8.5),
        height: convertInchesToTwip(11),
        orientation: PageOrientation.PORTRAIT,
      };

  const font =
    (note.layout.standardLayout.fontFamily || "Times New Roman")
      .split(",")[0]
      ?.replace(/['"]/g, "")
      .trim() || "Times New Roman";

  const toHex = (color: string) => color.replace("#", "") || "000000";

  type HeadingValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];
  type AlignmentValue = (typeof AlignmentType)[keyof typeof AlignmentType];

  const heading = (
    text: string,
    level: HeadingValue,
    align: AlignmentValue = AlignmentType.LEFT,
  ) =>
    new Paragraph({
      heading: level,
      alignment: align,
      children: [
        new TextRun({
          text,
          bold: true,
          color: toHex(note.colorScheme.primary),
          font,
        }),
      ],
    });

  const paragraph = (
    text: string,
    options?: {
      align?: AlignmentValue;
      color?: string;
      bold?: boolean;
      size?: number;
    },
  ) =>
    new Paragraph({
      alignment: options?.align,
      children: [
        new TextRun({
          text,
          color: toHex(options?.color || note.colorScheme.text),
          bold: options?.bold,
          size: options?.size,
          font,
        }),
      ],
    });

  const sections: any[] = [];

  const headerChildren: Paragraph[] = [];

  if (note.companyName) {
    headerChildren.push(
      paragraph(note.companyName, {
        align: AlignmentType.CENTER,
        color: note.colorScheme.primary,
        bold: true,
        size: 56,
      }),
    );
  }
  if (note.outletName) {
    headerChildren.push(
      paragraph(note.outletName, {
        align: AlignmentType.CENTER,
        color: note.colorScheme.secondary,
      }),
    );
  }

  const fallbackTitle = note.title?.trim() || docStrings.titleFallback;
  headerChildren.push(
    new Paragraph({
      text: fallbackTitle,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ font })],
    }),
  );
  headerChildren.push(
    paragraph(
      `${docStrings.distributionDate}: ${new Date(note.distributionDate).toLocaleDateString(language)}`,
      {
        align: AlignmentType.CENTER,
        color: note.colorScheme.secondary,
      },
    ),
  );

  sections.push({
    properties: {
      page: {
        size: pageSize,
        margin: {
          top: convertInchesToTwip(0.75),
          right: convertInchesToTwip(0.75),
          bottom: convertInchesToTwip(0.75),
          left: convertInchesToTwip(0.75),
        },
      },
    },
    children: headerChildren,
  });

  if (standard) {
    for (const entry of note.selectedRecipes) {
      const children: (Paragraph | Table)[] = [];
      const headerAlign =
        note.layout.standardLayout.headerStyle === "centered"
          ? AlignmentType.CENTER
          : AlignmentType.LEFT;

      children.push(
        new Paragraph({
          alignment: headerAlign,
          children: [
            new TextRun({
              text: entry.recipe.title,
              bold: true,
              size: 36,
              color: toHex(note.colorScheme.primary),
              font,
            }),
          ],
        }),
      );

      if (note.layout.standardLayout.includeImages && entry.recipe.image) {
        children.push(
          paragraph(`[Image: ${entry.recipe.image}]`, {
            align: AlignmentType.RIGHT,
            color: note.colorScheme.secondary,
          }),
        );
      }

      if (entry.recipe.description) {
        children.push(
          paragraph(entry.recipe.description, {
            color: note.colorScheme.secondary,
          }),
        );
      }

      if (note.layout.standardLayout.recipeLayout === "two-column") {
        const ingredientParagraphs =
          entry.recipe.ingredients?.map((ing) => paragraph(`• ${ing}`)) || [];
        const instructionParagraphs =
          entry.recipe.instructions?.map((step, idx) =>
            paragraph(`${idx + 1}. ${step}`),
          ) || [];

        const row = new TableRow({
          children: [
            new TableCell({
              children: [
                heading(docStrings.sectionIngredients, HeadingLevel.HEADING_3),
                ...ingredientParagraphs,
              ],
            }),
            new TableCell({
              children: [
                heading(docStrings.sectionPreparation, HeadingLevel.HEADING_3),
                ...instructionParagraphs,
              ],
            }),
          ],
        });

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [row],
          }),
        );
      } else {
        children.push(
          heading(docStrings.sectionIngredients, HeadingLevel.HEADING_3),
        );
        entry.recipe.ingredients?.forEach((ing) =>
          children.push(paragraph(`• ${ing}`)),
        );
        children.push(
          heading(docStrings.sectionPreparation, HeadingLevel.HEADING_3),
        );
        entry.recipe.instructions?.forEach((step, idx) =>
          children.push(paragraph(`${idx + 1}. ${step}`)),
        );
      }

      if (entry.wineSelection) {
        children.push(
          heading(docStrings.sectionWinePairing, HeadingLevel.HEADING_3),
        );
        children.push(paragraph(entry.wineSelection));
      }

      if (entry.sellingNotes) {
        children.push(
          heading(docStrings.sectionSellingPoints, HeadingLevel.HEADING_3),
        );
        children.push(paragraph(entry.sellingNotes));
      }

      if (entry.serviceInstructions) {
        children.push(
          heading(
            docStrings.sectionServiceInstructions,
            HeadingLevel.HEADING_3,
          ),
        );
        children.push(paragraph(entry.serviceInstructions));
      }

      if (entry.silverwareRequired?.length) {
        children.push(
          heading(docStrings.sectionRequiredSilverware, HeadingLevel.HEADING_3),
        );
        entry.silverwareRequired.forEach((item) =>
          children.push(paragraph(`• ${item}`)),
        );
      }

      sections.push({
        properties: {
          page: {
            size: pageSize,
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        children,
      });
    }
  } else {
    for (let idx = 0; idx < note.selectedRecipes.length; idx += cardsPerPage) {
      const pageRecipes = note.selectedRecipes.slice(idx, idx + cardsPerPage);
      const rows: TableRow[] = [];

      for (const item of pageRecipes) {
        const cells: Paragraph[] = [];
        cells.push(
          new Paragraph({
            alignment:
              note.layout.indexCardLayout.headerStyle === "centered"
                ? AlignmentType.CENTER
                : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: item.recipe.title,
                bold: true,
                size: 32,
                color: toHex(note.colorScheme.primary),
                font,
              }),
            ],
          }),
        );

        if (note.layout.indexCardLayout.includeImages && item.recipe.image) {
          cells.push(
            paragraph(`[Image: ${item.recipe.image}]`, {
              align: AlignmentType.RIGHT,
              color: note.colorScheme.secondary,
            }),
          );
        }

        if (note.layout.indexCardLayout.contentPriority !== "instructions") {
          cells.push(
            heading(docStrings.sectionIngredients, HeadingLevel.HEADING_3),
          );
          item.recipe.ingredients
            ?.slice(0, 8)
            .forEach((ing) => cells.push(paragraph(`• ${ing}`)));
        }

        if (note.layout.indexCardLayout.contentPriority !== "ingredients") {
          cells.push(heading(docStrings.sectionSteps, HeadingLevel.HEADING_3));
          item.recipe.instructions
            ?.slice(0, 6)
            .forEach((step, indexStep) =>
              cells.push(paragraph(`${indexStep + 1}. ${step}`)),
            );
        }

        if (item.wineSelection) {
          cells.push(heading(docStrings.sectionWine, HeadingLevel.HEADING_3));
          cells.push(paragraph(item.wineSelection));
        }

        if (item.sellingNotes) {
          cells.push(
            heading(docStrings.sectionSelling, HeadingLevel.HEADING_3),
          );
          cells.push(paragraph(item.sellingNotes));
        }

        rows.push(
          new TableRow({
            height: { value: convertInchesToTwip(3), rule: HeightRule.EXACT },
            children: [
              new TableCell({
                margins: {
                  top: convertInchesToTwip(0.15),
                  bottom: convertInchesToTwip(0.15),
                  left: convertInchesToTwip(0.2),
                  right: convertInchesToTwip(0.2),
                },
                width: { size: convertInchesToTwip(5), type: WidthType.DXA },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 2,
                    color: "999999",
                  },
                  left: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 2,
                    color: "999999",
                  },
                },
                children: cells,
              }),
            ],
          }),
        );
      }

      sections.push({
        properties: {
          page: {
            size: pageSize,
            margin: {
              top: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.5),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.5),
            },
          },
        },
        children: [
          new Table({
            width: { size: convertInchesToTwip(5), type: WidthType.DXA },
            rows,
          }),
        ],
      });
    }
  }

  const doc = new DocxDocument({
    sections,
    creator: "Echo Recipe Pro",
    description: `Language: ${language}`,
  });
  return Packer.toBlob(doc);
}

async function createDocx(
  note: ServerNote,
  language: LanguageCode = defaultLanguage,
): Promise<Blob> {
  if (note.layout.id === "luccca-briefing") {
    return createLucccaDoc(note, language);
  }
  return createStandardDoc(note, language);
}

async function createLucccaDoc(
  note: ServerNote,
  language: LanguageCode = defaultLanguage,
): Promise<Blob> {
  const docStrings = getServerNotesDocStrings(language);
  const entries = prepareLucccaEntries(note);
  const pageSize = {
    width:
      note.orientation === "horizontal"
        ? convertInchesToTwip(11)
        : convertInchesToTwip(8.5),
    height:
      note.orientation === "horizontal"
        ? convertInchesToTwip(8.5)
        : convertInchesToTwip(11),
    orientation:
      note.orientation === "horizontal"
        ? PageOrientation.LANDSCAPE
        : PageOrientation.PORTRAIT,
  };
  const margin = {
    top: convertInchesToTwip(0.5),
    right: convertInchesToTwip(0.5),
    bottom: convertInchesToTwip(0.5),
    left: convertInchesToTwip(0.5),
  };
  const font =
    (note.layout.standardLayout.fontFamily || "Arial")
      .split(",")[0]
      ?.replace(/['"]/g, "")
      .trim() || "Arial";
  const primaryHex = colorToHex(note.colorScheme.primary, "1F2933");
  const secondaryHex = colorToHex(note.colorScheme.secondary, "64748B");
  const textHex = colorToHex(note.colorScheme.text, "111827");
  const sections: ISectionOptions[] = [];

  const coverChildren: Paragraph[] = [];
  const formattedDistributionDate = new Date(
    note.distributionDate,
  ).toLocaleDateString(language);

  if (note.companyName) {
    coverChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: note.companyName,
            bold: true,
            size: 64,
            color: primaryHex,
            font,
          }),
        ],
      }),
    );
  }

  if (note.outletName) {
    coverChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: note.outletName,
            size: 32,
            color: secondaryHex,
            font,
          }),
        ],
      }),
    );
  }

  coverChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: note.title?.trim() || docStrings.serviceBriefing,
          bold: true,
          size: 52,
          color: primaryHex,
          font,
        }),
      ],
    }),
  );

  coverChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: `${docStrings.distributionDate}: ${formattedDistributionDate}`,
          color: secondaryHex,
          font,
        }),
      ],
    }),
  );

  coverChildren.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: docStrings.menuOverview,
          bold: true,
          size: 32,
          color: primaryHex,
          font,
        }),
      ],
    }),
  );

  entries.forEach((entry, idx) => {
    coverChildren.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `${idx + 1}. ${entry.menuName}`,
            color: textHex,
            font,
          }),
        ],
      }),
    );
  });

  if (note.distributionNotes) {
    coverChildren.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({
            text: docStrings.distributionNotes,
            bold: true,
            color: primaryHex,
            font,
          }),
        ],
      }),
    );
    splitLines(note.distributionNotes).forEach((line) =>
      coverChildren.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: line, color: textHex, font })],
        }),
      ),
    );
  }

  sections.push({
    properties: { page: { size: pageSize, margin } },
    children: coverChildren,
  });

  for (const prepared of entries) {
    const children: (Paragraph | Table)[] = [];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 75, type: WidthType.PERCENTAGE },
                borders: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 12,
                    color: primaryHex,
                  },
                },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: prepared.menuName,
                        bold: true,
                        size: 36,
                        color: primaryHex,
                        font,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 12,
                    color: primaryHex,
                  },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: prepared.menuPrice ?? "",
                        bold: true,
                        size: 32,
                        color: primaryHex,
                        font,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );

    if (prepared.imageSrc) {
      const imageData = await loadImageBuffer(prepared.imageSrc);
      if (imageData) {
        const imageOptions = {
          data: imageData,
          transformation: { width: 400, height: 260 },
        } as unknown as IImageOptions;
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new ImageRun(imageOptions)],
          }),
        );
      }
    }

    children.push(
      ...createLucccaSectionParagraphs(
        docStrings.sectionMenuDescription,
        prepared.description,
        textHex,
        secondaryHex,
        font,
      ),
    );
    children.push(
      ...createLucccaSectionParagraphs(
        docStrings.sectionServerNotes,
        prepared.serverNotes,
        textHex,
        secondaryHex,
        font,
      ),
    );
    children.push(
      ...createLucccaSectionParagraphs(
        docStrings.sectionServiceware,
        prepared.serviceware,
        textHex,
        secondaryHex,
        font,
      ),
    );

    children.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({
            text: docStrings.sectionDishComponents,
            bold: true,
            color: primaryHex,
            font,
          }),
        ],
      }),
    );
    children.push(
      createLucccaDishTable(prepared, primaryHex, secondaryHex, textHex, font, {
        qty: docStrings.tableQty,
        component: docStrings.tableComponent,
        notes: docStrings.tableNotes,
      }),
    );
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({
            text: docStrings.sectionAllergens,
            bold: true,
            color: primaryHex,
            font,
          }),
        ],
      }),
    );
    children.push(
      createLucccaAllergenTable(prepared, primaryHex, textHex, font, {
        item: docStrings.tableItem,
        allergy: docStrings.tableAllergy,
        modify: docStrings.tableModify,
        alternative: docStrings.tableAlternative,
      }),
    );
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({
            text: docStrings.sectionBeverages,
            bold: true,
            color: primaryHex,
            font,
          }),
        ],
      }),
    );
    children.push(
      createLucccaBeverageTable(prepared, primaryHex, textHex, font, {
        item: docStrings.tableItem,
        year: docStrings.tableYear,
        location: docStrings.tableLocation,
        country: docStrings.tableCountry,
      }),
    );

    sections.push({
      properties: { page: { size: pageSize, margin } },
      children,
    });
  }

  const doc = new DocxDocument({
    sections,
    creator: "Echo Recipe Pro",
    description: `Language: ${language}`,
  });

  return Packer.toBlob(doc);
}

function createLucccaSectionParagraphs(
  label: string,
  content: string,
  textHex: string,
  headingHex: string,
  font: string,
): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({ text: label, bold: true, color: headingHex, font }),
      ],
    }),
  ];
  const lines = splitLines(content);
  if (lines.length === 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: " ", color: textHex, font })],
      }),
    );
  } else {
    lines.forEach((line) =>
      paragraphs.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: line, color: textHex, font })],
        }),
      ),
    );
  }
  return paragraphs;
}

function createLucccaDishTable(
  prepared: LucccaPreparedEntry,
  headerHex: string,
  borderHex: string,
  textHex: string,
  font: string,
  labels: { qty: string; component: string; notes: string },
): Table {
  const headerRow = new TableRow({
    children: [labels.qty, labels.component, labels.notes].map(
      (title) =>
        new TableCell({
          shading: { fill: headerHex, color: "FFFFFF" },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: title, bold: true, color: "FFFFFF", font }),
              ],
            }),
          ],
        }),
    ),
  });

  const rows = prepared.dishComponents.map(
    (row) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.qty, color: textHex, font }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.component, color: textHex, font }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.notes, color: textHex, font }),
                ],
              }),
            ],
          }),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: borderHex },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: borderHex },
      left: { style: BorderStyle.SINGLE, size: 4, color: borderHex },
      right: { style: BorderStyle.SINGLE, size: 4, color: borderHex },
      insideHorizontal: {
        style: BorderStyle.SINGLE,
        size: 2,
        color: borderHex,
      },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: borderHex },
    },
    rows: [headerRow, ...rows],
  });
}

function createLucccaAllergenTable(
  prepared: LucccaPreparedEntry,
  headerHex: string,
  textHex: string,
  font: string,
  labels: {
    item: string;
    allergy: string;
    modify: string;
    alternative: string;
  },
): Table {
  const headerRow = new TableRow({
    children: [
      labels.item,
      labels.allergy,
      labels.modify,
      labels.alternative,
    ].map(
      (title) =>
        new TableCell({
          shading: { fill: headerHex, color: "FFFFFF" },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: title, bold: true, color: "FFFFFF", font }),
              ],
            }),
          ],
        }),
    ),
  });

  const rows = prepared.allergens.map(
    (row) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.item, color: textHex, font }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.allergen, color: textHex, font }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.modify, color: textHex, font }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.alternative, color: textHex, font }),
                ],
              }),
            ],
          }),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows],
  });
}

function createLucccaBeverageTable(
  prepared: LucccaPreparedEntry,
  headerHex: string,
  textHex: string,
  font: string,
  labels: { item: string; year: string; location: string; country: string },
): Table {
  const headerRow = new TableRow({
    children: [labels.item, labels.year, labels.location, labels.country].map(
      (title) =>
        new TableCell({
          shading: { fill: headerHex, color: "FFFFFF" },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: title, bold: true, color: "FFFFFF", font }),
              ],
            }),
          ],
        }),
    ),
  });

  const rows = prepared.beverages.map(
    (row) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.item, color: textHex, font }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.year, color: textHex, font }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.location, color: textHex, font }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: row.country, color: textHex, font }),
                ],
              }),
            ],
          }),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows],
  });
}

type ServerNotesDocStrings = {
  titleFallback: string;
  serviceBriefing: string;
  distributionDate: string;
  menuOverview: string;
  distributionNotes: string;
  sectionMenuDescription: string;
  sectionServerNotes: string;
  sectionServiceware: string;
  sectionIngredients: string;
  sectionPreparation: string;
  sectionSteps: string;
  sectionWinePairing: string;
  sectionSellingPoints: string;
  sectionServiceInstructions: string;
  sectionRequiredSilverware: string;
  sectionWine: string;
  sectionSelling: string;
  sectionDishComponents: string;
  sectionAllergens: string;
  sectionBeverages: string;
  tableQty: string;
  tableComponent: string;
  tableNotes: string;
  tableItem: string;
  tableAllergy: string;
  tableModify: string;
  tableAlternative: string;
  tableYear: string;
  tableLocation: string;
  tableCountry: string;
};

function getServerNotesDocStrings(
  language: LanguageCode,
): ServerNotesDocStrings {
  const fallbackDictionary = dictionaries[defaultLanguage];
  const dictionary = dictionaries[language] ?? fallbackDictionary;
  const t = (key: string, fallback: string) =>
    dictionary[key] ?? fallbackDictionary[key] ?? fallback;

  return {
    titleFallback: t("serverNotes.doc.titleFallback", "Server Notes"),
    serviceBriefing: t("serverNotes.doc.serviceBriefing", "Service Briefing"),
    distributionDate: t(
      "serverNotes.doc.distributionDate",
      "Distribution Date",
    ),
    menuOverview: t("serverNotes.doc.menuOverview", "Menu Overview"),
    distributionNotes: t(
      "serverNotes.doc.distributionNotes",
      "Distribution Notes",
    ),
    sectionMenuDescription: t(
      "serverNotes.doc.section.menuDescription",
      "Menu Description",
    ),
    sectionServerNotes: t(
      "serverNotes.doc.section.serverNotes",
      "Server Notes",
    ),
    sectionServiceware: t("serverNotes.doc.section.serviceware", "Serviceware"),
    sectionIngredients: t("serverNotes.doc.section.ingredients", "Ingredients"),
    sectionPreparation: t("serverNotes.doc.section.preparation", "Preparation"),
    sectionSteps: t("serverNotes.doc.section.steps", "Steps"),
    sectionWinePairing: t(
      "serverNotes.doc.section.winePairing",
      "Wine Pairing",
    ),
    sectionSellingPoints: t(
      "serverNotes.doc.section.sellingPoints",
      "Selling Points",
    ),
    sectionServiceInstructions: t(
      "serverNotes.doc.section.serviceInstructions",
      "Service Instructions",
    ),
    sectionRequiredSilverware: t(
      "serverNotes.doc.section.requiredSilverware",
      "Required Silverware",
    ),
    sectionWine: t("serverNotes.doc.section.wine", "Wine"),
    sectionSelling: t("serverNotes.doc.section.selling", "Selling"),
    sectionDishComponents: t(
      "serverNotes.doc.section.dishComponents",
      "Dish Components",
    ),
    sectionAllergens: t("serverNotes.doc.section.allergens", "Allergens"),
    sectionBeverages: t(
      "serverNotes.doc.section.beverages",
      "Wine & Beverage Pairings",
    ),
    tableQty: t("serverNotes.doc.table.qty", "Qty"),
    tableComponent: t("serverNotes.doc.table.component", "Component"),
    tableNotes: t("serverNotes.doc.table.notes", "Notes"),
    tableItem: t("serverNotes.doc.table.item", "Item Name"),
    tableAllergy: t("serverNotes.doc.table.allergy", "Allergy"),
    tableModify: t("serverNotes.doc.table.modify", "Modify"),
    tableAlternative: t("serverNotes.doc.table.alternative", "Alternative"),
    tableYear: t("serverNotes.doc.table.year", "Year"),
    tableLocation: t("serverNotes.doc.table.location", "Location"),
    tableCountry: t("serverNotes.doc.table.country", "Country"),
  };
}

async function loadImageBuffer(src?: string): Promise<Uint8Array | null> {
  if (!src) return null;
  try {
    if (src.startsWith("data:")) {
      const base64 = src.split(",")[1];
      if (!base64) return null;
      const binary = atob(base64);
      const length = binary.length;
      const bytes = new Uint8Array(length);
      for (let index = 0; index < length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }
    const response = await fetch(src);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.warn("Failed to load image for DOCX", error);
    return null;
  }
}
