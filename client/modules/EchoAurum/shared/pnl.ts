import { differenceInCalendarDays, parseISO } from "date-fns";
export type PnLAccountType =
  | "revenue"
  | "cogs"
  | "labor"
  | "operating"
  | "other";
export type ScheduleStatus = "scheduled" | "complete" | "in_progress";
export type PaymentStatus = "planned" | "approved" | "paid";
export interface PeriodRange {
  start: string;
  end: string;
}
export interface OutletDefinition {
  id: string;
  name: string;
  region: string;
  currency: string;
  budgetedRevenue: number;
  budgetedEbitda: number;
}
export interface LedgerEntry {
  outletId: string;
  costCenter: string;
  accountCode: string;
  accountName: string;
  accountType: PnLAccountType;
  amount: number;
  currency: string;
  postedAt: string;
  scheduleId?: string;
}
export interface ScheduleEntry {
  id: string;
  outletId: string;
  costCenter: string;
  description: string;
  scheduleType: "monthly" | "quarterly" | "annual" | "adhoc";
  status: ScheduleStatus;
  amount: number;
  dueAt: string;
}
export interface PaymentEvent {
  id: string;
  outletId: string;
  costCenter: string;
  vendor: string;
  dueAt: string;
  amount: number;
  status: PaymentStatus;
  method: "ach" | "wire" | "card" | "check";
}
export interface PnLInput {
  period: PeriodRange;
  outlets: OutletDefinition[];
  ledgerEntries: LedgerEntry[];
  schedules: ScheduleEntry[];
  payments: PaymentEvent[];
}
export interface CostCenterAccountNode {
  accountCode: string;
  accountName: string;
  accountType: PnLAccountType;
  amount: number;
}
export interface CostCenterBreakdown {
  costCenter: string;
  totalRevenue: number;
  totalExpense: number;
  netContribution: number;
  scheduleImpact: number;
  accounts: CostCenterAccountNode[];
}
export interface ScheduleItemSummary {
  id: string;
  description: string;
  dueAt: string;
  amount: number;
  status: ScheduleStatus;
  costCenter: string;
}
export interface ScheduleSummary {
  totalAmount: number;
  upcoming: ScheduleItemSummary[];
  overdue: ScheduleItemSummary[];
}
export interface PaymentBucket {
  label: "overdue" | "this_week" | "next_week" | "later";
  amount: number;
  count: number;
}
export interface PaymentEventSummary {
  id: string;
  vendor: string;
  dueAt: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentEvent["method"];
  costCenter: string;
}
export interface PaymentTimelineSummary {
  buckets: PaymentBucket[];
  upcomingPayments: PaymentEventSummary[];
}
export interface OutletPnL {
  outletId: string;
  name: string;
  region: string;
  currency: string;
  revenue: number;
  cogs: number;
  labor: number;
  operating: number;
  other: number;
  expenses: number;
  ebitda: number;
  ebitdaMargin: number;
  revenueVsBudget: number;
  ebitdaVsBudget: number;
  costCenters: CostCenterBreakdown[];
  schedules: ScheduleSummary;
  payments: PaymentTimelineSummary;
}
export interface ConsolidatedSummary {
  revenue: number;
  expenses: number;
  ebitda: number;
  margin: number;
  revenueVsBudget: number;
  ebitdaVsBudget: number;
}
export interface OutletPnlReport {
  period: PeriodRange;
  consolidated: ConsolidatedSummary;
  outlets: OutletPnL[];
}
export function buildOutletPnl(input: PnLInput): OutletPnlReport {
  const outletIndex = new Map(
    input.outlets.map((outlet) => [outlet.id, outlet] as const),
  );
  const outletAccumulator = new Map<string, OutletAccumulator>();
  for (const entry of input.ledgerEntries) {
    const outlet = outletIndex.get(entry.outletId);
    if (!outlet) {
      continue;
    }
    const accumulator = ensureOutletAccumulator(outletAccumulator, outlet);
    registerLedgerEntry(accumulator, entry);
  }
  const scheduleIndex = new Map<string, ScheduleEntry[]>();
  for (const schedule of input.schedules) {
    if (!outletIndex.has(schedule.outletId)) {
      continue;
    }
    const list = scheduleIndex.get(schedule.outletId) ?? [];
    list.push(schedule);
    scheduleIndex.set(schedule.outletId, list);
  }
  const paymentIndex = new Map<string, PaymentEvent[]>();
  for (const payment of input.payments) {
    if (!outletIndex.has(payment.outletId)) {
      continue;
    }
    const list = paymentIndex.get(payment.outletId) ?? [];
    list.push(payment);
    paymentIndex.set(payment.outletId, list);
  }
  const outlets: OutletPnL[] = [];
  for (const [outletId, accumulator] of outletAccumulator.entries()) {
    const outlet = outletIndex.get(outletId)!;
    const costCenters = buildCostCenters(
      accumulator.costCenters,
      scheduleIndex.get(outletId),
    );
    const revenue = roundCurrency(accumulator.revenue);
    const cogs = roundCurrency(accumulator.cogs);
    const labor = roundCurrency(accumulator.labor);
    const operating = roundCurrency(accumulator.operating);
    const other = roundCurrency(accumulator.other);
    const expenses = roundCurrency(cogs + labor + operating + other);
    const ebitda = roundCurrency(revenue - expenses);
    const ebitdaMargin = revenue > 0 ? roundRatio(ebitda / revenue) : 0;
    const revenueVsBudget = roundCurrency(revenue - outlet.budgetedRevenue);
    const ebitdaVsBudget = roundCurrency(ebitda - outlet.budgetedEbitda);
    const scheduleSummary = buildScheduleSummary(scheduleIndex.get(outletId));
    const paymentSummary = buildPaymentSummary(paymentIndex.get(outletId));
    outlets.push({
      outletId,
      name: outlet.name,
      region: outlet.region,
      currency: outlet.currency,
      revenue,
      cogs,
      labor,
      operating,
      other,
      expenses,
      ebitda,
      ebitdaMargin,
      revenueVsBudget,
      ebitdaVsBudget,
      costCenters,
      schedules: scheduleSummary,
      payments: paymentSummary,
    });
  }
  outlets.sort((a, b) => b.ebitda - a.ebitda);
  const consolidated = buildConsolidatedSummary(outlets);
  return { period: input.period, consolidated, outlets };
}
type CostCenterAccumulator = {
  revenue: number;
  expense: number;
  accounts: Map<string, CostCenterAccountNode>;
  scheduleImpact: number;
};
type OutletAccumulator = {
  revenue: number;
  cogs: number;
  labor: number;
  operating: number;
  other: number;
  costCenters: Map<string, CostCenterAccumulator>;
};
function ensureOutletAccumulator(
  map: Map<string, OutletAccumulator>,
  outlet: OutletDefinition,
) {
  const existing = map.get(outlet.id);
  if (existing) {
    return existing;
  }
  const accumulator: OutletAccumulator = {
    revenue: 0,
    cogs: 0,
    labor: 0,
    operating: 0,
    other: 0,
    costCenters: new Map(),
  };
  map.set(outlet.id, accumulator);
  return accumulator;
}
function registerLedgerEntry(
  accumulator: OutletAccumulator,
  entry: LedgerEntry,
) {
  const { amount, accountType } = entry;
  switch (accountType) {
    case "revenue":
      accumulator.revenue += amount;
      break;
    case "cogs":
      accumulator.cogs += amount;
      break;
    case "labor":
      accumulator.labor += amount;
      break;
    case "operating":
      accumulator.operating += amount;
      break;
    default:
      accumulator.other += amount;
      break;
  }
  const costCenter = ensureCostCenter(
    accumulator.costCenters,
    entry.costCenter,
  );
  if (accountType === "revenue") {
    costCenter.revenue += amount;
  } else {
    costCenter.expense += amount;
  }
  const accountNode = costCenter.accounts.get(entry.accountCode);
  if (accountNode) {
    accountNode.amount += amount;
  } else {
    costCenter.accounts.set(entry.accountCode, {
      accountCode: entry.accountCode,
      accountName: entry.accountName,
      accountType,
      amount,
    });
  }
}
function ensureCostCenter(
  map: Map<string, CostCenterAccumulator>,
  costCenter: string,
) {
  const existing = map.get(costCenter);
  if (existing) {
    return existing;
  }
  const accumulator: CostCenterAccumulator = {
    revenue: 0,
    expense: 0,
    accounts: new Map(),
    scheduleImpact: 0,
  };
  map.set(costCenter, accumulator);
  return accumulator;
}
function buildCostCenters(
  costCenterMap: Map<string, CostCenterAccumulator>,
  schedules?: ScheduleEntry[],
): CostCenterBreakdown[] {
  const list: CostCenterBreakdown[] = [];
  const scheduleImpactByCostCenter = new Map<string, number>();
  if (schedules) {
    for (const schedule of schedules) {
      const current = scheduleImpactByCostCenter.get(schedule.costCenter) ?? 0;
      scheduleImpactByCostCenter.set(
        schedule.costCenter,
        current + schedule.amount,
      );
    }
  }
  for (const [costCenter, accumulator] of costCenterMap.entries()) {
    const totalRevenue = roundCurrency(accumulator.revenue);
    const totalExpense = roundCurrency(accumulator.expense);
    const netContribution = roundCurrency(totalRevenue - totalExpense);
    const scheduleImpact = roundCurrency(
      scheduleImpactByCostCenter.get(costCenter) ?? 0,
    );
    const accounts = Array.from(accumulator.accounts.values()).map(
      (account) => ({ ...account, amount: roundCurrency(account.amount) }),
    );
    accounts.sort((a, b) => b.amount - a.amount);
    list.push({
      costCenter,
      totalRevenue,
      totalExpense,
      netContribution,
      scheduleImpact,
      accounts,
    });
  }
  return list.sort((a, b) => b.netContribution - a.netContribution);
}
function buildScheduleSummary(schedules?: ScheduleEntry[]): ScheduleSummary {
  if (!schedules || schedules.length === 0) {
    return { totalAmount: 0, upcoming: [], overdue: [] };
  }
  const now = new Date();
  const upcoming: ScheduleItemSummary[] = [];
  const overdue: ScheduleItemSummary[] = [];
  let totalAmount = 0;
  for (const schedule of schedules) {
    totalAmount += schedule.amount;
    const item: ScheduleItemSummary = {
      id: schedule.id,
      description: schedule.description,
      dueAt: schedule.dueAt,
      amount: roundCurrency(schedule.amount),
      status: schedule.status,
      costCenter: schedule.costCenter,
    };
    if (schedule.status === "complete") {
      continue;
    }
    const dueDate = parseISO(schedule.dueAt);
    const days = differenceInCalendarDays(dueDate, now);
    if (days < 0) {
      overdue.push(item);
    } else if (days <= 14) {
      upcoming.push(item);
    }
  }
  upcoming.sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );
  overdue.sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );
  return { totalAmount: roundCurrency(totalAmount), upcoming, overdue };
}
function buildPaymentSummary(
  payments?: PaymentEvent[],
): PaymentTimelineSummary {
  if (!payments || payments.length === 0) {
    return {
      buckets: [
        { label: "overdue", amount: 0, count: 0 },
        { label: "this_week", amount: 0, count: 0 },
        { label: "next_week", amount: 0, count: 0 },
        { label: "later", amount: 0, count: 0 },
      ],
      upcomingPayments: [],
    };
  }
  const now = new Date();
  const buckets: Record<
    PaymentTimelineSummary["buckets"][number]["label"],
    PaymentBucket
  > = {
    overdue: { label: "overdue", amount: 0, count: 0 },
    this_week: { label: "this_week", amount: 0, count: 0 },
    next_week: { label: "next_week", amount: 0, count: 0 },
    later: { label: "later", amount: 0, count: 0 },
  };
  const upcomingPayments: PaymentEventSummary[] = [];
  for (const payment of payments) {
    const days = differenceInCalendarDays(parseISO(payment.dueAt), now);
    let bucket: PaymentBucket;
    if (days < 0) {
      bucket = buckets.overdue;
    } else if (days <= 7) {
      bucket = buckets.this_week;
    } else if (days <= 14) {
      bucket = buckets.next_week;
    } else {
      bucket = buckets.later;
    }
    bucket.amount += payment.amount;
    bucket.count += 1;
    if (days >= -7 && upcomingPayments.length < 6) {
      upcomingPayments.push({
        id: payment.id,
        vendor: payment.vendor,
        dueAt: payment.dueAt,
        amount: roundCurrency(payment.amount),
        status: payment.status,
        method: payment.method,
        costCenter: payment.costCenter,
      });
    }
  }
  const orderedUpcoming = upcomingPayments.sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );
  return {
    buckets: Object.values(buckets).map((bucket) => ({
      ...bucket,
      amount: roundCurrency(bucket.amount),
    })),
    upcomingPayments: orderedUpcoming,
  };
}
function buildConsolidatedSummary(outlets: OutletPnL[]): ConsolidatedSummary {
  let revenue = 0;
  let expenses = 0;
  let ebitda = 0;
  let budgetedRevenue = 0;
  let budgetedEbitda = 0;
  for (const outlet of outlets) {
    revenue += outlet.revenue;
    expenses += outlet.expenses;
    ebitda += outlet.ebitda;
    budgetedRevenue += outlet.revenue - outlet.revenueVsBudget;
    budgetedEbitda += outlet.ebitda - outlet.ebitdaVsBudget;
  }
  const margin = revenue > 0 ? roundRatio(ebitda / revenue) : 0;
  return {
    revenue: roundCurrency(revenue),
    expenses: roundCurrency(expenses),
    ebitda: roundCurrency(ebitda),
    margin,
    revenueVsBudget: roundCurrency(revenue - budgetedRevenue),
    ebitdaVsBudget: roundCurrency(ebitda - budgetedEbitda),
  };
}
function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function roundRatio(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
