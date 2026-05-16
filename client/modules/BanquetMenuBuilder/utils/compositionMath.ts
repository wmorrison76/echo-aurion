/**
 * compositionMath.ts
 * ----------------------------------------------------------------------------
 * Small pure math helpers used across the canvas. Kept separate from the
 * engines so unit tests don't need to spin up the whole pipeline.
 * ----------------------------------------------------------------------------
 */

/**
 * Clamp a number between min and max.
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Linear interpolation.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Map a value in [inMin..inMax] to [outMin..outMax], clamped.
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  return lerp(outMin, outMax, t);
}

/**
 * Move an item within an array (immutable).
 * @returns new array with item at fromIndex moved to toIndex
 */
export function arrayMove<T>(arr: readonly T[], fromIndex: number, toIndex: number): T[] {
  const result = arr.slice();
  if (fromIndex < 0 || fromIndex >= result.length) return result;
  const [item] = result.splice(fromIndex, 1);
  const clamped = clamp(toIndex, 0, result.length);
  result.splice(clamped, 0, item);
  return result;
}

/**
 * Group an array by a key function.
 */
export function groupBy<T, K extends string | number>(
  arr: readonly T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/**
 * Returns a stable hash of an object's keys+values for memoization.
 * NOT cryptographic — just a quick fingerprint.
 */
export function shallowFingerprint(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  return keys.map((k) => `${k}:${String(obj[k])}`).join('|');
}

/**
 * Format a number of items with proper pluralization.
 *   formatCount(1, 'item') === '1 item'
 *   formatCount(5, 'item') === '5 items'
 *   formatCount(0, 'item') === 'No items'
 */
export function formatCount(n: number, singular: string, plural?: string): string {
  if (n === 0) return `No ${plural ?? singular + 's'}`;
  if (n === 1) return `1 ${singular}`;
  return `${n} ${plural ?? singular + 's'}`;
}

/**
 * Returns true if two arrays of strings have the same contents
 * regardless of order. Used to detect "actually changed" vs "re-derived
 * but same".
 */
export function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}
