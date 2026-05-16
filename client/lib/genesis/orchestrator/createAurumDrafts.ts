/**
 * Create Aurum Journal Drafts from Procurement Lines
 * Maps cost attribution modes to journal entries
 */

import type {
  ProcurementLine,
  AurumDraft,
} from "@/../shared/types/genesis-procurement";
import type { GenesisConfig } from "@/../shared/types/genesis-config";

export interface JournalDraftGroup {
  account: string;
  costCenter: string;
  draftEntries: AurumDraft[];
  totalAmount: number;
}

/**
 * Create Aurum journal drafts from procurement lines
 */
export function createAurumDrafts(
  lines: ProcurementLine[],
  config: GenesisConfig,
): AurumDraft[] {
  const drafts: AurumDraft[] = [];

  lines.forEach((line) => {
    const outlet = config.outlets.find((o) => o.id === line.locationId);
    if (!outlet) return;

    // Determine account and cost center based on outlet
    const account = outlet.type === "COMMISSARY" ? "5000" : "5010";
    const costCenter = outlet.id;

    let attributionMode = line.costAttributionMode;
    let payingEntityId = line.costAttributionPayerId || line.locationId;

    // Create journal entry based on cost attribution mode
    switch (attributionMode) {
      case "SOURCE_PAYS": {
        // Source location (vendor/supplier) bears the cost
        // Journal: Debit COGS, Credit AP
        drafts.push({
          draftId: `draft_${line.lineId}`,
          journalDate: new Date().toISOString().split("T")[0],
          account: "5000", // COGS
          costCenter: "VENDOR",
          amount: line.totalCost,
          costAttributionMode: "SOURCE_PAYS",
          sourceLineId: line.lineId,
          notes: `Procurement from vendor for ${line.itemName}`,
        });
        break;
      }

      case "REQUESTING_OUTLET_PAYS": {
        // Requesting outlet bears the cost
        // Journal: Debit outlet cost center, Credit AP
        drafts.push({
          draftId: `draft_${line.lineId}_requesting`,
          journalDate: new Date().toISOString().split("T")[0],
          account,
          costCenter: payingEntityId,
          amount: line.totalCost,
          costAttributionMode: "REQUESTING_OUTLET_PAYS",
          sourceLineId: line.lineId,
          notes: `Procurement for ${line.itemName} charged to requesting outlet`,
        });
        break;
      }

      case "SPLIT": {
        // Split cost between source and requesting outlet
        // Journal: Split into two entries
        const splitAmount = Math.round(line.totalCost / 2);
        const remainder = line.totalCost - splitAmount;

        drafts.push({
          draftId: `draft_${line.lineId}_source_split`,
          journalDate: new Date().toISOString().split("T")[0],
          account: "5000",
          costCenter: "VENDOR",
          amount: splitAmount,
          costAttributionMode: "SPLIT",
          sourceLineId: line.lineId,
          notes: `Procurement split cost (source share) for ${line.itemName}`,
        });

        drafts.push({
          draftId: `draft_${line.lineId}_outlet_split`,
          journalDate: new Date().toISOString().split("T")[0],
          account,
          costCenter: payingEntityId,
          amount: remainder,
          costAttributionMode: "SPLIT",
          sourceLineId: line.lineId,
          notes: `Procurement split cost (outlet share) for ${line.itemName}`,
        });
        break;
      }
    }
  });

  return drafts;
}

/**
 * Group journal drafts by account and cost center
 */
export function groupJournalDrafts(drafts: AurumDraft[]): JournalDraftGroup[] {
  const grouped = new Map<string, JournalDraftGroup>();

  drafts.forEach((draft) => {
    const key = `${draft.account}_${draft.costCenter}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        account: draft.account,
        costCenter: draft.costCenter,
        draftEntries: [],
        totalAmount: 0,
      });
    }

    const group = grouped.get(key)!;
    group.draftEntries.push(draft);
    group.totalAmount += draft.amount;
  });

  return Array.from(grouped.values());
}

/**
 * Validate journal drafts (basic checks)
 */
export function validateJournalDrafts(drafts: AurumDraft[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  drafts.forEach((draft, idx) => {
    if (!draft.account) {
      errors.push(`Draft ${idx}: Missing account`);
    }
    if (!draft.costCenter) {
      errors.push(`Draft ${idx}: Missing cost center`);
    }
    if (draft.amount <= 0) {
      errors.push(`Draft ${idx}: Invalid amount (${draft.amount})`);
    }
    if (!draft.journalDate) {
      errors.push(`Draft ${idx}: Missing journal date`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate total journal value
 */
export function calculateTotalJournalValue(drafts: AurumDraft[]): number {
  return drafts.reduce((sum, d) => sum + d.amount, 0);
}
