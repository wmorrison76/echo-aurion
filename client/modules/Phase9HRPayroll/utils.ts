export function formatDate(value: string | null | undefined): string {
  if (!value) return "–";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
export function formatMoney(amount: number, currency = "USD"): string {
  if (!Number.isFinite(amount)) return "–";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const rounded = Math.round(amount);
    return `$${rounded.toLocaleString()}`;
  }
}
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "–";
  return `${Math.round(value * 10) / 10}%`;
}
export function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
