/**
 * Gate 3 — Allergen Safety. Asserts that every edge case in
 * __fixtures__/allergenEdgeCases.ts produces the expected audit signals
 * and the dietary engine derives the expected gap tags from the items.
 *
 * `audit-yield-aware` always returns 'warning' (a permanent reminder
 * that PropertyItem doesn't carry structured cost yet) and is excluded
 * from "all-passing" assertions.
 */

import { describe, expect, it } from 'vitest';
import { runContinuousAudit } from './continuousAuditService';
import { analyzeDietary } from './dietaryEngine';
import { allergenEdgeCases } from './__fixtures__/allergenEdgeCases';
import type { ComposedItem } from '../hooks/useCompositionStore';

const PERMANENT_REMINDER_IDS = new Set(['audit-yield-aware']);

describe.each(allergenEdgeCases)('Allergen edge case: $name', (testCase) => {
  // Re-derive dietary gaps from the snapshot's items so the audit reads a
  // realistic snapshot.dietaryGaps instead of the empty fixture default.
  const composedItems: ComposedItem[] = testCase.snapshot.sections.flatMap((sec) =>
    sec.items.map((item, idx) => ({
      instanceId: `${sec.id}-${idx}`,
      itemId: item.id,
      itemSnapshot: item,
      order: idx,
    })),
  );
  const dietaryAnalysis = analyzeDietary(composedItems, testCase.snapshot.eventType);
  const enriched = {
    ...testCase.snapshot,
    dietaryGaps: dietaryAnalysis.gaps.map((g) => g.message),
  };

  it('produces the expected audit signal', async () => {
    const result = await runContinuousAudit(enriched);
    const interesting = result.signals.filter(
      (s) => s.status !== 'passing' && !PERMANENT_REMINDER_IDS.has(s.id),
    );

    if (testCase.expect.auditSignal === 'none') {
      expect(interesting, `expected no non-passing signals for "${testCase.name}"`).toEqual([]);
    } else {
      const sig = result.signals.find((s) => s.id === testCase.expect.auditSignal);
      expect(sig, `expected signal "${testCase.expect.auditSignal}" for "${testCase.name}"`).toBeDefined();
      if (testCase.expect.auditStatus) {
        expect(sig?.status).toBe(testCase.expect.auditStatus);
      }
    }
  });

  if (testCase.expect.dietaryGapTag && testCase.expect.dietaryGapTag !== 'none') {
    it(`dietary engine flags tag "${testCase.expect.dietaryGapTag}"`, () => {
      const flaggedTags = dietaryAnalysis.gaps.map((g) => g.tag);
      expect(flaggedTags, `expected dietary gap "${testCase.expect.dietaryGapTag}" for "${testCase.name}"`)
        .toContain(testCase.expect.dietaryGapTag);
    });
  }
});
