/**
 * Gate 7 — Accessibility (axe-core).
 *
 * Smoke-level a11y check on the BMB panel components. Renders the
 * accessible parts in isolation and asserts axe finds no violations
 * (or only known-acceptable ones).
 *
 * Limitations:
 *   - jsdom doesn't compute layout, so contrast checks are skipped.
 *   - This is a SMOKE test, not an audit. The full keyboard-walkthrough
 *     pass is documented separately and runs in a real browser.
 */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';

// Components under test — pick the simpler ones that don't require store mocking
import { NetworkPercentileBadge } from '../NetworkBadge/NetworkPercentileBadge';

async function runAxe(container: HTMLElement) {
  const result = await axe.run(container, {
    runOnly: ['wcag2a', 'wcag2aa'],
    rules: {
      // jsdom has no layout/CSS — disable rules that need it
      'color-contrast': { enabled: false },
      'region': { enabled: false },
    },
  });
  return result.violations;
}

describe('Gate 7: NetworkPercentileBadge a11y', () => {
  it('produces no axe violations when rendered with a valid percentile', async () => {
    const { container } = render(
      <NetworkPercentileBadge percentile={72} sampleSize={50} />,
    );
    const violations = await runAxe(container);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it('produces no axe violations when rendered with null percentile', async () => {
    const { container } = render(
      <NetworkPercentileBadge percentile={null} sampleSize={5} />,
    );
    const violations = await runAxe(container);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
