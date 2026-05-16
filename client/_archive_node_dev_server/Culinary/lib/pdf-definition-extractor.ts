/** * PDF Definition Extractor * Implements the Python scanner's glossary extraction logic in TypeScript * Extracts culinary terms and definitions from cookbook PDFs */ interface ExtractedDefinition {
  term: string;
  slug: string;
  letter: string;
  definition: string;
  categories: string[];
  aliases: string[];
  source_work: string;
  source_page?: number;
}
const INGREDIENT_KEYWORDS = [
  "herb",
  "spice",
  "salt",
  "pepper",
  "flour",
  "fat",
  "oil",
  "vinegar",
  "cheese",
  "meat",
  "fish",
  "shellfish",
  "bean",
  "grain",
  "rice",
  "fruit",
  "vegetable",
  "nut",
  "seed",
  "sugar",
  "honey",
  "chile",
  "mushroom",
  "wine",
  "butter",
  "cream",
  "egg",
  "milk",
  "juice",
  "extract",
  "essence",
  "zest",
  "peel",
  "rind",
  "curd",
  "whey",
  "stock",
  "broth",
  "jus",
  "reduction",
  "sauce",
  "paste",
  "puree",
  "gelatin",
  "agar",
  "pectin",
  "starch",
  "yeast",
  "baking powder",
  "chocolate",
  "cocoa",
  "vanilla",
  "almond",
  "sesame",
  "soy",
  "miso",
  "koji",
  "fermented",
  "cured",
  "smoked",
  "dried",
];
const TECHNIQUE_KEYWORDS = [
  "method",
  "technique",
  "process",
  "to cook",
  "to bake",
  "to roast",
  "cooked by",
  "to simmer",
  "to braise",
  "to poach",
  "to sauté",
  "to fry",
  "to grill",
  "to steam",
  "to blanch",
  "to shock",
  "to reduce",
  "to deglaze",
  "to glaze",
  "to caramelize",
  "used to thicken",
  "emulsion",
  "whipped",
  "folded",
  "fermented",
  "ferment",
  "knead",
  "proof",
  "temper",
  "bloom",
  "crystallize",
  "laminate",
  "score",
  "sear",
  "cure",
  "smoke",
  "pickle",
  "brine",
  "marinate",
  "infuse",
  "clarify",
  "strain",
  "sift",
  "cream",
  "whisk",
  "beat",
  "chop",
  "mince",
  "dice",
  "slice",
  "julienne",
  "brunoise",
  "chiffonade",
  "blanch",
  "shock",
  "deglaze",
  "flambé",
  "fold",
  "mount",
  "spherify",
  "gel",
  "foam",
  "dust",
  "air",
  "sous vide",
  "moderate",
  "rest",
  "set",
  "cure",
];
const EQUIPMENT_KEYWORDS = [
  "pan",
  "skillet",
  "pot",
  "mold",
  "mould",
  "mixer",
  "knife",
  "grill",
  "baking sheet",
  "baking stone",
  "tongs",
  "spatula",
  "whisk",
  "oven",
  "tandoor",
  "griddle",
  "scale",
  "thermometer",
];
const PASTRY_KEYWORDS = [
  "dough",
  "pastry",
  "cream",
  "custard",
  "icing",
  "frosting",
  "batter",
  "sponge",
  "meringue",
  "ganache",
  "laminated",
  "crust",
  "crumb",
];
const BREAD_KEYWORDS = [
  "bread",
  "dough",
  "yeast",
  "fermentation",
  "gluten",
  "crumb",
  "crust",
  "proofing",
  "rise",
];
const WINE_KEYWORDS = [
  "wine",
  "grape",
  "varietal",
  "vineyard",
  "appellation",
  "fortified",
  "liqueur",
  "spirit",
  "beer",
  "ale",
  "lager",
  "cider",
];
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function firstLetter(str: string): string {
  for (const char of str) {
    if (/[a-zA-Z]/.test(char)) {
      return char.toUpperCase();
    }
  }
  return "#";
}
function classifyGlossaryEntry(term: string, definition: string): string[] {
  const text = (term + "" + definition).toLowerCase();
  const categories: string[] = [];
  const containsAny = (keywords: string[]) =>
    keywords.some((k) => text.includes(k));
  if (containsAny(INGREDIENT_KEYWORDS)) categories.push("ingredient");
  if (containsAny(TECHNIQUE_KEYWORDS)) categories.push("technique");
  if (containsAny(EQUIPMENT_KEYWORDS)) categories.push("equipment");
  if (containsAny(WINE_KEYWORDS)) categories.push("wine/beverage");
  if (containsAny(PASTRY_KEYWORDS)) categories.push("pastry/baking");
  if (containsAny(BREAD_KEYWORDS)) categories.push("bread");
  return categories.length > 0 ? categories : ["general"];
}
function extractGlossaryEntries(text: string): Array<[string, string]> {
  const lines = text.split("\n");
  const entries: Array<[string, string]> = [];
  const culinaryTermsMap = new Map<string, string[]>(); // More flexible patterns for glossary entries const inlinePatterns = [ //"Term Definition" (2+ spaces) /^([A-Z][A-Za-z0-9''()\-/\s]+?)\s{2,}(.+)$/, //"Term: Definition" or"Term — Definition" or"Term - Definition" /^([A-Z][A-Za-z0-9''()\-/\s]+?)\s*[:—\-]\s+(.+)$/, //"TERM Definition" (capitalized term followed by lowercase definition) /^([A-Z][A-Z\s]+?)\s+([a-z].+)$/, //"term definition" (for lowercase dictionary entries) /^([a-z][a-z0-9''()\-/\s]+?)\s{1,}([A-Z].+)$/, // Term with parenthetical:"Term (description) definition" /^([A-Z][A-Za-z0-9''()\-/\s]+?)\s+\(([^)]+)\)\s+(.+)$/, ]; // First pass: Look for explicit glossary entries for (let i = 0; i < lines.length; i++) { let line = lines[i].trim(); if (!line || line.length < 5) continue; let matchedInline = false; // Try standard patterns first for (const pattern of inlinePatterns) { const m = line.match(pattern); if (m) { let term = ''; let definition = ''; if (m.length === 3) { // Patterns with 2 capture groups term = m[1].trim(); definition = m[2].trim(); } else if (m.length === 4) { // Pattern with parenthetical (4 groups) term = m[1].trim(); definition = `${m[2].trim()} - ${m[3].trim()}`; } if (term.length > 2 && term.length < 150 && definition.length > 10) { entries.push([term, definition]); matchedInline = true; break; } } } if (matchedInline) continue; // Looser pattern: Term on one line, definition on next // Look for a line that starts with capital letter and is relatively short if (/^[A-Z][A-Za-z0-9''()\-/\s]*$/.test(line) && line.length < 100) { if (i + 1 < lines.length) { const nextLine = lines[i + 1].trim(); // Definition should start with lowercase or number (or common words) if (nextLine && /^[a-z0-9the(]/.test(nextLine) && nextLine.length > 10) { entries.push([line, nextLine]); } } } // Also try if definition is on following lines combined if (/^[A-Z][A-Za-z0-9''()\-/\s]*$/.test(line) && line.length < 80) { let definition = ''; let j = i + 1; while (j < lines.length && j <= i + 3) { const defLine = lines[j].trim(); if (!defLine) break; // Stop if we hit another potential term (capital letter at start) if (/^[A-Z][A-Za-z0-9''()\-/\s]*$/.test(defLine) && j > i + 1) break; definition += (definition ? ' ' : '') + defLine; j++; } if (definition.length > 15) { entries.push([line, definition]); } } } // Second pass: Extract common culinary terms from paragraphs const paragraphs = text.split(/\n{2,}/); const commonCulinaryTerms = ["mise en place","bain marie","roux","ganache","emulsion","caramelize","temper chocolate","fold","simmer","whisk","sear","poach","blanch","reduce","deglaze","knead","proof","laminate","macaronage","pate a choux","sabayon","custard","meringue","pate sucree","pate brisee","frangipane","creme anglaise","streusel","simple syrup","brioche","croissant","puff pastry","shortbread","choux","genoise","sponge cake","buttercream","fondant","glaze","coulis","mousse","terrine","consomme","jus","demi-glace","veloute","bechamel","hollandaise","bearnaise","vinaigrette","brunoise","julienne","chiffonade","mirepoix","sachet","bouquet garni","beurre blanc","beurre noir","gastrique","fond","stock","broth","sauce","gravy","relish","compote","jam","preserve","pickle","infusion","reduction","glaze","marinade","brine","cure","smoke","sous vide","spherification","gel","foam","dust","air","spray","tempering","crystallization","fermentation","koji","miso","umami","savory","herbs","spices","seasoning","condiment" ]; for (const paragraph of paragraphs) { const trimmed = paragraph.trim(); if (trimmed.length < 30) continue; // Look for culinary terms with explanatory context for (const term of commonCulinaryTerms) { const termRegex = new RegExp(`\\b${term.replace(/\s+/g, '\\s+')}\\b`,"gi"); const matches = trimmed.match(termRegex); if (matches && matches.length > 0) { const sentences = trimmed.split(/[.!?]+/); for (const sentence of sentences) { if (new RegExp(`\\b${term.replace(/\s+/g, '\\s+')}\\b`,"i").test(sentence)) { // Get a reasonable context window const match = sentence.match( new RegExp(`(.{0,150}\\b${term.replace(/\s+/g, '\\s+')}\\b.{0,150})`,"i"), ); if (match && match[1]) { const context = match[1].trim(); if (context.length > term.length + 20) { if (!culinaryTermsMap.has(term)) { culinaryTermsMap.set(term, []); } culinaryTermsMap.get(term)!.push(context); } } } } } } } // Add extracted culinary terms with their context as"definitions" for (const [term, contexts] of culinaryTermsMap) { if (contexts.length > 0) { const definition = contexts[0] .replace(new RegExp(`\\b${term.replace(/\s+/g, '\\s+')}\\b`,"i"), `"${term}"`) .substring(0, 200); if (definition.length > 20) { entries.push([term, definition]); } } } // Deduplicate const seen = new Set<string>(); const unique: Array<[string, string]> = []; for (const [term, definition] of entries) { const key = `${term.toLowerCase()}|${definition.toLowerCase().substring(0, 50)}`; if (!seen.has(key)) { seen.add(key); unique.push([term, definition]); } } return unique;
} /** * Extract all definitions from PDF text (main entry point) */
export function extractDefinitionsFromPdfText(
  text: string,
  sourceName: string = "Imported Cookbook",
): ExtractedDefinition[] {
  // Clean text text = text.replace(/\r/g,""); text = text.replace(/-\n/g,""); text = text.replace(/\n{3,}/g,"\n\n"); text = text.replace(/\n(?=[a-z])/g,""); text = text.replace(/[^\x09-\x0d\x20-\x7e]/g,""); // Extract glossary entries const entries = extractGlossaryEntries(text); // Filter out common false positives but be lenient for culinary content // We specifically want to include pastry, baking, and culinary terms const filterPatterns = [ // Navigation and metadata - but not culinary terms /^(page|contents|index|glossary|appendix|chapter|figure|table|photo|illustration)/i, /^(scan to download|visit us online|qr code)/i, // Technical specs that aren't culinary /(flexipan|inch|inches|cm|diameter|copyright|isbn|published)/i, // Only exclude"recipe" if it's the whole entry, not technique recipes /^recipe\s*[:—\-]?\s*[a-z]*\s*(serves|ingredients|instructions)$/i, /^(serves|yields?|portions?|prep time|cook time|baking time|oven temp)\s*[:—]/i, ]; const definitions = entries .filter(([term, definition]) => { // Skip very short terms if (term.length < 2) return false; // Allow longer terms for multi-word culinary terms if (term.length > 150) return false; // Skip common false positives for (const pattern of filterPatterns) { if (pattern.test(term)) return false; } // Skip if definition is too short if (definition.length < 10) return false; // Skip entries that look like page numbers or table of contents if (/^\d+$/.test(term)) return false; if (/^(table of contents|index|chapter \d+)/i.test(term)) return false; // Skip if term is mostly numbers if ((term.match(/\d/g) || []).length / term.length > 0.5) return false; return true; }) .map(([term, definition]) => { const categories = classifyGlossaryEntry(term, definition); return { term, slug: slugify(term), letter: firstLetter(term), definition, categories, aliases: [], source_work: sourceName, }; }) .slice(0, 500); // Limit to prevent overload return definitions;
} /** * Format definitions for Builder.io upload */
export function formatDefinitionsForBuilder(
  definitions: ExtractedDefinition[],
): Array<{
  term: string;
  slug: string;
  letter: string;
  definition: string;
  categories: string[];
  aliases: string[];
  source_work: string;
  source_page?: number;
  status: string;
}> {
  return definitions.map((def) => ({
    ...def,
    status: "auto-imported",
    updated_at: new Date().toISOString(),
  }));
}
