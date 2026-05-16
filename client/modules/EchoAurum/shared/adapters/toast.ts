import type { AppendJournalInput } from "../ledger";
export type ToastItemCategory = "food" | "beverage" | "service" | "discount";
export interface ToastCheckItem {
  menuItemId: string;
  name: string;
  category: ToastItemCategory;
  gross: number;
  net: number;
  tax: number;
  cost?: number;
}
export interface ToastCheck {
  checkId: string;
  locationId: string;
  openedAt: string;
  closedAt: string;
  currency: string;
  server: string;
  items: ToastCheckItem[];
}
const CATEGORY_TO_LEDGER: Record<
  ToastItemCategory,
  { debit: string; credit: string }
> = {
  food: { debit: "1200", credit: "4200" },
  beverage: { debit: "1200", credit: "4300" },
  service: { debit: "1200", credit: "4400" },
  discount: { debit: "4100", credit: "1200" },
};
export function createToastJournalEntries(
  ledgerId: string,
  check: ToastCheck,
): AppendJournalInput[] {
  const entries: AppendJournalInput[] = [];
  for (const item of check.items) {
    const accounts = CATEGORY_TO_LEDGER[item.category];
    if (!accounts) {
      continue;
    }
    entries.push({
      ledgerId,
      payload: {
        debitAccount: accounts.debit,
        creditAccount: accounts.credit,
        amount: Math.abs(item.net),
        currency: check.currency,
        serviceDate: check.closedAt,
        memo: `${item.name} (${item.category})`,
        meta: {
          checkId: check.checkId,
          locationId: check.locationId,
          server: check.server,
          menuItemId: item.menuItemId,
          category: item.category,
        },
      },
      source: { type: "toast", checkId: check.checkId },
    });
    if (
      item.cost &&
      item.cost > 0 &&
      (item.category === "food" || item.category === "beverage")
    ) {
      entries.push({
        ledgerId,
        payload: {
          debitAccount: item.category === "food" ? "5200" : "5210",
          creditAccount: "1300",
          amount: item.cost,
          currency: check.currency,
          serviceDate: check.closedAt,
          memo: `Cost for ${item.name}`,
          meta: {
            checkId: check.checkId,
            locationId: check.locationId,
            menuItemId: item.menuItemId,
          },
        },
        source: { type: "toast", checkId: check.checkId },
      });
    }
  }
  return entries;
}
export interface ToastFlashMetric {
  locationId: string;
  checks: number;
  foodRevenue: number;
  beverageRevenue: number;
  serviceRevenue: number;
  discounts: number;
}
export function summarizeToastChecks(checks: ToastCheck[]): ToastFlashMetric[] {
  const grouped = new Map<string, ToastFlashMetric>();
  for (const check of checks) {
    const metric = grouped.get(check.locationId) ?? {
      locationId: check.locationId,
      checks: 0,
      foodRevenue: 0,
      beverageRevenue: 0,
      serviceRevenue: 0,
      discounts: 0,
    };
    metric.checks += 1;
    for (const item of check.items) {
      if (item.category === "food") {
        metric.foodRevenue += item.net;
      }
      if (item.category === "beverage") {
        metric.beverageRevenue += item.net;
      }
      if (item.category === "service") {
        metric.serviceRevenue += item.net;
      }
      if (item.category === "discount") {
        metric.discounts += item.net;
      }
    }
    grouped.set(check.locationId, metric);
  }
  return [...grouped.values()];
}
