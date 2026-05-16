/**
 * services/templateBindingService.ts
 * ----------------------------------------------------------------------------
 * Applies a MenuTemplate to a property's actual item library, resolving
 * the template's `slot:*` placeholders to real PropertyItem ids that match
 * the slot's intent.
 *
 * Why slot-based templates:
 *   System templates can't reference specific item IDs — every property has
 *   different items. A `slot:plated-entree-meat` placeholder tells the
 *   binder: "find the property's best plated meat entree in the budget
 *   range."
 *
 * Resolution strategy:
 *   1. Parse slot kind from the placeholder
 *   2. Score candidate items by:
 *      - Matching course kind
 *      - Matching dietary tags (when slot specifies one)
 *      - Cost being inside the template's budget band
 *      - Recency of use (favor frequently-used items)
 *   3. Pick the top candidate per slot, allowing duplicates only if the
 *      template repeats the slot
 *
 * The result is a fully-bound CompositionSnapshot the user can apply to
 * the menu via composition.replaceWithGenerated.
 * ----------------------------------------------------------------------------
 */

import type { MenuTemplate, MenuItemId } from '../BanquetMenuBuilder.p5.types';
import type { PropertyItem } from '../BanquetMenuBuilder.types';
import { propertyItemRepository } from '../data/repositories';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface BoundTemplate {
  templateId: string;
  /** Resolved sections with real items */
  sections: Array<{
    id: string;
    kind: string;
    label: string;
    items: PropertyItem[];
    /** Slots that couldn't resolve — chef must manually pick */
    unresolved: Array<{ slot: string; reason: string }>;
  }>;
  /** Budget summary with bound items */
  estimatedPerGuest: number;
  /** Slots that resolved (total) and unresolved (total) */
  bindStats: {
    resolved: number;
    unresolved: number;
  };
}

export interface BindOptions {
  /** Override the template's budget band */
  targetBudgetPerGuest?: number;
  /** Required dietary coverage — filter candidates */
  requiredDietary?: string[];
  /** Disallowed item ids (already used elsewhere, etc.) */
  excludeItemIds?: MenuItemId[];
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export async function bindTemplate(
  template: MenuTemplate,
  options: BindOptions = {},
): Promise<BoundTemplate> {
  const targetBudget =
    options.targetBudgetPerGuest ??
    (template.budgetBand.low + template.budgetBand.high) / 2;

  // Collect candidate items once, score per slot
  const candidates = await loadCandidateItems(template, options);

  const usedIds = new Set<MenuItemId>(options.excludeItemIds ?? []);
  let resolvedCount = 0;
  let unresolvedCount = 0;
  let totalCostPerGuest = 0;

  const sections = template.sections.map((section) => {
    const items: PropertyItem[] = [];
    const unresolved: Array<{ slot: string; reason: string }> = [];

    for (const ref of section.suggestedItemIds) {
      // If it's already a real id (e.g., property template), look it up directly
      if (!ref.startsWith('slot:')) {
        const direct = candidates.find((c) => c.id === ref);
        if (direct) {
          items.push(direct);
          usedIds.add(direct.id);
          resolvedCount++;
          totalCostPerGuest += getPerGuestCost(direct);
        } else {
          unresolved.push({ slot: ref, reason: 'Item not in property library' });
          unresolvedCount++;
        }
        continue;
      }

      const slotKind = ref.slice('slot:'.length);
      const picked = pickBestForSlot({
        slotKind,
        sectionKind: section.kind,
        candidates,
        usedIds,
        targetBudget,
        requiredDietary: options.requiredDietary,
      });

      if (picked) {
        items.push(picked);
        usedIds.add(picked.id);
        resolvedCount++;
        totalCostPerGuest += getPerGuestCost(picked);
      } else {
        unresolved.push({
          slot: ref,
          reason: `No matching item in library for ${slotKind}`,
        });
        unresolvedCount++;
      }
    }

    return {
      id: section.id,
      kind: section.kind,
      label: section.label,
      items,
      unresolved,
    };
  });

  return {
    templateId: template.id,
    sections,
    estimatedPerGuest: totalCostPerGuest,
    bindStats: {
      resolved: resolvedCount,
      unresolved: unresolvedCount,
    },
  };
}

// ----------------------------------------------------------------------------
// Candidate loading
// ----------------------------------------------------------------------------

async function loadCandidateItems(
  template: MenuTemplate,
  options: BindOptions,
): Promise<PropertyItem[]> {
  // Pull a generous shortlist tied to the template's event type
  try {
    const items = await propertyItemRepository.searchForGenerate({
      eventType: template.eventType,
      dietaryAny: options.requiredDietary ?? [],
      limit: 500,
    });
    return items;
  } catch (err) {
    console.warn('[templateBinding] candidate load failed', err);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Slot resolution
// ----------------------------------------------------------------------------

interface PickArgs {
  slotKind: string;
  sectionKind: string;
  candidates: PropertyItem[];
  usedIds: Set<MenuItemId>;
  targetBudget: number;
  requiredDietary?: string[];
}

function pickBestForSlot(args: PickArgs): PropertyItem | null {
  const { slotKind, sectionKind, candidates, usedIds, targetBudget } = args;

  // Score every candidate
  const scored: Array<{ item: PropertyItem; score: number }> = [];
  for (const item of candidates) {
    if (usedIds.has(item.id)) continue;
    const score = scoreCandidate(item, slotKind, sectionKind, targetBudget);
    if (score > 0) scored.push({ item, score });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item;
}

function scoreCandidate(
  item: PropertyItem,
  slotKind: string,
  sectionKind: string,
  targetBudget: number,
): number {
  let score = 0;

  // Course kind matching (most important)
  if (item.courseKind === sectionKind) score += 50;
  else if (slotMatchesCourse(slotKind, item.courseKind)) score += 35;

  // Slot-specific tag matching (e.g. "hot-canape" → tags include 'hot' + 'canape')
  const slotTokens = slotKind.split('-');
  const tagSet = new Set([...(item.tags ?? []), ...(item.dietaryTags ?? [])]);
  for (const tok of slotTokens) {
    if (tagSet.has(tok)) score += 8;
  }

  // Dietary slot matching
  if (slotKind.includes('-veg') || slotKind.includes('vegetarian')) {
    if (item.dietaryTags?.includes('vegetarian')) score += 15;
    else score -= 25; // wrong dietary
  }
  if (slotKind.includes('-fish') || slotKind.includes('seafood')) {
    if (item.tags?.some((t) => ['fish', 'seafood'].includes(t))) score += 15;
  }
  if (slotKind.includes('-meat')) {
    if (item.tags?.some((t) => ['beef', 'lamb', 'pork', 'poultry'].includes(t))) score += 12;
  }

  // Budget alignment — prefer items in target band
  const cost = getPerGuestCost(item);
  if (cost > 0 && targetBudget > 0) {
    const ratio = cost / targetBudget;
    // Sweet spot: 5%-25% of budget per item is reasonable for most slots
    if (ratio >= 0.05 && ratio <= 0.25) score += 15;
    else if (ratio < 0.05) score += 5;
    else if (ratio > 0.4) score -= 20; // unlikely too expensive for a single slot
  }

  // Preference: items with documented descriptions get a small bonus
  if (item.description && item.description.length > 20) score += 3;

  return score;
}

function slotMatchesCourse(slotKind: string, courseKind?: string): boolean {
  if (!courseKind) return false;
  // Loose matching: 'plated-entree-meat' contains 'entree'
  return slotKind.includes(courseKind);
}

function getPerGuestCost(item: PropertyItem): number {
  const c = item.cost;
  if (!c) return 0;
  if (c.rawFoodCostPerGuest !== undefined) return c.rawFoodCostPerGuest;
  if (c.rawFoodCostPerUnit !== undefined && c.portionPerGuest !== undefined) {
    const yieldF = c.yieldFactor ?? 1;
    if (yieldF <= 0) return 0;
    return (c.rawFoodCostPerUnit / yieldF) * c.portionPerGuest;
  }
  return 0;
}
