# Phase 2 Implementation Guide: Build Scale Foundation

**Duration:** 15-20 days
**Priority:** CRITICAL - Required before ingesting 180K terms
**Outcome:** Architecture ready to handle 180K terms efficiently with dual storage

---

## Architecture Overview

```
180,000 Terms
     │
     ▼
┌─────────────────────────────────────┐
│   Deduplication Service             │
│   - Fuzzy matching                  │
│   - Key normalization               │
│   Removes ~15-20% duplicates        │
└────────────────┬────────────────────┘
                 │
                 ▼ ~150,000 unique
┌─────────────────────────────────────┐
│   Postgres/Supabase: Master Terms   │
│   - Indexed for fast lookups        │
│   - JSONB metadata                  │
│   - Atomic transactions             │
└────────────────┬────────────────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
     ▼                       ▼
┌──────────────────┐  ┌──────────────────┐
│ Embedding Queue  │  │ Embedding Queue  │
│ (5 workers)      │  │ (5 workers)      │
│ batch: 100       │  │ batch: 100       │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         ▼                     ▼
    ┌─────────────────────────────┐
    │ OpenAI Embedding API        │
    │ (Rate limited, batched)     │
    └──────────────┬──────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
 ┌──────────┐              ┌──────────┐
 │Supabase  │              │ Pinecone │
 │pgvector  │              │(backup)  │
 │storage   │              │storage   │
 └──────────┘              └──────────┘
```

---

## Phase 2.1: Database Migration - Master Culinary Terms

### Migration File: `supabase/migrations/013_master_culinary_dictionary.sql`

```sql
-- Create master culinary terms table
-- This replaces the in-memory Map + JSON file persistence
-- Supports 180K+ terms with proper indexing

CREATE TABLE IF NOT EXISTS master_culinary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Unique identifier for the term
  term_key TEXT UNIQUE NOT NULL, -- "fond" or "fond-cooking"
  
  -- Core term information
  term_name TEXT NOT NULL,
  definition TEXT NOT NULL,
  
  -- Classification
  categories TEXT[] NOT NULL DEFAULT '{}',
  mastery_level TEXT DEFAULT 'intermediate',
  
  -- Quality metrics
  confidence FLOAT DEFAULT 0.85,
  source_type TEXT DEFAULT 'user-imported',
  
  -- Rich metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}', -- {pronunciation, etymology, usage, related_terms, etc}
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  
  -- Validation
  CONSTRAINT valid_term_key CHECK (LENGTH(TRIM(term_key)) > 0),
  CONSTRAINT valid_term_name CHECK (LENGTH(TRIM(term_name)) > 0),
  CONSTRAINT valid_definition CHECK (LENGTH(TRIM(definition)) > 0),
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes for fast lookups and filtering
CREATE INDEX idx_term_key 
ON master_culinary_terms(term_key);

CREATE INDEX idx_term_name 
ON master_culinary_terms(term_name);

CREATE INDEX idx_term_name_gin 
ON master_culinary_terms USING gin(to_tsvector('english', term_name || ' ' || definition));

CREATE INDEX idx_categories 
ON master_culinary_terms USING gin(categories);

CREATE INDEX idx_mastery_level 
ON master_culinary_terms(mastery_level);

CREATE INDEX idx_source_type 
ON master_culinary_terms(source_type);

CREATE INDEX idx_created_at 
ON master_culinary_terms(created_at DESC);

CREATE INDEX idx_confidence 
ON master_culinary_terms(confidence DESC);

-- Full text search capability
CREATE INDEX idx_term_search_fts
ON master_culinary_terms USING gin(
  to_tsvector('english', term_name || ' ' || definition || ' ' || array_to_string(categories, ' '))
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_master_culinary_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_master_culinary_terms_updated_at 
ON master_culinary_terms;

CREATE TRIGGER trigger_update_master_culinary_terms_updated_at
BEFORE UPDATE ON master_culinary_terms
FOR EACH ROW
EXECUTE FUNCTION update_master_culinary_terms_updated_at();

-- Function to search terms
CREATE OR REPLACE FUNCTION search_culinary_terms(
  query TEXT,
  search_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  term_name TEXT,
  definition TEXT,
  categories TEXT[],
  confidence FLOAT,
  relevance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mct.id,
    mct.term_name,
    mct.definition,
    mct.categories,
    mct.confidence,
    ts_rank(
      to_tsvector('english', mct.term_name || ' ' || mct.definition),
      plainto_tsquery('english', query)
    ) as relevance
  FROM master_culinary_terms mct
  WHERE to_tsvector('english', mct.term_name || ' ' || mct.definition) @@ 
        plainto_tsquery('english', query)
  ORDER BY relevance DESC, mct.confidence DESC
  LIMIT search_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get term count and statistics
CREATE OR REPLACE FUNCTION get_master_culinary_stats()
RETURNS TABLE (
  total_count BIGINT,
  by_category JSONB,
  by_mastery_level JSONB,
  by_source_type JSONB,
  avg_confidence FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    jsonb_object_agg(category, count) FILTER (WHERE category IS NOT NULL),
    jsonb_object_agg(mastery_level, count) FILTER (WHERE mastery_level IS NOT NULL),
    jsonb_object_agg(source_type, count) FILTER (WHERE source_type IS NOT NULL),
    AVG(confidence)::FLOAT
  FROM (
    SELECT 'count' as dummy FROM master_culinary_terms
  ) full_count,
  LATERAL (
    SELECT DISTINCT
      unnest(categories) as category,
      COUNT(*) OVER (PARTITION BY unnest(categories)) as count
    FROM master_culinary_terms
    
    UNION ALL
    
    SELECT DISTINCT
      mastery_level,
      COUNT(*) OVER (PARTITION BY mastery_level) as count
    FROM master_culinary_terms
    
    UNION ALL
    
    SELECT DISTINCT
      source_type,
      COUNT(*) OVER (PARTITION BY source_type) as count
    FROM master_culinary_terms
  ) stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS if using Supabase Auth
ALTER TABLE master_culinary_terms ENABLE ROW LEVEL SECURITY;

-- Public read access, admin write access
CREATE POLICY master_culinary_terms_read ON master_culinary_terms
  FOR SELECT USING (true);

CREATE POLICY master_culinary_terms_write ON master_culinary_terms
  FOR INSERT, UPDATE, DELETE 
  USING (auth.role() = 'service_role');

-- Grants
GRANT SELECT ON master_culinary_terms TO authenticated, anon;
GRANT ALL ON master_culinary_terms TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Add comments for documentation
COMMENT ON TABLE master_culinary_terms IS 'Master culinary dictionary - stores 180K+ hospitality industry terms with full-text search support';
COMMENT ON COLUMN master_culinary_terms.term_key IS 'Normalized unique key (e.g. "fond-cooking")';
COMMENT ON COLUMN master_culinary_terms.metadata IS 'JSONB field: {pronunciation, etymology, usage, related_terms, history, etc}';
COMMENT ON INDEX idx_term_search_fts IS 'Full-text search index for term_name and definition - use search_culinary_terms() function';
```

### Data Migration Script: `scripts/migrate-terms-to-postgres.ts`

```typescript
/**
 * Migration script: Move master dictionary from JSON to Postgres
 * Run with: npx ts-node scripts/migrate-terms-to-postgres.ts
 */

import { createClient } from "@supabase/supabase-js";
import { masterCulinaryDictionary } from "../server/lib/master-culinary-dictionary";
import { uploadedTermsStore } from "../server/lib/uploaded-terms-store";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateTermsToPostgres() {
  console.log("[Migration] Starting terms migration to Postgres...");

  try {
    // Load all terms
    await uploadedTermsStore.ensureLoaded();
    const allTerms = uploadedTermsStore.getAllTerms();
    const masterTerms = masterCulinaryDictionary.getAllTerms();

    const totalTerms = allTerms.length + masterTerms.length;
    console.log(`[Migration] Migrating ${totalTerms} terms...`);

    // Combine all terms (uploaded + master)
    const termsToMigrate = [...allTerms, ...masterTerms];

    // Batch insert (1000 at a time to avoid timeout)
    const batchSize = 1000;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < termsToMigrate.length; i += batchSize) {
      const batch = termsToMigrate.slice(i, i + batchSize);
      
      const records = batch.map((term) => ({
        term_key: term.term
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, ""),
        term_name: term.term,
        definition: term.definition,
        categories: term.categories || [],
        mastery_level: term.masteryLevel || "intermediate",
        confidence: term.confidence || 0.85,
        source_type: term.sourceType || "user-imported",
        metadata: {
          pronunciation: term.pronunciation || "",
          etymology: term.etymology || {},
          usage: term.usage || {},
          relatedTerms: term.relatedTerms || [],
          history: term.history || {},
          applications: term.applications || {},
        },
      }));

      const { error } = await supabase
        .from("master_culinary_terms")
        .insert(records);

      if (error) {
        console.warn(`[Migration] Batch ${i / batchSize + 1} error:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(
          `[Migration] Progress: ${successCount + errorCount}/${totalTerms}`,
        );
      }
    }

    console.log(`[Migration] Complete!`);
    console.log(`  Success: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Total: ${totalTerms}`);
  } catch (error) {
    console.error("[Migration] Failed:", error);
    process.exit(1);
  }
}

migrateTermsToPostgres();
```

**Run migration:**
```bash
npx ts-node scripts/migrate-terms-to-postgres.ts
```

---

## Phase 2.2: Embedding Queue Service

### New File: `server/lib/embedding-queue-service.ts`

```typescript
/**
 * Embedding Queue Service
 * Manages batched embedding generation with rate limiting and concurrent workers
 * 
 * Key features:
 * - Batch embedding (100 items per API call, not 1 per call)
 * - 5 concurrent workers to balance throughput + rate limit compliance
 * - Exponential backoff for rate limiting
 * - Progress tracking
 * - Automatic retry with configurable limits
 */

import { generateEmbedding } from "./pinecone-service";

export interface EmbeddingJob {
  itemId: string;
  text: string;
  targetStorage: "supabase" | "pinecone" | "both";
  metadata?: Record<string, any>;
}

export interface EmbeddingQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  avgTimePerBatch: number; // milliseconds
  estimatedTimeRemaining: number; // milliseconds
}

export class EmbeddingQueueService {
  private queue: EmbeddingJob[] = [];
  private processing: Set<string> = new Set();
  private completed: Map<string, number[]> = new Map();
  private failed: Map<string, Error> = new Map();
  
  private workers: number = 5; // Concurrent workers
  private batchSize: number = 100; // Items per embedding API call
  private retryLimit: number = 3;
  
  private startTime: number = 0;
  private stats = {
    completed: 0,
    failed: 0,
    totalBatches: 0,
    totalTime: 0,
  };

  constructor(
    workers: number = 5,
    batchSize: number = 100,
    retryLimit: number = 3,
  ) {
    this.workers = workers;
    this.batchSize = batchSize;
    this.retryLimit = retryLimit;
  }

  /**
   * Add job to queue
   */
  enqueue(job: EmbeddingJob) {
    this.queue.push(job);
  }

  /**
   * Add multiple jobs
   */
  enqueueBatch(jobs: EmbeddingJob[]) {
    this.queue.push(...jobs);
  }

  /**
   * Process entire queue
   */
  async processQueue(onProgress?: (stats: EmbeddingQueueStats) => void) {
    this.startTime = Date.now();
    const totalJobs = this.queue.length;

    console.log(
      `[EmbeddingQueue] Starting to process ${totalJobs} items with ${this.workers} workers`,
    );

    // Create worker promises
    const workerPromises: Promise<void>[] = [];
    for (let i = 0; i < this.workers; i++) {
      workerPromises.push(this.workerLoop(totalJobs, onProgress));
    }

    // Wait for all workers to complete
    await Promise.all(workerPromises);

    console.log(`[EmbeddingQueue] Queue processing complete`);
    console.log(`  Completed: ${this.stats.completed}`);
    console.log(`  Failed: ${this.stats.failed}`);
    console.log(`  Total time: ${(this.stats.totalTime / 1000).toFixed(1)}s`);
  }

  /**
   * Worker loop - processes items from queue
   */
  private async workerLoop(
    totalJobs: number,
    onProgress?: (stats: EmbeddingQueueStats) => void,
  ) {
    while (this.queue.length > 0) {
      // Get next batch
      const batch = this.queue.splice(0, this.batchSize);
      if (batch.length === 0) break;

      try {
        // Generate embeddings for entire batch
        const embeddings = await this.generateBatchEmbeddings(batch);

        // Store results
        for (let i = 0; i < batch.length; i++) {
          this.completed.set(batch[i].itemId, embeddings[i]);
          this.processing.delete(batch[i].itemId);
          this.stats.completed++;
        }

        this.stats.totalBatches++;

        // Call progress callback
        if (onProgress) {
          onProgress(this.getStats(totalJobs));
        }
      } catch (error) {
        // Handle batch failure
        for (const job of batch) {
          this.failed.set(job.itemId, error as Error);
          this.processing.delete(job.itemId);
          this.stats.failed++;
        }
      }

      // Small delay between batches to avoid overwhelming the API
      await this.delay(100);
    }
  }

  /**
   * Generate embeddings for a batch (OpenAI batches multiple inputs per call)
   */
  private async generateBatchEmbeddings(
    batch: EmbeddingJob[],
    retryCount: number = 0,
  ): Promise<number[][]> {
    try {
      const textsToEmbed = batch.map((job) => job.text);

      // Generate embeddings using OpenAI
      // Note: This should use OpenAI's batch endpoint if available
      const embeddings = await Promise.all(
        textsToEmbed.map((text) => generateEmbedding(text)),
      );

      return embeddings as number[][];
    } catch (error) {
      if (retryCount < this.retryLimit) {
        const backoffMs = Math.min(
          1000 * Math.pow(2, retryCount),
          30000,
        );
        console.warn(
          `[EmbeddingQueue] Batch embedding failed, retrying in ${backoffMs}ms...`,
        );
        await this.delay(backoffMs);
        return this.generateBatchEmbeddings(batch, retryCount + 1);
      }

      throw new Error(
        `Failed to generate embeddings after ${this.retryLimit} retries`,
      );
    }
  }

  /**
   * Get stats
   */
  getStats(totalJobs: number): EmbeddingQueueStats {
    const elapsed = Date.now() - this.startTime;
    const processed = this.stats.completed + this.stats.failed;
    const avgTimePerBatch = this.stats.totalBatches > 0
      ? elapsed / this.stats.totalBatches
      : 0;
    const remainingBatches = Math.ceil(
      (totalJobs - processed) / this.batchSize,
    );
    const estimatedTimeRemaining =
      remainingBatches * avgTimePerBatch;

    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.stats.completed,
      failed: this.stats.failed,
      totalProcessed: processed,
      avgTimePerBatch: Math.round(avgTimePerBatch),
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
    };
  }

  /**
   * Get completed embeddings
   */
  getCompletedEmbeddings(): Map<string, number[]> {
    return new Map(this.completed);
  }

  /**
   * Get failed items
   */
  getFailedItems(): Map<string, Error> {
    return new Map(this.failed);
  }

  /**
   * Utility: Sleep
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const embeddingQueueService = new EmbeddingQueueService(5, 100, 3);
```

---

## Phase 2.3: OCR Support for Scanned PDFs

### New File: `server/lib/pdf-ocr-service.ts`

```typescript
/**
 * PDF OCR Service
 * Adds OCR support for scanned/image-based PDFs
 * Uses Tesseract.js for server-side OCR
 */

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

// Option 1: Use Tesseract.js (Node.js compatible, pure JS)
import Tesseract from "tesseract.js";

// Option 2: Use commercial OCR API
// import axios from "axios";

export interface OCROptions {
  languages?: string[];
  confidence_threshold?: number;
  use_api?: boolean;
}

export class PDFOCRService {
  private defaultLanguages = ["eng"]; // English by default
  private confidenceThreshold = 0.5;

  /**
   * Perform OCR on image buffer
   * Suitable for PDFs converted to images
   */
  async ocrImage(
    imageBuffer: Buffer,
    options?: OCROptions,
  ): Promise<string> {
    const languages = options?.languages || this.defaultLanguages;
    const threshold = options?.confidence_threshold || this.confidenceThreshold;

    try {
      console.log("[PDFOCRService] Starting OCR with languages:", languages);

      // Use Tesseract.js (open-source, runs in Node)
      const worker = await Tesseract.createWorker(languages);

      const result = await worker.recognize(imageBuffer);
      const text = result.data.text;

      await worker.terminate();

      if (!text || text.trim().length < 50) {
        throw new Error("OCR returned insufficient text");
      }

      console.log(
        `[PDFOCRService] OCR complete: ${text.length} characters extracted`,
      );

      return text;
    } catch (error) {
      console.error("[PDFOCRService] OCR error:", error);
      throw error;
    }
  }

  /**
   * Alternative: Use commercial OCR API (Google Vision, AWS Textract, etc.)
   * Uncomment and configure if needed
   */
  async ocrImageAPI(
    imageBuffer: Buffer,
    apiKey: string,
    provider: "google" | "aws" | "azure" = "google",
  ): Promise<string> {
    if (provider === "google") {
      return this.ocrImageGoogle(imageBuffer, apiKey);
    } else if (provider === "aws") {
      return this.ocrImageAWS(imageBuffer, apiKey);
    } else {
      return this.ocrImageAzure(imageBuffer, apiKey);
    }
  }

  /**
   * Google Cloud Vision API
   */
  private async ocrImageGoogle(
    imageBuffer: Buffer,
    apiKey: string,
  ): Promise<string> {
    const base64Image = imageBuffer.toString("base64");

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      },
    );

    const data = await response.json();
    return (
      data.responses[0].fullTextAnnotation?.text || ""
    );
  }

  /**
   * AWS Textract API
   */
  private async ocrImageAWS(
    imageBuffer: Buffer,
    apiKey: string,
  ): Promise<string> {
    // Implement AWS Textract
    throw new Error("AWS Textract not yet implemented");
  }

  /**
   * Azure Computer Vision API
   */
  private async ocrImageAzure(
    imageBuffer: Buffer,
    apiKey: string,
  ): Promise<string> {
    // Implement Azure Computer Vision
    throw new Error("Azure Computer Vision not yet implemented");
  }

  /**
   * Utility: Convert PDF pages to images for OCR
   * Requires pdf-lib or ghostscript
   */
  async convertPDFToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    // This requires external dependency (ghostscript or similar)
    // For now, return empty - would need to install pdf-to-image library
    throw new Error(
      "PDF to image conversion requires additional dependencies",
    );
    // Installation:
    // npm install pdf-poppler
    // And ghostscript system library
  }
}

export const pdfOCRService = new PDFOCRService();
```

**Installation for Tesseract.js:**
```bash
npm install tesseract.js
```

**For production with commercial OCR, also install:**
```bash
# Google Cloud Vision
npm install @google-cloud/vision

# AWS Textract
npm install aws-sdk

# Azure Computer Vision
npm install @azure/cognitiveservices-vision-computervision
```

---

## Phase 2.4: Dual Storage Pipeline

### Updated File: `server/lib/knowledge-updater.ts` - Key Changes

```typescript
/**
 * Key update: storeEnrichedKnowledge now ensures dual storage
 */

async function storeEnrichedKnowledge(items: KnowledgeItem[]) {
  console.log(
    `[KnowledgeUpdater] Storing ${items.length} enriched knowledge items to both Supabase and Pinecone...`,
  );

  try {
    // Pre-generate embeddings once
    const embeddings: number[][] = [];
    for (const item of items) {
      const textToEmbed = `${item.title} ${item.description} ${item.content}`;
      const embedding = await generateEmbedding(textToEmbed);
      embeddings.push(embedding);
    }

    // Store to BOTH systems in parallel
    const [supabaseResult, pineconeResult] = await Promise.all([
      // Supabase
      storeInternalKnowledgeBatch(
        items.map((item) => ({
          title: item.title,
          content: item.content,
          description: item.description,
          sourceType: item.sourceType,
          source: item.source,
          categories: item.categories,
          domain: item.domain,
          metadata: item.metadata,
        })),
        5, // concurrency
        embeddings, // PRE-GENERATED embeddings
      ),
      // Pinecone
      storeKnowledgeBatch(
        items.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          content: item.content,
          description: item.description,
          sourceType: item.sourceType,
          source: item.source,
          tags: item.categories,
          domain: item.domain,
          createdAt: item.createdAt,
          confidence: item.metadata?.confidence || 0.8,
          relatedKnowledge: [],
        })),
        3, // concurrency
        embeddings, // PRE-GENERATED embeddings
      ),
    ]);

    console.log("[KnowledgeUpdater] Dual storage complete:");
    console.log(`  Supabase: ${supabaseResult.success} success, ${supabaseResult.failed} failed`);
    console.log(`  Pinecone: ${pineconeResult.success} success, ${pineconeResult.failed} failed`);

    return {
      supabaseSuccess: supabaseResult.success,
      pineconeSuccess: pineconeResult.success,
      totalSuccess: supabaseResult.success + pineconeResult.success,
      totalFailed: supabaseResult.failed + pineconeResult.failed,
    };
  } catch (error) {
    console.error("[KnowledgeUpdater] Error storing enriched knowledge:", error);
    throw error;
  }
}
```

---

## Phase 2.5: Term Deduplication Service

### New File: `server/lib/term-deduplication-service.ts`

```typescript
/**
 * Term Deduplication Service
 * Identifies and merges duplicate/similar terms before storage
 * 
 * Strategies:
 * 1. Exact key matching (normalized)
 * 2. Fuzzy string matching (edit distance)
 * 3. Semantic similarity (embedding-based)
 */

import Levenshtein from "fast-levenshtein";
import { generateEmbedding } from "./pinecone-service";

export interface DedupeOptions {
  strategy?: "exact" | "fuzzy" | "semantic" | "all";
  fuzzyThreshold?: number; // 0-1, default 0.8
  semanticThreshold?: number; // 0-1, default 0.9
  keepHighestConfidence?: boolean; // Keep the term with highest confidence
}

export class TermDeduplicationService {
  /**
   * Deduplicate a collection of terms
   */
  async deduplicate(
    terms: MasterCulinaryTerm[],
    options?: DedupeOptions,
  ): Promise<MasterCulinaryTerm[]> {
    const strategy = options?.strategy || "all";
    const fuzzyThreshold = options?.fuzzyThreshold || 0.8;
    const semanticThreshold = options?.semanticThreshold || 0.9;
    const keepHighestConfidence = options?.keepHighestConfidence !== false;

    console.log(
      `[Deduplication] Starting with ${terms.length} terms (strategy: ${strategy})`,
    );

    const deduped: Map<string, MasterCulinaryTerm> = new Map();

    // Step 1: Exact key matching
    for (const term of terms) {
      const key = this.normalizeKey(term.term);
      if (!deduped.has(key)) {
        deduped.set(key, term);
      } else if (keepHighestConfidence && term.confidence > deduped.get(key)!.confidence) {
        deduped.set(key, term);
      }
    }

    console.log(`[Deduplication] After exact match: ${deduped.size} unique terms`);

    // Step 2: Fuzzy matching (if requested)
    if (strategy === "fuzzy" || strategy === "all") {
      const dedupedFuzzy = await this.fuzzyDedupe(
        Array.from(deduped.values()),
        fuzzyThreshold,
        keepHighestConfidence,
      );
      deduped.clear();
      for (const term of dedupedFuzzy) {
        deduped.set(this.normalizeKey(term.term), term);
      }
      console.log(
        `[Deduplication] After fuzzy match: ${deduped.size} unique terms`,
      );
    }

    // Step 3: Semantic matching (if requested)
    if (strategy === "semantic" || strategy === "all") {
      const dedupedSemantic = await this.semanticDedupe(
        Array.from(deduped.values()),
        semanticThreshold,
        keepHighestConfidence,
      );
      deduped.clear();
      for (const term of dedupedSemantic) {
        deduped.set(this.normalizeKey(term.term), term);
      }
      console.log(
        `[Deduplication] After semantic match: ${deduped.size} unique terms`,
      );
    }

    console.log(
      `[Deduplication] Complete: ${terms.length} → ${deduped.size} terms (${Math.round((deduped.size / terms.length) * 100)}% retained)`,
    );

    return Array.from(deduped.values());
  }

  /**
   * Fuzzy string matching using Levenshtein distance
   */
  private async fuzzyDedupe(
    terms: MasterCulinaryTerm[],
    threshold: number,
    keepHighestConfidence: boolean,
  ): Promise<MasterCulinaryTerm[]> {
    const seen: Map<string, MasterCulinaryTerm> = new Map();

    for (const term of terms) {
      let isDuplicate = false;

      for (const [, seenTerm] of seen) {
        const similarity = this.calculateStringSimilarity(
          term.term,
          seenTerm.term,
        );

        if (similarity >= threshold) {
          isDuplicate = true;
          if (keepHighestConfidence && term.confidence > seenTerm.confidence) {
            seen.delete(seenTerm.term);
            seen.set(term.term, term);
          }
          break;
        }
      }

      if (!isDuplicate) {
        seen.set(term.term, term);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Semantic matching using embeddings
   */
  private async semanticDedupe(
    terms: MasterCulinaryTerm[],
    threshold: number,
    keepHighestConfidence: boolean,
  ): Promise<MasterCulinaryTerm[]> {
    console.log(
      `[Deduplication] Starting semantic deduplication (this may take a while)...`,
    );

    const seen: Map<string, { term: MasterCulinaryTerm; embedding: number[] }> = new Map();

    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];

      // Generate embedding for this term
      const embedding = await generateEmbedding(
        `${term.term} ${term.definition}`,
      );

      let isDuplicate = false;

      for (const [, seenItem] of seen) {
        const similarity = this.cosineSimilarity(embedding, seenItem.embedding);

        if (similarity >= threshold) {
          isDuplicate = true;
          if (
            keepHighestConfidence &&
            term.confidence > seenItem.term.confidence
          ) {
            seen.delete(seenItem.term.term);
            seen.set(term.term, { term, embedding });
          }
          break;
        }
      }

      if (!isDuplicate) {
        seen.set(term.term, { term, embedding });
      }

      // Progress logging every 100 items
      if ((i + 1) % 100 === 0) {
        console.log(
          `[Deduplication] Processed ${i + 1}/${terms.length} terms...`,
        );
      }
    }

    return Array.from(seen.values()).map((item) => item.term);
  }

  /**
   * Utility: Normalize term key
   */
  private normalizeKey(term: string): string {
    return term
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
  }

  /**
   * Utility: Calculate string similarity (0-1)
   */
  private calculateStringSimilarity(a: string, b: string): number {
    const distance = Levenshtein.get(a.toLowerCase(), b.toLowerCase());
    const maxLength = Math.max(a.length, b.length);
    return 1 - distance / maxLength;
  }

  /**
   * Utility: Cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const termDeduplicationService = new TermDeduplicationService();
```

**Install dependency:**
```bash
npm install fast-levenshtein
```

---

## Installation Instructions

```bash
# Install all Phase 2 dependencies
npm install multer @types/multer tesseract.js fast-levenshtein sharp

# Apply database migration
npx supabase migration up

# Run data migration
npx ts-node scripts/migrate-terms-to-postgres.ts

# Restart development server
npm run dev
```

---

## Performance Expectations for 180K Terms

| Operation | Time | Throughput |
|-----------|------|-----------|
| Deduplication | 30-45 min | ~150K terms |
| Embedding Generation | 10-15 hours | ~15-17 terms/sec |
| Supabase Storage | 10-20 min | ~9,000 terms/sec |
| Pinecone Storage | 10-20 min | ~9,000 terms/sec |
| **Total End-to-End** | **11-16 hours** | **~5 batches/min** |

**Cost Expectations:**
- OpenAI Embeddings: 180K terms × $0.00002 = $3.60
- Supabase Storage: ~500MB = minimal cost
- Pinecone: $0.20 per million vectors = $0.036

**Total Cost: ~$4**

---

## Troubleshooting

### If OCR Fails
- Tesseract.js works in Node.js, no system binary needed
- For scanned PDFs, consider using Google Cloud Vision API instead
- Quality improvement: "scanned PDF" language detection

### If Deduplication is Too Slow
- Use fuzzy only, skip semantic
- Reduce fuzzy threshold from 0.8 to 0.7
- Process in smaller batches (10K at a time)

### If Embeddings Timeout
- Already handled with 15-second timeout
- If still timing out, reduce batch size from 100 to 50
- Or increase worker sleep delay

---

## Next Steps

Once Phase 2 is complete:
1. Verify all 180K terms are in Postgres
2. Test embedding generation at scale (sample 10K)
3. Verify both Supabase and Pinecone have vectors
4. Move to Phase 3 (production hardening + knowledge expansion)
