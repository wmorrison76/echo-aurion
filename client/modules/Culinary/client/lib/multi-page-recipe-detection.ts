/**
 * Multi-page Recipe Detection Enhancement
 * Detects recipes that span across multiple pages and merges them intelligently
 * Looks for continuation markers, page breaks, and structural patterns
 */

export interface PageRecipeSegment {
  page: number;
  type: "ingredients" | "instructions" | "continuation" | "unknown";
  content: string;
  confidence: number;
  isContinuation: boolean;
}

export interface MergedRecipe {
  startPage: number;
  endPage: number;
  title: string;
  ingredients: string[];
  instructions: string[];
  fullText: string;
  confidence: number;
}

/**
 * Detect if a page appears to be a continuation of a previous recipe
 */
export function isPageContinuation(
  pageText: string,
  previousPageText: string | null
): boolean {
  const continuationMarkers = [
    /^continue[dr]?s?(?:\s|$)|^continuation/i,
    /^method\s*\(cont(?:inued)?\)/i,
    /^instructions\s*\(cont(?:inued)?\)/i,
    /^see\s+page\s+\d+|^(?:see\s+)?above/i,
    /^(?:continued|cont'?d?\.?)\s+from\s+(?:previous\s+)?page/i,
    /^step\s+\d+\s*:.*continued/i,
  ];

  // Check for explicit continuation markers
  const lines = pageText.split("\n").slice(0, 5);
  for (const line of lines) {
    for (const marker of continuationMarkers) {
      if (marker.test(line)) {
        return true;
      }
    }
  }

  // If previous page ended with "continued", likely continuation
  if (previousPageText) {
    const lastLines = previousPageText.split("\n").slice(-3);
    for (const line of lastLines) {
      if (/continued|cont\.?$|cont\?$/i.test(line)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect the type of content on a page (ingredients, instructions, etc)
 */
export function detectPageContentType(
  pageText: string
): "ingredients" | "instructions" | "mixed" | "other" {
  const lines = pageText.toLowerCase();
  
  const hasIngredientsHeader =
    /\b(?:ingredients?|items?|components?|mise\s+en\s+place)\b/i.test(lines);
  const hasInstructionsHeader =
    /\b(?:instructions?|method|directions?|procedure|steps?|preparation)\b/i.test(
      lines
    );
  const hasInstructionMarkers = /^\d+\.|^[a-z]\)|^\*|\-\s+/m.test(pageText);

  if (hasIngredientsHeader && !hasInstructionsHeader) {
    return "ingredients";
  }
  if (hasInstructionsHeader || hasInstructionMarkers) {
    return "instructions";
  }
  if (hasIngredientsHeader && hasInstructionsHeader) {
    return "mixed";
  }

  return "other";
}

/**
 * Extract ingredient lines from text
 * Uses quantity regex to identify ingredient lines
 */
export function extractIngredients(text: string): string[] {
  const lines = text.split("\n");
  const ingredients: string[] = [];

  // Quantity regex pattern (matches numbers, fractions, cups, tbsp, etc)
  const qtyRegex =
    /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?(?:\s+[a-z]|$)/i;
  const bulletRegex = /^[\s]*[●○▪▫•◦\-*]\s+/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and headers
    if (!line || /^(?:ingredients?|items?|components?)[\s:]*$/i.test(line)) {
      continue;
    }

    // Match quantity patterns or bullet points
    if (qtyRegex.test(line) || bulletRegex.test(line)) {
      const cleaned = line
        .replace(/^[\s]*[●○▪▫•◦\-*]\s+/, "") // Remove bullet
        .replace(/^\d+[\).]\s+/, "") // Remove numbering
        .trim();

      if (cleaned.length > 2 && cleaned.length < 200) {
        ingredients.push(cleaned);
      }
    }
  }

  return ingredients;
}

/**
 * Extract instruction lines from text
 * Uses numbering, bullets, and structural patterns
 */
export function extractInstructions(text: string): string[] {
  const lines = text.split("\n");
  const instructions: string[] = [];

  // Numbered step pattern
  const numberRegex = /^\s*(\d+)[\).]\s+/;
  // Letter step pattern
  const letterRegex = /^\s*([a-z])[\).]\s+/;
  // Bullet pattern
  const bulletRegex = /^[\s]*[●○▪▫•◦\-*]\s+/;

  let inInstructionSection = false;
  let currentInstruction = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and headers temporarily
    if (!trimmed) {
      if (currentInstruction) {
        instructions.push(currentInstruction);
        currentInstruction = "";
      }
      continue;
    }

    if (
      /^(?:instructions?|directions?|method|procedure|steps?|preparation)[\s:]*$/i.test(
        trimmed
      )
    ) {
      inInstructionSection = true;
      continue;
    }

    // Match numbered steps
    const numMatch = trimmed.match(numberRegex);
    if (numMatch) {
      if (currentInstruction) {
        instructions.push(currentInstruction);
      }
      currentInstruction = trimmed.replace(numberRegex, "").trim();
      inInstructionSection = true;
      continue;
    }

    // Match lettered steps
    const letterMatch = trimmed.match(letterRegex);
    if (letterMatch && inInstructionSection) {
      if (currentInstruction) {
        instructions.push(currentInstruction);
      }
      currentInstruction = trimmed.replace(letterRegex, "").trim();
      continue;
    }

    // Match bullet points in instruction section
    if (inInstructionSection && bulletRegex.test(trimmed)) {
      if (currentInstruction) {
        instructions.push(currentInstruction);
      }
      currentInstruction = trimmed.replace(bulletRegex, "").trim();
      continue;
    }

    // Append to current instruction if we're in that section
    if (inInstructionSection && currentInstruction) {
      currentInstruction += " " + trimmed;
    }
  }

  if (currentInstruction) {
    instructions.push(currentInstruction);
  }

  return instructions.filter(
    (inst) => inst.length > 3 && inst.length < 500
  );
}

/**
 * Detect if consecutive pages likely belong to the same recipe
 * Analyzes content flow and structural patterns
 */
export function shouldMergePages(
  currentPageText: string,
  nextPageText: string,
  currentType: string,
  nextType: string
): boolean {
  // If next page is clearly a continuation, merge
  if (isPageContinuation(nextPageText, currentPageText)) {
    return true;
  }

  // If current page has instructions and next starts with instructions, likely same recipe
  if (
    currentType === "instructions" &&
    (nextType === "instructions" || nextType === "mixed")
  ) {
    return true;
  }

  // If current has ingredients and next has instructions (no title), likely same recipe
  if (currentType === "ingredients" && nextType === "instructions") {
    // Make sure there's no clear new recipe title
    const nextLines = nextPageText.split("\n").slice(0, 3);
    const hasNewTitle = nextLines.some(
      (line) =>
        /^[A-Z][A-Za-z0-9\-\'\s]{2,60}$/.test(line.trim()) &&
        !/^(?:ingredients?|instructions?|method|directions?)/i.test(line)
    );
    return !hasNewTitle;
  }

  return false;
}

/**
 * Merge multi-page recipe segments into a single complete recipe
 */
export function mergeRecipeSegments(segments: PageRecipeSegment[]): MergedRecipe | null {
  if (segments.length === 0) return null;

  const startPage = Math.min(...segments.map((s) => s.page));
  const endPage = Math.max(...segments.map((s) => s.page));

  // Find the title (first non-continuation segment with content)
  const titleSegment = segments.find((s) => !s.isContinuation);
  let title = `Recipe from pages ${startPage}-${endPage}`;
  if (titleSegment && titleSegment.content) {
    const firstLine = titleSegment.content.split("\n")[0].trim();
    if (firstLine && firstLine.length > 2 && firstLine.length < 100) {
      title = firstLine;
    }
  }

  // Combine all text and extract ingredients/instructions
  const fullText = segments.map((s) => s.content).join("\n");
  const ingredients = extractIngredients(fullText);
  const instructions = extractInstructions(fullText);

  // Calculate overall confidence
  const avgConfidence =
    segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length;

  return {
    startPage,
    endPage,
    title,
    ingredients,
    instructions,
    fullText,
    confidence: avgConfidence,
  };
}

/**
 * Analyze pages to detect multi-page recipes and return grouped segments
 */
export function detectMultiPageRecipes(
  pageTexts: string[],
  pageNumbers: number[] // Original page numbers
): Array<{
  startPage: number;
  endPage: number;
  pages: number[];
  contentTypes: string[];
}> {
  const groups: Array<{
    startPage: number;
    endPage: number;
    pages: number[];
    contentTypes: string[];
  }> = [];

  let currentGroup = {
    startPage: pageNumbers[0] ?? 1,
    endPage: pageNumbers[0] ?? 1,
    pages: [pageNumbers[0] ?? 1],
    contentTypes: [detectPageContentType(pageTexts[0])],
  };

  for (let i = 1; i < pageTexts.length; i++) {
    const currentType = detectPageContentType(pageTexts[i - 1]);
    const nextType = detectPageContentType(pageTexts[i]);

    if (shouldMergePages(pageTexts[i - 1], pageTexts[i], currentType, nextType)) {
      // Continue the current group
      currentGroup.endPage = pageNumbers[i] ?? pageNumbers[i - 1] + 1;
      currentGroup.pages.push(pageNumbers[i] ?? pageNumbers[i - 1] + 1);
      currentGroup.contentTypes.push(nextType);
    } else {
      // Start a new group
      groups.push(currentGroup);
      currentGroup = {
        startPage: pageNumbers[i] ?? pageNumbers[i - 1] + 1,
        endPage: pageNumbers[i] ?? pageNumbers[i - 1] + 1,
        pages: [pageNumbers[i] ?? pageNumbers[i - 1] + 1],
        contentTypes: [nextType],
      };
    }
  }

  // Don't forget the last group
  groups.push(currentGroup);

  return groups;
}
