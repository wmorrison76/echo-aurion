import { useMemo } from "react";
import type { IngredientRow } from "@/types/ingredients";
import { parseQuantity } from "@/lib/recipe-scaling";
import {
  getSupplierQuotesForIngredient,
  type SupplierQuote,
} from "@/lib/supplier-pricing";

export type SupplierQuoteMap = Record<string, SupplierQuote[]>;

export function useSupplierQuotes(rows: IngredientRow[]): SupplierQuoteMap {
  return useMemo(() => {
    if (!rows.length) return {};
    const map: SupplierQuoteMap = {};

    rows.forEach((row, index) => {
      if (row.type === "divider") return;
      const key = row.subId ?? `${index}`;
      const qty = parseQuantity(String(row.qty || ""));
      const unit = row.unit?.trim();
      const quotes = getSupplierQuotesForIngredient({
        ingredientName: row.item,
        quantity: Number.isFinite(qty) ? qty : null,
        unit: unit && unit.length ? unit : undefined,
      });
      if (quotes.length > 0) {
        map[key] = quotes;
      }
    });

    return map;
  }, [rows]);
}
