/** * Learning system for invoice field extraction * Uses field mappings from page 1 to predict and pre-fill subsequent pages */ import type {
  FieldMapping,
  BoundingBox,
} from "@/lib/invoice-field-mapping";
import type { ApprovalQueueItem } from "@/lib/invoice-deduplication";
export interface PredictedField {
  fieldName: string;
  predictedValue?: string;
  confidence: number;
  source: "mapping" | "ml" | "extraction";
}
export interface PagePredictions {
  pageNumber: number;
  predictions: PredictedField[];
  confidenceScore: number;
} /** * Extract text from a specific region of an image using OCR * (In production, this would call a backend OCR service) */
export async function extractTextFromBoundingBox(
  imageUrl: string,
  boundingBox: BoundingBox,
): Promise<string> {
  // For now, return placeholder // In production, this would: // 1. Get image dimensions // 2. Calculate pixel coordinates from percentages // 3. Call backend OCR service with the cropped region // 4. Return extracted text return `[Region extraction pending - ${boundingBox.x.toFixed(1)}% x ${boundingBox.y.toFixed(1)}%]`;
} /** * Generate predictions for subsequent pages based on page 1 mappings */
export function predictPageFields(
  pageMappings: FieldMapping[],
  pageIndex: number,
  allRawItems: Array<{
    lineNumber?: number;
    productName: string;
    rawText: string;
  }>,
): PagePredictions {
  // Strategy 1: Use spatial location mappings from page 1 const spatialPredictions = pageMappings .filter((m) => m.pageNumber === 0) // Assuming page 1 is index 0 .map((mapping): PredictedField => { // Simple heuristic: similar position on subsequent pages likely has same field // Confidence degrades slightly for each page distance const pageDistance = pageIndex; const confidenceDegradation = Math.max(0.7, 1 - pageDistance * 0.1); return { fieldName: mapping.fieldName, predictedValue: undefined, // Will be filled by extraction confidence: Math.min(0.95, 0.85 * confidenceDegradation), source:"mapping", }; }); // Strategy 2: Extract values from previous page results if available const extractedPredictions: PredictedField[] = []; for (const mapping of pageMappings.filter((m) => m.pageNumber === 0)) { // Look for this field in the raw items const fieldValue = findFieldValueInItems(mapping.fieldName, allRawItems); if (fieldValue) { extractedPredictions.push({ fieldName: mapping.fieldName, predictedValue: fieldValue, confidence: 0.72, source:"extraction", }); } } // Merge predictions, preferring extraction sources const allPredictions = mergePredictor( spatialPredictions, extractedPredictions, ); const avgConfidence = allPredictions.length > 0 ? allPredictions.reduce((sum, p) => sum + p.confidence, 0) / allPredictions.length : 0; return { pageNumber: pageIndex, predictions: allPredictions, confidenceScore: avgConfidence, };
} /** * Merge prediction sources, preferring higher confidence */
function mergePredictor(
  predictions1: PredictedField[],
  predictions2: PredictedField[],
): PredictedField[] {
  const merged: Record<string, PredictedField> = {};
  for (const pred of predictions1) {
    merged[pred.fieldName] = pred;
  }
  for (const pred of predictions2) {
    if (
      !merged[pred.fieldName] ||
      pred.confidence > merged[pred.fieldName].confidence
    ) {
      merged[pred.fieldName] = pred;
    }
  }
  return Object.values(merged);
} /** * Find a field value in raw line items */
function findFieldValueInItems(
  fieldName: string,
  items: Array<{ lineNumber?: number; productName: string; rawText: string }>,
): string | undefined {
  if (!items || items.length === 0) return undefined; // Simple pattern matching for common fields const patterns: Record<string, RegExp[]> = { vendor: [ /^(?:vendor|from|company)[:\s]+([^\n]+)/im, /^([A-Z][a-zA-Z\s&'-]{3,}?)(?:\n|$)/, ], invoiceNumber: [ /invoice\s*(?:#|no\.?|number)[:\s]*([a-z0-9-]+)/im, /order\s*(?:#|no\.?|number)[:\s]*([a-z0-9-]+)/im, ], invoiceDate: [ /(?:invoice|date)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/im, /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/, ], total: [/(?:total|amount)[:\s]*\$?([0-9,.]+)/im], poNumber: [/(?:po|purchase\s+order)[:\s]*([a-z0-9-]+)/im], }; const patternsForField = patterns[fieldName]; if (!patternsForField) return undefined; const searchText = items.map((item) => item.rawText).join("\n"); for (const pattern of patternsForField) { const match = searchText.match(pattern); if (match?.[1]) { return match[1].trim(); } } return undefined;
} /** * Learn from user corrections and update field mappings */
export function learnFromCorrection(
  mappings: FieldMapping[],
  fieldName: string,
  userValue: string,
  extractedValue: string | undefined,
): FieldMapping[] {
  // Boost confidence of mappings that led to correct extraction if (userValue === extractedValue) { return mappings.map((m) => m.fieldName === fieldName ? { ...m, confidence: Math.min(1, (m.confidence || 0.8) + 0.1) } : m, ); } // Reduce confidence if extraction was wrong return mappings.map((m) => m.fieldName === fieldName ? { ...m, confidence: Math.max(0.5, (m.confidence || 0.8) - 0.15) } : m, );
} /** * Calculate field mapping accuracy for vendor */
export function calculateMappingAccuracy(
  mappings: FieldMapping[],
  correctFieldCount: number,
  totalFieldCount: number,
): number {
  if (totalFieldCount === 0) return 0;
  const accuracyPct = (correctFieldCount / totalFieldCount) * 100;
  return Math.round(accuracyPct);
}
