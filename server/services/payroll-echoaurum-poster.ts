import { financialEventEmitter, type FinancialEventPayload } from "../lib/financial-event-emitter";
import { logger } from "../lib/logger";
import { writeAudit } from "../lib/audit-log";
import { AutoPostEngine } from "./autoPostEngine";
import {
  AurumDatabaseService,
  buildPayrollPostingId,
} from "./aurum-database-service";

export type EchoAurumPostingStatus =
  | "created"
  | "posted"
  | "requires_approval"
  | "failed";

export interface EchoAurumJournalLine {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  memo?: string;
}

export interface EchoAurumJournalEntry {
  id: string;
  entityId: string;
  periodDate: string;
  source: "payroll";
  referenceId: string;
  description: string;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  lines: EchoAurumJournalLine[];
}

export interface PayrollAurumPosting {
  id: string;
  createdAt: string;
  org_id: string;
  outlet_id: string;
  payroll_run_id: string;
  period_start: string;
  period_end: string;
  provider?: string;
  wages: number;
  taxes: number;
  benefits: number;
  deductions: number;
  employee_count?: number;
  journalEntry: EchoAurumJournalEntry;
  status: EchoAurumPostingStatus;
  autoPostResult?: {
    posted: boolean;
    autoPosted: boolean;
    requiresApproval: boolean;
    guardianRiskScore: number;
    reason: string;
    timestamp: string;
  };
  error?: string;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function formatPeriodDate(periodEnd: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) return periodEnd;
  const d = new Date(periodEnd);
  if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function getAurumBaseUrl(): string | null {
  const base =
    process.env.AURUM_BASE_URL ||
    process.env.VITE_AURUM_BASE_URL ||
    process.env.ECHOAURUM_BASE_URL;
  if (typeof base !== "string") return null;
  const trimmed = base.trim().replace(/\/$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

function getAurumApiKey(): string | null {
  const key = process.env.AURUM_API_KEY || process.env.ECHOAURUM_API_KEY;
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function postToExternalAurum(
  posting: PayrollAurumPosting,
): Promise<{ createdEntryId: string; posted: boolean } | null> {
  const baseUrl = getAurumBaseUrl();
  if (!baseUrl) return null;

  const apiKey = getAurumApiKey();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "idempotency-key": posting.payroll_run_id,
    "x-luccca-system": "payroll-echoaurum-poster",
  };

  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const createRes = await fetch(`${baseUrl}/api/aurum/journal-entries`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      entityId: posting.journalEntry.entityId,
      periodDate: posting.journalEntry.periodDate,
      source: "payroll",
      referenceId: posting.journalEntry.referenceId,
      description: posting.journalEntry.description,
      createdBy: "payroll-system",
      lines: posting.journalEntry.lines,
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    throw new Error(
      `EchoAurum create failed (${createRes.status}): ${body || createRes.statusText}`,
    );
  }

  const createdJson: any = await createRes.json().catch(() => null);
  const createdEntryId =
    createdJson?.entry?.id || createdJson?.id || posting.journalEntry.id;

  const postRes = await fetch(
    `${baseUrl}/api/aurum/journal-entries/${encodeURIComponent(createdEntryId)}/post`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ approvedBy: "payroll-system" }),
    },
  );

  if (!postRes.ok) {
    const body = await postRes.text().catch(() => "");
    throw new Error(
      `EchoAurum post failed (${postRes.status}): ${body || postRes.statusText}`,
    );
  }

  return { createdEntryId, posted: true };
}

export class PayrollEchoAurumPoster {
  private static initialized = false;
  private static postingsByKey = new Map<string, PayrollAurumPosting>();
  private static postingKeysByOrg = new Map<string, string[]>();

  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    financialEventEmitter.onFinancialEvent("payroll:run-posted", (event) =>
      this.handlePayrollRunPosted(event),
    );

    logger.info("[PayrollEchoAurumPoster] Initialized");
  }

  static getPosting(
    org_id: string,
    outlet_id: string,
    payroll_run_id: string,
  ): PayrollAurumPosting | null {
    const key = this.buildKey(org_id, outlet_id, payroll_run_id);
    return this.postingsByKey.get(key) ?? null;
  }

  static listPostings(
    org_id: string,
    outlet_id?: string,
    limit: number = 50,
    offset: number = 0,
  ): PayrollAurumPosting[] {
    const keys = this.postingKeysByOrg.get(org_id) ?? [];
    const filteredKeys = outlet_id
      ? keys.filter((k) => k.includes(`:${outlet_id}:`))
      : keys;

    return filteredKeys
      .slice(offset, offset + limit)
      .map((k) => this.postingsByKey.get(k))
      .filter((p): p is PayrollAurumPosting => Boolean(p));
  }

  private static buildKey(
    org_id: string,
    outlet_id: string,
    payroll_run_id: string,
  ): string {
    return `${org_id}:${outlet_id}:${payroll_run_id}`;
  }

  private static rememberPosting(key: string, posting: PayrollAurumPosting) {
    this.postingsByKey.set(key, posting);

    const existing = this.postingKeysByOrg.get(posting.org_id) ?? [];
    this.postingKeysByOrg.set(posting.org_id, [key, ...existing]);
  }

  private static async handlePayrollRunPosted(
    event: FinancialEventPayload,
  ): Promise<void> {
    const data = event.data ?? {};

    const payroll_run_id =
      typeof data.payroll_run_id === "string" ? data.payroll_run_id : null;

    if (!payroll_run_id) {
      logger.warn("[PayrollEchoAurumPoster] Missing payroll_run_id", {
        outlet_id: event.outlet_id,
        org_id: event.org_id,
      });
      return;
    }

    const key = this.buildKey(event.org_id, event.outlet_id, payroll_run_id);
    if (this.postingsByKey.has(key)) {
      return;
    }

    const wages = isNonNegativeFiniteNumber(data.wages) ? data.wages : 0;
    const taxes = isNonNegativeFiniteNumber(data.taxes) ? data.taxes : 0;
    const benefits = isNonNegativeFiniteNumber(data.benefits) ? data.benefits : 0;

    const rawDeductions = isNonNegativeFiniteNumber(data.deductions)
      ? data.deductions
      : 0;

    const deductions = Math.min(rawDeductions, wages);

    const period_start =
      typeof data.period_start === "string" ? data.period_start : "";
    const period_end = typeof data.period_end === "string" ? data.period_end : "";

    const entityId = event.outlet_id;
    const periodDate = formatPeriodDate(period_end || period_start);

    const journalEntry = this.buildPayrollAccrualJournalEntry({
      org_id: event.org_id,
      outlet_id: event.outlet_id,
      payroll_run_id,
      periodDate,
      wages,
      taxes,
      benefits,
      deductions,
      provider: typeof data.provider === "string" ? data.provider : undefined,
    });

    const postingId = buildPayrollPostingId({
      org_id: event.org_id,
      outlet_id: event.outlet_id,
      payroll_run_id,
    });

    const posting: PayrollAurumPosting = {
      id: postingId,
      createdAt: new Date().toISOString(),
      org_id: event.org_id,
      outlet_id: event.outlet_id,
      payroll_run_id,
      period_start,
      period_end,
      provider: typeof data.provider === "string" ? data.provider : undefined,
      wages,
      taxes,
      benefits,
      deductions,
      employee_count:
        typeof data.employee_count === "number" && Number.isFinite(data.employee_count)
          ? data.employee_count
          : undefined,
      journalEntry: { ...journalEntry, entityId },
      status: "created",
    };

    this.rememberPosting(key, posting);

    const existing = await AurumDatabaseService.getPayrollPosting({
      org_id: event.org_id,
      outlet_id: event.outlet_id,
      payroll_run_id,
    });

    if (existing) {
      this.postingsByKey.set(key, existing);
      return;
    }

    await AurumDatabaseService.upsertPayrollPosting(posting);
    await AurumDatabaseService.storeJournalEntry(posting.journalEntry, {
      org_id: event.org_id,
    });

    writeAudit({
      actor: "system-payroll",
      action: "echoaurum.payroll.accrual.created",
      target: `${event.outlet_id}:${payroll_run_id}`,
      severity: "info",
      details: `Created payroll accrual journal entry for outlet ${event.outlet_id}`,
    });

    try {
      const total = wages + taxes + benefits;
      const autoPost = await AutoPostEngine.processAndAutoPost({
        transactionId: journalEntry.id,
        transactionType: "journal_entry",
        transaction: {
          id: journalEntry.id,
          glAccountId: "6100",
          amount: total,
          description: journalEntry.description,
          transactionType: "payroll_accrual",
          date: new Date(event.timestamp),
          entityId,
          referenceId: payroll_run_id,
        },
        entityId,
        userId: "system-payroll",
      });

      posting.autoPostResult = {
        posted: autoPost.posted,
        autoPosted: autoPost.autoPosted,
        requiresApproval: autoPost.requiresApproval,
        guardianRiskScore: autoPost.guardianRiskScore,
        reason: autoPost.reason,
        timestamp: autoPost.timestamp.toISOString(),
      };

      if (autoPost.autoPosted) {
        posting.status = "posted";
      } else if (autoPost.requiresApproval) {
        posting.status = "requires_approval";
      }

      try {
        await postToExternalAurum(posting);
      } catch (externalError) {
        logger.warn("[PayrollEchoAurumPoster] External EchoAurum post failed", {
          outlet_id: event.outlet_id,
          payroll_run_id,
          error:
            externalError instanceof Error
              ? externalError.message
              : String(externalError),
        });
      }

      await AurumDatabaseService.upsertPayrollPosting(posting);

      writeAudit({
        actor: "system-payroll",
        action: "echoaurum.payroll.accrual.processed",
        target: `${event.outlet_id}:${payroll_run_id}`,
        severity: posting.status === "posted" ? "info" : "warn",
        details: posting.autoPostResult.reason,
      });
    } catch (error) {
      posting.status = "failed";
      posting.error = error instanceof Error ? error.message : String(error);

      await AurumDatabaseService.upsertPayrollPosting(posting);

      writeAudit({
        actor: "system-payroll",
        action: "echoaurum.payroll.accrual.failed",
        target: `${event.outlet_id}:${payroll_run_id}`,
        severity: "danger",
        details: posting.error,
      });

      logger.error("[PayrollEchoAurumPoster] Failed to process payroll event", {
        outlet_id: event.outlet_id,
        payroll_run_id,
        error: posting.error,
      });
    }
  }

  private static buildPayrollAccrualJournalEntry(input: {
    org_id: string;
    outlet_id: string;
    payroll_run_id: string;
    periodDate: string;
    wages: number;
    taxes: number;
    benefits: number;
    deductions: number;
    provider?: string;
  }): Omit<EchoAurumJournalEntry, "entityId"> {
    const wagesPayable = Math.max(0, input.wages - input.deductions);

    const lines: EchoAurumJournalLine[] = [
      {
        accountCode: "6100",
        accountName: "Wages Expense",
        debitAmount: input.wages,
        creditAmount: 0,
        memo: `Payroll run ${input.payroll_run_id}`,
      },
      {
        accountCode: "6200",
        accountName: "Payroll Tax Expense",
        debitAmount: input.taxes,
        creditAmount: 0,
        memo: `Payroll taxes for ${input.payroll_run_id}`,
      },
      {
        accountCode: "6300",
        accountName: "Benefits Expense",
        debitAmount: input.benefits,
        creditAmount: 0,
        memo: `Payroll benefits for ${input.payroll_run_id}`,
      },
      {
        accountCode: "2100",
        accountName: "Wages Payable",
        debitAmount: 0,
        creditAmount: wagesPayable,
        memo: `Accrued wages for ${input.payroll_run_id}`,
      },
      {
        accountCode: "2110",
        accountName: "Payroll Taxes Payable",
        debitAmount: 0,
        creditAmount: input.taxes,
        memo: `Accrued payroll taxes for ${input.payroll_run_id}`,
      },
      {
        accountCode: "2120",
        accountName: "Benefits Payable",
        debitAmount: 0,
        creditAmount: input.benefits,
        memo: `Accrued benefits for ${input.payroll_run_id}`,
      },
    ];

    if (input.deductions > 0) {
      lines.push({
        accountCode: "2130",
        accountName: "Employee Deductions Payable",
        debitAmount: 0,
        creditAmount: input.deductions,
        memo: `Employee deductions for ${input.payroll_run_id}`,
      });
    }

    const totalDebits = lines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredits = lines.reduce((sum, l) => sum + l.creditAmount, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    return {
      id: `je_payroll_${input.payroll_run_id}`,
      periodDate: input.periodDate,
      source: "payroll",
      referenceId: input.payroll_run_id,
      description: `Payroll accrual (${input.provider || "provider"}) — ${input.outlet_id}`,
      totalDebits,
      totalCredits,
      isBalanced,
      lines,
    };
  }
}
