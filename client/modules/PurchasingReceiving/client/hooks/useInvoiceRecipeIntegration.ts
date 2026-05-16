/** * Invoice-Recipe Integration Hook * Loads invoice items as recipe ingredients with pricing history */ import {
  useState,
  useCallback,
  useEffect,
} from "react";
import { useInvoices } from "./useInvoices";
import {
  convertInvoiceLinesToRecipeCatalog,
  detectPricingChanges,
  calculatePriceTrend,
  getPricingHistory,
  savePricingHistory,
  findAffectedRecipes,
} from "@/services/invoice-recipe-integration";
import type {
  RecipeIngredientFromInvoice,
  PricingAlert,
  PriceTrend,
} from "@/services/invoice-recipe-integration";
import type { StandardizedLineItem } from "@shared/api";
interface UseInvoiceRecipeIntegrationOptions {
  outletId: string;
  userId: string;
}
export function useInvoiceRecipeIntegration({
  outletId,
  userId,
}: UseInvoiceRecipeIntegrationOptions) {
  const { invoices } = useInvoices({ outletId, userId });
  const [recipeCatalog, setRecipeCatalog] = useState<StandardizedLineItem[]>(
    [],
  );
  const [pricingAlerts, setPricingAlerts] = useState<PricingAlert[]>([]);
  const [priceTrends, setPriceTrends] = useState<Map<string, PriceTrend>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(false); // Load invoice items as recipe catalog useEffect(() => { setIsLoading(true); try { const catalog: RecipeIngredientFromInvoice[] = []; invoices.forEach((invoice) => { // In a real implementation, we'd fetch line items for each invoice // For now, we'll use the invoice data to construct ingredients }); setRecipeCatalog(catalog); } finally { setIsLoading(false); } }, [invoices]); // Calculate pricing trends const calculateTrends = useCallback((ingredients: string[]) => { const trends = new Map<string, PriceTrend>(); ingredients.forEach((ing) => { const parts = ing.split("|"); if (parts.length === 2) { const [name, vendor] = parts; const trend = calculatePriceTrend(name, vendor); if (trend) { trends.set(`${name}|${vendor}`, trend); } } }); setPriceTrends(trends); }, []); // Detect pricing changes const detectChanges = useCallback( ( recipeId: string, ingredients: Array<{ name: string; vendor: string; price: number }>, ) => { const currentPrices: Record<string, number> = {}; const previousPrices: Record<string, number> = {}; ingredients.forEach((ing) => { const key = `${ing.name}|${ing.vendor}`; currentPrices[key] = ing.price; // Get previous price from history const history = getPricingHistory(); const history_entries = history[key]; if (history_entries && history_entries.length > 0) { previousPrices[key] = history_entries[history_entries.length - 1].price; } }); const alerts = detectPricingChanges(previousPrices, currentPrices); // Save current prices to history ingredients.forEach((ing) => { savePricingHistory(ing.name, ing.vendor, ing.price); }); setPricingAlerts(alerts); return alerts; }, [], ); // Find ingredients by name (for autocomplete) const findIngredients = useCallback( (query: string): StandardizedLineItem[] => { return recipeCatalog.filter( (item) => item.productName.toLowerCase().includes(query.toLowerCase()) || item.vendor.toLowerCase().includes(query.toLowerCase()), ); }, [recipeCatalog], ); // Get ingredient history const getIngredientHistory = useCallback( (ingredientName: string, vendor: string) => { const history = getPricingHistory(); return history[`${ingredientName}|${vendor}`] || []; }, [], ); return { // Recipe catalog from invoices recipeCatalog, isLoading, // Pricing alerts pricingAlerts, detectChanges, // Pricing trends priceTrends, calculateTrends, // Search and lookup findIngredients, getIngredientHistory, };
}
