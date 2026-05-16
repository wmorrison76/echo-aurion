/**
 * Genesis D — Aurum Journal Entry (Minimal v1)
 * A single entry can produce COGS debit for one or more locations
 * and optional internal credit to producer.
 */

export type AurumJournalLine = {
  locationId: string;
  type: "COGS_DEBIT" | "INTERNAL_CREDIT" | "INVENTORY_DELTA";
  amount: number;
  memo: string;
};

export type AurumJournalEntry = {
  entryId: string;
  createdAtISO: string;

  sourceType: "PROCUREMENT_PLAN" | "INTERNAL_FULFILLMENT" | "ADJUSTMENT";
  sourceId: string;

  note: string;

  lines: AurumJournalLine[];
};
