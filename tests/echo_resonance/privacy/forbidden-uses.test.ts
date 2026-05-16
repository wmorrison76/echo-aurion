/**
 * ===========================================================================
 * TENET enforcement — forbidden uses (Tenet 3 isolation)
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   IMPLEMENTED (Tenet 3 isolation enforced; Tenet 4/7 todos remain
 *           pending Phase 1.4 routes + signal-decay cron wiring)
 * Phase:    1
 *
 * Purpose:  NON-NEGOTIABLE static-analysis tests. Tenet 3 says tone informs
 *           CARE, not COMMERCE. This file proves it: it scans every source
 *           file under known commerce paths (pricing, sales, marketing,
 *           revenue, upsell, billing) and fails the build if any of them
 *           imports a resonance / signal-graph / affect helper module.
 *
 *           If a commerce module ever needs guest care info, the architecture
 *           requires it to receive ABSTRACTED signals via a vetted bridge —
 *           never raw resonance scores or affect coordinates.
 *
 * Failure mode:
 *   When this test fails, do NOT add an exception. Read the violating import,
 *   then either (a) move the calling file out of the commerce path, or (b)
 *   re-route through an explicit, vetted abstraction layer that the privacy
 *   spine has approved. Tenet 3 does not bend.
 *
 * Forbidden import patterns (substring matches against the import specifier):
 *   - server/services/echo-ai3/resonance/    — the engines (resonance, trajectory, intervention, fast, deep, cascade-bridge, forecast)
 *   - server/services/signals/                — the signal graph write/read paths
 *   - client/lib/resonance/                   — the client score / quadrant helpers
 *   - shared/types/resonance/                 — affect/reading/score type contracts (commerce
 *                                               must not even know the type shape)
 *   - shared/types/signals/                   — Signal carries SignalTag[] and
 *                                               sensitivity='emotional'; commerce
 *                                               importing it sees tone-tagged data
 *
 * Note on resonance type files: every file under shared/types/resonance/ is
 * tone-bearing. intervention.ts has affectQuadrants and pre/postReading;
 * trajectory.ts exposes entryScore/currentScore/liftGap; forecast.ts is
 * affect by design. Coarse-block-the-whole-dir is the correct call.
 *
 * Statement forms detected:
 *   - import ... from '...'  /  import ... from "..."
 *   - bare side-effect imports:  import '...'
 *   - dynamic import('...')  with single, double, OR backtick quotes
 *   - require('...')
 *   - export ... from '...'  (re-export pass-through — barrel file evasion)
 *
 * Hardening: import specifiers are Unicode-escape-decoded before the
 * substring check so '/server/services/...' cannot evade.
 *
 * Known limitations (require AST analysis to close):
 *   - Runtime-computed paths (string concatenation, variable interpolation
 *     inside backticks). A determined evader writing
 *     `await import('a' + 'b' + 'c')` cannot be caught by static scan.
 *     The architectural answer is: don't tolerate dynamic imports of
 *     internal modules in commerce code; lint at the route/build layer.
 *   - Imports inside block comments are flagged as violations. False
 *     positive in exchange for never missing a real import.
 *
 * Commerce paths scanned (top-level dirs that are unambiguously commerce —
 * see COMMERCE_DIRS_RELATIVE constant for the canonical list):
 *
 *     client/modules/RevenueOps
 *     client/modules/DynamicPricing
 *     client/modules/RevenueIntelligence
 *     client/modules/Schedule/client/components/revenue
 *     client/modules/PurchasingReceiving/client/components/pricing
 *     client/modules/MixologySommelier/services/sales-analytics
 *     client/modules/EchoEvents/components/marketing
 *
 *   Excluded path fragments: '/imported/' and '/archive/' — frozen historical
 *   snapshots, not part of the live build graph.
 *
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const FORBIDDEN_IMPORT_SUBSTRINGS = [
  'server/services/echo-ai3/resonance/',
  'services/echo-ai3/resonance/',
  'server/services/signals/',
  'services/signals/',
  'client/lib/resonance/',
  'lib/resonance/',
  'shared/types/resonance/',
  'types/resonance/',
  'shared/types/signals/',
  'types/signals/',
];

const COMMERCE_DIRS_RELATIVE = [
  'client/modules/RevenueOps',
  'client/modules/DynamicPricing',
  'client/modules/RevenueIntelligence',
  'client/modules/Schedule/client/components/revenue',
  'client/modules/PurchasingReceiving/client/components/pricing',
  'client/modules/MixologySommelier/services/sales-analytics',
  'client/modules/EchoEvents/components/marketing',
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const EXCLUDED_PATH_FRAGMENTS = ['/imported/', '/archive/', '/node_modules/'];

interface Violation {
  filePath: string;
  importLine: string;
  matchedSubstring: string;
}

function shouldSkip(absPath: string): boolean {
  return EXCLUDED_PATH_FRAGMENTS.some((frag) => absPath.includes(frag));
}

function listSourceFiles(dirAbs: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dirAbs)) return out;
  const stack: string[] = [dirAbs];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(cur, entry.name);
      if (shouldSkip(full)) continue;
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SOURCE_EXTENSIONS.has(ext)) out.push(full);
      }
    }
  }
  return out;
}

const IMPORT_PATTERNS = [
  // import ... from 'spec' or "spec"
  /\bimport\b[^'"`]*?from\s*['"]([^'"]+)['"]/g,
  // import ... from `spec` (backtick — refuses interpolated specifiers)
  /\bimport\b[^'"`]*?from\s*`([^`$]+)`/g,
  // bare side-effect: import 'spec' / import "spec" / import `spec`
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*`([^`$]+)`/g,
  // dynamic import('spec') with single, double, or backtick
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s*\(\s*`([^`$]+)`\s*\)/g,
  // require('spec')
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // re-export pass-through: export { x } from 'spec' / export * from 'spec'
  /\bexport\b[^'"`]*?from\s*['"]([^'"]+)['"]/g,
  /\bexport\b[^'"`]*?from\s*`([^`$]+)`/g,
];

/**
 * Decode \uXXXX escapes so '/server/services/...' becomes
 * '/server/services/...' before the substring check runs. Without this,
 * an evader can hide forbidden paths behind hex literals.
 */
function decodeUnicodeEscapes(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function findForbiddenImports(filePath: string): Violation[] {
  const source = fs.readFileSync(filePath, 'utf-8');
  const violations: Violation[] = [];

  for (const re of IMPORT_PATTERNS) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const spec = decodeUnicodeEscapes(match[1]);
      const matched = FORBIDDEN_IMPORT_SUBSTRINGS.find((sub) => spec.includes(sub));
      if (matched) {
        violations.push({
          filePath,
          importLine: match[0],
          matchedSubstring: matched,
        });
      }
    }
  }

  return violations;
}

function scanCommerceTree(): Violation[] {
  const violations: Violation[] = [];
  for (const rel of COMMERCE_DIRS_RELATIVE) {
    const abs = path.join(REPO_ROOT, rel);
    const files = listSourceFiles(abs);
    for (const f of files) {
      violations.push(...findForbiddenImports(f));
    }
  }
  return violations;
}

describe('Tenet 3 — tone informs care, not commerce', () => {
  // Sanity-check: at least one commerce dir exists. If a future refactor
  // moves them all, the substring list above must move too.
  it('at least one configured commerce directory exists in the repo', () => {
    const found = COMMERCE_DIRS_RELATIVE.filter((rel) =>
      fs.existsSync(path.join(REPO_ROOT, rel)),
    );
    expect(found.length).toBeGreaterThan(0);
  });

  it('no commerce module imports from any resonance / signals / affect path', () => {
    const violations = scanCommerceTree();

    if (violations.length > 0) {
      const formatted = violations
        .map(
          (v) =>
            `  ${path.relative(REPO_ROOT, v.filePath)}\n` +
            `      ↳ ${v.importLine}\n` +
            `      ↳ matched forbidden substring: ${v.matchedSubstring}`,
        )
        .join('\n');
      throw new Error(
        `Tenet 3 violation: commerce module(s) import resonance/signal/affect data:\n${formatted}\n\n` +
          `Fix: either move the calling file out of the commerce path, or route\n` +
          `through a vetted abstraction layer. Tenet 3 does not bend.`,
      );
    }

    expect(violations.length).toBe(0);
  });

  // Spot-check the scanner itself — make sure it would catch a real violation.
  // Uses os.tmpdir() so a crashed test never leaves debris in the repo.
  it('scanner detects forbidden imports (self-test)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tenet3-self-'));
    const fakeFile = path.join(tmp, 'attack.ts');
    fs.writeFileSync(
      fakeFile,
      `import { resonanceEngine } from '../../../../server/services/echo-ai3/resonance/resonance-engine';\n`,
      'utf-8',
    );
    try {
      const found = findForbiddenImports(fakeFile);
      expect(found.length).toBeGreaterThan(0);
      expect(found[0].matchedSubstring).toContain('echo-ai3/resonance/');
    } finally {
      fs.unlinkSync(fakeFile);
      fs.rmdirSync(tmp);
    }
  });

  // ---------------------------------------------------------------------------
  // Adversarial bypass attempts — each was a real false-negative caught
  // during the smoke pass and now closed.
  // ---------------------------------------------------------------------------
  describe('Tenet 3 — bypass-attempt regression suite', () => {
    function withTempFile(content: string, fn: (filePath: string) => void): void {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tenet3-bypass-'));
      const file = path.join(tmp, 'attack.ts');
      fs.writeFileSync(file, content, 'utf-8');
      try {
        fn(file);
      } finally {
        fs.unlinkSync(file);
        fs.rmdirSync(tmp);
      }
    }

    it('catches dynamic import with backtick template literal', () => {
      withTempFile(
        'const ev = await import(`../../../../server/services/echo-ai3/resonance/resonance-engine`);',
        (f) => {
          const found = findForbiddenImports(f);
          expect(found.length).toBeGreaterThan(0);
        },
      );
    });

    it('catches static import with backtick template literal', () => {
      withTempFile(
        'import { x } from `../../../../client/lib/resonance/score`;',
        (f) => {
          const found = findForbiddenImports(f);
          expect(found.length).toBeGreaterThan(0);
        },
      );
    });

    it('catches Unicode-escaped path inside import string', () => {
      withTempFile(
        // 0x2f = '/'
        "import { x } from '\\u002fserver\\u002fservices\\u002fecho-ai3\\u002fresonance\\u002fresonance-engine';",
        (f) => {
          const found = findForbiddenImports(f);
          expect(found.length).toBeGreaterThan(0);
        },
      );
    });

    it('catches re-export pass-through (barrel-file smuggling)', () => {
      withTempFile(
        `export { resonanceEngine } from '../../server/services/echo-ai3/resonance/resonance-engine';`,
        (f) => {
          const found = findForbiddenImports(f);
          expect(found.length).toBeGreaterThan(0);
        },
      );
    });

    it('catches export * from re-export', () => {
      withTempFile(
        `export * from '../../shared/types/resonance/reading';`,
        (f) => {
          const found = findForbiddenImports(f);
          expect(found.length).toBeGreaterThan(0);
        },
      );
    });

    it('does NOT catch interpolated backtick (documents the AST-analysis gap)', () => {
      // ${...} interpolation cannot be statically resolved. Documented in
      // the file header as a known limitation. This test locks the current
      // behavior so any future improvement (e.g., AST integration) breaks
      // the test deliberately and forces a docs update.
      withTempFile(
        'const seg = "resonance"; await import(`../../server/services/echo-ai3/${seg}/resonance-engine`);',
        (f) => {
          const found = findForbiddenImports(f);
          expect(found.length).toBe(0);
        },
      );
    });

    it('does NOT catch string-concatenated dynamic import (documents the AST-analysis gap)', () => {
      withTempFile(
        `const p = './services/' + 'signals/' + 'signal-recorder'; await import(p);`,
        (f) => {
          const found = findForbiddenImports(f);
          expect(found.length).toBe(0);
        },
      );
    });
  });
});

// =============================================================================
// Tenet 4 — trust score invisibility (Phase 1.4 routes wire-in)
// =============================================================================
describe('Tenet 4 — trust score invisibility', () => {
  it.todo('GET /api/echo-resonance/guest/:id never returns trust_scores (gated on Phase 1.4 routes)');
  it.todo('Guest memory view never includes trust signals (gated on Phase 1.4 routes)');
});

// =============================================================================
// Tenet 7 — sensitive flag decay (signal-decay cron wiring)
// =============================================================================
describe('Tenet 7 — sensitive flag decay', () => {
  it.todo('signals tagged sensitivity=sensitive expire after 30 days (covered by signal-recorder unit test; cron wiring is a separate ticket)');
  it.todo('signal-decay job hard-deletes (not soft-deletes) sensitive signals (covered by signal-decay unit test; cron wiring is a separate ticket)');
});
