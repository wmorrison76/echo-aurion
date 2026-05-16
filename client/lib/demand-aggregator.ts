/**
 * Genesis C — Demand Aggregator (v1)
 * Aggregates ingredient needs across multiple BEOs.
 */

import type {
  DemandSourceRef,
  IngredientNeed,
} from "@/../shared/types/procurement";

import { getProductionSheetsForBeo } from "@/lib/production-store";
import { rollupIngredients } from "@/lib/ingredient-rollup";

export function aggregateIngredientNeedsFromBeos(args: {
  beoIds: string[];
  dueAtISO: string;
  consumerLocationId: string;
}): IngredientNeed[] {
  const { beoIds, dueAtISO, consumerLocationId } = args;

  const uniqueBeoIds = Array.from(new Set(beoIds.filter(Boolean)));

  const allSheets: any[] = [];
  for (const beoId of uniqueBeoIds) {
    const sheets = getProductionSheetsForBeo(beoId) || [];
    allSheets.push(...sheets);
  }

  const rolled = rollupIngredients(allSheets) || [];

  // v1 traceability: BEO-level sources only
  const sources: DemandSourceRef[] = uniqueBeoIds.map((id) => ({
    type: "BEO",
    id,
    name: `BEO ${id}`,
    dueAtISO,
    locationId: consumerLocationId,
  }));

  const needs: IngredientNeed[] = rolled
    .map((row: any) => {
      const ingredientId = String(
        row.ingredientId ?? row.ingredientName ?? row.name ?? "unknown",
      );
      const ingredientName = String(
        row.ingredientName ?? row.name ?? ingredientId,
      );
      const requiredQty = Number(row.requiredQuantity ?? row.requiredQty ?? 0);
      const unit = String(row.unit ?? "ea");

      return {
        ingredientId,
        ingredientName,
        requiredQty,
        unit,
        sources,
      };
    })
    .filter((n) => n.requiredQty > 0);

  // Combine duplicates by ingredientId (sum required, merge sources)
  const map = new Map<string, IngredientNeed>();
  for (const n of needs) {
    const existing = map.get(n.ingredientId);
    if (!existing) {
      map.set(n.ingredientId, { ...n, sources: [...n.sources] });
    } else {
      existing.requiredQty += n.requiredQty;
      const seen = new Set(existing.sources.map((s) => `${s.type}:${s.id}`));
      for (const s of n.sources) {
        const key = `${s.type}:${s.id}`;
        if (!seen.has(key)) {
          existing.sources.push(s);
          seen.add(key);
        }
      }
    }
  }

  return Array.from(map.values()).filter((n) => n.requiredQty > 0);
}
