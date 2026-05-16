import { Buffer } from "node:buffer";
import type { JournalEventEnvelope } from "./ledger";
export interface TrialBalanceRow {
  account: string;
  description: string;
  debit: number;
  credit: number;
  net: number;
}
export interface TrialBalanceExport {
  rows: TrialBalanceRow[];
  csv: string;
}
export interface WorkpaperDocument {
  name: string;
  contentType: string;
  data: string; // base64 encoded
}
export interface WorkpaperBundle {
  metadata: Record<string, string>;
  documents: WorkpaperDocument[];
  archive: string; // base64 encoded zip placeholder
}
function aggregateBalances(events: JournalEventEnvelope[]) {
  const balances = new Map<string, { debit: number; credit: number }>();
  for (const event of events) {
    const debit = balances.get(event.payload.debitAccount) ?? {
      debit: 0,
      credit: 0,
    };
    debit.debit += event.payload.amount;
    balances.set(event.payload.debitAccount, debit);
    const credit = balances.get(event.payload.creditAccount) ?? {
      debit: 0,
      credit: 0,
    };
    credit.credit += event.payload.amount;
    balances.set(event.payload.creditAccount, credit);
  }
  return balances;
}
function buildCsv(rows: TrialBalanceRow[]) {
  const header = "Account,Description,Debit,Credit,Net";
  const body = rows
    .map((row) =>
      [
        row.account,
        row.description,
        row.debit.toFixed(2),
        row.credit.toFixed(2),
        row.net.toFixed(2),
      ].join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}
export function generateTrialBalanceExport(
  events: JournalEventEnvelope[],
  descriptions: Record<string, string> = {},
): TrialBalanceExport {
  const balances = aggregateBalances(events);
  const rows: TrialBalanceRow[] = [...balances.entries()]
    .map(([account, value]) => ({
      account,
      description: descriptions[account] ?? "",
      debit: value.debit,
      credit: value.credit,
      net: value.debit - value.credit,
    }))
    .sort((a, b) => a.account.localeCompare(b.account));
  return { rows, csv: buildCsv(rows) };
}
export interface WorkpaperInputDocument {
  name: string;
  content: string;
  contentType: string;
}
export interface WorkpaperBundleInput {
  ledgerId: string;
  period: string;
  preparedBy: string;
  documents: WorkpaperInputDocument[];
}
export function assembleWorkpaperBundle(
  input: WorkpaperBundleInput,
): WorkpaperBundle {
  const documents = input.documents.map((doc) => ({
    name: doc.name,
    contentType: doc.contentType,
    data: Buffer.from(doc.content, "utf-8").toString("base64"),
  }));
  const archivePayload = {
    ledgerId: input.ledgerId,
    period: input.period,
    preparedBy: input.preparedBy,
    documents,
  };
  const archive = Buffer.from(JSON.stringify(archivePayload), "utf-8").toString(
    "base64",
  );
  return {
    metadata: {
      ledgerId: input.ledgerId,
      period: input.period,
      preparedBy: input.preparedBy,
    },
    documents,
    archive,
  };
}
