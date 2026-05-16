/**
 * Shared utilities for SaaS/sections (e.g. formatCurrency).
 * Used by Culinary and other modules that need currency formatting.
 */
export function formatCurrency(value: number, currency: string = "USD"): string {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || "USD"} ${value.toFixed(2)}`;
  }
}
