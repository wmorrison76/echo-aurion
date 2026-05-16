import { CulinaryProcedure } from "./echo-procedures-service";

export interface ExtractedProcedure {
  title: string;
  category: CulinaryProcedure["category"];
  steps: Array<{
    number: number;
    instruction: string;
    tips?: string;
  }>;
  materials?: string[];
  tools?: string[];
  time_estimate?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  related_keywords?: string[];
}

/**
 * Categorize text content to determine if it contains culinary procedures
 */
export function categorizeProcedureContent(
  text: string,
): CulinaryProcedure["category"] {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("debone") ||
    lowerText.includes("butcher") ||
    lowerText.includes("primals") ||
    lowerText.includes("sub-primal") ||
    lowerText.includes("fabrication") ||
    lowerText.includes("breakdown") ||
    lowerText.includes("boning knife")
  ) {
    return "butchery";
  }

  if (
    lowerText.includes("dough") ||
    lowerText.includes("pastry") ||
    lowerText.includes("proof") ||
    lowerText.includes("laminate") ||
    lowerText.includes("temper") ||
    lowerText.includes("crumb")
  ) {
    return "pastry";
  }

  if (
    lowerText.includes("simmer") ||
    lowerText.includes("sauté") ||
    lowerText.includes("braise") ||
    lowerText.includes("roast") ||
    lowerText.includes("grill") ||
    lowerText.includes("fry")
  ) {
    return "cooking";
  }

  if (
    lowerText.includes("chop") ||
    lowerText.includes("mince") ||
    lowerText.includes("dice") ||
    lowerText.includes("julienne") ||
    lowerText.includes("brunoise") ||
    lowerText.includes("mise en place")
  ) {
    return "preparation";
  }

  if (
    lowerText.includes("technique") ||
    lowerText.includes("method") ||
    lowerText.includes("process")
  ) {
    return "technique";
  }

  return "general";
}

/**
 * Extract procedure steps from text using pattern matching
 * Looks for numbered lists, bullet points, and step indicators
 */
export function extractProcedureSteps(text: string): Array<{
  number: number;
  instruction: string;
  tips?: string;
}> {
  const steps: Array<{
    number: number;
    instruction: string;
    tips?: string;
  }> = [];

  // Split by common step indicators
  const stepPatterns = [
    /^\s*(?:step|step\s+\d+|\d+\.|\d+\)|[-•]\s+)/im,
    /^\s*(?:then|next|finally|meanwhile)/im,
  ];

  const lines = text.split("\n").filter((line) => line.trim());
  let currentStep: {
    number: number;
    instruction: string;
    tips?: string;
  } | null = null;

  for (const line of lines) {
    // Check if this line starts a new step
    const isNewStep = stepPatterns.some((pattern) => pattern.test(line));

    if (isNewStep) {
      // Save previous step
      if (currentStep) {
        steps.push(currentStep);
      }

      // Extract step number from text
      const numberMatch = line.match(/\d+/);
      const stepNumber = numberMatch
        ? parseInt(numberMatch[0])
        : steps.length + 1;

      // Clean instruction text
      const instruction = line
        .replace(/^step\s+\d+[\s:.]*/i, "")
        .replace(/^\d+[\\.)\s]*/i, "")
        .replace(/^[-•]\s*/i, "")
        .trim();

      currentStep = {
        number: stepNumber,
        instruction,
      };
    } else if (currentStep && (line.includes("tip") || line.includes("note"))) {
      // Attach tip to current step
      const tip = line.replace(/^(?:tip|note|note:|tip:)\s*/i, "").trim();
      currentStep.tips = tip;
    }
  }

  // Don't forget the last step
  if (currentStep) {
    steps.push(currentStep);
  }

  return steps.length > 0
    ? steps
    : [
        {
          number: 1,
          instruction: text.slice(0, 500).trim(),
        },
      ];
}

/**
 * Extract materials/tools from text
 */
export function extractMaterials(text: string): string[] {
  const materials: Set<string> = new Set();

  // Look for common material indicators
  const materialPattern =
    /(?:ingredients?|materials?|you will need|requires?)[\s:]*([^\n]+)/gi;
  let match;

  while ((match = materialPattern.exec(text)) !== null) {
    const items = match[1]
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    items.forEach((item) => materials.add(item));
  }

  return Array.from(materials).slice(0, 10);
}

/**
 * Extract tools from text
 */
export function extractTools(text: string): string[] {
  const tools: Set<string> = new Set();
  const toolKeywords = [
    "knife",
    "saw",
    "hook",
    "board",
    "tray",
    "pan",
    "pot",
    "utensil",
    "shears",
    "tongs",
    "spatula",
    "whisk",
    "scale",
    "thermometer",
    "grater",
    "peeler",
    "cutter",
  ];

  const lowerText = text.toLowerCase();
  for (const keyword of toolKeywords) {
    if (lowerText.includes(keyword)) {
      // Try to find the full tool name (e.g., "boning knife" not just "knife")
      const toolPattern = new RegExp(`[\\w\\s]*${keyword}[\\w\\s]*`, "i");
      const match = text.match(toolPattern);
      if (match) {
        tools.add(match[0].trim());
      }
    }
  }

  return Array.from(tools);
}

/**
 * Extract time estimate from text
 */
export function extractTimeEstimate(text: string): string | undefined {
  const timePattern =
    /(?:takes?|requires?|about|approximately|roughly)?\s*(\d+[-–]?\d*)\s*(?:minutes?|hours?|mins?|hrs?)/i;
  const match = text.match(timePattern);
  return match ? match[0].trim() : undefined;
}

/**
 * Determine difficulty level from text
 */
export function extractDifficulty(
  text: string,
): "beginner" | "intermediate" | "advanced" | undefined {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("advanced") ||
    lowerText.includes("expert") ||
    lowerText.includes("professional")
  ) {
    return "advanced";
  }

  if (
    lowerText.includes("intermediate") ||
    lowerText.includes("intermediate") ||
    lowerText.includes("moderate")
  ) {
    return "intermediate";
  }

  if (
    lowerText.includes("beginner") ||
    lowerText.includes("simple") ||
    lowerText.includes("easy") ||
    lowerText.includes("basic")
  ) {
    return "beginner";
  }

  return undefined;
}

/**
 * Extract related keywords from text
 */
export function extractKeywords(text: string): string[] {
  const keywords: Set<string> = new Set();

  // Extract capitalized terms (likely important concepts)
  const capPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
  const matches = text.match(capPattern) || [];

  matches.forEach((match) => {
    if (match.length > 3) {
      keywords.add(match.toLowerCase());
    }
  });

  return Array.from(keywords).slice(0, 15);
}

/**
 * Parse a section of text and extract a procedure
 */
export function extractProcedure(
  text: string,
  title: string,
): ExtractedProcedure | null {
  if (!text || text.trim().length < 50) {
    return null;
  }

  const steps = extractProcedureSteps(text);
  if (steps.length === 0) {
    return null;
  }

  return {
    title: title.trim(),
    category: categorizeProcedureContent(text),
    steps,
    materials: extractMaterials(text),
    tools: extractTools(text),
    time_estimate: extractTimeEstimate(text),
    difficulty: extractDifficulty(text),
    related_keywords: extractKeywords(text),
  };
}

/**
 * Identify procedures in a larger text (e.g., PDF page text)
 * Looks for section headers followed by step-by-step instructions
 */
export function identifyProcedures(fullText: string): ExtractedProcedure[] {
  const procedures: ExtractedProcedure[] = [];

  // Split by major headings (H1, H2 style)
  const sections = fullText.split(/\n(?=\s*[A-Z][A-Za-z\s]{5,}(?:\n|$))/);

  for (const section of sections) {
    const lines = section.split("\n");
    const firstLine = lines[0]?.trim() || "";

    // Check if section looks like a procedure
    if (firstLine.length > 5 && firstLine.length < 150) {
      const procedure = extractProcedure(section, firstLine);
      if (procedure) {
        procedures.push(procedure);
      }
    }
  }

  return procedures;
}
