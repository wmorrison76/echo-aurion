import { mapLedgerAccount } from "./usali";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "MXN";
export type AccountNature =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense"
  | "contra";
export interface LedgerOutlet {
  id: string;
  name: string;
  propertyCode: string;
  brand: string;
  timezone: string;
  currency: CurrencyCode;
  segments: string[];
}
export interface LedgerCostCenter {
  id: string;
  outletId: string;
  name: string;
  category: string;
}
export interface LedgerVendor {
  id: string;
  name: string;
  category: string;
  paymentTermsDays: number;
}
export interface LedgerAccount {
  id: string;
  number: string;
  name: string;
  nature: AccountNature;
  parentAccountId?: string;
  outletScoped?: boolean;
  currency?: CurrencyCode;
}
export interface JournalEntryLine {
  accountId: string;
  accountNumber: string;
  description?: string;
  debit: number;
  credit: number;
  outletId?: string;
  costCenterId?: string;
}
export interface JournalEntrySource {
  system: string;
  referenceId: string;
  type: "invoice" | "payment" | "journal" | "sales" | "payroll" | "adjustment";
}
export interface JournalEntry {
  id: string;
  ledgerId: string;
  postedAt: string;
  memo?: string;
  lines: JournalEntryLine[];
  source: JournalEntrySource;
  createdBy: string;
}
export type InvoiceStatus =
  | "draft"
  | "pending"
  | "approved"
  | "scheduled"
  | "paid"
  | "void";
export interface LedgerInvoice {
  id: string;
  ledgerId: string;
  vendorId: string;
  outletId: string;
  costCenterId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: CurrencyCode;
  amount: number;
  status: InvoiceStatus;
  approvalRoute: string[];
  description?: string;
}
export interface LedgerPayment {
  id: string;
  ledgerId: string;
  invoiceId: string;
  scheduledDate: string;
  paidDate?: string;
  amount: number;
  currency: CurrencyCode;
  method: "ach" | "wire" | "check" | "card";
  status: "scheduled" | "processing" | "completed" | "cancelled";
}
export interface OutletDailySales {
  ledgerId: string;
  outletId: string;
  businessDate: string;
  roomsRevenue: number;
  fnbRevenue: number;
  otherRevenue: number;
  taxes: number;
  covers?: number;
}
export interface OutletDailyLabor {
  ledgerId: string;
  outletId: string;
  businessDate: string;
  department: string;
  hours: number;
  wages: number;
}
export interface LedgerPnLLine {
  outletId: string;
  costCenterId?: string;
  accountNumber: string;
  amount: number;
  period: string;
}
export interface LedgerContext {
  ledgerId: string;
  name: string;
  currency: CurrencyCode;
  outlets: LedgerOutlet[];
  costCenters: LedgerCostCenter[];
  accounts: LedgerAccount[];
  vendors: LedgerVendor[];
  journals: JournalEntry[];
  invoices: LedgerInvoice[];
  payments: LedgerPayment[];
  dailySales: OutletDailySales[];
  dailyLabor: OutletDailyLabor[];
  pnlLines: LedgerPnLLine[];
}
export interface AccountBalance {
  accountId: string;
  accountNumber: string;
  accountName: string;
  nature: AccountNature;
  balance: number;
  debits: number;
  credits: number;
  usaliSegment?: ReturnType<typeof mapLedgerAccount>;
}
export interface OutletSnapshot {
  outletId: string;
  name: string;
  dailySales: Array<OutletDailySales & { netSales: number }>;
  openInvoices: LedgerInvoice[];
  payableBalance: number;
  pnl: OutletPnLSummary;
}
export interface OutletPnLSummary {
  outletId: string;
  period: string;
  revenue: number;
  payroll: number;
  costOfGoods: number;
  operatingExpenses: number;
  contributionMargin: number;
}
export interface PaymentScheduleSummary {
  upcoming: LedgerPayment[];
  overdueInvoices: LedgerInvoice[];
  payableAging: AgingBucket[];
}
export interface AgingBucket {
  label: string;
  total: number;
  invoiceIds: string[];
}
export interface LedgerExplorer {
  ledger: Pick<LedgerContext, "ledgerId" | "name" | "currency">;
  accounts: AccountBalance[];
  invoices: LedgerInvoice[];
  payments: PaymentScheduleSummary;
  outlets: OutletSnapshot[];
}
export function buildLedgerExplorer(context: LedgerContext): LedgerExplorer {
  const accountIndex = new Map(
    context.accounts.map((account) => [account.id, account]),
  );
  const balanceMap = new Map<string, AccountBalance>();
  for (const journal of context.journals) {
    for (const line of journal.lines) {
      const account = accountIndex.get(line.accountId);
      if (!account) {
        continue;
      }
      const entry =
        balanceMap.get(line.accountId) ??
        ({
          accountId: account.id,
          accountNumber: account.number,
          accountName: account.name,
          nature: account.nature,
          balance: 0,
          debits: 0,
          credits: 0,
          usaliSegment:
            mapLedgerAccount({
              account: account.number,
              alias: account.name,
            }) ?? undefined,
        } satisfies AccountBalance);
      entry.debits += line.debit;
      entry.credits += line.credit;
      entry.balance += line.debit - line.credit;
      balanceMap.set(line.accountId, entry);
    }
  }
  const accounts = [...balanceMap.values()].sort((a, b) =>
    a.accountNumber.localeCompare(b.accountNumber),
  );
  const now = new Date();
  const paymentsByInvoice = new Map(
    context.payments.map((payment) => [payment.invoiceId, payment]),
  );
  const overdueInvoices = context.invoices.filter((invoice) => {
    if (invoice.status === "paid") {
      return false;
    }
    const due = new Date(invoice.dueDate);
    return due.getTime() < now.getTime();
  });
  const agingBuckets: AgingBucket[] = [
    { label: "Current", total: 0, invoiceIds: [] },
    { label: "1-30", total: 0, invoiceIds: [] },
    { label: "31-60", total: 0, invoiceIds: [] },
    { label: "61-90", total: 0, invoiceIds: [] },
    { label: "90+", total: 0, invoiceIds: [] },
  ];
  for (const invoice of context.invoices) {
    if (invoice.status === "paid") {
      continue;
    }
    const dueDate = new Date(invoice.dueDate);
    const diffDays = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const amount = invoice.amount;
    let bucketIndex = 0;
    if (diffDays <= 0) {
      bucketIndex = 0;
    } else if (diffDays <= 30) {
      bucketIndex = 1;
    } else if (diffDays <= 60) {
      bucketIndex = 2;
    } else if (diffDays <= 90) {
      bucketIndex = 3;
    } else {
      bucketIndex = 4;
    }
    agingBuckets[bucketIndex].total += amount;
    agingBuckets[bucketIndex].invoiceIds.push(invoice.id);
  }
  const upcomingPayments = context.payments
    .filter(
      (payment) =>
        payment.status === "scheduled" || payment.status === "processing",
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() -
        new Date(b.scheduledDate).getTime(),
    )
    .slice(0, 20);
  const outletIndex = new Map(
    context.outlets.map((outlet) => [outlet.id, outlet]),
  );
  const pnlByOutlet = aggregateOutletPnL(context);
  const outletSnapshots: OutletSnapshot[] = context.outlets.map((outlet) => {
    const openInvoices = context.invoices.filter(
      (invoice) => invoice.outletId === outlet.id && invoice.status !== "paid",
    );
    const payableBalance = openInvoices.reduce(
      (sum, invoice) => sum + invoice.amount,
      0,
    );
    const dailySales = context.dailySales
      .filter((sale) => sale.outletId === outlet.id)
      .map((sale) => ({
        ...sale,
        netSales:
          sale.roomsRevenue + sale.fnbRevenue + sale.otherRevenue - sale.taxes,
      }));
    return {
      outletId: outlet.id,
      name: outlet.name,
      dailySales,
      openInvoices,
      payableBalance,
      pnl: pnlByOutlet.get(outlet.id) ?? {
        outletId: outlet.id,
        period: "",
        revenue: 0,
        payroll: 0,
        costOfGoods: 0,
        operatingExpenses: 0,
        contributionMargin: 0,
      },
    } satisfies OutletSnapshot;
  });
  return {
    ledger: {
      ledgerId: context.ledgerId,
      name: context.name,
      currency: context.currency,
    },
    accounts,
    invoices: context.invoices,
    payments: {
      upcoming: upcomingPayments,
      overdueInvoices,
      payableAging: agingBuckets,
    },
    outlets: outletSnapshots,
  } satisfies LedgerExplorer;
}
function aggregateOutletPnL(context: LedgerContext) {
  const result = new Map<string, OutletPnLSummary>();
  for (const line of context.pnlLines) {
    const outlet =
      result.get(line.outletId) ??
      ({
        outletId: line.outletId,
        period: line.period,
        revenue: 0,
        payroll: 0,
        costOfGoods: 0,
        operatingExpenses: 0,
        contributionMargin: 0,
      } satisfies OutletPnLSummary);
    const mapping = mapLedgerAccount({
      account: line.accountNumber,
      alias: line.accountNumber,
    });
    const statement = mapping?.statement ?? "income";
    const department = mapping?.segment.department ?? "";
    const lineItem = mapping?.segment.lineItem ?? "";
    if (statement === "income") {
      if (
        department.toLowerCase().includes("payroll") ||
        lineItem.toLowerCase().includes("payroll")
      ) {
        outlet.payroll += line.amount;
      } else if (
        lineItem.toLowerCase().includes("cost") ||
        line.accountNumber.startsWith("52")
      ) {
        outlet.costOfGoods += line.amount;
      } else if (
        lineItem.toLowerCase().includes("revenue") ||
        line.accountNumber.startsWith("4")
      ) {
        outlet.revenue += line.amount;
      } else {
        outlet.operatingExpenses += line.amount;
      }
    } else {
      outlet.operatingExpenses += line.amount;
    }
    result.set(line.outletId, outlet);
  }
  for (const summary of result.values()) {
    summary.contributionMargin =
      summary.revenue -
      summary.payroll -
      summary.costOfGoods -
      summary.operatingExpenses;
  }
  return result;
}
