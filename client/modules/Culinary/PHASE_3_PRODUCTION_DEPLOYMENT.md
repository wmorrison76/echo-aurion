# Phase 3: Production Deployment - 180K Term Ingestion

**Duration:** 1 week
**Priority:** CRITICAL - Final step to launch full knowledge base
**Outcome:** Complete 180K term ingestion and production-ready system

---

## Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] Supabase database has `master_culinary_terms` table (run migration from Phase 2)
- [ ] Pinecone project created and API key configured
- [ ] OpenAI API key validated and has sufficient quota
- [ ] SUPABASE_SERVICE_ROLE_KEY in environment variables
- [ ] Database backups scheduled

### System Verification

- [ ] Phase 1 all passing (crawler, PDF upload working)
- [ ] Phase 2 database migration completed
- [ ] Load testing passed (10K terms successfully ingested)
- [ ] All APIs responding correctly
- [ ] Monitoring/alerting configured (Sentry, etc.)

---

## Step-by-Step Deployment

### Step 1: Data Preparation (30 minutes)

Organize the 180K terms in the following format:

**File:** `data/180k-terms.json`

```json
[
  {
    "term": "fond",
    "definition": "The browned bits of food left in a pan after cooking meat, fish, or vegetables...",
    "categories": ["technique", "sauce"],
    "masteryLevel": "intermediate",
    "confidence": 0.92,
    "sourceType": "culinary-reference",
    "metadata": {
      "pronunciation": "fahn",
      "etymology": "French: 'bottom'",
      "relatedTerms": ["deglaze", "pan sauce"],
      "applications": ["gravies", "pan sauces", "braising liquids"]
    }
  },
  ...180000 more terms
]
```

**Expected file size:** ~250-300MB

### Step 2: Database Migration (15 minutes)

Run the Phase 2 migration if not already done:

```bash
# Apply Supabase migration
npx supabase db pull
npx supabase db push

# Or run migration script (if table doesn't exist)
npx ts-node scripts/migrate-terms-to-postgres.ts
```

Verify table creation:

```sql
SELECT COUNT(*) FROM master_culinary_terms;
-- Should return 0 (empty, ready for data)
```

### Step 3: Pre-Ingestion Validation (1 hour)

1. **Load sample data (100 terms)**

   ```bash
   curl -X POST http://localhost:5173/api/load-test/small \
     -H "Content-Type: application/json"
   ```

2. **Run deduplication test**

   ```bash
   curl -X POST http://localhost:5173/api/load-test/deduplication \
     -H "Content-Type: application/json" \
     -d '{"termCount": 5000, "duplicateRate": 0.2}'
   ```

3. **Get time estimate for full 180K**

   ```bash
   curl http://localhost:5173/api/load-test/estimated-time
   ```

4. **Expected results:**
   - Small test: <5 minutes for 1000 terms
   - Medium test: <30 minutes for 10,000 terms
   - Estimated 180K: 8-12 hours (depending on API rate limits)

### Step 4: Data Import - Phase 1 (6-8 hours)

**Ingest first 60K terms to verify system stability:**

1. Create data split:

   ```bash
   # Split 180K into 3 files of 60K each
   cd data
   split -l 60000 180k-terms.json batch-
   ls -lah batch-*
   ```

2. Start ingestion of batch-aa (first 60K):

   ```bash
   # Terminal 1: Monitor progress
   tail -f logs/ingestion-batch-aa.log

   # Terminal 2: Start ingestion
   node scripts/ingest-batch.js data/batch-aa
   ```

3. **What to monitor during ingestion:**
   - Memory usage (should stay < 70% of available)
   - CPU usage (should stay < 80%)
   - Database connections (max 20 for free Supabase tier)
   - OpenAI API rate limit responses (should be < 5% errors)
   - Pinecone vector count increasing (should be ~60K after completion)

4. **Pause points to check:**
   - After 10K terms: Verify embeddings in Supabase + Pinecone
   - After 30K terms: Check database query performance
   - After 60K terms: Confirm all data persisted successfully

### Step 5: Data Import - Phase 2 (6-8 hours)

**Ingest next 60K terms (batch-ab):**

Same process as Step 4, but with batch-ab

- Monitor same metrics
- Expected total in Supabase: ~120K
- Expected total in Pinecone: ~120K

### Step 6: Data Import - Phase 3 (6-8 hours)

**Ingest final 60K terms (batch-ac):**

Same process, completing full 180K ingestion

After completion:

```sql
-- Verify total count
SELECT COUNT(*) FROM master_culinary_terms;
-- Should return 180,000 (or ~150,000 after deduplication)

-- Verify data quality
SELECT
  COUNT(*) as total,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT categories[1]) as unique_categories
FROM master_culinary_terms;
```

### Step 7: Post-Ingestion Validation (2 hours)

1. **Full-text search test**

   ```bash
   curl "http://localhost:5173/api/pdf-library/search?q=cooking"
   # Should return relevant terms
   ```

2. **Knowledge stats verification**

   ```bash
   curl http://localhost:5173/api/knowledge/stats
   # Verify counts match database
   ```

3. **Embedding quality check**

   ```bash
   curl -X POST http://localhost:5173/api/vector/search \
     -H "Content-Type: application/json" \
     -d '{"query": "How to cook chicken", "limit": 10}'
   # Should return semantically relevant results
   ```

4. **Performance benchmarks**
   ```bash
   # Search latency should be < 500ms
   # Deduplication rate should be 15-20%
   # Storage success rate should be > 99%
   ```

---

## Monitoring During Ingestion

### Key Metrics to Track

| Metric                | Target  | Alert Level |
| --------------------- | ------- | ----------- |
| Embedding Gen Success | > 99%   | < 95%       |
| Storage Success Rate  | > 99%   | < 95%       |
| API Response Time     | < 500ms | > 2000ms    |
| Database Query Time   | < 100ms | > 500ms     |
| Memory Usage          | < 70%   | > 85%       |
| CPU Usage             | < 80%   | > 90%       |

### Monitoring Tools

**Sentry (Error Tracking)**

```bash
# Errors should be minimal during ingestion
# Expected error rate: < 1%
```

**Supabase Dashboard**

- Database: Check table sizes and query performance
- Storage: Monitor API bandwidth
- Auth: Verify service role keys are valid

**Pinecone Dashboard**

- Vector count: Should match ingested terms
- Query performance: Should stay consistent
- Index health: Should show no warnings

### Common Issues & Solutions

| Issue                      | Solution                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| Rate limit errors (OpenAI) | Reduce batch size from 100 to 50, add delays between batches          |
| Database timeout           | Reduce concurrent workers from 5 to 3, increase connection pool       |
| Memory spike               | Split into smaller batches (30K instead of 60K)                       |
| Pinecone errors            | Verify API key, check index exists, reduce vector dimension if needed |
| SSL/TLS errors             | Verify certificates, use HTTPS_PROXY if behind proxy                  |

---

## Rollback Plan

If ingestion fails at any point:

1. **Stop current process**

   ```bash
   # Kill any running ingestion scripts
   pkill -f "ingest"
   ```

2. **Check what was ingested**

   ```sql
   SELECT COUNT(*) FROM master_culinary_terms WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

3. **Rollback if needed**

   ```sql
   -- Delete failed batch (replace timestamp)
   DELETE FROM master_culinary_terms
   WHERE created_at > '2024-01-15 10:00:00 UTC';

   -- Verify Pinecone is cleaned up too
   -- (Check Pinecone dashboard or API)
   ```

4. **Retry with adjusted parameters**
   - Reduce batch size
   - Increase retry limits
   - Add longer delays between API calls
   - Run validation tests again

---

## Post-Deployment

### Day 1: Verification

- [ ] All 180K terms searchable
- [ ] API response times acceptable (< 500ms)
- [ ] No errors in logs
- [ ] Database backups working

### Day 2-7: Monitoring

- [ ] Monitor for any pattern of errors
- [ ] Check search quality (manually test 20+ queries)
- [ ] Verify embeddings are semantically correct
- [ ] Performance remains consistent
- [ ] User feedback on knowledge quality

### Week 2+: Optimization

- [ ] Analyze which searches are slow
- [ ] Add indexes for common queries
- [ ] Archive old logs
- [ ] Document lessons learned

---

## Success Criteria

✅ **Deployment is successful if:**

1. **Data Completeness**
   - 180K terms in database (or ~150K after deduplication)
   - All metadata fields populated
   - Confidence scores calculated
   - Embeddings generated for all terms

2. **System Performance**
   - Search response time: < 500ms
   - Database query time: < 100ms
   - No critical errors in logs
   - Memory/CPU usage normal

3. **Data Quality**
   - Full-text search works correctly
   - Semantic search returns relevant results
   - No duplicate terms in system
   - Metadata complete and accurate

4. **Operational Readiness**
   - Monitoring/alerting configured
   - Backup procedures tested
   - Rollback plan documented and tested
   - Team trained on system

---

## Timeline

| Phase                       | Duration    | Status               |
| --------------------------- | ----------- | -------------------- |
| Pre-deployment verification | 2 hours     | Ready                |
| Data preparation            | 30 min      | Pending              |
| Database migration          | 15 min      | Pending              |
| Pre-ingestion validation    | 1 hour      | Pending              |
| Ingestion Phase 1 (60K)     | 6-8 hours   | Pending              |
| Ingestion Phase 2 (60K)     | 6-8 hours   | Pending              |
| Ingestion Phase 3 (60K)     | 6-8 hours   | Pending              |
| Post-ingestion validation   | 2 hours     | Pending              |
| **Total**                   | **~2 days** | **Ready to execute** |

---

## Contact & Support

**During deployment:**

- Monitor Sentry for real-time errors
- Check Supabase dashboard for database issues
- Verify Pinecone index health

**After deployment:**

- All documentation in `/docs/knowledge-base-guide.md`
- API endpoints documented in `/docs/api-reference.md`
- Troubleshooting guide in `/docs/troubleshooting.md`

---

## Version History

- **v1.0** (2024-01-15): Initial Phase 3 deployment guide
- Ready for 180K term production ingestion
