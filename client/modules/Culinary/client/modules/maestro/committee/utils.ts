export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
export function roundTo(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
export function sumBy<T>(
  items: Iterable<T>,
  selector: (item: T) => number,
): number {
  let total = 0;
  for (const item of items) {
    const value = selector(item);
    if (Number.isFinite(value)) {
      total += value;
    }
  }
  return total;
}
export function average(values: number[]): number {
  if (!values.length) return 0;
  return sumBy(values, (v) => v) / values.length;
}
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback = 0,
): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    Math.abs(denominator) < Number.EPSILON
  ) {
    return fallback;
  }
  return numerator / denominator;
}
export function uniqueId(prefix = "id"): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
export function isoNow(): string {
  return new Date().toISOString();
}
export function hoursBetween(startISO: string, endISO: string): number {
  const start = Date.parse(startISO);
  const end = Date.parse(endISO);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  const diffMs = end - start;
  return diffMs / 3_600_000;
}
export function cloneDeep<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
export function take<T>(iterable: Iterable<T>, limit: number): T[] {
  const result: T[] = [];
  if (limit <= 0) return result;
  for (const item of iterable) {
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}
export function percentile(values: number[], pct: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp((sorted.length - 1) * pct, 0, sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
