/**
 * GL Auto-Poster Service
 * ──────────────────────
 * Automatically posts GL entries based on financial observer decisions.
 * Prevents duplicate posting using idempotency keys and transaction integrity.
 *
 * FEATURES:
 * - Idempotent posting (prevents duplicates)
 * - Exponential backoff retry logic
 * - Transaction validation
 * - Audit trail logging
 * - Batch processing support
 * - Multi-outlet support
 */

interface GLEntry {
  id?: string;
  account: string;
  debit?: number;
  credit?: number;
  description: string;
  reference?: string;
  posted_at?: number;
  posted_by?: string;
}

interface PostingRequest {
  entries: GLEntry[];
  outlet_id: string;
  org_id: string;
  period: string;
  idempotency_key: string;
  metadata?: Record<string, any>;
}

interface PostingResult {
  success: boolean;
  entries_posted: number;
  journal_entry_id?: string;
  error?: string;
  retry_count: number;
}

class GLAutoPostingService {
  private maxRetries = 5;
  private baseDelay = 5000; // 5 seconds
  private postedEntries: Map<string, PostingResult> = new Map();
  private failedQueue: PostingRequest[] = [];

  /**
   * Post GL entries with idempotency protection
   */
  public async postGLEntries(
    request: PostingRequest,
    retryCount = 0,
  ): Promise<PostingResult> {
    // Check if already posted using idempotency key
    const cached = this.postedEntries.get(request.idempotency_key);
    if (cached) {
      console.log(
        `[GLPoster] Entry ${request.idempotency_key} already posted, returning cached result`,
      );
      return cached;
    }

    try {
      // Validate entries before posting
      this.validateEntries(request.entries);

      // Generate journal entry ID
      const journalEntryId = this.generateJournalEntryId(request);

      // Prepare posting payload
      const payload = {
        ...request,
        journal_entry_id: journalEntryId,
        posted_at: Date.now(),
      };

      // Post to GL API
      const response = await this.postToGLAPI(payload);

      const result: PostingResult = {
        success: true,
        entries_posted: request.entries.length,
        journal_entry_id: journalEntryId,
        retry_count: retryCount,
      };

      // Cache the result
      this.postedEntries.set(request.idempotency_key, result);

      // Log audit trail
      this.logPostingAudit(request, result, "success");

      console.log(
        `[GLPoster] ✓ Posted ${request.entries.length} entries (journal: ${journalEntryId})`,
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      console.warn(
        `[GLPoster] Error posting GL entries (attempt ${retryCount + 1}/${this.maxRetries}):`,
        errorMsg,
      );

      // Retry with exponential backoff
      if (retryCount < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, retryCount);
        console.log(`[GLPoster] Retrying in ${delay}ms...`);

        await this.sleep(delay);
        return this.postGLEntries(request, retryCount + 1);
      }

      // Max retries exceeded - add to failed queue
      this.failedQueue.push(request);

      const result: PostingResult = {
        success: false,
        entries_posted: 0,
        error: errorMsg,
        retry_count: retryCount,
      };

      // Log failure
      this.logPostingAudit(request, result, "failed");

      return result;
    }
  }

  /**
   * Validate GL entries before posting
   */
  private validateEntries(entries: GLEntry[]): void {
    if (!entries || entries.length === 0) {
      throw new Error("No GL entries to post");
    }

    for (const entry of entries) {
      // Check account exists
      if (!entry.account || entry.account.trim() === "") {
        throw new Error("GL account is required");
      }

      // Check amounts
      const debit = entry.debit || 0;
      const credit = entry.credit || 0;

      if (debit < 0 || credit < 0) {
        throw new Error("GL amounts must be non-negative");
      }

      if (debit === 0 && credit === 0) {
        throw new Error("GL entry must have either debit or credit amount");
      }

      // Only one side should be populated
      if (debit > 0 && credit > 0) {
        throw new Error("GL entry cannot have both debit and credit");
      }

      // Check description
      if (!entry.description || entry.description.trim() === "") {
        throw new Error("GL description is required");
      }
    }

    // Check double-entry (debits === credits)
    const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `GL entries do not balance: debits ${totalDebits} !== credits ${totalCredits}`,
      );
    }
  }

  /**
   * Generate idempotency key
   */
  public generateIdempotencyKey(
    sourceId: string,
    eventId: string,
    outletId: string,
  ): string {
    return `gl:${sourceId}:${eventId}:${outletId}`;
  }

  /**
   * Generate journal entry ID
   */
  private generateJournalEntryId(request: PostingRequest): string {
    const timestamp = Date.now();
    const sequence = Math.random().toString(36).slice(2, 7);
    return `JE-${request.outlet_id}-${timestamp}-${sequence}`;
  }

  /**
   * Post to GL API
   */
  private async postToGLAPI(payload: any): Promise<any> {
    // This would be replaced with actual API call
    const response = await fetch("/api/echo-aurum/gl/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(`GL API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Log audit trail
   */
  private logPostingAudit(
    request: PostingRequest,
    result: PostingResult,
    status: string,
  ): void {
    const auditEntry = {
      timestamp: Date.now(),
      status,
      outlet_id: request.outlet_id,
      org_id: request.org_id,
      idempotency_key: request.idempotency_key,
      entries_count: request.entries.length,
      journal_entry_id: result.journal_entry_id,
      retry_count: result.retry_count,
      error: result.error,
    };

    console.log("[GLPoster] Audit:", auditEntry);

    // In production, this would be stored in audit table
    // For now, just log to console
  }

  /**
   * Process failed queue (retry failed postings)
   */
  public async processFailedQueue(): Promise<number> {
    const queueLength = this.failedQueue.length;
    if (queueLength > 0) {
      console.debug(`[GLPoster] Processing failed queue (${queueLength} items)...`);
    }

    let processed = 0;
    const retryQueue = [...this.failedQueue];
    this.failedQueue = [];

    for (const request of retryQueue) {
      const result = await this.postGLEntries(request);
      if (result.success) {
        processed++;
      } else {
        // Re-add to queue if still failing
        this.failedQueue.push(request);
      }
    }

    if (processed > 0) {
      console.debug(`[GLPoster] Processed ${processed} items from failed queue`);
    }
    return processed;
  }

  /**
   * Get failed posting queue
   */
  public getFailedQueue(): PostingRequest[] {
    return [...this.failedQueue];
  }

  /**
   * Get posting history for an outlet
   */
  public getPostingHistory(
    outletId: string,
    limit = 100,
  ): Array<{
    idempotency_key: string;
    result: PostingResult;
  }> {
    const history: Array<{ idempotency_key: string; result: PostingResult }> =
      [];

    this.postedEntries.forEach((result, key) => {
      if (key.includes(outletId) && history.length < limit) {
        history.push({ idempotency_key: key, result });
      }
    });

    return history;
  }

  /**
   * Batch post GL entries
   */
  public async postBatch(requests: PostingRequest[]): Promise<PostingResult[]> {
    const results = await Promise.all(
      requests.map((req) => this.postGLEntries(req)),
    );

    const summary = {
      total: requests.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };

    console.log(`[GLPoster] Batch posting complete:`, summary);

    return results;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear history (for testing)
   */
  public clearHistory(): void {
    this.postedEntries.clear();
    this.failedQueue = [];
  }
}

export const glAutoPostingService = new GLAutoPostingService();

/**
 * Helper function to generate GL entry from observation
 */
export function createGLEntry(
  account: string,
  amount: number,
  description: string,
  isDebit = true,
): GLEntry {
  return {
    account,
    [isDebit ? "debit" : "credit"]: amount,
    description,
  };
}

/**
 * Helper to create balanced GL entries
 */
export function createBalancedGLEntries(
  debitAccount: string,
  creditAccount: string,
  amount: number,
  description: string,
): GLEntry[] {
  return [
    { account: debitAccount, debit: amount, description },
    { account: creditAccount, credit: amount, description },
  ];
}
