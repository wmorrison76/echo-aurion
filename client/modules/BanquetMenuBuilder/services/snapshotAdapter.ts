/**
 * snapshotAdapter.ts
 * ----------------------------------------------------------------------------
 * Flattens Pkg 1's PropertyItem (nested under current.* / provenance.*) into
 * the CanvasSnapshot shape Pkg 3's UI + engines consume. Called once when
 * the user adds an item to the composition.
 *
 * Operational fields (stations / equipment as enums, complexityScore) are
 * left undefined — Pkg 1 ships free-form `equipment: string[]` on
 * ServiceRequirement, not the typed enums Pkg 3 expects. Until PropertyItem
 * gains structured operational data, the operationalEngine returns empty
 * analyses for items with no operationalLoad.
 * ----------------------------------------------------------------------------
 */

import type { CanvasSnapshot, PropertyItem } from '../BanquetMenuBuilder.types';

export function toCanvasSnapshot(item: PropertyItem): CanvasSnapshot {
  const cur = item.current;
  return {
    id: item.itemId,
    name: cur.canonicalName,
    description: cur.descriptions?.short ?? cur.descriptions?.long,
    category: cur.category,
    pricing: cur.pricing,
    costBasis: cur.pricingMetadata?.costBasis,
    dietaryTags: cur.dietary?.tags ?? [],
    networkArchetypeId: item.provenance?.networkArchetypeKey,
    // operationalLoad intentionally omitted — see file header
  };
}
