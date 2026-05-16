/**
 * useMenuComposition.ts
 * ----------------------------------------------------------------------------
 * Adapter hook that flattens the composition store into a CompositionSnapshot
 * — a serializable, denormalized view consumed by Pkg 5 services
 * (workflowService, networkIntelligenceService, publishingService,
 * templateBindingService) and the Pkg 4 Echo services.
 *
 * Why a snapshot:
 *   These services expect a flat structure (sections[].items[]) rather than
 *   the store's normalized layout (sections by id, items by instanceId).
 *   Computing the snapshot once per render is cheaper than every consumer
 *   walking the store independently — and it gives services a single
 *   stable contract.
 * ----------------------------------------------------------------------------
 */

import { useMemo } from 'react';
import {
  useCompositionStore,
  selectOrderedSections,
} from './useCompositionStore';
import { useLivePricing } from './useLivePricing';
import { useDietaryAggregation } from './useDietaryAggregation';
import { useOperationalLoad } from './useOperationalLoad';
import type {
  CanvasSnapshot,
  MenuSectionType,
} from '../BanquetMenuBuilder.types';

export interface CompositionSnapshotSection {
  id: string;
  name: string;
  kind: MenuSectionType;
  order: number;
  items: CanvasSnapshot[];
}

export interface CompositionSnapshot {
  draftId: string | null;
  propertyId: string;
  eventType: string;
  guestCount: number;
  budgetPerGuest: number;
  budgetTotal: number;
  /** Sum of all item per-guest contributions (mirrors LivePricing.perGuestCost) */
  perGuestCost: number;
  /** Sum of all item total contributions */
  totalCost: number;
  /** Aggregated weighted margin across the menu (null if no items have cost) */
  weightedMargin: number | null;
  /** Total composed items across all sections */
  itemCount: number;
  sections: CompositionSnapshotSection[];
  /** Currency code from the composition meta */
  currency: string;
  /** Dietary gap messages (denormalized from useDietaryAggregation for consumers like echoCritiqueService) */
  dietaryGaps: string[];
  /** Stations carrying disproportionate prep load */
  bottleneckStations: string[];
  /** Aggregate kitchen load classification */
  loadLevel: 'light' | 'moderate' | 'heavy' | 'extreme';
  /** Estimated total prep hours */
  estimatedPrepHours: number;
}

/**
 * The hook returns CompositionSnapshot fields directly for plain access,
 * AND exposes a .snapshot() method that returns the same data — Pkg 4
 * services were authored against the .snapshot() shape; Pkg 5 services
 * were authored against the plain shape. Both work.
 */
export interface CompositionView extends CompositionSnapshot {
  snapshot(): CompositionSnapshot;
}

export function useMenuComposition(): CompositionView {
  const sections = useCompositionStore(selectOrderedSections);
  const items = useCompositionStore((s) => s.items);
  const meta = useCompositionStore((s) => s.meta);
  const pricing = useLivePricing();
  const dietary = useDietaryAggregation();
  const operational = useOperationalLoad();

  return useMemo(() => {
    const flatSections: CompositionSnapshotSection[] = sections.map((sec) => ({
      id: sec.id,
      name: sec.name,
      kind: sec.kind,
      order: sec.order,
      items: sec.itemInstanceIds
        .map((id) => items[id])
        .filter((c) => c !== undefined)
        .map((c) => c.itemSnapshot),
    }));

    const itemCount = flatSections.reduce(
      (sum, s) => sum + s.items.length,
      0,
    );

    const snap: CompositionSnapshot = {
      draftId: meta.draftId,
      propertyId: meta.propertyId,
      eventType: meta.eventType,
      guestCount: meta.guestCount,
      budgetPerGuest: meta.budgetPerGuest,
      budgetTotal: meta.budgetTotal,
      perGuestCost: pricing.perGuestCost,
      totalCost: pricing.totalCost,
      weightedMargin: pricing.weightedMargin,
      itemCount,
      sections: flatSections,
      currency: meta.currency,
      dietaryGaps: dietary.gaps.map((g) => g.message),
      bottleneckStations: operational.bottleneckStations,
      loadLevel: operational.loadLevel,
      estimatedPrepHours: operational.estimatedPrepHours,
    };

    return {
      ...snap,
      snapshot() {
        return snap;
      },
    };
  }, [sections, items, meta, pricing, dietary, operational]);
}
