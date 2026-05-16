# Load Testing & Deployment Guide

**Purpose:** Verify system can handle 180K terms at production scale
**Duration:** 2-3 days
**Outcome:** Confident deployment with known performance characteristics

---

## Load Testing Strategy

### Phase 1: Small Scale (1,000 terms)
**Goal:** Verify basic functionality
**Time:** 30 minutes
**Success Criteria:**
- ✅ 100% of terms ingested
- ✅ Both Supabase and Pinecone populated
- ✅ Completion time < 5 minutes
- ✅ No errors or retries > 10%

### Phase 2: Medium Scale (10,000 terms)
**Goal:** Identify bottlenecks and scale issues
**Time:** 2-4 hours
**Success Criteria:**
- ✅ 99%+ ingestion success rate
- ✅ Completion time < 30 minutes
- ✅ Memory usage < 2GB
- ✅ CPU usage < 80%
- ✅ No database connection timeouts

### Phase 3: Full Scale (180,000 terms)
**Goal:** Production readiness verification
**Time:** 11-16 hours
**Success Criteria:**
- ✅ 99.5%+ ingestion success rate
- ✅ Completion time < 20 hours
- ✅ Memory stable (no leaks)
- ✅ Both storage systems populated
- ✅ API response times normal
- ✅ Cost within budget

---

## Test Data Preparation

### Generate Test Dataset

```bash
# Create script: scripts/generate-test-terms.ts

import { MasterCulinaryTerm } from "../server/lib/master-culinary-dictionary";

function generateTestTerms(count: number): MasterCulinaryTerm[] {
  const categories = [
    "technique",
    "ingredient",
    "method",
    "equipment",
    "theory",
    "cuisine",
  ];
  const cuisines = [
    "French",
    "Italian",
    "Asian",
    "American",
    "Spanish",
    "Indian",
  ];

  const terms: MasterCulinaryTerm[] = [];

  for (let i = 0; i < count; i++) {
    const cuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];

    terms.push({
      term: `Term_${i}_${cuisine}_${category}`,
      definition: `Definition for test term ${i} in ${cuisine} cuisine, category ${category}. This is a sample term for load testing.`,
      pronunciation: `pronunciation_${i}`,
      etymology: {
        origin: cuisine,
        originalWord: `Original_${i}`,
        meaning: `Meaning of term ${i}`,
        period: "Modern",
      },
      usage: {
        primary: `Primary usage for term ${i}`,
        secondary: [`Secondary ${i}`],
        context: `${cuisine} cooking`,
      },
      categories: [category, cuisine.toLowerCase()],
      applications: {
        primary: `Application for ${category}`,
        examples: [`Example ${i}`],
        dishes: [`Dish ${i}`],
      },
      relatedTerms: [
        `related_${i - 1}`,
        `related_${i + 1}`,
      ],
      history: {
        period: "Modern",
        culture: cuisine,
        significance: "Test term",
      },
      confidence: 0.85,
      sources: ["Load Testing"],
      masteryLevel: "intermediate",
    });
  }

  return terms;
}

// Run with:
// npx ts-node scripts/generate-test-terms.ts 1000 > test-terms-1k.json
```

---

## Load Testing Procedures

### Test 1: Single Ingestion (1,000 terms)

**Setup:**
```bash
# Generate test data
npx ts-node scripts/generate-test-terms.ts 1000 > test-terms-1k.json

# Create test script
cat > scripts/test-ingestion-1k.ts << 'EOF'
import fetch from "node-fetch";
import * as fs from "fs";

async function test1KIngestion() {
  const terms = JSON.parse(
    fs.readFileSync("test-terms-1k.json", "utf-8")
  );

  console.log("Starting 1K term ingestion test...");

  const startTime = Date.now();

  // Upload terms
  const response = await fetch("http://localhost:3000/api/knowledge/upload-terms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terms, region: "global" }),
  });

  const result = await response.json();

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log(`\n=== INGESTION RESULTS (1K Terms) ===`);
  console.log(`Time: ${duration.toFixed(1)}s`);
  console.log(`Success: ${result.uploadedCount}`);
  console.log(`Failed: ${result.totalCount - result.uploadedCount}`);
  console.log(`Rate: ${(result.uploadedCount / duration).toFixed(1)} terms/sec`);

  // Verify storage
  const statusResponse = await fetch("http://localhost:3000/api/knowledge/status");
  const status = await statusResponse.json();

  console.log(`\n=== STORAGE VERIFICATION ===`);
  console.log(`Supabase vectors: ${status.internal_vectors}`);
  console.log(`Pinecone vectors: ${status.pinecone_vectors || 'N/A'}`);
  console.log(`Master dictionary: ${status.master_dictionary_terms}`);

  // Test query
  const queryResponse = await fetch("http://localhost:3000/api/echo/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "Term_500_French_technique" }),
  });

  const queryResult = await queryResponse.json();
  console.log(`\n=== QUERY TEST ===`);
  console.log(`Results found: ${queryResult.results?.length || 0}`);
  if (queryResult.results?.length > 0) {
    console.log(`Top result: ${queryResult.results[0].title}`);
  }

  return {
    success: result.uploadedCount === result.totalCount,
    duration,
    uploadedCount: result.uploadedCount,
  };
}

test1KIngestion();
EOF

npx ts-node scripts/test-ingestion-1k.ts
```

**Metrics to Record:**
```
Ingestion Time:
- Start: [timestamp]
- End: [timestamp]
- Duration: __ seconds
- Rate: __ terms/second

Success Rate:
- Uploaded: __ / __
- Failed: __
- Success %: __

Memory:
- Peak usage: __ MB
- Stable: Yes/No

Storage Verification:
- Supabase rows: __
- Pinecone vectors: __
- Both match: Yes/No

Query Test:
- Response time: __ ms
- Results found: __
- Quality: Good/Fair/Poor
```

### Test 2: Embedding Generation Throughput (10,000 terms)

```typescript
// scripts/test-embeddings-throughput.ts

import { generateEmbedding } from "../server/lib/pinecone-service";
import { embeddingQueueService } from "../server/lib/embedding-queue-service";

async function testEmbeddingsThroughput() {
  console.log("Testing embedding generation throughput...");

  const testTexts = Array.from({ length: 10000 }, (_, i) =>
    `Test term ${i} with definition and context for embedding generation performance testing`
  );

  const startTime = Date.now();
  let completed = 0;
  let failed = 0;

  // Test sequential (baseline)
  console.log("Testing sequential generation (baseline)...");
  for (let i = 0; i < 100; i++) {
    try {
      await generateEmbedding(testTexts[i]);
      completed++;
    } catch (error) {
      failed++;
    }
  }

  const sequentialTime = Date.now() - startTime;
  console.log(`Sequential 100 terms: ${sequentialTime}ms = ${(100000 / sequentialTime).toFixed(1)} terms/hour`);

  // Test queue (parallel)
  console.log("Testing queue service (parallel)...");
  const queueStartTime = Date.now();

  embeddingQueueService.enqueueBatch(
    testTexts.slice(100, 10000).map((text, i) => ({
      itemId: `test-${i}`,
      text,
      targetStorage: "both",
    }))
  );

  await embeddingQueueService.processQueue((stats) => {
    if (stats.totalProcessed % 500 === 0) {
      console.log(`Progress: ${stats.totalProcessed} items, ETA: ${(stats.estimatedTimeRemaining / 1000 / 60).toFixed(1)} min`);
    }
  });

  const queueTime = Date.now() - queueStartTime;
  const completedCount = embeddingQueueService.getCompletedEmbeddings().size;

  console.log(`\n=== EMBEDDING THROUGHPUT RESULTS ===`);
  console.log(`Sequential (100): ${sequentialTime}ms`);
  console.log(`Queue (9,900): ${queueTime}ms`);
  console.log(`Rate: ${(completedCount / (queueTime / 1000)).toFixed(1)} terms/sec`);
  console.log(`Estimated time for 180K: ${((180000 / (completedCount / (queueTime / 1000))) / 3600).toFixed(1)} hours`);
}

testEmbeddingsThroughput();
```

### Test 3: Concurrent Storage (Full Scale Simulation)

```typescript
// scripts/test-concurrent-storage.ts

import { storeInternalKnowledgeBatch } from "../server/lib/internal-knowledge-service";
import { storeKnowledgeBatch } from "../server/lib/knowledge-vector-service";

async function testConcurrentStorage() {
  console.log("Testing concurrent storage performance...");

  // Generate test items
  const testItems = Array.from({ length: 10000 }, (_, i) => ({
    title: `Test Item ${i}`,
    content: `Test content for item ${i}`,
    description: `Description for test item ${i}`,
    sourceType: "test" as const,
    source: "load-test",
    categories: ["test"],
    domain: "culinary",
    metadata: { test: true },
  }));

  const testEmbeddings = Array.from({ length: 10000 }, () =>
    Array(1536).fill(0).map(() => Math.random())
  );

  console.log("Starting concurrent storage test...");

  const startTime = Date.now();

  // Store to both systems in parallel
  const [supabaseResult, pineconeResult] = await Promise.all([
    storeInternalKnowledgeBatch(testItems, 5, testEmbeddings),
    storeKnowledgeBatch(
      testItems.map((item, i) => ({
        id: `test-${i}`,
        type: "test",
        title: item.title,
        content: item.content,
        description: item.description,
        sourceType: item.sourceType,
        source: item.source,
        tags: item.categories,
        domain: item.domain,
        createdAt: new Date().toISOString(),
        confidence: 0.85,
        relatedKnowledge: [],
      })),
      3,
      testEmbeddings
    ),
  ]);

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log(`\n=== CONCURRENT STORAGE RESULTS ===`);
  console.log(`Supabase: ${supabaseResult.success} success, ${supabaseResult.failed} failed`);
  console.log(`Pinecone: ${pineconeResult.success} success, ${pineconeResult.failed} failed`);
  console.log(`Total time: ${duration.toFixed(1)}s`);
  console.log(`Rate: ${(10000 / duration).toFixed(0)} items/sec`);
  console.log(`Estimated time for 180K: ${((180000 / (10000 / duration)) / 3600).toFixed(1)} hours`);

  // Calculate combined success
  const totalSuccess = supabaseResult.success + pineconeResult.success;
  const successRate = (totalSuccess / (10000 * 2)) * 100;
  console.log(`\nDual storage success rate: ${successRate.toFixed(1)}%`);

  return { supabaseResult, pineconeResult, duration };
}

testConcurrentStorage();
```

---

## Monitoring During Production Ingestion

### Real-time Monitoring Dashboard

```typescript
// Create server/routes/ingestion-monitor.ts

import { Router } from "express";

router.get("/api/ingestion/monitor", (req, res) => {
  // Get current ingestion progress
  const progress = ingestionController.getProgress();
  
  // Get system metrics
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  // Get database stats
  const dbStats = {
    supabaseVectors: 0, // Query from DB
    pineconeVectors: 0, // Query from Pinecone
  };

  res.json({
    progress,
    system: {
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      uptime: uptime,
      timestamp: new Date().toISOString(),
    },
    storage: dbStats,
    eta: calculateETA(progress),
  });
});

function calculateETA(progress: any) {
  const elapsed = progress.elapsedTime || 0;
  const processed = progress.processedTerms || 0;
  const total = progress.totalTerms || 0;

  if (processed === 0) return null;

  const rate = processed / (elapsed / 1000); // terms per second
  const remaining = total - processed;
  const eta = remaining / rate; // seconds

  return {
    remainingSeconds: eta,
    remainingMinutes: Math.round(eta / 60),
    remainingHours: Math.round(eta / 3600),
    estimatedCompletion: new Date(Date.now() + eta * 1000),
  };
}
```

### Monitoring Checklist

```
During Ingestion:
□ Memory usage increasing? (Peak expected: 2-4GB)
□ CPU peaking? (Should be < 80%)
□ Disk I/O steady? (No disk thrashing)
□ Network steady? (No packet loss)
□ Database response times normal? (< 100ms)
□ OpenAI API rate limited? (Check logs for 429s)
□ Vectors in both systems? (Check every 10K items)
□ Errors staying low? (< 1%)
```

---

## Production Deployment Checklist

### Pre-Deployment

#### Code Review & Testing
- [ ] All Phase 1 code changes reviewed
- [ ] All Phase 2 code changes reviewed
- [ ] Unit tests passing for all new modules
- [ ] Integration tests passing
- [ ] Load tests completed successfully (10K minimum)
- [ ] No console errors or warnings
- [ ] All environment variables documented

#### Database
- [ ] Supabase database backed up
- [ ] Migrations tested on staging
- [ ] `master_culinary_terms` table created
- [ ] All indexes created
- [ ] RLS policies configured
- [ ] Full-text search tested
- [ ] pgvector extension enabled

#### External Services
- [ ] OpenAI API key valid
- [ ] SPOONACULAR_API_KEY set (if using)
- [ ] EDAMAM credentials set (if using)
- [ ] Pinecone API key valid
- [ ] Pinecone index created and sized
- [ ] All services responding to health checks

#### Infrastructure
- [ ] Server scaled to handle load (CPU, RAM, disk)
- [ ] Database connections pooled
- [ ] Backup systems configured
- [ ] Monitoring set up (Sentry, Prometheus, etc.)
- [ ] Log aggregation configured
- [ ] CDN configured for static assets
- [ ] SSL certificates valid

#### Operational Readiness
- [ ] Incident response plan documented
- [ ] Rollback procedure documented
- [ ] Team trained on monitoring
- [ ] On-call schedule established
- [ ] Customer communication plan ready

### Deployment Steps

#### Step 1: Staging Deployment
```bash
# Deploy to staging
git push origin main

# Deploy with env variables
npm run build
npm run start

# Run smoke tests
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/training/session/initialize

# Test full ingestion with 100 terms
npm run test:load-small

# Verify both systems have data
curl http://localhost:3000/api/knowledge/status
```

#### Step 2: Production Deployment
```bash
# Tag release
git tag -a v2.0.0-180k-ready -m "Ready for 180K term ingestion"

# Deploy to production
# (Use your CI/CD system - GitHub Actions, GitLab CI, etc.)

# Verify deployment
curl https://api.yourdomain.com/api/health

# Monitor for 1 hour
# Check logs, memory, CPU
```

#### Step 3: Start Ingestion
```bash
# Option A: Start via API
curl -X POST https://api.yourdomain.com/api/terms/ingest/start

# Option B: Via admin console (if available)
# Navigate to admin dashboard → Ingestion → Start

# Monitor progress
while true; do
  curl https://api.yourdomain.com/api/terms/ingestion/progress
  sleep 30
done
```

### Rollback Plan

If anything goes wrong:

```bash
# 1. Stop current ingestion
curl -X POST https://api.yourdomain.com/api/terms/ingest/stop

# 2. Restore database from backup
# (In Supabase console or via pg_restore)

# 3. Revert code
git revert <commit-hash>
npm run deploy

# 4. Verify
curl https://api.yourdomain.com/api/health

# 5. Post-mortem
# Document what went wrong, plan fix
```

---

## Production Monitoring

### Key Metrics to Track

```
Ingestion Performance:
- Terms ingested per hour
- Average embedding generation time
- Supabase success rate
- Pinecone success rate
- Overall success rate (target: >99%)

System Health:
- Memory usage (alert if > 90% of available)
- CPU usage (alert if > 80%)
- Disk usage (alert if > 85%)
- Network latency to APIs
- Database connection pool status

Error Metrics:
- HTTP 5xx errors
- Timeout errors
- Rate limit errors (429)
- Database connection errors

Cost Metrics:
- OpenAI API spend (track against budget)
- Pinecone spend
- Supabase spend
- Total cost vs. estimated
```

### Alerting Rules (Suggested)

```
Critical Alerts (Page on-call):
- Success rate < 95%
- Memory > 95% of available
- Database down (cannot connect)
- Pinecone down
- OpenAI API errors > 10 per minute

Warning Alerts (Email):
- Success rate < 99%
- CPU > 80%
- API response time > 500ms
- Logs indicate warnings
- Cost exceeding 110% of budget
```

### Post-Deployment Verification

After ingestion completes:

```bash
# 1. Verify all terms are in both systems
curl https://api.yourdomain.com/api/knowledge/status
# Expected: {"internal_vectors": ~180000, "pinecone_vectors": ~180000}

# 2. Test search functionality
curl -X POST https://api.yourdomain.com/api/echo/search \
  -d '{"query": "fond"}'
# Expected: Should return multiple results with high relevance

# 3. Test training orchestration
curl -X POST https://api.yourdomain.com/api/training/start \
  -d '{"mode": "sequential", "sources": ["web-crawler"]}'
# Expected: Crawler runs successfully

# 4. Check database statistics
# SELECT COUNT(*) FROM master_culinary_terms;
# Expected: ~180000

# 5. Verify no errors in logs
# grep "ERROR\|CRITICAL" /var/log/application.log
# Expected: Minimal errors (< 0.1%)

# 6. Performance baseline
curl https://api.yourdomain.com/api/knowledge/diagnostics
# Document response times and metrics for future comparison
```

---

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Ingestion Success % | >99.5% | <99% | <95% |
| Embedding Latency | <1 sec | >2 sec | >5 sec |
| Supabase Write Latency | <100ms | >200ms | >500ms |
| Pinecone Write Latency | <100ms | >200ms | >500ms |
| Query Latency | <500ms | >1 sec | >3 sec |
| Memory Peak | <4GB | >6GB | >8GB |
| CPU Peak | <80% | >85% | >95% |
| Disk Usage | <85% | >90% | >95% |

---

## Cost Estimate for 180K Terms

| Service | Cost |
|---------|------|
| OpenAI Embeddings (180K terms) | $3.60 |
| Supabase pgvector storage | Included |
| Pinecone vectors | ~$0.10 |
| Network/transfer | <$1.00 |
| **Total** | **~$5** |

---

## Success Criteria Checklist

Final sign-off before considering complete:

- [ ] 180K terms successfully ingested
- [ ] 99.5%+ success rate
- [ ] < 20 hours total ingestion time
- [ ] Both Supabase and Pinecone populated
- [ ] Search queries working properly
- [ ] Crawler functional
- [ ] PDF uploads working
- [ ] All training modules operational
- [ ] Team trained on monitoring
- [ ] Runbooks documented
- [ ] Incident procedures tested

---

## Contact & Escalation

**For deployment issues:**
1. Check logs: `tail -f /var/log/application.log`
2. Check monitoring dashboard
3. Reference runbooks
4. Contact on-call engineer

**For data inconsistency:**
1. Stop ingestion
2. Verify database state
3. Check both Supabase and Pinecone
4. Restore from backup if needed

**For performance issues:**
1. Check system resources
2. Review slow query logs
3. Verify API quotas
4. Scale infrastructure if needed
