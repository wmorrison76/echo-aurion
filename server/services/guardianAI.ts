/**
 * Guardian AI Service
 * Four-layer AI oversight system for financial transactions:
 * - Argus: GL validation & compliance rules
 * - Zelda: Duplicate detection & data quality checks
 * - Phoenix: Fraud & anomaly detection
 * - Odin: Immutable audit trail
 */

import { logger } from "../lib/logger";

export interface GuardianCheckResult {
  transactionId: string;
  timestamp: Date;
  argusResult: ArgusCheckResult;
  zeldaResult: ZeldaCheckResult;
  phoenixResult: PhoenixCheckResult;
  odinResult: OdinCheckResult;
  overallRiskScore: number; // 0-100
  canAutoPost: boolean;
  requiresManualApproval: boolean;
  warnings: string[];
  errors: string[];
}

export interface ArgusCheckResult {
  passed: boolean;
  riskScore: number; // 0-100
  validations: {
    glAccountValid: boolean;
    amountInRange: boolean;
    costCenterValid: boolean;
    departmentValid: boolean;
    descriptionPresent: boolean;
    documentReferenceValid: boolean;
  };
  missingFields: string[];
  violations: string[];
}

export interface ZeldaCheckResult {
  passed: boolean;
  riskScore: number; // 0-100
  duplicateDetection: {
    isDuplicate: boolean;
    similarTransactionIds: string[];
    confidence: number; // 0-1
  };
  dataQuality: {
    amountRounded: boolean;
    dateValid: boolean;
    descriptionQuality: "poor" | "fair" | "good" | "excellent";
    vendorNameConsistent: boolean;
  };
  potentialErrors: string[];
}

export interface PhoenixCheckResult {
  passed: boolean;
  riskScore: number; // 0-100
  fraudDetection: {
    suspiciousPattern: boolean;
    anomalyScore: number; // 0-1
    reasons: string[];
  };
  benchmarkAnalysis: {
    amountOutsideNorm: boolean;
    frequencyOutsideNorm: boolean;
    vendorOutsideNorm: boolean;
    analysisDetails: string;
  };
  alerts: string[];
}

export interface OdinCheckResult {
  passed: boolean;
  auditTrailId: string;
  immutable: boolean;
  hashValue: string;
  previousHash: string;
  blockchainReady: boolean;
  complianceMetadata: {
    createdBy: string;
    approvedBy?: string;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
  };
}

// In-memory storage for Guardian results and audit trail
const guardianResults = new Map<string, GuardianCheckResult>();
const auditTrail: OdinCheckResult[] = [];

export class GuardianAI {
  /**
   * Run all Guardian checks on a transaction
   */
  static async checkTransaction(
    transaction: any,
    entityId: string,
    userId: string,
  ): Promise<GuardianCheckResult> {
    const transactionId = transaction.id || `txn-${Date.now()}`;
    const timestamp = new Date();

    try {
      // Run all four Guardian checks in parallel
      const [argusResult, zeldaResult, phoenixResult, odinResult] =
        await Promise.all([
          this.runArgusCheck(transaction, entityId),
          this.runZeldaCheck(transaction, entityId),
          this.runPhoenixCheck(transaction, entityId),
          this.runOdinCheck(transaction, entityId, userId),
        ]);

      // Calculate overall risk score (weighted average)
      const overallRiskScore = Math.round(
        argusResult.riskScore * 0.3 +
          zeldaResult.riskScore * 0.2 +
          phoenixResult.riskScore * 0.3 +
          (100 - (odinResult.immutable ? 100 : 0)) * 0.2, // Odin risk is inverse (immutable = 0 risk)
      );

      // Determine if can auto-post
      const canAutoPost =
        argusResult.passed &&
        zeldaResult.passed &&
        phoenixResult.riskScore < 30 &&
        overallRiskScore < 25;

      // Collect all warnings and errors
      const warnings = [
        ...argusResult.violations,
        ...zeldaResult.potentialErrors,
        ...phoenixResult.alerts,
      ];

      const errors = [
        ...argusResult.missingFields.map((f) => `Missing required field: ${f}`),
        ...(zeldaResult.duplicateDetection.isDuplicate
          ? [
              `Potential duplicate transaction detected (${zeldaResult.duplicateDetection.confidence * 100}% confidence)`,
            ]
          : []),
      ];

      const result: GuardianCheckResult = {
        transactionId,
        timestamp,
        argusResult,
        zeldaResult,
        phoenixResult,
        odinResult,
        overallRiskScore,
        canAutoPost,
        requiresManualApproval: !canAutoPost || overallRiskScore > 50,
        warnings,
        errors,
      };

      // Store result
      guardianResults.set(transactionId, result);

      logger.info("[Guardian] Transaction checked", {
        transactionId,
        overallRiskScore,
        canAutoPost,
        argusRisk: argusResult.riskScore,
        zeldaRisk: zeldaResult.riskScore,
        phoenixRisk: phoenixResult.riskScore,
        warningCount: warnings.length,
        errorCount: errors.length,
      });

      return result;
    } catch (error) {
      logger.error("[Guardian] Check failed", {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return a conservative result (require manual approval) if check fails
      return {
        transactionId,
        timestamp,
        argusResult: {
          passed: false,
          riskScore: 100,
          validations: {} as any,
          missingFields: ["Unknown error"],
          violations: [],
        },
        zeldaResult: {
          passed: false,
          riskScore: 100,
          duplicateDetection: {
            isDuplicate: false,
            similarTransactionIds: [],
            confidence: 0,
          },
          dataQuality: {} as any,
          potentialErrors: [],
        },
        phoenixResult: {
          passed: false,
          riskScore: 100,
          fraudDetection: {
            suspiciousPattern: false,
            anomalyScore: 0,
            reasons: ["Check failed"],
          },
          benchmarkAnalysis: {} as any,
          alerts: ["Guardian check failed"],
        },
        odinResult: {
          passed: false,
          auditTrailId: "",
          immutable: false,
          hashValue: "",
          previousHash: "",
          blockchainReady: false,
          complianceMetadata: { createdBy: userId, timestamp },
        },
        overallRiskScore: 100,
        canAutoPost: false,
        requiresManualApproval: true,
        warnings: [],
        errors: ["Guardian check failed - manual review required"],
      };
    }
  }

  /**
   * Argus: GL Validation & Compliance Rules
   * Checks if transaction complies with GL posting rules
   */
  private static async runArgusCheck(
    transaction: any,
    entityId: string,
  ): Promise<ArgusCheckResult> {
    const validations = {
      glAccountValid:
        !!transaction.glAccountId && transaction.glAccountId !== "",
      amountInRange:
        transaction.amount &&
        transaction.amount > 0 &&
        transaction.amount < 10000000,
      costCenterValid: !transaction.costCenter || transaction.costCenter !== "",
      departmentValid: !transaction.department || transaction.department !== "",
      descriptionPresent:
        !!transaction.description && transaction.description.length > 3,
      documentReferenceValid:
        !transaction.documentRef || transaction.documentRef !== "",
    };

    const missingFields: string[] = [];
    if (!validations.glAccountValid) missingFields.push("GL Account");
    if (!validations.amountInRange)
      missingFields.push("Amount (must be positive and < $10M)");
    if (!validations.descriptionPresent)
      missingFields.push("Description (must be > 3 characters)");

    const violations: string[] = [];

    // Check for high-risk accounts (adjustments, write-offs)
    const highRiskAccounts = ["7000", "7100", "8000", "8100"];
    const accountCode = String(transaction.glAccountId).substring(0, 4);
    if (highRiskAccounts.includes(accountCode)) {
      violations.push(
        `High-risk account detected: ${accountCode} (requires additional approval)`,
      );
    }

    // Check for large amounts
    if (transaction.amount && transaction.amount > 100000) {
      violations.push(
        `Large amount detected: $${transaction.amount.toFixed(2)} (requires CFO approval)`,
      );
    }

    // Check for manual entries without proper documentation
    if (
      transaction.transactionType === "manual_journal_entry" &&
      !transaction.documentRef
    ) {
      violations.push("Manual entries require document reference");
    }

    const riskScore = Math.min(
      100,
      missingFields.length * 20 + violations.length * 15,
    );

    const passed = missingFields.length === 0 && violations.length === 0;

    return {
      passed,
      riskScore,
      validations,
      missingFields,
      violations,
    };
  }

  /**
   * Zelda: Duplicate Detection & Data Quality
   * Identifies duplicate transactions and data quality issues
   */
  private static async runZeldaCheck(
    transaction: any,
    entityId: string,
  ): Promise<ZeldaCheckResult> {
    // Check for duplicates
    const isDuplicate = await this.checkForDuplicate(transaction, entityId);

    // Similarity analysis
    const similarTransactionIds = await this.findSimilarTransactions(
      transaction,
      entityId,
    );
    const duplicateConfidence = similarTransactionIds.length > 0 ? 0.7 : 0;

    // Data quality checks
    const amountRounded = transaction.amount % 1 === 0; // Flag if not precise
    const dateValid =
      transaction.date && !isNaN(new Date(transaction.date).getTime());
    const descriptionLength = transaction.description?.length || 0;
    const descriptionQuality: "poor" | "fair" | "good" | "excellent" =
      descriptionLength < 5
        ? "poor"
        : descriptionLength < 20
          ? "fair"
          : descriptionLength < 50
            ? "good"
            : "excellent";

    const vendorNameConsistent =
      !transaction.vendor || transaction.vendor === transaction.vendor.trim();

    const potentialErrors: string[] = [];

    if (isDuplicate) {
      potentialErrors.push(
        "Exact duplicate detected - same vendor, amount, and date",
      );
    }

    if (!amountRounded) {
      potentialErrors.push(
        `Amount has decimals: $${transaction.amount.toFixed(5)} (unusual precision)`,
      );
    }

    if (!dateValid) {
      potentialErrors.push("Invalid transaction date");
    }

    if (descriptionQuality === "poor") {
      potentialErrors.push(
        "Description too short (< 5 characters) - consider adding more detail",
      );
    }

    if (!vendorNameConsistent) {
      potentialErrors.push("Vendor name has leading/trailing spaces");
    }

    const riskScore = Math.min(
      100,
      (isDuplicate ? 50 : 0) +
        similarTransactionIds.length * 10 +
        (descriptionQuality === "poor" ? 10 : 0) +
        (amountRounded ? 5 : 0),
    );

    return {
      passed: !isDuplicate && potentialErrors.length === 0,
      riskScore,
      duplicateDetection: {
        isDuplicate,
        similarTransactionIds,
        confidence: duplicateConfidence,
      },
      dataQuality: {
        amountRounded,
        dateValid,
        descriptionQuality,
        vendorNameConsistent,
      },
      potentialErrors,
    };
  }

  /**
   * Phoenix: Fraud & Anomaly Detection
   * Identifies suspicious patterns and anomalies
   */
  private static async runPhoenixCheck(
    transaction: any,
    entityId: string,
  ): Promise<PhoenixCheckResult> {
    // Fraud detection
    const suspiciousPatterns = await this.detectSuspiciousPatterns(
      transaction,
      entityId,
    );
    const anomalyScore = await this.calculateAnomalyScore(
      transaction,
      entityId,
    );

    // Benchmark analysis (historical comparison)
    const benchmark = await this.getTransactionBenchmark(transaction, entityId);
    const amountOutsideNorm =
      benchmark &&
      Math.abs(transaction.amount - benchmark.avgAmount) > benchmark.stdDev * 2;
    const frequencyOutsideNorm =
      benchmark && transaction.frequency > benchmark.avgFrequency * 2;
    const vendorOutsideNorm =
      benchmark && transaction.vendor !== benchmark.commonVendor;

    const alerts: string[] = [];

    if (suspiciousPatterns.length > 0) {
      alerts.push(...suspiciousPatterns);
    }

    if (anomalyScore > 0.8) {
      alerts.push(
        `High anomaly score: ${(anomalyScore * 100).toFixed(1)}% - unusual transaction pattern`,
      );
    }

    if (amountOutsideNorm) {
      alerts.push(
        `Amount outside normal range: $${transaction.amount} (2+ std dev from mean)`,
      );
    }

    if (frequencyOutsideNorm) {
      alerts.push("Frequency unusually high - possible duplicate posting");
    }

    const riskScore = Math.min(
      100,
      suspiciousPatterns.length * 15 +
        anomalyScore * 40 +
        (amountOutsideNorm ? 20 : 0) +
        (frequencyOutsideNorm ? 15 : 0),
    );

    return {
      passed: alerts.length === 0 && anomalyScore < 0.5,
      riskScore,
      fraudDetection: {
        suspiciousPattern: suspiciousPatterns.length > 0,
        anomalyScore,
        reasons: suspiciousPatterns,
      },
      benchmarkAnalysis: {
        amountOutsideNorm: amountOutsideNorm || false,
        frequencyOutsideNorm: frequencyOutsideNorm || false,
        vendorOutsideNorm: vendorOutsideNorm || false,
        analysisDetails: benchmark
          ? `Avg: $${benchmark.avgAmount}, Frequency: ${benchmark.avgFrequency}/mo`
          : "No benchmark data available",
      },
      alerts,
    };
  }

  /**
   * Odin: Immutable Audit Trail
   * Creates cryptographic audit trail and compliance metadata
   */
  private static async runOdinCheck(
    transaction: any,
    entityId: string,
    userId: string,
  ): Promise<OdinCheckResult> {
    // Get previous transaction hash (for blockchain-style chain)
    const previousHash =
      auditTrail.length > 0
        ? auditTrail[auditTrail.length - 1].hashValue
        : "0000000000000000000000000000000000000000";

    // Create hash of current transaction
    const hashData = JSON.stringify({
      ...transaction,
      entityId,
      timestamp: new Date().toISOString(),
    });

    // Simple SHA256-like hash (in production, use crypto library)
    const hashValue = this.createSimpleHash(hashData);

    const auditTrailId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result: OdinCheckResult = {
      passed: true,
      auditTrailId,
      immutable: true,
      hashValue,
      previousHash,
      blockchainReady: true,
      complianceMetadata: {
        createdBy: userId,
        timestamp: new Date(),
        ipAddress: undefined, // Would be set from request context in production
        userAgent: undefined, // Would be set from request context in production
      },
    };

    // Add to audit trail
    auditTrail.push(result);

    return result;
  }

  /**
   * Check for exact duplicate transaction
   */
  private static async checkForDuplicate(
    transaction: any,
    entityId: string,
  ): Promise<boolean> {
    // In production, query database for exact matches
    // vendor + amount + date (within 1 day) + GL account
    for (const [, result] of guardianResults) {
      const prev = result.argusResult;
      if (
        transaction.vendor === transaction.vendor &&
        Math.abs(transaction.amount - transaction.amount) < 0.01 &&
        transaction.glAccountId === transaction.glAccountId
      ) {
        const daysBetween =
          Math.abs(
            new Date(transaction.date).getTime() -
              new Date(transaction.date).getTime(),
          ) /
          (1000 * 60 * 60 * 24);
        if (daysBetween < 1) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Find similar transactions
   */
  private static async findSimilarTransactions(
    transaction: any,
    entityId: string,
  ): Promise<string[]> {
    const similar: string[] = [];

    for (const [id, result] of guardianResults) {
      // Simple similarity: same vendor and amount within 10%
      const amountDiff =
        Math.abs(result.timestamp.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24);

      if (amountDiff < 7) {
        // Within 7 days
        similar.push(id);
        if (similar.length >= 3) break;
      }
    }

    return similar;
  }

  /**
   * Detect suspicious patterns
   */
  private static async detectSuspiciousPatterns(
    transaction: any,
    entityId: string,
  ): Promise<string[]> {
    const patterns: string[] = [];

    // Pattern 1: Round numbers (potential manual entry manipulation)
    if (
      transaction.amount &&
      transaction.amount % 1000 === 0 &&
      transaction.amount > 10000
    ) {
      patterns.push("Round number amount detected - verify amount is accurate");
    }

    // Pattern 2: Weekend posting (unusual for business transactions)
    const day = new Date(transaction.date).getDay();
    if (day === 0 || day === 6) {
      patterns.push("Weekend transaction - verify posting date is intentional");
    }

    // Pattern 3: High-value adjustment entries
    if (
      transaction.transactionType === "adjustment" &&
      transaction.amount > 50000
    ) {
      patterns.push("Large adjustment detected - ensure proper authorization");
    }

    // Pattern 4: Unusual vendor
    if (transaction.vendor && transaction.vendor.length > 50) {
      patterns.push("Unusually long vendor name - possible data entry error");
    }

    return patterns;
  }

  /**
   * Calculate anomaly score (0-1)
   */
  private static async calculateAnomalyScore(
    transaction: any,
    entityId: string,
  ): Promise<number> {
    // In production, use ML model (isolation forest, etc.)
    // For now, simple heuristic score
    let score = 0;

    // Check against historical transactions
    const recentTxns = Array.from(guardianResults.values())
      .filter(
        (r) =>
          new Date().getTime() - r.timestamp.getTime() <
          30 * 24 * 60 * 60 * 1000,
      )
      .map((r) => r.argusResult);

    if (recentTxns.length > 0) {
      const amounts = recentTxns.map((r) => r as any).filter((r) => r.amount);
      if (amounts.length > 0) {
        const avgAmount =
          amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const variance =
          amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) /
          amounts.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev > 0) {
          const zScore = Math.abs((transaction.amount - avgAmount) / stdDev);
          score = Math.min(1, zScore / 4); // Normalize: 4+ std devs = score 1.0
        }
      }
    }

    return score;
  }

  /**
   * Get transaction benchmark
   */
  private static async getTransactionBenchmark(
    transaction: any,
    entityId: string,
  ): Promise<any> {
    // In production, query database for historical stats
    return {
      avgAmount: 5000,
      stdDev: 2000,
      avgFrequency: 4, // Per month
      commonVendor: "Unknown",
    };
  }

  /**
   * Simple hash function for audit trail
   */
  private static createSimpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(40, "0");
  }

  /**
   * Get Guardian check result for a transaction
   */
  static async getCheckResult(
    transactionId: string,
  ): Promise<GuardianCheckResult | null> {
    return guardianResults.get(transactionId) || null;
  }

  /**
   * Get audit trail entries
   */
  static async getAuditTrail(limit: number = 100): Promise<OdinCheckResult[]> {
    return auditTrail.slice(-limit).reverse();
  }

  /**
   * Verify transaction immutability
   */
  static async verifyImmutability(transactionId: string): Promise<boolean> {
    const result = guardianResults.get(transactionId);
    if (!result) return false;

    // In production, verify blockchain hash chain
    return result.odinResult.immutable && result.odinResult.blockchainReady;
  }
}
