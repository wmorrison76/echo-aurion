/**
 * useDietaryAggregation.ts
 * ----------------------------------------------------------------------------
 * Returns live dietary distribution + gap analysis for the composed menu.
 * Recomputes only when items or eventType changes.
 * ----------------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useCompositionStore, selectAllComposedItems } from './useCompositionStore';
import { analyzeDietary, type DietaryAnalysis } from '../services/dietaryEngine';

export function useDietaryAggregation(): DietaryAnalysis {
  const items = useCompositionStore(selectAllComposedItems);
  const eventType = useCompositionStore((s) => s.meta.eventType);

  return useMemo(() => analyzeDietary(items, eventType), [items, eventType]);
}
