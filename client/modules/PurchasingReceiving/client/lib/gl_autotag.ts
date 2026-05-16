import glRules from "../data/resort_gl_rules.json";
export type PropertyType = "restaurant" | "hotel" | "resort" | "casino";
export interface GLMapping {
  code: string;
  label: string;
  category: string;
  subCategory: string;
  confidence: number;
  matchedKeywords?: string[];
}
export interface GLRule {
  code: string;
  label: string;
  category: string;
  sub_category: string;
  property_types: PropertyType[];
  keywords: string[];
  patterns?: string[];
} /** * Map invoice text/vendor/line item to GL code * Searches rules based on property type, keywords, and regex patterns */
export function mapInvoiceLineToGL(
  textBlob: string,
  propertyType: PropertyType = "resort",
  vendorName?: string,
): GLMapping {
  const textLower = textBlob.toLowerCase();
  const vendorLower = vendorName?.toLowerCase() ?? "";
  const fullText = `${textLower} ${vendorLower}`; // 1. Try regex patterns first (most specific) for (const rule of glRules.rules as GLRule[]) { if (!rule.property_types.includes(propertyType)) continue; if (rule.patterns && rule.patterns.length > 0) { for (const patternStr of rule.patterns) { try { const regex = new RegExp(patternStr,"i"); if (regex.test(fullText)) { return { code: rule.code, label: rule.label, category: rule.category, subCategory: rule.sub_category, confidence: 0.95, matchedKeywords: [patternStr], }; } } catch (e) { console.warn(`Invalid regex pattern: ${patternStr}`, e); } } } } // 2. Try keyword matching (highest-priority keywords first) const rulesByKeywordCount = (glRules.rules as GLRule[]) .filter((rule) => rule.property_types.includes(propertyType)) .map((rule) => { const matchedKeywords = rule.keywords.filter((k) => fullText.includes(k.toLowerCase()) ); return { rule, matchedCount: matchedKeywords.length, matchedKeywords }; }) .filter((item) => item.matchedCount > 0) .sort((a, b) => b.matchedCount - a.matchedCount); if (rulesByKeywordCount.length > 0) { const best = rulesByKeywordCount[0]; return { code: best.rule.code, label: best.rule.label, category: best.rule.category, subCategory: best.rule.sub_category, confidence: Math.min(0.95, 0.5 + best.matchedCount * 0.15), matchedKeywords: best.matchedKeywords, }; } // 3. Heuristic fallback for common invoice types if (textLower.includes("payroll") || textLower.includes("wage") || textLower.includes("salary")) { return { code:"5301", label:"Kitchen Labor", category:"LABOR", subCategory:"Back of House", confidence: 0.4, }; } if (textLower.includes("electric") || textLower.includes("water") || textLower.includes("gas")) { return { code:"5600", label:"Utilities", category:"OPEX", subCategory:"Utilities", confidence: 0.4, }; } if (textLower.includes("rent") || textLower.includes("lease")) { return { code:"5700", label:"Occupancy Costs", category:"OPEX", subCategory:"Occupancy", confidence: 0.4, }; } if (textLower.includes("insurance")) { return { code:"5800", label:"Insurance", category:"OPEX", subCategory:"Insurance", confidence: 0.4, }; } if (textLower.includes("repair") || textLower.includes("maintenance") || textLower.includes("service")) { return { code:"5500", label:"Repairs & Maintenance", category:"OPEX", subCategory:"R&M", confidence: 0.4, }; } // 4. Default unmapped return { code:"9999", label:"UNMAPPED - Requires Manual Review", category:"UNKNOWN", subCategory:"Uncategorized", confidence: 0, };
} /** * Batch map multiple invoice lines to GL codes */
export function mapInvoiceLinestoGL(
  lines: Array<{
    productName?: string;
    description?: string;
    vendorName?: string;
  }>,
  propertyType: PropertyType = "resort",
): GLMapping[] {
  return lines.map((line) => {
    const textBlob = [line.productName, line.description]
      .filter(Boolean)
      .join("");
    return mapInvoiceLineToGL(textBlob, propertyType, line.vendorName);
  });
} /** * Get all GL rules for a property type (for reference/UI) */
export function getGLRulesForProperty(propertyType: PropertyType): GLRule[] {
  return (glRules.rules as GLRule[]).filter((rule) =>
    rule.property_types.includes(propertyType),
  );
} /** * Get GL rule by code */
export function getGLRuleByCode(code: string): GLRule | undefined {
  return (glRules.rules as GLRule[]).find((rule) => rule.code === code);
} /** * Get all unique GL categories */
export function getAllGLCategories(): string[] {
  const categories = new Set<string>();
  for (const rule of glRules.rules as GLRule[]) {
    categories.add(rule.category);
  }
  return Array.from(categories).sort();
}
