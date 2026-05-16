export interface CashPosition {
  date: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
}
export interface Payable {
  vendor: string;
  amount: number;
  dueDate: string;
  discountAvailable?: { percent: number; expiresOn: string };
  priority?: number;
}
export interface CashLadderInput {
  positions: CashPosition[];
  payables: Payable[];
  minimumBalance: number;
}
export interface DiscountRecommendation {
  vendor: string;
  amount: number;
  percent: number;
  savings: number;
  expiresOn: string;
}
export interface CashLadderResult {
  projectedBalances: { date: string; closingBalance: number }[];
  shortfallDate?: string;
  discountRecommendations: DiscountRecommendation[];
}
function compareDates(a: string, b: string) {
  return new Date(a).getTime() - new Date(b).getTime();
}
function applyPayables(payables: Payable[], date: string) {
  return payables.filter((payable) => compareDates(payable.dueDate, date) <= 0);
}
function calculateClosingBalance(position: CashPosition, payables: Payable[]) {
  const payableOutflows = payables.reduce(
    (sum, payable) => sum + payable.amount,
    0,
  );
  return (
    position.openingBalance +
    position.inflows -
    (position.outflows + payableOutflows)
  );
}
export function optimizeCashLadder(input: CashLadderInput): CashLadderResult {
  const sortedPositions = [...input.positions].sort((a, b) =>
    compareDates(a.date, b.date),
  );
  const payables = [...input.payables].sort((a, b) =>
    compareDates(a.dueDate, b.dueDate),
  );
  const projectedBalances: { date: string; closingBalance: number }[] = [];
  let shortfallDate: string | undefined;
  for (const position of sortedPositions) {
    const dueNow = applyPayables(payables, position.date);
    const closing = calculateClosingBalance(position, dueNow);
    if (closing < input.minimumBalance && !shortfallDate) {
      shortfallDate = position.date;
    }
    projectedBalances.push({ date: position.date, closingBalance: closing });
  }
  const discountRecommendations = payables
    .filter((payable) => payable.discountAvailable)
    .map((payable) => {
      const discount = payable.discountAvailable!;
      const savings = (payable.amount * discount.percent) / 100;
      return {
        vendor: payable.vendor,
        amount: payable.amount,
        percent: discount.percent,
        savings,
        expiresOn: discount.expiresOn,
      };
    })
    .sort((a, b) => b.savings - a.savings);
  return { projectedBalances, shortfallDate, discountRecommendations };
}
