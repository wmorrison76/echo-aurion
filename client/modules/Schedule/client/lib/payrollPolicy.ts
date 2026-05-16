/** * Client-side payroll policy and calculation helpers */ export function calculateHours(
  start: string,
  end: string,
  breakMin: number = 0,
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, diffHours - breakMin / 60);
}
export function computePayroll(
  hours: number,
  rate: number,
  otMultiplier: number = 1.5,
  otThreshold: number = 40,
) {
  const regular = Math.min(hours, otThreshold);
  const overtime = Math.max(0, hours - otThreshold);
  return {
    regularPay: parseFloat((regular * rate).toFixed(2)),
    otPay: parseFloat((overtime * rate * otMultiplier).toFixed(2)),
    totalPay: parseFloat(
      (regular * rate + overtime * rate * otMultiplier).toFixed(2),
    ),
    regularHours: regular,
    overtimeHours: overtime,
  };
}
export function predictabilityPay(
  changeHours: number,
  threshold: number = 24,
): number {
  // Returns extra hours owed if schedule changed < threshold hours before shift return changeHours < threshold ? 1 : 0;
} /** * Format currency consistently */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
): string {
  const symbols: Record<string, string> = {
    USD: "$",
    CAD: "C$",
    GBP: "£",
    EUR: "€",
  };
  const symbol = symbols[currency] || "$";
  return `${symbol}${amount.toFixed(2)}`;
} /** * Format hours with decimal precision */
export function formatHours(hours: number): string {
  return hours.toFixed(2) + "h";
}
