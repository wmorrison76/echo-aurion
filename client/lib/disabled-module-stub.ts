/**
 * Disabled-module stub.
 *
 * Vendored modules that have unresolved internal imports are aliased to this
 * stub at build time so the production bundle can be produced. The
 * panel-registry should already have its entries for those modules commented
 * out; this stub is a belt-and-braces guard for any other code path that
 * still imports them.
 *
 * When a module is fixed and re-enabled:
 *   1. Remove its alias entry from vite.config.ts
 *   2. Uncomment its panel-registry entry
 *   3. Verify `pnpm build` still succeeds
 */

import React from 'react';

const styles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 240,
  padding: 24,
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  color: '#94a3b8',
  textAlign: 'center',
  fontSize: 13,
  lineHeight: 1.5,
};

const DisabledPanel: React.FC = () =>
  React.createElement(
    'div',
    { style: styles },
    'This module is temporarily unavailable. It is excluded from the current build pending an internal-import cleanup.',
  );

export default DisabledPanel;

export const panel = DisabledPanel;
