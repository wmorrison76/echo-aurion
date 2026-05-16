/** * Invoice Learning Store * Tracks bounding box adjustments and line corrections to improve future extractions */ import { Store } from "./store";
export interface BoundingBoxLocation {
  top: number; // % of image height (0-100) left: number; // % of image width (0-100) height: number; // % of image height width: number; // % of image width
}
export interface LineCorrection {
  lineNumber: number;
  originalText: string;
  correctedProductName: string;
  correctedQuantity?: number;
  correctedUnit?: string;
  correctedPrice?: number;
  boundingBox: BoundingBoxLocation;
  confidence: number;
  confirmedAt: number;
}
export interface InvoiceLearning {
  invoiceId: string;
  vendor: string;
  vendorId?: string;
  corrections: LineCorrection[];
  appliedAt: number;
  createdAt: number;
} // In-memory learning cache (session-based)
const learningCache = new Map<string, InvoiceLearning>(); // Local storage key
const LEARNING_STORAGE_KEY =
  "invoice_learning_v1"; /** * Initialize learning from localStorage */
export function initializeLearning() {
  try {
    const stored = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as InvoiceLearning[];
      data.forEach((learning) => {
        learningCache.set(learning.invoiceId, learning);
      });
    }
  } catch (err) {
    console.warn("Failed to load learning data:", err);
  }
} /** * Record a line correction with bounding box */
export function recordLineCorrection(
  invoiceId: string,
  vendor: string,
  correction: LineCorrection,
) {
  let learning = learningCache.get(invoiceId);
  if (!learning) {
    learning = {
      invoiceId,
      vendor,
      corrections: [],
      appliedAt: 0,
      createdAt: Date.now(),
    };
    learningCache.set(invoiceId, learning);
  } // Update or add correction const idx = learning.corrections.findIndex((c) => c.lineNumber === correction.lineNumber); if (idx >= 0) { learning.corrections[idx] = correction; } else { learning.corrections.push(correction); } // Persist to localStorage persistLearning();
} /** * Get learning data for a vendor * Used to apply previous corrections to current invoice */
export function getVendorLearning(vendor: string): InvoiceLearning[] {
  return Array.from(learningCache.values()).filter(
    (learning) => learning.vendor.toLowerCase() === vendor.toLowerCase(),
  );
} /** * Get bounding box suggestion for a line based on past corrections */
export function suggestBoundingBox(
  vendor: string,
  lineNumber: number,
): BoundingBoxLocation | null {
  const vendorLearnings = getVendorLearning(vendor);
  if (!vendorLearnings.length) return null; // Find corrections for similar line numbers const suggestions: BoundingBoxLocation[] = []; for (const learning of vendorLearnings) { const correction = learning.corrections.find((c) => c.lineNumber === lineNumber); if (correction) { suggestions.push(correction.boundingBox); } } if (!suggestions.length) return null; // Return average bounding box from all similar lines return { top: suggestions.reduce((sum, s) => sum + s.top, 0) / suggestions.length, left: suggestions.reduce((sum, s) => sum + s.left, 0) / suggestions.length, height: suggestions.reduce((sum, s) => sum + s.height, 0) / suggestions.length, width: suggestions.reduce((sum, s) => sum + s.width, 0) / suggestions.length, };
} /** * Get all corrections for an invoice */
export function getInvoiceLearning(invoiceId: string): InvoiceLearning | null {
  return learningCache.get(invoiceId) || null;
} /** * Persist learning to localStorage */
function persistLearning() {
  try {
    const data = Array.from(learningCache.values());
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to persist learning data:", err);
  }
} /** * Clear old learning data (older than 30 days) */
export function clearOldLearning(daysOld: number = 30) {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const toDelete: string[] = [];
  learningCache.forEach((learning, id) => {
    if (learning.createdAt < cutoff) {
      toDelete.push(id);
    }
  });
  toDelete.forEach((id) => learningCache.delete(id));
  persistLearning();
} /** * Get statistics about learning */
export function getLearningStats() {
  const stats = {
    totalInvoices: learningCache.size,
    totalCorrections: 0,
    vendorCount: new Set<string>(),
    avgConfidence: 0,
  };
  let totalConfidence = 0;
  learningCache.forEach((learning) => {
    stats.vendorCount.add(learning.vendor);
    stats.totalCorrections += learning.corrections.length;
    learning.corrections.forEach((c) => {
      totalConfidence += c.confidence;
    });
  });
  if (stats.totalCorrections > 0) {
    stats.avgConfidence = totalConfidence / stats.totalCorrections;
  }
  return { ...stats, vendorCount: stats.vendorCount.size };
}
