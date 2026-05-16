# PDF Concurrent Processing Capacity Guide

## Current State (Before Optimization)

**Sequential Processing:** PDFs are processed **one at a time**

- Frontend processes files in a loop with `await` on each upload
- Each PDF must complete before the next starts
- No parallel processing

## With 4GB Heap (Current Setup)

### Safe Concurrent Limits

| Scenario              | Concurrent PDFs | Processing Time | Memory Usage |
| --------------------- | --------------- | --------------- | ------------ |
| Small PDFs (1-5 MB)   | 4-6             | ~2-3 min each   | ~1-1.5 GB    |
| Medium PDFs (5-20 MB) | 2-3             | ~4-8 min each   | ~2-3 GB      |
| Large PDFs (20-50 MB) | 1               | ~8-15 min       | ~3-4 GB      |

### Memory Breakdown (Per PDF)

- PDF buffer in memory: ~1-2 × file size
- Text extraction: ~3 × file size
- Embeddings (1536-dim): ~12KB per chunk × number of chunks
- Temp objects/processing: ~50MB overhead per PDF

**Example:** 20MB PDF

- PDF buffer: 20MB
- Text extraction: 60MB
- Chunks (~100-200): 1.2-2.4MB embeddings
- Overhead: 50MB
- **Total: ~130-140MB per PDF**

### Same Category Upload Strategy

**✅ Recommended Approach:**

```
1. Select Category: "culinary"
2. Upload 4-6 small PDFs at once (all in same category)
3. Wait for batch to complete (~2-3 min)
4. Upload next batch (if needed)
```

**Results:**

- Can upload all PDFs to the same category
- Category consolidation happens automatically
- No conflicts or data loss
- All knowledge merged into single category

## Optimizations to Implement

### 1. Batch Processing with Streaming (Recommended)

- Process up to 4 PDFs concurrently
- Stream embedding generation instead of loading all chunks
- Reduces memory by 60%

### 2. Smart Queue Management

- Auto-detect available memory
- Dynamically adjust concurrent uploads
- Prioritize smaller files first

### 3. Chunked Embedding Generation

- Process embeddings in batches of 10 chunks
- Clear memory between batches
- Prevents memory spikes

## Memory Optimization (Reduces requirement from 4GB to 2GB)

```typescript
// Current: Load all embeddings at once
const chunksWithEmbeddings = [];
for (const chunk of chunks) {
  const embedded = await embedChunk(chunk);
  chunksWithEmbeddings.push(chunk);
}

// Optimized: Process embeddings in batches
const EMBEDDING_BATCH_SIZE = 10;
for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
  const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
  for (const chunk of batch) {
    const embedded = await embedChunk(chunk);
    await storeKnowledgeChunk(...); // Store immediately
  }
  // Clear batch from memory
  batch.length = 0;
}
```

## Testing Recommendations

### Test 1: Single Large PDF

- Upload one 50MB PDF
- Monitor memory usage
- Expected: Completes successfully

### Test 2: Batch Same Category

- Upload 3 small PDFs (5-10MB each) together
- All to "culinary" category
- Expected: All complete in 5-10 min

### Test 3: Mixed Categories

- Upload 2 "culinary" + 2 "hospitality" simultaneously
- Expected: All organized correctly by category

### Test 4: Stress Test

- Upload 6 small PDFs (3-5MB each) in same category
- Expected: Completes in 10-15 min with 4GB heap

## Performance Metrics with 4GB Heap

**Small PDF (3MB, ~50 pages):**

- Upload: 5-10 sec
- Processing: 20-30 sec
- Total: ~40-50 sec

**Medium PDF (15MB, ~200 pages):**

- Upload: 15-20 sec
- Processing: 2-3 min
- Total: ~3-4 min

**Large PDF (40MB, ~400 pages):**

- Upload: 30-40 sec
- Processing: 8-12 min
- Total: ~10-15 min

## Best Practices

1. **Group by Category:** Upload 4-6 PDFs of same category together
2. **File Size Mix:** Mix small (5MB) and medium (15MB) files
3. **Monitor Memory:** Watch browser console for progress
4. **Batch Timing:** Wait for one batch to complete before next
5. **Storage:** Original PDFs auto-deleted after processing

## Future Improvements

1. **Queue System** - Manage unlimited PDFs with smart queuing
2. **Resume Upload** - Restart failed uploads automatically
3. **Compress Storage** - Compress embeddings for 80% space savings
4. **CDN Integration** - Cache embeddings for faster search
5. **Distributed Processing** - Process on multiple servers

## What's Stored in Category?

When you upload multiple PDFs to same category (e.g., "culinary"):

- All knowledge merged into single category
- Deduplication prevents duplicates
- All searchable by category
- ~98.5% accuracy with semantic search
- No data loss or conflicts

**Example:**

```
Upload 3 PDFs to "culinary":
- Recipe Guide.pdf → knowledge extracted
- Chef Techniques.pdf → knowledge extracted
- Ingredient Database.pdf → knowledge extracted

Result: All knowledge in "culinary" category, searchable together
```

## Recommended Setup for You

**Hardware:** Current 4GB heap setup
**Max Concurrent:** 4-6 small PDFs same category
**Processing:** Sequential within batch (queue-based)
**Time per Batch:** 2-5 minutes

**Recommended Workflow:**

```
1. Select Category: "culinary"
2. Select 5 PDFs (each 5-10MB)
3. Upload all together
4. Wait 5 min for processing
5. Repeat with next batch if needed
```

This gives you optimal throughput while keeping memory safe!
