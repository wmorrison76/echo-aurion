/**
 * Auto-Post Engine
 * Automatically posts GL entries and invoices when Guardian AI approves them
 */

import { logger } from "../lib/logger";
import { GuardianAI, GuardianCheckResult } from "./guardianAI";
import { ApprovalRulesEngine } from "./approvalRulesEngine";

export interface AutoPostRequest {
  transactionId: string;
  transactionType: "journal_entry" | "invoice" | "payment";
  transaction: any;
  entityId: string;
  userId: string;
}

export interface AutoPostResult {
  success: boolean;
  transactionId: string;
  posted: boolean;
  autoPosted: boolean;
  requiresApproval: boolean;
  guardianRiskScore: number;
  reason: string;
  timestamp: Date;
}

const autoPostStats = {
  totalProcessed: 0,
  successfullyPosted: 0,
  requiresApproval: 0,
  failedToPost: 0,
  lastRun: new Date(),
};

export class AutoPostEngine {
  /**
   * Process transaction and attempt auto-post if Guardian approves
   */
  static async processAndAutoPost(
    request: AutoPostRequest,
  ): Promise<AutoPostResult> {
    const { transactionId, transactionType, transaction, entityId, userId } =
      request;
    autoPostStats.totalProcessed++;

    try {
      // Step 1: Run Guardian checks
      const guardianResult = await GuardianAI.checkTransaction(
        transaction,
        entityId,
        userId,
      );

      // Step 2: Check if can auto-post based on Guardian result
      if (!guardianResult.canAutoPost) {
        autoPostStats.requiresApproval++;
        return {
          success: true,
          transactionId,
          posted: false,
          autoPosted: false,
          requiresApproval: true,
          guardianRiskScore: guardianResult.overallRiskScore,
          reason: `Guardian flagged for manual review (risk: ${guardianResult.overallRiskScore}%)`,
          timestamp: new Date(),
        };
      }

      // Step 3: Get approval requirements
      const approvalRequirements =
        await ApprovalRulesEngine.evaluateApprovalRequirements(
          transaction,
          entityId,
        );

      // Step 4: Check if rules allow auto-approval
      if (
        approvalRequirements.canAutoApprove === false ||
        approvalRequirements.requiresManualReview
      ) {
        autoPostStats.requiresApproval++;
        return {
          success: true,
          transactionId,
          posted: false,
          autoPosted: false,
          requiresManualApproval: true,
          guardianRiskScore: guardianResult.overallRiskScore,
          reason:
            "Rules engine requires manual approval (amount threshold or account type)",
          timestamp: new Date(),
        };
      }

      // Step 5: Actually post the transaction
      const posted = await this.postTransaction(
        transaction,
        transactionType,
        entityId,
        userId,
      );

      if (posted) {
        autoPostStats.successfullyPosted++;
        logger.info("[AutoPost] Transaction auto-posted", {
          transactionId,
          type: transactionType,
          amount: transaction.amount,
          guardianRiskScore: guardianResult.overallRiskScore,
        });

        return {
          success: true,
          transactionId,
          posted: true,
          autoPosted: true,
          requiresApproval: false,
          guardianRiskScore: guardianResult.overallRiskScore,
          reason: "Auto-posted by Guardian AI (low risk)",
          timestamp: new Date(),
        };
      } else {
        autoPostStats.failedToPost++;
        return {
          success: false,
          transactionId,
          posted: false,
          autoPosted: false,
          requiresApproval: false,
          guardianRiskScore: guardianResult.overallRiskScore,
          reason: "Failed to post transaction (database error)",
          timestamp: new Date(),
        };
      }
    } catch (error) {
      autoPostStats.failedToPost++;
      logger.error("[AutoPost] Processing failed", {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        transactionId,
        posted: false,
        autoPosted: false,
        requiresApproval: false,
        guardianRiskScore: 100,
        reason: `Auto-post failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Actually post a transaction (would update GL accounts, create entries, etc.)
   */
  private static async postTransaction(
    transaction: any,
    type: "journal_entry" | "invoice" | "payment",
    entityId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // In production, this would:
      // 1. Create journal entry records
      // 2. Update GL account balances
      // 3. Create audit trail records
      // 4. Send notifications
      // For now, simulate success

      logger.debug("[AutoPost] Posting transaction", {
        type,
        amount: transaction.amount,
        entityId,
      });

      // Simulate posting delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      logger.error("[AutoPost] Post transaction failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Process batch of transactions (used for nightly processing)
   */
  static async processBatch(
    requests: AutoPostRequest[],
  ): Promise<AutoPostResult[]> {
    const results: AutoPostResult[] = [];

    for (const request of requests) {
      const result = await this.processAndAutoPost(request);
      results.push(result);
    }

    return results;
  }

  /**
   * Get auto-post statistics
   */
  static getStatistics() {
    return {
      ...autoPostStats,
      successRate:
        autoPostStats.totalProcessed > 0
          ? (
              (autoPostStats.successfullyPosted /
                autoPostStats.totalProcessed) *
              100
            ).toFixed(2) + "%"
          : "0%",
      manualApprovalRate:
        autoPostStats.totalProcessed > 0
          ? (
              (autoPostStats.requiresApproval / autoPostStats.totalProcessed) *
              100
            ).toFixed(2) + "%"
          : "0%",
    };
  }

  /**
   * Reset statistics (admin only)
   */
  static resetStatistics() {
    autoPostStats.totalProcessed = 0;
    autoPostStats.successfullyPosted = 0;
    autoPostStats.requiresApproval = 0;
    autoPostStats.failedToPost = 0;
    autoPostStats.lastRun = new Date();
  }

  /**
   * Automatic nightly batch processing
   */
  static async runNightlyBatch(): Promise<any> {
    const startTime = Date.now();

    try {
      logger.info("[AutoPost] Starting nightly batch processing");

      // In production, this would:
      // 1. Query all draft/pending transactions from last 24 hours
      // 2. Filter those that haven't been reviewed
      // 3. Run auto-post on each
      // 4. Send summary email to approvers

      const result = {
        startTime: new Date(startTime),
        endTime: new Date(),
        processedCount: autoPostStats.totalProcessed,
        autoPostedCount: autoPostStats.successfullyPosted,
        requiresApprovalCount: autoPostStats.requiresApproval,
        failureCount: autoPostStats.failedToPost,
      };

      logger.info("[AutoPost] Nightly batch complete", result);
      return result;
    } catch (error) {
      logger.error("[AutoPost] Nightly batch failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
