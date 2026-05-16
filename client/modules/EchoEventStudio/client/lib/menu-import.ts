import type { MenuItem } from "../components/BeoMenuPicker";

import * as pdfjs from "pdfjs-dist";
// Vite will turn this into a static asset URL
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Tesseract from "tesseract.js";

type ParseResult = { items: MenuItem[]; warnings: string[] };

function slugId(prefix: string, s: string): string {
  const base = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
  return `${prefix}-${base || Math.random().toString(36).slice(2, 10)}`;
}

function normalizeWhitespace(s: string): string {
  return String(s || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inferDietary(line: string): string[] {
  const l = line.toLowerCase();
  const out = new Set<string>();
  if (/\bvegan\b/.test(l)) out.add("vegan");
  if (/\bvegetarian\b/.test(l)) out.add("vegetarian");
  if (/\bgluten[- ]?free\b/.test(l)) out.add("gluten-free");
  if (/\bdairy[- ]?free\b/.test(l)) out.add("dairy-free");
  if (/\bhalal\b/.test(l)) out.add("halal");
  if (/\bkosher\b/.test(l)) out.add("kosher");
  return Array.from(out);
}

function inferAllergens(line: string): string[] {
  const l = line.toLowerCase();
  const out = new Set<string>();
  if (/\b(shellfish|shrimp|crab|lobster)\b/.test(l)) out.add("shellfish");
  if (/\b(fish|salmon|tuna|cod)\b/.test(l)) out.add("fish");
  if (/\b(peanut|peanuts)\b/.test(l)) out.add("peanut");
  if (/\b(tree nut|almond|walnut|pecan|cashew|pistachio)\b/.test(l))
    out.add("tree-nut");
  if (/\b(egg|eggs)\b/.test(l)) out.add("egg");
  if (/\b(dairy|milk|cheese|butter|cream)\b/.test(l)) out.add("dairy");
  if (/\b(gluten|wheat|flour|bread|pasta)\b/.test(l)) out.add("gluten");
  if (/\b(soy|soya)\b/.test(l)) out.add("soy");
  if (/\b(sesame)\b/.test(l)) out.add("sesame");
  return Array.from(out);
}

function detectCategoryHeading(line: string): string | null {
  const t = line.trim();
  if (t.length < 3 || t.length > 40) return null;
  const upper = t.toUpperCase();
  const looksAllCaps = t === upper && /[A-Z]/.test(upper);
  const looksHeading = looksAllCaps || /:$/.test(t);
  if (!looksHeading) return null;
  const c = t.replace(/:$/, "").trim();
  // common headings
  const mapped = /appet/i.test(c)
    ? "Appetizer"
    : /starter/i.test(c)
      ? "Appetizer"
      : /salad/i.test(c)
        ? "Appetizer"
        : /entree|main|dinner/i.test(c)
          ? "Entree"
          : /dessert|sweet/i.test(c)
            ? "Dessert"
            : /bever|drink|bar/i.test(c)
              ? "Beverage"
              : /side/i.test(c)
                ? "Side"
                : c.slice(0, 24);
  return mapped;
}

function parseMenuTextToItems(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = normalizeWhitespace(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let category = "Entree";
  const items: MenuItem[] = [];

  // Price patterns like "$12", "12.00", "12"
  const priceRe =
    /(?:\$?\s*)(\d{1,3}(?:\.\d{1,2})?)(?:\s*(?:pp|per person|each))?$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = detectCategoryHeading(line);
    if (heading) {
      category = heading;
      continue;
    }

    // If line is too short, skip
    if (line.length < 4) continue;

    const m = line.match(priceRe);
    let price = 0;
    let name = line;
    if (m) {
      price = Number(m[1]) || 0;
      name = line.replace(priceRe, "").trim();
    }

    // description may be next line if it doesn't look like an item
    let description = "";
    const next = lines[i + 1] || "";
    const nextIsHeading = Boolean(detectCategoryHeading(next));
    const nextLooksLikePriceLine = priceRe.test(next);
    const nextLooksLikeItem =
      next.length > 4 &&
      /[A-Za-z]/.test(next) &&
      !nextIsHeading &&
      nextLooksLikePriceLine;
    if (next && !nextIsHeading && !nextLooksLikeItem && next.length <= 120) {
      // treat as description if it doesn't have its own price and isn't a heading
      if (!priceRe.test(next)) {
        description = next;
        i++;
      }
    }

    // Guard: ignore lines that are obviously venue headers/footers
    if (/^(www\.|http|copyright|all rights reserved)/i.test(name)) continue;

    items.push({
      id: slugId("menu", `${category}-${name}-${price}`),
      name,
      category,
      description,
      price,
      preparationTime: 20,
      servingSize: "per person",
      dietary: inferDietary(`${name} ${description}`),
      allergens: inferAllergens(`${name} ${description}`),
      popularity: 0.75,
      upsellPotential: 0.6,
    });
  }

  if (items.length === 0) {
    warnings.push(
      "No menu items detected. Try a clearer PDF/image, or use Manual Entry.",
    );
  }

  return { items, warnings };
}

async function extractTextFromPdf(file: File): Promise<string> {
  (pdfjs as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const ab = await file.arrayBuffer();
  const doc = await (pdfjs as any).getDocument({ data: ab }).promise;
  let text = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = (content.items || [])
      .map((it: any) => String(it?.str || ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    text += `${pageText}\n`;
  }
  return normalizeWhitespace(text);
}

async function extractTextFromImage(file: File): Promise<string> {
  try {
    const worker = await Tesseract.createWorker("eng");
    try {
      const { data } = await worker.recognize(file);
      return normalizeWhitespace(String(data?.text || ""));
    } finally {
      try {
        await worker.terminate();
      } catch {
        // ignore
      }
    }
  } catch (error) {
    // Graceful fallback if tesseract.js fails
    console.warn("OCR extraction failed, returning empty text:", error);
    return "";
  }
}

async function extractTextFromPlainText(file: File): Promise<string> {
  return normalizeWhitespace(await file.text());
}

export async function parseMenuFile(file: File): Promise<ParseResult> {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();

  let text = "";
  if (type.includes("pdf") || name.endsWith(".pdf")) {
    text = await extractTextFromPdf(file);
  } else if (type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(name)) {
    text = await extractTextFromImage(file);
  } else if (type.includes("text") || /\.(txt|csv)$/i.test(name)) {
    text = await extractTextFromPlainText(file);
  } else {
    // best-effort: try OCR (camera scans often come through weirdly)
    text = await extractTextFromImage(file);
  }

  return parseMenuTextToItems(text);
}
