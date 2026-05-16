/**
 * DietaryDistribution.tsx
 * ----------------------------------------------------------------------------
 * Renders a row of dietary tag chips showing presence + density. Tags
 * with zero items appear muted. Tags with gaps flagged by the engine
 * appear with a warning indicator.
 *
 * The chip itself is informational, not interactive. Filtering by tag
 * happens in the center panel (Package 2's responsibility).
 * ----------------------------------------------------------------------------
 */

import React from 'react';
import type { DietaryAnalysis } from '../../services/dietaryEngine';
import { TAG_LABELS, TAG_SHORT_LABELS } from '../../services/dietaryEngine';
import type { DietaryTag } from '../../BanquetMenuBuilder.types';

interface DietaryDistributionProps {
  analysis: DietaryAnalysis;
}

// Tags shown in the footer — we don't show every possible tag, just the
// ones a chef typically watches during composition.
const DISPLAYED_TAGS: DietaryTag[] = [
  'vegan',
  'vegetarian',
  'gluten_free',
  'dairy_free',
  'nut_free',
];

export const DietaryDistribution: React.FC<DietaryDistributionProps> = ({
  analysis,
}) => {
  const { distribution, gaps } = analysis;

  // Index gaps by tag for quick lookup
  const gapByTag = new Map(gaps.map((g) => [g.tag, g]));

  return (
    <div className="bmb-dietary-dist" aria-label="Dietary distribution">
      {DISPLAYED_TAGS.map((tag) => {
        const count = distribution.counts[tag];
        const present = count > 0;
        const gap = gapByTag.get(tag);

        return (
          <div
            key={tag}
            className={[
              'bmb-dietary-chip',
              present ? 'bmb-dietary-chip--present' : 'bmb-dietary-chip--absent',
              gap ? `bmb-dietary-chip--gap-${gap.severity}` : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-tag={tag}
            title={
              gap
                ? gap.message
                : present
                  ? `${count} ${count === 1 ? 'item' : 'items'} marked ${TAG_LABELS[tag]}`
                  : `No ${TAG_LABELS[tag]} items yet`
            }
          >
            <span className="bmb-dietary-chip__label">{TAG_SHORT_LABELS[tag]}</span>
            <span className="bmb-dietary-chip__count">{count}</span>
            {gap && (
              <span className="bmb-dietary-chip__gap-flag" aria-hidden="true">
                !
              </span>
            )}
          </div>
        );
      })}

      {gaps.length > 0 && (
        <span className="bmb-dietary-dist__gap-count" aria-live="polite">
          {gaps.length} {gaps.length === 1 ? 'gap' : 'gaps'}
        </span>
      )}
    </div>
  );
};
