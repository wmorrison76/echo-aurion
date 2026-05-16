/**
 * echoEmbeddingService.ts
 * ----------------------------------------------------------------------------
 * Bridges Echo's LLM-driven intents back to concrete PropertyItem records.
 *
 * Two functions:
 *
 *   1. lookupItemsByIds — given a list of itemIds the LLM emitted, fetch
 *      the full PropertyItem snapshots from the property repository.
 *
 *   2. fetchPropertyItemsForGenerate — given event type + dietary
 *      constraints, returns the ~250 most relevant items from the
 *      property's library to send to the model. We pre-filter on the
 *      server side to keep prompt size manageable.
 *
 * "Embedding" in the name nods to the planned future vector-similarity
 * step (semantic search on items). For now we use simpler filters; the
 * function signatures are stable so the implementation can swap in a
 * vector store without affecting callers.
 * ----------------------------------------------------------------------------
 */

import type { PropertyItem } from '../BanquetMenuBuilder.types';
import { propertyItemRepository } from '../data/repositories';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface LightItem {
  id: string;
  name: string;
  dietaryTags?: string[];
  perGuestCost?: number;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Resolve a batch of itemIds to full PropertyItem records, missing-tolerant.
 * Returns a Record so callers can do `byId[id]` lookups without filtering.
 */
export async function lookupItemsByIds(
  ids: string[],
): Promise<Record<string, PropertyItem | undefined>> {
  if (ids.length === 0) return {};

  // Dedupe
  const unique = Array.from(new Set(ids));

  try {
    const items = await propertyItemRepository.getByIds(unique);
    const out: Record<string, PropertyItem | undefined> = {};
    for (const it of items) {
      out[it.id] = it;
    }
    return out;
  } catch (err) {
    console.warn('[echoEmbeddingService] lookupItemsByIds failed', err);
    return {};
  }
}

/**
 * Pre-filter the property's item library down to a manageable shortlist
 * for the generate prompt. Server-side filtering avoids sending the
 * entire catalog through the model.
 */
export async function fetchPropertyItemsForGenerate(args: {
  eventType: string;
  dietaryConstraints: string[];
}): Promise<LightItem[]> {
  try {
    const items = await propertyItemRepository.searchForGenerate({
      eventType: args.eventType,
      dietaryAny: args.dietaryConstraints,
      limit: 250,
    });
    return items.map(toLightItem);
  } catch (err) {
    console.warn('[echoEmbeddingService] fetchPropertyItemsForGenerate failed', err);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Internal
// ----------------------------------------------------------------------------

function toLightItem(item: PropertyItem): LightItem {
  return {
    id: item.id,
    name: item.name,
    dietaryTags: item.dietaryTags,
    perGuestCost: extractPerGuestCost(item),
  };
}

function extractPerGuestCost(item: PropertyItem): number | undefined {
  const c = item.cost;
  if (!c) return undefined;
  if (c.rawFoodCostPerGuest !== undefined) return c.rawFoodCostPerGuest;
  if (
    c.rawFoodCostPerUnit !== undefined &&
    c.portionPerGuest !== undefined
  ) {
    const yieldF = c.yieldFactor ?? 1;
    if (yieldF <= 0) return undefined;
    return (c.rawFoodCostPerUnit / yieldF) * c.portionPerGuest;
  }
  return undefined;
}
