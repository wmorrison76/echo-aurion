#!/usr/bin/env node

/**
 * Batch Ingestion Script
 * Reads terms from JSON file and ingests them through the production pipeline
 *
 * Usage:
 *   node scripts/ingest-batch.js <path-to-terms-file.json>
 *   node scripts/ingest-batch.js data/batch-aa
 */

const fs = require("fs");
const path = require("path");

const BATCH_SIZE = 500; // Terms per API call
const CONCURRENT_BATCHES = 3; // Parallel requests
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // ms

class BatchIngester {
  constructor(termsFile) {
    this.termsFile = termsFile;
    this.baseUrl = process.env.API_URL || "http://localhost:5173";
    this.stats = {
      totalTerms: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      startTime: Date.now(),
    };
  }

  async run() {
    try {
      console.log("[Ingestion] Starting batch ingestion");
      console.log("[Ingestion] File:", this.termsFile);
      console.log("[Ingestion] API URL:", this.baseUrl);

      // Load terms from file
      const terms = this.loadTerms();
      this.stats.totalTerms = terms.length;

      console.log(`[Ingestion] Loaded ${terms.length} terms`);

      // Split into batches
      const batches = [];
      for (let i = 0; i < terms.length; i += BATCH_SIZE) {
        batches.push(terms.slice(i, i + BATCH_SIZE));
      }

      console.log(
        `[Ingestion] Split into ${batches.length} batches of ${BATCH_SIZE} terms`,
      );

      // Process batches concurrently
      const batchGroups = [];
      for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
        batchGroups.push(batches.slice(i, i + CONCURRENT_BATCHES));
      }

      let batchIndex = 0;
      for (const group of batchGroups) {
        const promises = group.map((batch) =>
          this.processBatch(batch, batchIndex++),
        );
        await Promise.all(promises);

        // Progress report
        this.reportProgress();
      }

      // Final report
      this.reportFinal();
    } catch (error) {
      console.error("[Ingestion] Fatal error:", error);
      process.exit(1);
    }
  }

  loadTerms() {
    try {
      const fullPath = path.resolve(this.termsFile);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`);
      }

      const content = fs.readFileSync(fullPath, "utf-8");
      const terms = JSON.parse(content);

      if (!Array.isArray(terms)) {
        throw new Error("File must contain JSON array of terms");
      }

      return terms;
    } catch (error) {
      console.error("[Ingestion] Failed to load terms:", error.message);
      process.exit(1);
    }
  }

  async processBatch(batch, batchIndex) {
    let attempts = 0;
    while (attempts < RETRY_ATTEMPTS) {
      try {
        attempts++;

        const payload = {
          terms: batch,
          source: "batch-import",
          batchIndex,
        };

        const response = await fetch(`${this.baseUrl}/api/terms/ingest-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          timeout: 60000, // 60 second timeout
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${error.substring(0, 200)}`,
          );
        }

        const result = await response.json();

        this.stats.processed += batch.length;
        this.stats.succeeded += result.successful || batch.length;
        this.stats.failed += result.failed || 0;

        console.log(
          `[Ingestion] Batch ${batchIndex + 1}: ${batch.length} terms (${result.successful || batch.length} success, ${result.failed || 0} failed)`,
        );

        return; // Success
      } catch (error) {
        console.warn(
          `[Ingestion] Batch ${batchIndex + 1} attempt ${attempts}/${RETRY_ATTEMPTS} failed:`,
          error.message,
        );

        if (attempts < RETRY_ATTEMPTS) {
          await this.sleep(RETRY_DELAY * attempts);
        }
      }
    }

    // Failed after all retries
    this.stats.processed += batch.length;
    this.stats.failed += batch.length;
    console.error(
      `[Ingestion] Batch ${batchIndex + 1} FAILED after ${RETRY_ATTEMPTS} attempts`,
    );
  }

  reportProgress() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const rate = this.stats.processed / (elapsed / 60); // terms per minute

    console.log(
      `[Ingestion] Progress: ${this.stats.processed}/${this.stats.totalTerms} (${(
        (this.stats.processed / this.stats.totalTerms) *
        100
      ).toFixed(1)}%) - ${rate.toFixed(0)} terms/min - ETA: ${this.getETA(
        elapsed,
      )}`,
    );
  }

  reportFinal() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const minutes = (elapsed / 60).toFixed(1);
    const hours = (elapsed / 3600).toFixed(2);
    const successRate = (
      (this.stats.succeeded / this.stats.totalTerms) *
      100
    ).toFixed(1);

    console.log("\n[Ingestion] ==========================================");
    console.log("[Ingestion] INGESTION COMPLETE");
    console.log("[Ingestion] ==========================================");
    console.log(`[Ingestion] Total terms: ${this.stats.totalTerms}`);
    console.log(`[Ingestion] Succeeded: ${this.stats.succeeded}`);
    console.log(`[Ingestion] Failed: ${this.stats.failed}`);
    console.log(`[Ingestion] Success rate: ${successRate}%`);
    console.log(`[Ingestion] Time taken: ${minutes}m (${hours}h)`);
    console.log(
      `[Ingestion] Rate: ${((this.stats.succeeded / elapsed) * 60).toFixed(0)} terms/min`,
    );
    console.log("[Ingestion] ==========================================\n");

    if (this.stats.failed > 0) {
      process.exit(1);
    }
  }

  getETA(elapsedSeconds) {
    const remaining = this.stats.totalTerms - this.stats.processed;
    const rate = this.stats.processed / (elapsedSeconds / 60); // per minute
    const minutesLeft = remaining / rate;

    if (minutesLeft < 60) {
      return `${minutesLeft.toFixed(0)}m`;
    }
    return `${(minutesLeft / 60).toFixed(1)}h`;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node ingest-batch.js <path-to-terms-file>");
  console.error("Example: node ingest-batch.js data/batch-aa");
  process.exit(1);
}

const termsFile = args[0];
const ingester = new BatchIngester(termsFile);
ingester.run();
