/**
 * Invoice-Recipe Integration Service
 * Bridges invoice data to recipe costing system with pricing history and alerts
 * Now includes automatic ingredient matching and pricing updates
 */

import type {
  StandardizedLineItem,
  ProductStandardization,
  Tier1Category,
} from "@shared/api";
import type { InvoiceLineItem, GLCodeCategory } from "@shared/types/invoices";
import { autoIngredientMatcher } from "./auto-ingredient-matcher";
import { pricingUpdateService } from "./pricing-update-service";
import {
  extractBarcodesFromText,
  matchBarcodesToLineItems,
} from "../lib/barcode-extractor";
export interface RecipeIngredientFromInvoice extends StandardizedLineItem {
  invoiceId: string;
  glCategory?: GLCodeCategory;
  lastUpdated: string;
}
export interface PricingAlert {
  ingredientName: string;
  vendor: string;
  previousPrice: number;
  currentPrice: number;
  percentageChange: number;
  changeDate: string;
  affectedRecipes: string[];
} /** * Convert invoice line items to recipe catalog format */
export function convertInvoiceLinesToRecipeCatalog(
  invoiceItems: InvoiceLineItem[],
  invoiceId: string,
  glCategory?: GLCodeCategory,
): RecipeIngredientFromInvoice[] {
  return invoiceItems.map((item) => {
    const tier1 = mapGLCategoryToTier1(glCategory);
    return {
      vendor: item.invoice_id ? `Invoice ${item.invoice_id}` : "Unknown",
      productName: item.item_description,
      standardized: {
        standardizedName: item.item_description,
        standardUnit: parseUnit(item.unit_of_measure),
        categories: {
          tier1: tier1 || "Non-Food",
          tier2: undefined,
          tier3: undefined,
        },
      },
      quantityPurchaseUnit: {
        quantity: item.quantity,
        unit: item.unit_of_measure || "each",
        totalStandardUnits: item.quantity,
      },
      totalCost: item.extended_price,
      costPerStandardUnit: item.unit_price,
      date: new Date().toISOString(),
      invoiceNumber: `INV-${invoiceId}`,
      invoiceId,
      glCategory,
      lastUpdated: new Date().toISOString(),
    };
  });
} /** * Map GL code categories to tier 1 food categories */
function mapGLCategoryToTier1(
  glCategory?: GLCodeCategory,
): Tier1Category | null {
  const mapping: Record<GLCodeCategory, Tier1Category> = {
    FOOD: "Produce",
    BEVERAGES: "Beverage",
    NON_FOOD: "Non-Food",
    PAPER_SUPPLIES: "Non-Food",
    EQUIPMENT: "Non-Food",
    MAINTENANCE: "Non-Food",
    UTILITIES: "Non-Food",
    OTHER: "Non-Food",
  };
  return glCategory ? mapping[glCategory] : null;
} /** * Parse unit of measure and normalize to standard unit */
function parseUnit(unit?: string): "oz" | "g" | "lb" | "ml" | "l" | "each" {
  if (!unit) return "each";
  const normalized = unit.toLowerCase().trim();
  if (normalized.includes("oz")) return "oz";
  if (normalized.includes("ml")) return "ml";
  if (normalized.includes("l") && !normalized.includes("lb")) return "l";
  if (normalized.includes("lb") || normalized.includes("lbs")) return "lb";
  if (normalized.includes("g") && !normalized.includes("kg")) return "g";
  return "each";
} /** * Detect pricing changes between invoice items */
export function detectPricingChanges(
  previousInvoices: Record<string, number>,
  currentInvoice: Record<string, number>,
): PricingAlert[] {
  const alerts: PricingAlert[] = [];
  for (const [key, currentPrice] of Object.entries(currentInvoice)) {
    const [ingredientName, vendor] = key.split("|");
    const previousPrice = previousInvoices[key];
    if (previousPrice && previousPrice !== currentPrice) {
      const percentageChange =
        ((currentPrice - previousPrice) / previousPrice) * 100;
      if (Math.abs(percentageChange) > 5) {
        alerts.push({
          ingredientName,
          vendor,
          previousPrice,
          currentPrice,
          percentageChange,
          changeDate: new Date().toISOString(),
          affectedRecipes: [],
        });
      }
    }
  }
  return alerts;
} /** * Find recipes that use affected ingredients */
export function findAffectedRecipes(
  recipes: Array<{ id: string; name: string; ingredients: string[] }>,
  priceAlerts: PricingAlert[],
): PricingAlert[] {
  return priceAlerts.map((alert) => {
    const affected = recipes
      .filter((recipe) =>
        recipe.ingredients.some((ing) =>
          ing.toLowerCase().includes(alert.ingredientName.toLowerCase()),
        ),
      )
      .map((r) => r.name);
    return { ...alert, affectedRecipes: affected };
  });
} /** * Store pricing history for comparison */
const PRICING_HISTORY_KEY = "invoice_pricing_history";
export function savePricingHistory(
  ingredientName: string,
  vendor: string,
  price: number,
): void {
  const history = getPricingHistory();
  const key = `${ingredientName}|${vendor}`;
  if (!history[key]) {
    history[key] = [];
  }
  history[key].push({ price, date: new Date().toISOString() }); // Keep only last 12 entries history[key] = history[key].slice(-12); localStorage.setItem(PRICING_HISTORY_KEY, JSON.stringify(history));
}
export function getPricingHistory(): Record<
  string,
  Array<{ price: number; date: string }>
> {
  const stored = localStorage.getItem(PRICING_HISTORY_KEY);
  return stored ? JSON.parse(stored) : {};
}
export function clearPricingHistory(): void {
  localStorage.removeItem(PRICING_HISTORY_KEY);
} /** * Calculate price trend for an ingredient */
export interface PriceTrend {
  ingredientName: string;
  vendor: string;
  trend: "up" | "down" | "stable";
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  entries: Array<{ price: number; date: string }>;
}
export function calculatePriceTrend(
  ingredientName: string,
  vendor: string,
): PriceTrend | null {
  const history = getPricingHistory();
  const key = `${ingredientName}|${vendor}`;
  const entries = history[key];
  if (!entries || entries.length === 0) {
    return null;
  }
  const prices = entries.map((e) => e.price);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices); // Determine trend let trend:"up" |"down" |"stable" ="stable"; if (entries.length >= 2) { const recent = prices.slice(-3).reduce((a, b) => a + b, 0) / 3; const older = prices.slice(-6, -3).reduce((a, b) => a + b, 0) / 3 || recent; const change = recent - older; if (change > averagePrice * 0.05) { trend ="up"; } else if (change < averagePrice * -0.05) { trend ="down"; } } return { ingredientName, vendor, trend, averagePrice, lowestPrice, highestPrice, entries, };
}
