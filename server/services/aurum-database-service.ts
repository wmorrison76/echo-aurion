import { getDatabaseClient } from "../lib/database-client";
import type {
  EchoAurumJournalEntry,
  PayrollAurumPosting,
  EchoAurumPostingStatus,
} from "./payroll-echoaurum-poster";

export type PayrollPostingKey = {
  org_id: string;
  outlet_id: string;
  payroll_run_id: string;
};

function safeIdComponent(value: string): string {
  return encodeURIComponent(value).replace(/%/g, "_");
}

export function buildPayrollPostingId(key: PayrollPostingKey): string {
  return `pp_${safeIdComponent(key.org_id)}_${safeIdComponent(key.outlet_id)}_${safeIdComponent(key.payroll_run_id)}`;
}

function toSqlDate(value: string): string | null {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function isDbConfigured(): boolean {
  return Boolean(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const memory = {
  postings: new Map<string, PayrollAurumPosting>(),
};

export class AurumDatabaseService {
  private static schemaEnsured = false;

  private static async ensureSchema(): Promise<void> {
    if (this.schemaEnsured) return;
    this.schemaEnsured = true;

    if (!isDbConfigured()) return;

    const db = getDatabaseClient();

    const sql = `
      CREATE TABLE IF NOT EXISTS aurum_payroll_postings (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        org_id TEXT NOT NULL,
        outlet_id TEXT NOT NULL,
        payroll_run_id TEXT NOT NULL,
        period_start DATE NULL,
        period_end DATE NULL,
        provider TEXT NULL,
        wages NUMERIC NOT NULL,
        taxes NUMERIC NOT NULL,
        benefits NUMERIC NOT NULL,
        deductions NUMERIC NOT NULL,
        employee_count INTEGER NULL,
        status TEXT NOT NULL,
        error TEXT NULL,
        autopost_result JSONB NULL,
        journal_entry JSONB NOT NULL,
        UNIQUE (org_id, outlet_id, payroll_run_id)
      );
      CREATE INDEX IF NOT EXISTS idx_aurum_payroll_postings_org_outlet_period
        ON aurum_payroll_postings (org_id, outlet_id, period_end, period_start);
    `;

    await db.exec(sql);
  }

  private static keyString(key: PayrollPostingKey): string {
    return `${key.org_id}:${key.outlet_id}:${key.payroll_run_id}`;
  }

  static async upsertPayrollPosting(posting: PayrollAurumPosting): Promise<void> {
    const key: PayrollPostingKey = {
      org_id: posting.org_id,
      outlet_id: posting.outlet_id,
      payroll_run_id: posting.payroll_run_id,
    };

    const memKey = this.keyString(key);
    memory.postings.set(memKey, posting);

    if (!isDbConfigured()) return;

    await this.ensureSchema();

    const db = getDatabaseClient();
    const id = buildPayrollPostingId(key);

    const periodStart = toSqlDate(posting.period_start);
    const periodEnd = toSqlDate(posting.period_end);

    const sql = `
      INSERT INTO aurum_payroll_postings (
        id, created_at, org_id, outlet_id, payroll_run_id,
        period_start, period_end, provider,
        wages, taxes, benefits, deductions, employee_count,
        status, error, autopost_result, journal_entry
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17
      )
      ON CONFLICT (org_id, outlet_id, payroll_run_id)
      DO UPDATE SET
        created_at = EXCLUDED.created_at,
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        provider = EXCLUDED.provider,
        wages = EXCLUDED.wages,
        taxes = EXCLUDED.taxes,
        benefits = EXCLUDED.benefits,
        deductions = EXCLUDED.deductions,
        employee_count = EXCLUDED.employee_count,
        status = EXCLUDED.status,
        error = EXCLUDED.error,
        autopost_result = EXCLUDED.autopost_result,
        journal_entry = EXCLUDED.journal_entry;
    `;

    await db.exec(sql, [
      id,
      posting.createdAt,
      posting.org_id,
      posting.outlet_id,
      posting.payroll_run_id,
      periodStart,
      periodEnd,
      posting.provider ?? null,
      posting.wages,
      posting.taxes,
      posting.benefits,
      posting.deductions,
      posting.employee_count ?? null,
      posting.status,
      posting.error ?? null,
      posting.autoPostResult ? JSON.stringify(posting.autoPostResult) : null,
      JSON.stringify(posting.journalEntry),
    ]);
  }

  static async getPayrollPosting(
    key: PayrollPostingKey,
  ): Promise<PayrollAurumPosting | null> {
    const memKey = this.keyString(key);
    const cached = memory.postings.get(memKey);
    if (cached) return cached;

    if (!isDbConfigured()) return null;
    await this.ensureSchema();

    const db = getDatabaseClient();
    const row = await db.queryOne<any>(
      `
      SELECT *
      FROM aurum_payroll_postings
      WHERE org_id = $1 AND outlet_id = $2 AND payroll_run_id = $3
      LIMIT 1
      `,
      [key.org_id, key.outlet_id, key.payroll_run_id],
    );

    if (!row) return null;

    const posting = this.deserializePosting(row);
    memory.postings.set(memKey, posting);
    return posting;
  }

  static async hasPayrollPosting(key: PayrollPostingKey): Promise<boolean> {
    if (memory.postings.has(this.keyString(key))) return true;
    if (!isDbConfigured()) return false;

    await this.ensureSchema();

    const db = getDatabaseClient();
    const row = await db.queryOne<any>(
      `
      SELECT id
      FROM aurum_payroll_postings
      WHERE org_id = $1 AND outlet_id = $2 AND payroll_run_id = $3
      LIMIT 1
      `,
      [key.org_id, key.outlet_id, key.payroll_run_id],
    );

    return Boolean(row);
  }

  static async listPayrollPostings(params: {
    org_id: string;
    outlet_id?: string;
    status?: EchoAurumPostingStatus;
    limit?: number;
    offset?: number;
  }): Promise<PayrollAurumPosting[]> {
    const { org_id, outlet_id, status, limit = 50, offset = 0 } = params;

    if (!isDbConfigured()) {
      const all = Array.from(memory.postings.values()).filter((p) => p.org_id === org_id);
      const byOutlet = outlet_id ? all.filter((p) => p.outlet_id === outlet_id) : all;
      const byStatus = status ? byOutlet.filter((p) => p.status === status) : byOutlet;
      return byStatus.slice(offset, offset + limit);
    }

    await this.ensureSchema();
    const db = getDatabaseClient();

    const hasStatus = typeof status === "string" && status.length > 0;

    const sql = outlet_id
      ? hasStatus
        ? `
          SELECT *
          FROM aurum_payroll_postings
          WHERE org_id = $1 AND outlet_id = $2 AND status = $3
          ORDER BY created_at DESC
          LIMIT $4 OFFSET $5
        `
        : `
          SELECT *
          FROM aurum_payroll_postings
          WHERE org_id = $1 AND outlet_id = $2
          ORDER BY created_at DESC
          LIMIT $3 OFFSET $4
        `
      : hasStatus
        ? `
          SELECT *
          FROM aurum_payroll_postings
          WHERE org_id = $1 AND status = $2
          ORDER BY created_at DESC
          LIMIT $3 OFFSET $4
        `
        : `
          SELECT *
          FROM aurum_payroll_postings
          WHERE org_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `;

    const paramsArr = outlet_id
      ? hasStatus
        ? [org_id, outlet_id, status, limit, offset]
        : [org_id, outlet_id, limit, offset]
      : hasStatus
        ? [org_id, status, limit, offset]
        : [org_id, limit, offset];

    const rows = await db.query<any>(sql, paramsArr);
    const postings = rows.map((r) => this.deserializePosting(r));

    for (const p of postings) {
      memory.postings.set(
        this.keyString({ org_id: p.org_id, outlet_id: p.outlet_id, payroll_run_id: p.payroll_run_id }),
        p,
      );
    }

    return postings;
  }

  static async getPayrollPostingById(params: {
    org_id: string;
    posting_id: string;
  }): Promise<PayrollAurumPosting | null> {
    const { org_id, posting_id } = params;

    const inMemory = Array.from(memory.postings.values()).find(
      (p) => p.org_id === org_id && p.id === posting_id,
    );
    if (inMemory) return inMemory;

    if (!isDbConfigured()) return null;
    await this.ensureSchema();

    const db = getDatabaseClient();
    const row = await db.queryOne<any>(
      `
      SELECT *
      FROM aurum_payroll_postings
      WHERE org_id = $1 AND id = $2
      LIMIT 1
      `,
      [org_id, posting_id],
    );

    if (!row) return null;

    const posting = this.deserializePosting(row);
    memory.postings.set(this.keyString({
      org_id: posting.org_id,
      outlet_id: posting.outlet_id,
      payroll_run_id: posting.payroll_run_id,
    }), posting);

    return posting;
  }

  static async updatePayrollPostingStatusById(params: {
    org_id: string;
    posting_id: string;
    status: EchoAurumPostingStatus;
    error?: string | null;
    actor?: string;
    reason?: string;
  }): Promise<PayrollAurumPosting | null> {
    const { org_id, posting_id, status, error } = params;

    const existing = await this.getPayrollPostingById({ org_id, posting_id });
    if (!existing) return null;

    const updated: PayrollAurumPosting = {
      ...existing,
      status,
      error: error ?? undefined,
      autoPostResult: {
        posted: status === "posted",
        autoPosted: false,
        requiresApproval: status === "requires_approval",
        guardianRiskScore: existing.autoPostResult?.guardianRiskScore ?? 0,
        reason: params.reason || (status === "posted" ? "Manually approved" : "Manually updated"),
        timestamp: new Date().toISOString(),
      },
    };

    await this.upsertPayrollPosting(updated);
    return updated;
  }

  static async sumPayrollLaborCost(params: {
    org_id: string;
    outlet_id: string;
    start_date: string;
    end_date: string;
  }): Promise<number> {
    const { org_id, outlet_id, start_date, end_date } = params;

    if (!isDbConfigured()) {
      const start = toSqlDate(start_date);
      const end = toSqlDate(end_date);
      if (!start || !end) return 0;

      let sum = 0;
      for (const posting of memory.postings.values()) {
        if (posting.org_id !== org_id) continue;
        if (posting.outlet_id !== outlet_id) continue;
        const pe = toSqlDate(posting.period_end) ?? toSqlDate(posting.period_start);
        if (!pe) continue;
        if (pe < start || pe > end) continue;
        sum += posting.wages + posting.taxes + posting.benefits;
      }
      return sum;
    }

    await this.ensureSchema();

    const db = getDatabaseClient();
    const start = toSqlDate(start_date);
    const end = toSqlDate(end_date);
    if (!start || !end) return 0;

    const row = await db.queryOne<any>(
      `
      SELECT COALESCE(SUM(wages + taxes + benefits), 0) AS total
      FROM aurum_payroll_postings
      WHERE org_id = $1
        AND outlet_id = $2
        AND COALESCE(period_end::TEXT, period_start::TEXT, '') >= $3
        AND COALESCE(period_end::TEXT, period_start::TEXT, '') <= $4
      `,
      [org_id, outlet_id, start, end],
    );

    const total = typeof row?.total === "number" ? row.total : Number(row?.total ?? 0);
    return Number.isFinite(total) ? total : 0;
  }

  static async storeJournalEntry(entry: EchoAurumJournalEntry, meta: { org_id: string }): Promise<void> {
    if (!isDbConfigured()) return;

    await this.ensureSchema();
    const db = getDatabaseClient();

    const sql = `
      CREATE TABLE IF NOT EXISTS aurum_journal_entries (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        org_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        period_date DATE NOT NULL,
        source TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        description TEXT NOT NULL,
        total_debits NUMERIC NOT NULL,
        total_credits NUMERIC NOT NULL,
        is_balanced BOOLEAN NOT NULL,
        entry JSONB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_aurum_journal_entries_org_entity_period
        ON aurum_journal_entries (org_id, entity_id, period_date);
    `;

    await db.exec(sql);

    const periodDate = toSqlDate(entry.periodDate) ?? new Date().toISOString().slice(0, 10);

    await db.exec(
      `
      INSERT INTO aurum_journal_entries (
        id, created_at, org_id, entity_id, period_date, source,
        reference_id, description, total_debits, total_credits, is_balanced, entry
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      )
      ON CONFLICT (id)
      DO UPDATE SET
        entry = EXCLUDED.entry,
        total_debits = EXCLUDED.total_debits,
        total_credits = EXCLUDED.total_credits,
        is_balanced = EXCLUDED.is_balanced,
        description = EXCLUDED.description;
      `,
      [
        entry.id,
        new Date().toISOString(),
        meta.org_id,
        entry.entityId,
        periodDate,
        entry.source,
        entry.referenceId,
        entry.description,
        entry.totalDebits,
        entry.totalCredits,
        entry.isBalanced,
        JSON.stringify(entry),
      ],
    );
  }

  private static deserializePosting(row: any): PayrollAurumPosting {
    const journalEntryRaw = row.journal_entry ?? row.journalEntry ?? row.journal_entry_json;
    const parsedJournalEntry =
      typeof journalEntryRaw === "string" ? (JSON.parse(journalEntryRaw) as EchoAurumJournalEntry) : (journalEntryRaw as EchoAurumJournalEntry);

    const autoPostRaw = row.autopost_result ?? row.autoPostResult;
    const parsedAutoPost =
      typeof autoPostRaw === "string" ? (JSON.parse(autoPostRaw) as PayrollAurumPosting["autoPostResult"]) : (autoPostRaw as PayrollAurumPosting["autoPostResult"]);

    return {
      id: String(row.id ?? buildPayrollPostingId({ org_id: row.org_id, outlet_id: row.outlet_id, payroll_run_id: row.payroll_run_id })),
      createdAt: new Date(row.created_at ?? row.createdAt ?? new Date().toISOString()).toISOString(),
      org_id: String(row.org_id),
      outlet_id: String(row.outlet_id),
      payroll_run_id: String(row.payroll_run_id),
      period_start: String(row.period_start ?? row.period_start_date ?? row.period_start ?? ""),
      period_end: String(row.period_end ?? row.period_end_date ?? row.period_end ?? ""),
      provider: row.provider ? String(row.provider) : undefined,
      wages: Number(row.wages ?? 0),
      taxes: Number(row.taxes ?? 0),
      benefits: Number(row.benefits ?? 0),
      deductions: Number(row.deductions ?? 0),
      employee_count:
        row.employee_count == null ? undefined : Number.isFinite(Number(row.employee_count)) ? Number(row.employee_count) : undefined,
      journalEntry: parsedJournalEntry,
      status: row.status,
      autoPostResult: parsedAutoPost ?? undefined,
      error: row.error ? String(row.error) : undefined,
    };
  }
}
