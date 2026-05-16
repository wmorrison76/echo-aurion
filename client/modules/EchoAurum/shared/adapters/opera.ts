import type { AppendJournalInput } from "../ledger";
export type OperaChargeCategory = "room" | "allowance" | "tax";
export interface OperaCharge {
  reservationId: string;
  propertyId: string;
  folioNumber: string;
  postedAt: string;
  amount: number;
  currency: string;
  category: OperaChargeCategory;
  description?: string;
}
const CATEGORY_TO_LEDGER: Record<
  OperaChargeCategory,
  { debit: string; credit: string }
> = {
  room: { debit: "1200", credit: "4000" },
  allowance: { debit: "4100", credit: "1200" },
  tax: { debit: "1200", credit: "7000" },
};
export function createOperaJournalEntries(
  ledgerId: string,
  charge: OperaCharge,
): AppendJournalInput[] {
  const accounts = CATEGORY_TO_LEDGER[charge.category];
  if (!accounts) {
    return [];
  }
  return [
    {
      ledgerId,
      payload: {
        debitAccount: accounts.debit,
        creditAccount: accounts.credit,
        amount: Math.abs(charge.amount),
        currency: charge.currency,
        serviceDate: charge.postedAt,
        memo: charge.description ?? `${charge.category} charge`,
        meta: {
          reservationId: charge.reservationId,
          folioNumber: charge.folioNumber,
          propertyId: charge.propertyId,
          category: charge.category,
        },
      },
      source: { type: "opera", reservationId: charge.reservationId },
    },
  ];
}
export interface OperaFlashMetric {
  reservationId: string;
  folioNumber: string;
  propertyId: string;
  roomsRevenue: number;
  allowances: number;
  taxes: number;
}
export function summarizeOperaCharges(
  charges: OperaCharge[],
): OperaFlashMetric[] {
  const grouped = new Map<string, OperaFlashMetric>();
  for (const charge of charges) {
    const key = `${charge.reservationId}:${charge.folioNumber}`;
    const metric = grouped.get(key) ?? {
      reservationId: charge.reservationId,
      folioNumber: charge.folioNumber,
      propertyId: charge.propertyId,
      roomsRevenue: 0,
      allowances: 0,
      taxes: 0,
    };
    if (charge.category === "room") {
      metric.roomsRevenue += charge.amount;
    }
    if (charge.category === "allowance") {
      metric.allowances += charge.amount;
    }
    if (charge.category === "tax") {
      metric.taxes += charge.amount;
    }
    grouped.set(key, metric);
  }
  return [...grouped.values()];
}
