/**
 * GL Posting Engine
 *
 * Optimized for real-time GL posting with:
 *  - Batch operations (INSERT multiple lines in one query)
 *  - Non-blocking consolidation triggers
 *  - Connection pooling and caching
 *  - < 50ms posting latency target
 *
 * B2: balance arithmetic now goes through the Money primitive (Decimal.js
 * under the hood) instead of float `reduce` + `Math.abs(d - c) < 0.01`
 * tolerance. Drift that the old check would have masked is either
 * normalized to true equality (under Money) or rejected as a real
 * imbalance — no more silent acceptance of float noise as "balanced".
 *
 * Note on file history: prior to B2 this file was structurally broken
 * (the entire class body lived on one line behind a `// 5 minutes`
 * comment, so nothing actually executed). B2 reformats it cleanly while
 * preserving the original intent. Behavior change: methods that were
 * effectively no-ops now actually run.
 */

import type {
  JournalEntry,
  JournalLine,
  GLAccount,
} from "@shared/aurum";
import { DatabasePool } from "./aurumDatabase";
import {
  sum as sumMoney,
  balanced as balancedMoney,
  fromLegacyNumber,
  toNumber as moneyToNumber,
} from "../../../../../server/lib/money";

export interface PostingResult {
  entryId: string;
  entryNumber: string;
  status: string;
  postedAt: string;
  consolidationTriggered: boolean;
  latencyMs: number;
}

export class GLPostingEngine {
  private accountCache = new Map<string, GLAccount>();
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private pool: DatabasePool) {}

  /**
   * Create journal entry with optimized batch insert for lines.
   * Target: < 20ms.
   */
  async createJournalEntryOptimized(
    entry: Omit<
      JournalEntry,
      "id" | "entryNumber" | "createdAt" | "totalDebits" | "totalCredits" | "isBalanced"
    >,
  ): Promise<JournalEntry> {
    const startTime = Date.now();
    const id = `je_${Date.now()}`;
    const entryNumber = `JE-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`;
    const now = new Date().toISOString();

    // B2: Money-based totals + strict equality balance check.
    const totalDebitsMoney = sumMoney(
      entry.lines.map((line) =>
        fromLegacyNumber(line.debitAmount, "glPostingEngine.line.debitAmount"),
      ),
    );
    const totalCreditsMoney = sumMoney(
      entry.lines.map((line) =>
        fromLegacyNumber(line.creditAmount, "glPostingEngine.line.creditAmount"),
      ),
    );
    const isBalanced = balancedMoney(totalDebitsMoney, totalCreditsMoney);
    if (!isBalanced) {
      throw new Error(
        `Journal entry not balanced. Debits: ${totalDebitsMoney}, Credits: ${totalCreditsMoney}`,
      );
    }
    // Persisted SQL columns still take number; B3 migrates them to NUMERIC(18,2).
    const totalDebits = moneyToNumber(totalDebitsMoney);
    const totalCredits = moneyToNumber(totalCreditsMoney);

    // Batch insert: create entry + lines in single transaction.
    await this.pool.transaction(async (txPool) => {
      // 1. Insert journal entry
      await txPool.queryOne(
        `INSERT INTO journal_entries (
          id, entryNumber, entityId, periodDate, status, source, referenceId,
          description, totalDebits, totalCredits, isBalanced, createdBy,
          createdAt, guardianCheckStatus
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          id,
          entryNumber,
          entry.entityId,
          entry.periodDate,
          entry.status,
          entry.source,
          entry.referenceId,
          entry.description,
          totalDebits,
          totalCredits,
          isBalanced,
          entry.createdBy,
          now,
          "pending",
        ],
      );

      // 2. Batch insert all journal lines in one query
      if (entry.lines.length > 0) {
        const lineValues = entry.lines
          .map((line, idx) => ({
            id: `jl_${Date.now()}_${idx}`,
            journalEntryId: id,
            ...line,
          }))
          .map((line) => [
            line.id,
            line.journalEntryId,
            line.accountCode,
            line.accountName,
            line.accountType,
            line.debitAmount,
            line.creditAmount,
            line.costCenter || null,
            line.department || null,
            line.memo || null,
          ]);

        const placeholders = lineValues
          .map((_, idx) => {
            const offset = idx * 10;
            return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9},$${offset + 10})`;
          })
          .join(",");
        const flatValues = lineValues.flat();

        await txPool.query(
          `INSERT INTO journal_lines (
            id, journalEntryId, accountCode, accountName, accountType,
            debitAmount, creditAmount, costCenter, department, memo
          ) VALUES ${placeholders}`,
          flatValues,
        );
      }

      // 3. Create audit record (minimal)
      await txPool.query(
        `INSERT INTO audit_transactions (
          id, entityId, transactionId, transactionType, action, actor,
          occurred_at, reason
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          entry.entityId,
          id,
          "journal_entry",
          "created",
          entry.createdBy,
          now,
          entry.description,
        ],
      );
    });

    const latencyMs = Date.now() - startTime;
    void latencyMs; // exposed via PostingResult on post; create returns the entry directly

    return {
      id,
      entryNumber,
      ...entry,
      createdAt: now,
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }

  /**
   * Post journal entry with optimized single query.
   * Target: < 30ms (includes Guardian check).
   */
  async postJournalEntryOptimized(
    id: string,
    approvedBy: string,
  ): Promise<PostingResult> {
    const startTime = Date.now();
    const now = new Date().toISOString();

    const entryWithLines = await this.pool.queryOne<any>(
      `SELECT je.id, je.entryNumber, je.entityId, je.periodDate, je.status,
              je.source, je.referenceId, je.description, je.totalDebits,
              je.totalCredits, je.isBalanced, je.createdBy, je.createdAt,
              je.guardianCheckStatus,
              json_agg(json_build_object(
                'id', jl.id,
                'accountCode', jl.accountCode,
                'accountName', jl.accountName,
                'accountType', jl.accountType,
                'debitAmount', jl.debitAmount,
                'creditAmount', jl.creditAmount,
                'costCenter', jl.costCenter,
                'department', jl.department,
                'memo', jl.memo
              )) as lines
       FROM journal_entries je
       LEFT JOIN journal_lines jl ON jl.journalEntryId = je.id
       WHERE je.id = $1
       GROUP BY je.id`,
      [id],
    );
    if (!entryWithLines) {
      throw new Error("Journal entry not found");
    }

    await this.pool.query(
      `UPDATE journal_entries SET status = $1, approvedBy = $2, approvedAt = $3, postedAt = $3 WHERE id = $4`,
      ["posted", approvedBy, now, id],
    );

    const consolidationTriggered = !!entryWithLines.entityId;
    if (consolidationTriggered) {
      this.triggerConsolidationAsync(
        entryWithLines.entityId,
        entryWithLines.periodDate,
      ).catch((err) => {
        console.error("Consolidation trigger failed:", err);
      });
    }

    const latencyMs = Date.now() - startTime;
    return {
      entryId: id,
      entryNumber: entryWithLines.entryNumber,
      status: "posted",
      postedAt: now,
      consolidationTriggered,
      latencyMs,
    };
  }

  /**
   * Trigger consolidation asynchronously.
   * Updates parent entity GL balances based on child postings.
   */
  private async triggerConsolidationAsync(
    entityId: string,
    periodDate: string,
  ): Promise<void> {
    try {
      const entity = await this.pool.queryOne<any>(
        "SELECT * FROM aurum_entities WHERE id = $1",
        [entityId],
      );
      if (!entity || !entity.parentId) {
        return; // No parent, nothing to consolidate
      }

      const balances = await this.pool.query<any>(
        `SELECT accountCode,
                SUM(CASE WHEN debitAmount > 0 THEN debitAmount ELSE -creditAmount END) as netAmount
         FROM journal_lines jl
         JOIN journal_entries je ON je.id = jl.journalEntryId
         WHERE je.entityId = $1 AND je.periodDate = $2 AND je.status = 'posted'
         GROUP BY accountCode`,
        [entityId, periodDate],
      );

      for (const balance of balances.rows || []) {
        await this.pool.query(
          `INSERT INTO consolidation_entries (
            id, entityId, sourceEntityId, accountCode, amount, periodDate,
            status, createdAt
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (entityId, sourceEntityId, accountCode, periodDate)
          DO UPDATE SET amount = EXCLUDED.amount, updatedAt = NOW()`,
          [
            `cons_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            entity.parentId,
            entityId,
            balance.accountCode,
            balance.netAmount,
            periodDate,
            "pending",
            new Date().toISOString(),
          ],
        );
      }
    } catch (error) {
      console.error("Consolidation processing failed:", error);
      // Non-blocking, so we don't throw
    }
  }

  /**
   * Batch post multiple journal entries.
   * For high-volume scenarios (e.g. end-of-day processing).
   * Target: < 10ms per entry average.
   */
  async batchPostJournalEntries(
    entries: Array<{ id: string; approvedBy: string }>,
  ): Promise<PostingResult[]> {
    const startTime = Date.now();
    const now = new Date().toISOString();

    const ids = entries.map((e) => e.id);
    const approvals = entries.map((e) => e.approvedBy);

    const caseStatement = entries
      .map((_, idx) => `WHEN id = $${idx + 1} THEN $${entries.length + idx + 1}`)
      .join(" ");
    await this.pool.query(
      `UPDATE journal_entries
       SET status = 'posted',
           approvedBy = CASE ${caseStatement} END,
           approvedAt = $${entries.length * 2 + 1},
           postedAt = $${entries.length * 2 + 1}
       WHERE id = ANY($${entries.length * 2 + 2}::text[])`,
      [...ids, ...approvals, now, ids],
    );

    const consolidationPromises = entries.map(async (entry) => {
      const entryData = await this.pool.queryOne<any>(
        "SELECT entityId, periodDate FROM journal_entries WHERE id = $1",
        [entry.id],
      );
      if (entryData) {
        return this.triggerConsolidationAsync(
          entryData.entityId,
          entryData.periodDate,
        );
      }
    });
    Promise.all(consolidationPromises).catch((err) => {
      console.error("Batch consolidation trigger failed:", err);
    });

    const latencyMs = Date.now() - startTime;
    const avgLatency = latencyMs / entries.length;
    return entries.map((entry) => ({
      entryId: entry.id,
      entryNumber: "", // would need an extra query to retrieve
      status: "posted",
      postedAt: now,
      consolidationTriggered: true,
      latencyMs: avgLatency,
    }));
  }

  /**
   * Get GL account with caching. Reduces database load.
   */
  async getGLAccountCached(code: string): Promise<any> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.CACHE_TTL) {
      const result = await this.pool.query<GLAccount>(
        "SELECT * FROM gl_accounts WHERE status = 'active'",
      );
      this.accountCache.clear();
      result.rows?.forEach((account) => {
        this.accountCache.set(account.code, account);
      });
      this.lastCacheUpdate = now;
    }
    return this.accountCache.get(code);
  }

  /**
   * Verify GL balance after posting. Quick validation without full audit.
   */
  async verifyGLBalance(
    entityId: string,
    accountCode: string,
    periodDate: string,
  ): Promise<number> {
    const result = await this.pool.queryOne<any>(
      `SELECT SUM(debitAmount - creditAmount) as balance
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journalEntryId
       WHERE je.entityId = $1 AND jl.accountCode = $2
         AND je.periodDate = $3 AND je.status = 'posted'`,
      [entityId, accountCode, periodDate],
    );
    return result?.balance || 0;
  }

  /**
   * Get cache statistics (for monitoring).
   */
  getCacheStats() {
    const age = Date.now() - this.lastCacheUpdate;
    return {
      accountsInCache: this.accountCache.size,
      cacheAge: age,
      cacheExpiredIn: Math.max(0, this.CACHE_TTL - age),
    };
  }
}
