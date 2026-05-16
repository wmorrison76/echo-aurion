export type IngredientRow = {
  qty: string;
  unit: string;
  item: string;
  prep: string;
  yield: string;
  cost: string;
};
export type RecipeExport = {
  title: string;
  subtitle?: string;
  cookTime?: string;
  cookTemp?: string;
  yieldQty?: number;
  yieldUnit?: string;
  portionCount?: number;
  portionUnit?: string;
  portionCost?: number;
  access?: string[];
  allergens: string[];
  modifiers: {
    nationality: string[];
    courses: string[];
    recipeType: string[];
    prepMethod: string[];
    equipment: string[];
  };
  ingredients: IngredientRow[];
  directions: string;
  imageDataUrl?: string;
  nutrition?: {
    calories?: number;
    fat?: number;
    carbs?: number;
    protein?: number;
    fiber?: number;
    sugars?: number;
    sodium?: number;
    cholesterol?: number;
  } | null;
  totals: { fullRecipeCost: number };
  currency: string;
};
export const currencySymbol = (currency: string) =>
  (
    ({ USD: "$", CAD: "$", AUD: "$", EUR: "€", GBP: "£", JPY: "¥" }) as Record<
      string,
      string
    >
  )[currency] ?? "$";
export type RecipeNutrition = NonNullable<RecipeExport["nutrition"]>;
export type Recipe = {
  id: string;
  title: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  tags?: string[];
  imageNames?: string[];
  imageDataUrls?: string[];
  image?: string;
  course?: string;
  cuisine?: string;
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  nutrition?: RecipeNutrition | null;
  createdAt: number;
  sourceFile?: string;
  extra?: Record<string, unknown>;
  favorite?: boolean;
  rating?: number;
  deletedAt?: number | null;
  blurhash?: string;
  portionSize?: string;
  portionUnit?: string;
};
type NormalizeInput = {
  recipeName: string;
  ingredients: IngredientRow[];
  directions: string;
  selectedAllergens: string[];
  selectedNationality: string[];
  selectedCourses: string[];
  selectedRecipeType: string[];
  selectedPrepMethod: string[];
  selectedCookingEquipment: string[];
  image: string | null;
  yieldQty: number;
  yieldUnit: string;
  portionCount: number;
  portionUnit: string;
  currentCurrency: string;
  nutrition: any | null;
  fullRecipeCost: number;
  portionCost: number;
  cookTime?: string;
  cookTemp?: string;
  access?: string[];
};
export function normalizeRecipe(data: NormalizeInput): RecipeExport {
  const trimmed = [...data.ingredients];
  while (
    trimmed.length &&
    Object.values(trimmed[trimmed.length - 1]!).every(
      (value) => !`${value}`.trim(),
    )
  ) {
    trimmed.pop();
  }
  const parseCost = (input: string) => {
    const numeric = parseFloat((input || "").replace(/[$€£¥,\s]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  };
  const fullRecipeCost =
    data.fullRecipeCost ||
    trimmed.reduce((sum, row) => sum + parseCost(row.cost), 0);
  const nutritionSource = data.nutrition;
  const nutrition: RecipeExport["nutrition"] = nutritionSource
    ? {
        calories: Math.round(nutritionSource.calories || 0),
        fat: nutritionSource.totalNutrients?.FAT?.quantity,
        carbs: nutritionSource.totalNutrients?.CHOCDF?.quantity,
        protein: nutritionSource.totalNutrients?.PROCNT?.quantity,
        fiber: nutritionSource.totalNutrients?.FIBTG?.quantity,
        sugars: nutritionSource.totalNutrients?.SUGAR?.quantity,
        sodium: nutritionSource.totalNutrients?.NA?.quantity,
        cholesterol: nutritionSource.totalNutrients?.CHOLE?.quantity,
      }
    : null;
  return {
    title: (data.recipeName || "").trim(),
    subtitle: undefined,
    cookTime: data.cookTime,
    cookTemp: data.cookTemp,
    yieldQty: data.yieldQty,
    yieldUnit: data.yieldUnit,
    portionCount: data.portionCount,
    portionUnit: data.portionUnit,
    portionCost: data.portionCost,
    access: data.access || [],
    allergens: data.selectedAllergens || [],
    modifiers: {
      nationality: data.selectedNationality || [],
      courses: data.selectedCourses || [],
      recipeType: data.selectedRecipeType || [],
      prepMethod: data.selectedPrepMethod || [],
      equipment: data.selectedCookingEquipment || [],
    },
    ingredients: trimmed,
    directions: data.directions || "",
    imageDataUrl: data.image || undefined,
    nutrition,
    totals: { fullRecipeCost },
    currency: data.currentCurrency || "USD",
  };
}
export function downloadRecipeJSON(recipe: RecipeExport) {
  const blob = new Blob([JSON.stringify(recipe, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${recipe.title || "recipe"}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
export async function downloadRecipePDF(
  recipe: RecipeExport,
  opts?: { watermarkUrl?: string },
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 40;
  const colLeft = 270;
  const colRight = 612 - margin * 2 - colLeft;
  let y = margin;
  doc.setFont("Times", "bold");
  doc.setFontSize(26);
  doc.text(recipe.title || "RECIPE", margin, y);
  y += 28;
  if (recipe.subtitle) {
    doc.setFont("Times", "italic");
    doc.setFontSize(12);
    doc.text(recipe.subtitle, margin, y, { maxWidth: colLeft - 10 });
    y += 18;
  }
  const imgX = margin + colLeft + 16;
  const imgY = margin - 4;
  const imgW = Math.min(colRight - 20, 260);
  const imgH = imgW * 0.72;
  if (recipe.imageDataUrl) {
    doc.setFillColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(imgX + 4, imgY + 4, imgW, imgH, "F");
    doc.addImage(
      recipe.imageDataUrl,
      "JPEG",
      imgX,
      imgY,
      imgW,
      imgH,
      undefined,
      "FAST",
    );
    doc.rect(imgX, imgY, imgW, imgH);
  }
  const bullet = (label: string, value?: string) => {
    if (!value) return;
    const labelWidth = doc.getTextWidth(`${label}:`);
    doc.setFont("Times", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("Times", "");
    doc.text(` ${value}`, margin + labelWidth, y);
    y += 16;
  };
  doc.setFont("Times", "");
  doc.setFontSize(11);
  bullet("Cook Time", recipe.cookTime);
  bullet("Cook Temp", recipe.cookTemp);
  bullet("Yield", `${recipe.yieldQty ?? ""} ${recipe.yieldUnit ?? ""}`.trim());
  bullet(
    "Portion",
    `${recipe.portionCount ?? ""} ${recipe.portionUnit ?? ""}`.trim(),
  );
  if (typeof recipe.portionCost === "number") {
    bullet(
      "Portion Cost",
      `${currencySymbol(recipe.currency)}${recipe.portionCost.toFixed(2)}`,
    );
  }
  if (recipe.allergens?.length) {
    doc.setTextColor(200, 0, 0);
    bullet("Allergens", recipe.allergens.join(","));
    doc.setTextColor(0, 0, 0);
  }
  y += 6;
  doc.setFont("Times", "bold");
  doc.setFontSize(16);
  doc.text("Ingredients", margin, y);
  y += 12;
  doc.setFont("Times", "");
  doc.setFontSize(11);
  for (const row of recipe.ingredients) {
    const pieces = [
      row.qty?.trim(),
      row.unit?.trim(),
      row.item?.trim(),
      row.prep ? `, ${row.prep.trim()}` : "",
      row.yield ? ` (${row.yield.trim()})` : "",
      row.cost
        ? ` — ${currencySymbol(recipe.currency)}${row.cost.replace(/[$€£¥,\s]/g, "")}`
        : "",
    ].filter(Boolean);
    if (!pieces.length) continue;
    doc.circle(margin - 6, y - 4, 1.5, "F");
    doc.text(pieces.join(""), margin, y, { maxWidth: colLeft - 12 });
    y += 14;
  }
  let yRight = margin + imgH + 18;
  doc.setFont("Times", "bold");
  doc.setFontSize(18);
  doc.text("Directions", imgX, yRight);
  yRight += 16;
  doc.setFont("Times", "");
  doc.setFontSize(12);
  const wrapped = doc.splitTextToSize(recipe.directions || "", colRight - 18);
  for (const line of wrapped) {
    doc.text(line, imgX, yRight);
    yRight += 16;
  }
  const noteStart = yRight + 8;
  const notes: string[] = [];
  if (recipe.modifiers?.prepMethod?.length) {
    notes.push(`Prep: ${recipe.modifiers.prepMethod.join(",")}`);
  }
  if (recipe.modifiers?.equipment?.length) {
    notes.push(`Equipment: ${recipe.modifiers.equipment.join(",")}`);
  }
  if (notes.length) {
    doc.setFont("Times", "bold");
    doc.setFontSize(14);
    doc.text("Chef's Notes", imgX, noteStart);
    doc.setFont("Times", "");
    doc.setFontSize(11);
    doc.text(notes.join(" •"), imgX, noteStart + 14);
  }
  if (opts?.watermarkUrl) {
    try {
      doc.addImage(
        opts.watermarkUrl,
        "PNG",
        160,
        520,
        300,
        180,
        undefined,
        "FAST",
      );
    } catch {
      /* ignore watermark failures */
    }
  }
  if (recipe.nutrition) {
    const baseline = Math.max(y, noteStart + 34);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(margin, baseline, 612 - margin, baseline);
    doc.setFont("Times", "bold");
    doc.setFontSize(14);
    doc.text("Nutrition Facts", margin, baseline + 18);
    doc.setFont("Times", "");
    doc.setFontSize(11);
    const entries: string[] = [];
    const push = (label: string, value: unknown, unit = "") => {
      if (value === undefined || value === null) return;
      const numeric = Number(value);
      entries.push(
        `${label}: ${Number.isFinite(numeric) ? numeric.toFixed(unit ? 1 : 0) : value}${unit}`,
      );
    };
    const n = recipe.nutrition;
    push("Calories", n.calories);
    push("Fat", n.fat, " g");
    push("Carbs", n.carbs, " g");
    push("Protein", n.protein, " g");
    push("Fiber", n.fiber, " g");
    push("Sugars", n.sugars, " g");
    push("Sodium", n.sodium, " mg");
    push("Cholesterol", n.cholesterol, " mg");
    const perRow = 4;
    let col = 0;
    let rowY = baseline + 36;
    const colWidth = (612 - margin * 2) / perRow;
    for (const entry of entries) {
      doc.text(entry, margin + col * colWidth, rowY);
      col += 1;
      if (col === perRow) {
        col = 0;
        rowY += 16;
      }
    }
  }
  doc.setFont("Helvetica", "");
  doc.setFontSize(9);
  doc.text(`Page ${doc.getNumberOfPages()}`, 612 - margin, 792 - 18, {
    align: "right",
  });
  doc.save(`${recipe.title || "recipe"}.pdf`);
}
