/**
 * useOperationalLoad.ts
 * ----------------------------------------------------------------------------
 * Returns live operational analysis for the composed menu — station load,
 * prep complexity, equipment needs.
 * ----------------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useCompositionStore, selectAllComposedItems } from './useCompositionStore';
import {
  analyzeOperational,
  type OperationalAnalysis,
} from '../services/operationalEngine';

export function useOperationalLoad(): OperationalAnalysis {
  const items = useCompositionStore(selectAllComposedItems);
  const guestCount = useCompositionStore((s) => s.meta.guestCount);

  return useMemo(
    () => analyzeOperational(items, guestCount),
    [items, guestCount],
  );
}
