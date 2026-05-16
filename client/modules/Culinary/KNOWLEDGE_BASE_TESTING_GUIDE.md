# Knowledge Base Ingestion Testing Guide

## Pre-Testing Checklist

### ✓ Code Changes Deployed

- [ ] pinecone-service.ts updated with timeout logic
- [ ] internal-knowledge-service.ts updated to accept pre-generated embeddings
- [ ] knowledge-vector-service.ts updated to accept pre-generated embeddings
- [ ] terms-vector-ingestion.ts updated to pass embeddings
- [ ] All changes compiled without errors

### ✓ Environment Verified

- [ ] OPENAI_API_KEY is set and valid
- [ ] PINECONE_API_KEY is set and valid
- [ ] SUPABASE_URL is set
- [ ] Supabase migrations applied (010_internal_knowledge_vectors.sql)
- [ ] PostgreSQL pgvector extension enabled

---

## Test 1: Basic Ingestion Flow

### Step 1.1: Clear Previous Data (Optional)

```bash
# Clear Supabase internal knowledge vectors
curl -X DELETE http://localhost:3000/api/knowledge/clear
# Expected: { "success": true, "cleared": 0 } (or deleted count)

# Note: Cannot directly clear Pinecone via API, but new ingestion will overwrite
```

### Step 1.2: Check Current State

```bash
# Get terms count
curl http://localhost:3000/api/terms/count
```

**Expected Response:**

```json
{
  "success": true,
  "totalTerms": 10556,
  "uploadedTerms": 10265,
  "masterTerms": 291,
  "termsReady": true,
  "message": "10556 terms available for ingestion (10265 uploaded, 291 built-in)"
}
```

### Step 1.3: Start Ingestion

```bash
curl -X POST http://localhost:3000/api/terms/ingest/start
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Ingestion started",
  "message2": "Check /api/terms/ingestion/progress for updates"
}
```

### Step 1.4: Monitor Progress

```bash
# Run this in a loop to watch progress
curl http://localhost:3000/api/terms/ingestion/progress

# Check every 5 seconds:
watch -n 5 'curl -s http://localhost:3000/api/terms/ingestion/progress | jq'
```

**Expected Progress Sequence:**

**Phase 1: Embedding Generation** (0-30 minutes)

```json
{
  "status": "in_progress",
  "progress": {
    "totalTerms": 10556,
    "processedTerms": 5000,
    "currentPhase": "embedding",
    "message": "Generated embeddings for 5000/10556 terms",
    "overallProgress": 12,
    "embeddingsGenerated": 5000,
    "embeddingsFailed": 0
  }
}
```

**Key Metrics to Monitor:**

- ✅ `embeddingsGenerated` should increase monotonically
- ✅ `embeddingsFailed` should stay at 0 or very low
- ✅ Progress should advance smoothly (no sudden stops)
- ❌ Should NOT hang at 704 like before

**Phase 2: Supabase Storage** (5-10 minutes)

```json
{
  "status": "in_progress",
  "progress": {
    "currentPhase": "supabase",
    "message": "Ingested 5000 terms to Supabase",
    "supabaseSuccess": 5000,
    "supabaseErrors": 0,
    "overallProgress": 65
  }
}
```

**Key Metrics:**

- ✅ `supabaseSuccess` should be > 0 (was 0 before!)
- ✅ Should approach total term count
- ✅ `supabaseErrors` should be low (< 1% failure)

**Phase 3: Pinecone Storage** (5-10 minutes)

```json
{
  "status": "in_progress",
  "progress": {
    "currentPhase": "pinecone",
    "message": "Ingested 10556 terms to Pinecone",
    "pineconeSuccess": 10556,
    "pineconeErrors": 0,
    "overallProgress": 98
  }
}
```

**Key Metrics:**

- ✅ `pineconeSuccess` should be 10,556 (was 704 before!)
- ✅ Should match total terms (not capped at 704)
- ✅ `pineconeErrors` should be 0 or < 10

**Phase 4: Complete**

```json
{
  "status": "in_progress",
  "progress": {
    "currentPhase": "complete",
    "message": "✓ Ingestion complete! Processed 21112 terms in 2145.3s",
    "overallProgress": 100,
    "embeddingsGenerated": 10556,
    "supabaseSuccess": 10556,
    "pineconeSuccess": 10556,
    "pineconeErrors": 0,
    "supabaseErrors": 0
  }
}
```

**Success Criteria:**

- ✅ `currentPhase` = "complete"
- ✅ `overallProgress` = 100
- ✅ `embeddingsGenerated` = 10,556
- ✅ `supabaseSuccess` + `pineconeSuccess` = 21,112 (both systems)
- ✅ Errors are minimal (< 10 total)
- ✅ Completion time: 30-60 minutes (not instant, not hanging)

---

## Test 2: Verify Data Storage

### Test 2.1: Check Supabase

```bash
# Query internal knowledge vectors count
curl -X POST https://uloszkcuqppfahlssjju.supabase.co/rest/v1/rpc/get_internal_knowledge_stats \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "total_count": 10556,
  "source_type_breakdown": {
    "culinary-dictionary": 10556
  },
  "domain_breakdown": {
    "culinary": 10556
  },
  "average_confidence": 0.85
}
```

### Test 2.2: Query Supabase Directly

```bash
# Login to Supabase dashboard
# Navigate to: Database → internal_knowledge_vectors table
# Verify:
# - Rows: 10,556 (should see this count)
# - Columns: id, title, content, embedding, source_type, etc.
# - Sample: Click row with title "Fond" to verify data structure
```

### Test 2.3: Check Pinecone

```javascript
// Via Pinecone console or Python client
import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.Index("echo-knowledge");
const stats = await index.describeIndexStats();

console.log(stats);
// Expected: { "namespaces": { "": { "recordCount": 10556 } } }
```

**Expected in Pinecone:**

- Index name: `echo-knowledge`
- Total vectors: 10,556 (was 704 before!)
- All vectors have 1536 dimensions
- Metadata includes title, domain, sourceType, confidence

---

## Test 3: Request Timeout Verification

### Test 3.1: Simulate OpenAI Timeout

```bash
# Add a slow endpoint to test timeout behavior
# Edit pinecone-service.ts generateEmbedding temporarily:
# const REQUEST_TIMEOUT_MS = 2000; // Reduce to 2 seconds for testing

# Call endpoint that requires embedding
curl http://localhost:3000/api/terms/count

# Expected behavior:
# - First call times out (2 seconds)
# - Retries with backoff
# - Eventually succeeds or falls back to mock
# - Logs should show timeout message:
#   "[GenerateEmbedding] Attempt 1/3 failed (timeout), backing off..."
```

**Check Server Logs:**

```
[GenerateEmbedding] Attempt 1/3 failed (timeout), backing off 1000ms
[GenerateEmbedding] Attempt 2/3 failed (timeout), backing off 2000ms
[GenerateEmbedding] Attempt 3/3 failed (timeout), backing off 4000ms
[GenerateEmbedding] All retries failed, using mock embedding as fallback
```

✅ **Success:** Timeout is caught and handled gracefully (not hung forever)

### Test 3.2: Restore Normal Timeout

```bash
# Edit back to REQUEST_TIMEOUT_MS = 15000
# Verify ingestion works normally
```

---

## Test 4: Embedding Reuse Verification

### Test 4.1: Monitor API Call Count

```bash
# Add logging to generateEmbedding to track calls
# Wrap the fetch call with a counter:

let embeddingCallCount = 0;
const logEmbeddingCall = () => {
  embeddingCallCount++;
  console.log(`[EmbeddingAPI] Call #${embeddingCallCount}`);
};

// Before fetch call
logEmbeddingCall();
```

**Expected Call Count:**

- **Before fixes:** ~31,795 calls (10,556 × 3)
- **After fixes:** ~10,556 calls (only 1 generation)

### Test 4.2: Verify Via Logs

```bash
# During ingestion, grep logs for embedding generation
# You should see approximately 10,556 "Generated embeddings" messages
# NOT 31,795 messages

grep "Generated embeddings" server.log | wc -l
# Expected: ~10,556 (not ~31,795)

# Monitor OpenAI API usage
# Should be significantly lower than before
```

---

## Test 5: Rate Limit Handling

### Test 5.1: Check for 429 Responses

```bash
# Monitor logs during ingestion for rate limit handling
# Should see patterns like:
```

**Expected Log Patterns:**

```
[GenerateEmbedding] Rate limited (429), backing off 1000ms before retry 1/3
[GenerateEmbedding] Rate limited (429), backing off 2000ms before retry 2/3
[GenerateEmbedding] Successfully recovered from rate limit
```

✅ **Success:** Rate limits are handled with exponential backoff

### Test 5.2: Verify No Infinite Hangs

```bash
# Ingestion should complete in ~30-60 minutes
# NOT hang indefinitely or timeout after certain point

# Monitor with:
time curl -X POST http://localhost:3000/api/terms/ingest/start
# Complete ingestion from start to finish
```

---

## Test 6: Echo's Brain Functionality

### Test 6.1: Test "Fond" Query

```bash
# This is the user's original test case
curl -X POST http://localhost:3000/api/echo/search \
  -H "Content-Type: application/json" \
  -d '{"query": "what is fond", "topK": 5}'
```

**Expected Response:**

```json
{
  "success": true,
  "results": [
    {
      "title": "Fond",
      "content": "Browned and caramelized food particles that stick to a pan or cooking surface...",
      "similarity": 0.95,
      "source": "culinary-dictionary",
      "metadata": {
        "confidence": 1.0,
        "categories": ["technique", "cooking"]
      }
    }
  ]
}
```

### Test 6.2: Test Wine Pairing (Future)

```bash
curl -X POST http://localhost:3000/api/echo/search \
  -H "Content-Type: application/json" \
  -d '{"query": "wine pairing for beef"}'

# Expected: (Once wine KB is added)
# Returns wine recommendations with tasting notes
```

### Test 6.3: Test Food Safety Query

```bash
curl -X POST http://localhost:3000/api/echo/search \
  -H "Content-Type: application/json" \
  -d '{"query": "HACCP critical control points"}'

# Expected: (Once food safety KB is added)
# Returns HACCP protocols and procedures
```

---

## Test 7: Performance Benchmarks

### Test 7.1: Ingestion Speed

```bash
# Measure total ingestion time
START_TIME=$(date +%s)
curl -X POST http://localhost:3000/api/terms/ingest/start
# Wait for completion...
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Total ingestion time: ${DURATION} seconds"
echo "Rate: $((10556 / DURATION)) terms per second"
```

**Expected Benchmark:**

- ✅ Total time: 30-60 minutes
- ✅ Rate: ~3-5 terms per second
- ✅ No timeouts or hangs
- ❌ Should NOT complete instantly (that would mean failures)
- ❌ Should NOT take > 2 hours (that would indicate problems)

### Test 7.2: Query Performance

```bash
# Test response time for knowledge queries
curl -w "@curl-format.txt" -o /dev/null -s \
  -X POST http://localhost:3000/api/echo/search \
  -H "Content-Type: application/json" \
  -d '{"query": "what is fond"}'
```

**Expected:**

- ✅ Response time: < 500ms
- ✅ Query returns results
- ✅ Similarity scores range 0.0-1.0

### Test 7.3: Storage Efficiency

```bash
# Check database size
# Supabase:
# SELECT pg_size_pretty(pg_total_relation_size('internal_knowledge_vectors'));
# Expected: ~500MB-1GB for 10,556 vectors with 1536 dimensions

# Pinecone:
# Via console, check index stats
# Expected: 10,556 vectors, 1536 dimensions each
```

---

## Test 8: Error Scenarios

### Test 8.1: Network Interruption

```bash
# Simulate network timeout
# Kill network for 30 seconds during ingestion

# Expected behavior:
# ✅ Ingestion pauses
# ✅ Requests timeout after 15 seconds
# ✅ Exponential backoff prevents hammer-effect
# ✅ Resumes when network returns
```

### Test 8.2: Incomplete Data

```bash
# Manually insert a term with invalid embedding
INSERT INTO internal_knowledge_vectors (title, content, embedding, source_type, domain, source, metadata)
VALUES ('BadTerm', 'No content', vec_zero(1536), 'test', 'test', 'test', '{}');

# Test retrieval
# Should handle gracefully (skip or return with warning)
```

### Test 8.3: Duplicate Terms

```bash
# Run ingestion twice
# First ingestion: 10,556 terms stored
# Second ingestion: Should update existing, not duplicate

# Expected:
# SELECT COUNT(*) FROM internal_knowledge_vectors;
# Result: Still ~10,556 (not ~21,112)
```

---

## Troubleshooting Guide

### Issue: Ingestion Hangs at ~704 Terms (BEFORE FIX)

**Status:** ✅ FIXED
**Solution:** Timeout was added to generateEmbedding()
**Verification:** Should now progress beyond 704

### Issue: Supabase Shows 0 Terms Ingested

**Status:** ✅ FIXED
**Solution:** Now passes pre-generated embeddings instead of regenerating
**Verification:** Supabase should show 10,556 terms

### Issue: OpenAI Rate Limiting (429 Errors)

**Status:** ✅ IMPROVED
**Solution:** Exponential backoff + Retry-After header handling
**Verification:** Logs should show "Rate limited, backing off..."

### Issue: High API Costs

**Status:** ✅ FIXED
**Solution:** Embeddings generated once instead of 3x
**Verification:** Embedding call count should be ~10,556 not ~31,795

### Issue: Queries Still Return No Results for "Fond"

**Status:** Test after re-ingestion
**Solution:** May need to clear old bad data or re-import
**Verification:** Check that term was successfully ingested

---

## Success Checklist

### ✅ Ingestion Complete

- [ ] No errors or timeouts during ingestion
- [ ] Progress reaches 100%
- [ ] Total time: 30-60 minutes

### ✅ Data Verification

- [ ] Supabase shows 10,556+ terms
- [ ] Pinecone shows 10,556+ vectors
- [ ] Sample terms (Fond, Sauce, Technique) are retrievable

### ✅ Functionality

- [ ] Query for "fond" returns correct definition
- [ ] Query response time < 500ms
- [ ] No null/undefined results

### ✅ Performance

- [ ] Embedding API calls: ~10,556 (not ~31,795)
- [ ] No hangs or timeouts
- [ ] Rate limiting handled gracefully

### ✅ Quality

- [ ] No duplicate terms
- [ ] All embeddings valid (1536 dimensions)
- [ ] Metadata complete and accurate
- [ ] Confidence scores reasonable (0.8-1.0)

---

## Post-Verification Actions

### If All Tests Pass ✅

1. Celebrate! The critical bottlenecks are fixed
2. Document actual timings and metrics
3. Plan Phase 2: Expansion to wine/beverage
4. Begin knowledge base expansion

### If Tests Fail ❌

1. Review specific failure
2. Check logs for error messages
3. Compare with expected responses
4. File issue with details
5. May need to debug timeout logic or embedding parameters

---

## Quick Reference

| Metric              | Before        | After               | Test Location |
| ------------------- | ------------- | ------------------- | ------------- |
| Terms to Pinecone   | 704           | 10,556              | Test 2.3      |
| Terms to Supabase   | 0             | 10,556              | Test 2.1      |
| OpenAI API Calls    | 31,795        | 10,556              | Test 4.1      |
| Total Time          | ~Hour (hangs) | 30-60 min           | Test 7.1      |
| Timeout Handling    | None          | 15 seconds          | Test 3.1      |
| Rate Limit Handling | Poor          | Exponential backoff | Test 5        |
