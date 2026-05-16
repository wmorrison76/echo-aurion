import type { BEODocument, BEOChange } from "@/../shared/types/beo";

/**
 * Shallow + nested diff (v1)
 * We deliberately keep this deterministic and readable.
 * Compares two BEO documents and returns a list of changes.
 */
export function diffBeo(prev: BEODocument, next: BEODocument): BEOChange[] {
  const changes: BEOChange[] = [];

  function walk(p: any, n: any, path: string, label: string) {
    if (JSON.stringify(p) === JSON.stringify(n)) return;

    if (typeof p !== "object" || typeof n !== "object" || !p || !n) {
      changes.push({ path, label, previous: p, current: n });
      return;
    }

    const keys = new Set([...Object.keys(p), ...Object.keys(n)]);
    keys.forEach((k) => {
      walk(p[k], n[k], `${path}.${k}`, k);
    });
  }

  walk(prev, next, "beo", "BEO");
  return changes;
}
