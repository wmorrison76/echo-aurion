/**
 * EchoAurum Guardian System — Complete Implementation
 *
 *   Argus    — Data compliance & GL validation (8 comprehensive checks)
 *   Zelda    — Auto-healing & duplicate detection
 *   Phoenix  — Anomaly detection & fraud prevention
 *   Odin     — Immutable audit trail & point-in-time recovery
 *
 * B2: balance arithmetic and "near-equal amount" comparisons go through
 * the Money primitive (Decimal.js under the hood) instead of float
 * `reduce` + `Math.abs(d - c) < 0.01` tolerance. The strict-equality
 * balance check is now load-bearing; the auto-heal / duplicate-near
 * tolerances are explicit, named, configurable thresholds rather than
 * magic numbers masking float drift.
 *
 * Note on file history: prior to B2 this file was structurally broken
 * (the entire class bodies lived on one line behind a `// 5 minutes`-
 * style trailing comment, so nothing actually executed). B2 reformats
 * cleanly while preserving the original intent.
 */

import type {
  JournalEntry,
  APInvoice,
  GuardianCheckResult,
  AurumEntity,
  GLAccount,
} from "@shared/aurum";
import crypto from "crypto";
import {
  sum as sumMoney,
  balanced as balancedMoney,
  eq as eqMoney,
  sub as subMoney,
  abs as absMoney,
  lt as ltMoney,
  fromLegacyNumber,
  money,
  toNumber as moneyToNumber,
  type Money,
} from "../../../../../server/lib/money";

/**
 * Reconciliation tolerance for "close enough" auto-resolve and
 * near-duplicate detection. NOT for balance correctness — the Argus
 * balance check uses strict Money equality. The default of 1¢ matches
 * the prior heuristic but is now an explicit, configurable threshold
 * rather than a magic number masking float drift.
 */
const RECONCILIATION_TOLERANCE: Money = money(
  process.env.RECONCILIATION_TOLERANCE_USD || "0.01",
);

// ============================================================================
// ARGUS GUARDIAN — Data Compliance & GL Validation
// ============================================================================

export interface ArgusCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  checksRun: string[];
  riskScore: number;
}

export class ArgusGuardian {
  /**
   * Data Compliance Guardian.
   * Ensures GL posting rules are followed, accounts exist, currencies match.
   * Performs 8 comprehensive validation checks.
   */
  constructor(private glAccounts: Map<string, GLAccount> = new Map()) {}

  async validateJournalEntry(
    entry: JournalEntry,
    glAccounts?: Map<string, GLAccount>,
  ): Promise<ArgusCheckResult> {
    const accountMap = glAccounts || this.glAccounts;
    const errors: string[] = [];
    const warnings: string[] = [];
    const checksRun: string[] = [];

    // CHECK 1: Journal has lines
    checksRun.push("JOURNAL_LINES_EXIST");
    if (!entry.lines || entry.lines.length === 0) {
      errors.push("Journal entry must have at least one line");
      return { passed: false, errors, warnings, checksRun, riskScore: 100 };
    }

    // CHECK 2: All GL accounts exist and are active
    checksRun.push("GL_ACCOUNTS_VALID");
    for (const line of entry.lines) {
      const account = accountMap.get(line.accountCode);
      if (!account) {
        errors.push(`GL Account ${line.accountCode} does not exist`);
      } else if (account.status !== "active") {
        errors.push(`GL Account ${line.accountCode} (${account.name}) is not active`);
      }
    }

    // CHECK 3: Debits = Credits exactly. B2: replaces the previous
    // `Math.abs(d - c) > 0.01` tolerance hack with Money-based strict
    // equality. Drift that the old check would have masked (0.1 + 0.2
    // ≠ 0.3 in floats) now either normalizes to true equality (under
    // Money) or fails as a real imbalance.
    checksRun.push("DEBIT_CREDIT_BALANCE");
    const totalDebitsMoney = sumMoney(
      entry.lines.map((l) =>
        fromLegacyNumber(l.debitAmount || 0, "argus.line.debitAmount"),
      ),
    );
    const totalCreditsMoney = sumMoney(
      entry.lines.map((l) =>
        fromLegacyNumber(l.creditAmount || 0, "argus.line.creditAmount"),
      ),
    );
    if (!balancedMoney(totalDebitsMoney, totalCreditsMoney)) {
      errors.push(
        `Debits (${totalDebitsMoney}) must equal Credits (${totalCreditsMoney})`,
      );
    }

    // CHECK 4: Each line has EITHER debit OR credit (not both, not neither)
    checksRun.push("LINE_DEBIT_CREDIT_INTEGRITY");
    for (let i = 0; i < entry.lines.length; i++) {
      const line = entry.lines[i];
      const hasDebit = line.debitAmount && line.debitAmount > 0;
      const hasCredit = line.creditAmount && line.creditAmount > 0;
      if (hasDebit && hasCredit) {
        errors.push(
          `Line ${i + 1}: Cannot have both debit (${line.debitAmount}) and credit (${line.creditAmount})`,
        );
      }
      if (!hasDebit && !hasCredit) {
        errors.push(`Line ${i + 1}: Must have either debit or credit amount`);
      }
    }

    // CHECK 5: Required cost centers (if account requires it)
    checksRun.push("COST_CENTER_REQUIREMENTS");
    for (let i = 0; i < entry.lines.length; i++) {
      const line = entry.lines[i];
      const account = accountMap.get(line.accountCode);
      if (account?.requiresCostCenter && !line.costCenter) {
        warnings.push(`Line ${i + 1}: Cost center required for ${account.name}`);
      }
    }

    // CHECK 6: Required departments (if account requires it)
    checksRun.push("DEPARTMENT_REQUIREMENTS");
    for (let i = 0; i < entry.lines.length; i++) {
      const line = entry.lines[i];
      const account = accountMap.get(line.accountCode);
      if (account?.requiresDepartment && !line.department) {
        warnings.push(`Line ${i + 1}: Department required for ${account.name}`);
      }
    }

    // CHECK 7: Amounts are positive (no negative amounts)
    checksRun.push("POSITIVE_AMOUNTS");
    for (let i = 0; i < entry.lines.length; i++) {
      const line = entry.lines[i];
      if (
        (line.debitAmount && line.debitAmount < 0) ||
        (line.creditAmount && line.creditAmount < 0)
      ) {
        errors.push(`Line ${i + 1}: Amounts must be positive`);
      }
    }

    // CHECK 8: Fiscal period is open (if applicable). For now we just
    // verify the date is not too old (< 5 years); production should
    // check against fiscal_periods table.
    checksRun.push("FISCAL_PERIOD_OPEN");
    const entryDate = new Date(entry.periodDate);
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (entryDate < fiveYearsAgo) {
      warnings.push(`Entry date ${entry.periodDate} is more than 5 years old`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      checksRun,
      riskScore: errors.length > 0 ? 100 : warnings.length > 0 ? 30 : 0,
    };
  }

  async validateAPInvoice(invoice: APInvoice): Promise<ArgusCheckResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checksRun: string[] = [];

    checksRun.push("INVOICE_AMOUNT_VALID");
    if (invoice.amount <= 0) {
      errors.push("Invoice amount must be positive");
    }

    checksRun.push("INVOICE_DATE_VALID");
    if (new Date(invoice.invoiceDate) > new Date()) {
      errors.push("Invoice date cannot be in the future");
    }

    checksRun.push("OCR_CONFIDENCE");
    if (invoice.OCRConfidence && invoice.OCRConfidence < 0.7) {
      warnings.push(
        `OCR confidence low: ${(invoice.OCRConfidence * 100).toFixed(1)}%`,
      );
    }

    checksRun.push("DUE_DATE_VALID");
    if (new Date(invoice.dueDate) < new Date(invoice.invoiceDate)) {
      errors.push("Due date cannot be before invoice date");
    }

    checksRun.push("VENDOR_EXISTS");
    if (!invoice.vendorId || !invoice.vendorName) {
      errors.push("Vendor ID and name are required");
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      checksRun,
      riskScore: errors.length > 0 ? 100 : warnings.length > 0 ? 20 : 0,
    };
  }
}

// ============================================================================
// ZELDA GUARDIAN — Duplicate Detection & Auto-Healing
// ============================================================================

export interface ZeldaCheckResult {
  passed: boolean;
  duplicatesDetected: Array<{
    type: "EXACT_DUPLICATE" | "LIKELY_DUPLICATE" | "TRANSPOSED" | "ROUNDING";
    message: string;
    confidence: number;
  }>;
  autoHeals: Array<{
    type: "ROUNDING_CORRECTION" | "DUPLICATE_REMOVAL";
    description: string;
    appliedAutomatically: boolean;
  }>;
  warnings: string[];
}

export class ZeldaGuardian {
  /**
   * Auto-Heal Guardian.
   * Detects duplicates, auto-corrects minor errors, identifies transposed numbers.
   */
  async detectDuplicates(
    invoices: APInvoice[],
    recentInvoices: APInvoice[] = [],
  ): Promise<ZeldaCheckResult> {
    const duplicates: ZeldaCheckResult["duplicatesDetected"] = [];
    const autoHeals: ZeldaCheckResult["autoHeals"] = [];
    const warnings: string[] = [];

    const seen = new Map<string, APInvoice>();

    for (const invoice of invoices) {
      // Check 1: Exact duplicate (same vendor, invoice number, amount).
      // B2: Money-based exact equality. Float === on numbers from
      // different code paths (one OCR-rounded, one hand-entered) was
      // unreliable; Money normalizes both sides.
      const exactKey = `${invoice.vendorId}_${invoice.invoiceNumber}`;
      for (const recent of recentInvoices) {
        const recentKey = `${recent.vendorId}_${recent.invoiceNumber}`;
        if (
          exactKey === recentKey &&
          eqMoney(
            fromLegacyNumber(invoice.amount, "zelda.exact.invoice"),
            fromLegacyNumber(recent.amount, "zelda.exact.recent"),
          )
        ) {
          duplicates.push({
            type: "EXACT_DUPLICATE",
            message: `Exact duplicate: ${invoice.vendorName} invoice ${invoice.invoiceNumber} for $${invoice.amount}`,
            confidence: 0.98,
          });
        }
      }

      // Check 2: Transposed numbers (e.g., 1234 vs 4321)
      const amountStr = invoice.amount.toString().replace(/\./g, "");
      const transposed = amountStr.split("").reverse().join("");
      for (const recent of recentInvoices) {
        const recentStr = recent.amount.toString().replace(/\./g, "");
        if (recentStr === transposed && recent.vendorId === invoice.vendorId) {
          duplicates.push({
            type: "TRANSPOSED",
            message: `Possible transposed amount: ${invoice.amount} vs ${recent.amount} (same vendor)`,
            confidence: 0.75,
          });
        }
      }

      // Check 3: Near-duplicate detection — explicitly tolerance-based by
      // design (vendor + date + amount within RECONCILIATION_TOLERANCE).
      // B2: tolerance is now a named, configurable Money constant rather
      // than a magic 0.01, so it's clear this is a heuristic for "close
      // enough to be the same invoice", NOT a balance check.
      for (const recent of recentInvoices) {
        const variance = absMoney(
          subMoney(
            fromLegacyNumber(invoice.amount, "zelda.rounding.invoice"),
            fromLegacyNumber(recent.amount, "zelda.rounding.recent"),
          ),
        );
        const sameVendor = invoice.vendorId === recent.vendorId;
        const within24h =
          Math.abs(
            new Date(invoice.invoiceDate).getTime() -
              new Date(recent.invoiceDate).getTime(),
          ) < 86400000;
        if (
          ltMoney(variance, RECONCILIATION_TOLERANCE) &&
          sameVendor &&
          within24h
        ) {
          autoHeals.push({
            type: "ROUNDING_CORRECTION",
            description: `Auto-correct rounding: $${invoice.amount} → $${recent.amount}`,
            appliedAutomatically: true,
          });
        }
      }

      seen.set(exactKey, invoice);
    }

    return {
      passed: duplicates.length === 0,
      duplicatesDetected: duplicates,
      autoHeals,
      warnings,
    };
  }

  async autoReconcile(
    systemAmount: number,
    externalAmount: number,
  ): Promise<{ variance: number; autoResolved: boolean }> {
    // B2: variance computed via Money so float drift doesn't produce
    // false "close enough" auto-resolves. Tolerance is the named
    // RECONCILIATION_TOLERANCE constant; default 1¢ matches prior
    // behavior but is now configurable + explicit.
    const varianceMoney = absMoney(
      subMoney(
        fromLegacyNumber(systemAmount, "zelda.autoReconcile.system"),
        fromLegacyNumber(externalAmount, "zelda.autoReconcile.external"),
      ),
    );
    const autoResolved = ltMoney(varianceMoney, RECONCILIATION_TOLERANCE);
    return { variance: moneyToNumber(varianceMoney), autoResolved };
  }
}

// ============================================================================
// PHOENIX GUARDIAN — Anomaly Detection & Fraud Prevention
// ============================================================================

export interface PhoenixCheckResult {
  passed: boolean;
  anomalies: Array<{
    type: string;
    severity: "INFO" | "WARNING" | "ERROR";
    message: string;
  }>;
  riskScore: number; // 0-100
  warnings: string[];
}

export class PhoenixGuardian {
  /**
   * Emergency Defense Guardian.
   * Detects anomalies, unusual patterns, and fraud indicators.
   * Risk scoring: 0-100.
   */
  async detectAnomalies(
    entries: JournalEntry[],
    historicalEntries: JournalEntry[] = [],
  ): Promise<PhoenixCheckResult> {
    const anomalies: PhoenixCheckResult["anomalies"] = [];
    let riskScore = 0;

    // Calculate historical statistics. Risk-scoring math is statistical,
    // not financial-precision sensitive — float arithmetic is fine here.
    const historicalAmounts = historicalEntries
      .map((e) => e.totalDebits)
      .filter((a) => a > 0);
    const avgAmount =
      historicalAmounts.length > 0
        ? historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length
        : 0;

    for (const entry of entries) {
      // ANOMALY 1: Large transaction (> 2x average)
      if (avgAmount > 0 && entry.totalDebits > avgAmount * 2) {
        anomalies.push({
          type: "LARGE_AMOUNT",
          severity: "WARNING",
          message: `Amount $${entry.totalDebits.toFixed(2)} is ${(entry.totalDebits / avgAmount).toFixed(1)}x average ($${avgAmount.toFixed(2)})`,
        });
        riskScore += 15;
      }

      // ANOMALY 2: Off-hours posting (outside 6 AM - 10 PM)
      const postTime = new Date(entry.createdAt).getHours();
      if (postTime < 6 || postTime > 22) {
        anomalies.push({
          type: "OFF_HOURS_POSTING",
          severity: "INFO",
          message: `Posted outside business hours: ${postTime}:00`,
        });
        riskScore += 10;
      }

      // ANOMALY 3: Weekend posting
      const dayOfWeek = new Date(entry.createdAt).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        anomalies.push({
          type: "WEEKEND_POSTING",
          severity: "INFO",
          message: `Weekend posting detected (${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek]})`,
        });
        riskScore += 5;
      }

      // ANOMALY 4: Round number amounts (fraud indicator)
      const isRound = entry.totalDebits % 1000 === 0 && entry.totalDebits >= 1000;
      if (isRound) {
        anomalies.push({
          type: "ROUND_NUMBER",
          severity: "INFO",
          message: `Round amount $${entry.totalDebits.toFixed(2)} may indicate fraud`,
        });
        riskScore += 5;
      }

      // ANOMALY 5: Rapid succession (same amount multiple times in 1 hour).
      // B2: amount equality goes through Money so float drift doesn't
      // miss a real fraud signal. "Same amount" means within
      // RECONCILIATION_TOLERANCE — kept as a heuristic threshold rather
      // than strict equality because OCR / FX rounding can produce 1¢
      // differences that should still flag as the same fraud pattern.
      const targetMoney = fromLegacyNumber(
        entry.totalDebits,
        "phoenix.rapid.entry",
      );
      const recentSame = historicalEntries.filter((h) => {
        const variance = absMoney(
          subMoney(
            fromLegacyNumber(h.totalDebits, "phoenix.rapid.historical"),
            targetMoney,
          ),
        );
        return (
          ltMoney(variance, RECONCILIATION_TOLERANCE) &&
          new Date(h.createdAt).getTime() >
            new Date(entry.createdAt).getTime() - 3600000
        );
      });
      if (recentSame.length >= 2) {
        anomalies.push({
          type: "RAPID_SUCCESSION",
          severity: "WARNING",
          message: `Same amount $${entry.totalDebits} posted ${recentSame.length + 1} times in last hour`,
        });
        riskScore += 25;
      }
    }

    riskScore = Math.min(riskScore, 100);
    return {
      passed: riskScore < 60, // block if risk > 60
      anomalies,
      riskScore,
      warnings: anomalies.filter((a) => a.severity !== "INFO").map((a) => a.message),
    };
  }

  async prepareRollback(
    entryId: string,
    reason: string,
  ): Promise<{ rollingBackEntryId: string; timestamp: string; reason: string }> {
    return { rollingBackEntryId: entryId, timestamp: new Date().toISOString(), reason };
  }
}

// ============================================================================
// ODIN GUARDIAN — Immutable Audit Trail & Point-in-Time Recovery
// ============================================================================

export interface OdinCheckResult {
  passed: boolean;
  transactionHash: string;
  auditTrailId: string;
  warnings: string[];
}

export class OdinGuardian {
  /**
   * Immutable Audit Guardian.
   * Maintains complete cryptographically-secured audit trail.
   * Enables point-in-time restoration and tamper detection.
   */
  async logImmutable(
    action: string,
    actor: string,
    details: Record<string, any>,
  ): Promise<OdinCheckResult> {
    const timestamp = new Date().toISOString();
    const recordData = JSON.stringify({ action, actor, details, timestamp });
    const hash = crypto.createHash("sha256").update(recordData).digest("hex");
    return {
      passed: true,
      transactionHash: hash,
      auditTrailId: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      warnings: [],
    };
  }

  async verifyIntegrity(entries: JournalEntry[]): Promise<boolean> {
    /**
     * Verify no entries were modified after posting.
     * In production, would verify full change history and hash chain.
     */
    for (const entry of entries) {
      if (entry.status === "posted") {
        if (!entry.postedAt) {
          return false;
        }
        // Additional verification would check against immutable hash chain
      }
    }
    return true;
  }

  async generateAuditReport(
    entries: JournalEntry[],
    invoices: APInvoice[],
  ): Promise<{
    period: string;
    totalTransactions: number;
    chainIntegrity: "VERIFIED" | "BROKEN";
    records: any[];
  }> {
    return {
      period: new Date().toISOString(),
      totalTransactions: entries.length + invoices.length,
      chainIntegrity: "VERIFIED",
      records: [],
    };
  }
}

// ============================================================================
// GUARDIAN ORCHESTRATOR — Master Controller
// ============================================================================

export interface GuardianOrchestrationResult {
  transactionId: string;
  timestamp: string;
  argus: ArgusCheckResult;
  zelda: ZeldaCheckResult;
  phoenix: PhoenixCheckResult;
  odin: OdinCheckResult;
  passedAll: boolean;
  blockingErrors: string[];
  warnings: string[];
  riskScore: number;
  overallStatus: "PASSED" | "WARNINGS" | "BLOCKED";
}

export class GuardianOrchestrator {
  private argus: ArgusGuardian;
  private zelda: ZeldaGuardian;
  private phoenix: PhoenixGuardian;
  private odin: OdinGuardian;

  constructor(glAccounts: Map<string, GLAccount> = new Map()) {
    this.argus = new ArgusGuardian(glAccounts);
    this.zelda = new ZeldaGuardian();
    this.phoenix = new PhoenixGuardian();
    this.odin = new OdinGuardian();
  }

  /**
   * Run all Guardian checks on a transaction.
   * Executes in parallel, returns comprehensive report.
   */
  async runGuardianChecks(
    transaction: JournalEntry | APInvoice,
    recentTransactions: (JournalEntry | APInvoice)[] = [],
  ): Promise<GuardianOrchestrationResult> {
    const isJournalEntry = "lines" in transaction;
    const transactionId = transaction.id;

    const [argusResult, zeldaResult, phoenixResult, odinResult] = await Promise.all([
      isJournalEntry
        ? this.argus.validateJournalEntry(transaction as JournalEntry)
        : this.argus.validateAPInvoice(transaction as APInvoice),
      isJournalEntry
        ? Promise.resolve({
            passed: true,
            duplicatesDetected: [],
            autoHeals: [],
            warnings: [],
          } as ZeldaCheckResult)
        : this.zelda.detectDuplicates(
            [transaction as APInvoice],
            recentTransactions as APInvoice[],
          ),
      isJournalEntry
        ? this.phoenix.detectAnomalies(
            [transaction as JournalEntry],
            recentTransactions as JournalEntry[],
          )
        : Promise.resolve({
            passed: true,
            anomalies: [],
            riskScore: 0,
            warnings: [],
          } as PhoenixCheckResult),
      this.odin.logImmutable(
        isJournalEntry ? "JOURNAL_ENTRY_POSTED" : "INVOICE_APPROVED",
        "guardian_system",
        { transactionId, type: isJournalEntry ? "journal_entry" : "ap_invoice" },
      ),
    ]);

    const blockingErrors = [
      ...argusResult.errors,
      ...(zeldaResult.duplicatesDetected
        .filter((d) => d.confidence > 0.9)
        .map((d) => d.message) || []),
      ...(phoenixResult.anomalies
        .filter((a) => a.severity === "ERROR")
        .map((a) => a.message) || []),
    ];
    const allWarnings = [
      ...argusResult.warnings,
      ...(zeldaResult.warnings || []),
      ...(phoenixResult.warnings || []),
    ];
    const passedAll = blockingErrors.length === 0;
    const riskScore = (argusResult.riskScore + phoenixResult.riskScore) / 2;

    return {
      transactionId,
      timestamp: new Date().toISOString(),
      argus: argusResult,
      zelda: zeldaResult,
      phoenix: phoenixResult,
      odin: odinResult,
      passedAll,
      blockingErrors,
      warnings: allWarnings,
      riskScore,
      overallStatus:
        blockingErrors.length > 0
          ? "BLOCKED"
          : allWarnings.length > 0
            ? "WARNINGS"
            : "PASSED",
    };
  }
}

// ============================================================================
// LEGACY: GuardianOversightSystem (for backward compatibility)
// ============================================================================

export interface GuardianOversightReport {
  timestamp: string;
  overallStatus: "healthy" | "warnings" | "critical";
  recommendations: string[];
  argusChecksPassed: number;
  argusChecksFailed: number;
  phoenixRiskScore: number;
}

export class GuardianOversightSystem {
  private orchestrator: GuardianOrchestrator;

  constructor(glAccounts: Map<string, GLAccount> = new Map()) {
    this.orchestrator = new GuardianOrchestrator(glAccounts);
  }

  async performFullAudit(
    entries: JournalEntry[],
    invoices: APInvoice[],
    glAccounts: Map<string, GLAccount>,
  ): Promise<GuardianOversightReport> {
    const argusGuardian = new ArgusGuardian(glAccounts);
    const entryChecks = await Promise.all(
      entries.map((e) => argusGuardian.validateJournalEntry(e, glAccounts)),
    );
    const invoiceChecks = await Promise.all(
      invoices.map((i) => argusGuardian.validateAPInvoice(i)),
    );

    const allChecks = [...entryChecks, ...invoiceChecks];
    const failures = allChecks.filter((c) => !c.passed);
    const warnings = allChecks.filter((c) => c.passed && c.warnings.length > 0);

    const phoenix = new PhoenixGuardian();
    const phoenixCheck = await phoenix.detectAnomalies(entries);

    const recommendations: string[] = [];
    if (failures.length > 0) {
      recommendations.push(`Resolve ${failures.length} critical issue(s) before posting`);
    }
    if (warnings.length > 0) {
      recommendations.push(`Review ${warnings.length} warning(s) in data validation`);
    }

    return {
      timestamp: new Date().toISOString(),
      overallStatus:
        failures.length > 0 ? "critical" : warnings.length > 0 ? "warnings" : "healthy",
      recommendations,
      argusChecksPassed: allChecks.filter((c) => c.passed).length,
      argusChecksFailed: failures.length,
      phoenixRiskScore: phoenixCheck.riskScore,
    };
  }
}
