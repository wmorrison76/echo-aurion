import type { RequestHandler } from "express";
import {
  buildOutletPnl,
  type LedgerEntry,
  type OutletDefinition,
  type PnLInput,
  type PaymentEvent,
  type PeriodRange,
  type ScheduleEntry,
} from "../../shared/pnl";
export const handleOutletPnl: RequestHandler = (req, res) => {
  const { period, outlets, ledgerEntries, schedules, payments } =
    req.body ?? {};
  const payload: PnLInput = {
    period: coercePeriod(period),
    outlets: coerceOutlets(outlets),
    ledgerEntries: coerceLedgerEntries(ledgerEntries),
    schedules: coerceSchedules(schedules),
    payments: coercePayments(payments),
  };
  try {
    const report = buildOutletPnl(payload);
    res.json({ report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build outlet P&L.";
    res.status(500).json({ error: message });
  }
};
function coercePeriod(value: unknown): PeriodRange {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PeriodRange).start === "string" &&
    typeof (value as PeriodRange).end === "string"
  ) {
    return value as PeriodRange;
  }
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).toISOString();
  return { start, end };
}
function coerceOutlets(value: unknown): OutletDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isOutletDefinition) as OutletDefinition[];
}
function isOutletDefinition(value: unknown): value is OutletDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<OutletDefinition>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.region === "string" &&
    typeof candidate.currency === "string" &&
    typeof candidate.budgetedRevenue === "number" &&
    typeof candidate.budgetedEbitda === "number"
  );
}
function coerceLedgerEntries(value: unknown): LedgerEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isLedgerEntry) as LedgerEntry[];
}
function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<LedgerEntry>;
  return (
    typeof candidate.outletId === "string" &&
    typeof candidate.costCenter === "string" &&
    typeof candidate.accountCode === "string" &&
    typeof candidate.accountName === "string" &&
    typeof candidate.accountType === "string" &&
    typeof candidate.amount === "number" &&
    typeof candidate.currency === "string" &&
    typeof candidate.postedAt === "string"
  );
}
function coerceSchedules(value: unknown): ScheduleEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isScheduleEntry) as ScheduleEntry[];
}
function isScheduleEntry(value: unknown): value is ScheduleEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<ScheduleEntry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.outletId === "string" &&
    typeof candidate.costCenter === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.scheduleType === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.amount === "number" &&
    typeof candidate.dueAt === "string"
  );
}
function coercePayments(value: unknown): PaymentEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isPaymentEvent) as PaymentEvent[];
}
function isPaymentEvent(value: unknown): value is PaymentEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<PaymentEvent>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.outletId === "string" &&
    typeof candidate.costCenter === "string" &&
    typeof candidate.vendor === "string" &&
    typeof candidate.dueAt === "string" &&
    typeof candidate.amount === "number" &&
    typeof candidate.status === "string" &&
    typeof candidate.method === "string"
  );
}
