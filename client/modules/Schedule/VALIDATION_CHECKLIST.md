# Production Validation Checklist

**Use this checklist to verify the system is production-ready**

---

## Phase 1: Safety & Stability (Week 1-2)

### ✅ Input Validation

- [ ] All `GET` endpoints validate query parameters with Zod
- [ ] All `POST`/`PATCH` endpoints validate body with Zod
- [ ] Invalid input returns HTTP 400 (not 200)
- [ ] Error response includes validation details
- [ ] Test: `GET /api/staff/skills?dept_id=invalid` → Returns 400

**Test Command**:
```bash
curl -X GET "http://localhost:8080/api/staff/skills?dept_id=invalid" \
  -H "Content-Type: application/json"
# Should return: { "error": "Invalid department UUID", "code": "VALIDATION_ERROR" }
# Status: 400
```

---

### ✅ Error Handling

- [ ] All error responses follow consistent format
- [ ] Database errors return 500 (not 200)
- [ ] Auth errors return 401 (not 200)
- [ ] Validation errors return 400 (not 200)
- [ ] All responses include `error`, `code`, `requestId`, `timestamp`
- [ ] No silent failures (all errors return proper status codes)
- [ ] Test: Verify 10 endpoints return correct status codes

**Test Command**:
```bash
# Test database error (try invalid employee UUID)
curl -X POST "http://localhost:8080/api/staff/rate" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "00000000-0000-0000-0000-000000000000",
    "outlet_id": "00000000-0000-0000-0000-000000000000",
    "shift_date": "2024-01-15",
    "punctuality": 5, "quality": 5, "teamwork": 5, "guest_feedback": 5
  }'
# Should return status 500 with error details
```

---

### ✅ Authorization

- [ ] `/api/staff/*` requires `requireRole("DEPT_MGR", "GM", "ADMIN")`
- [ ] `/api/scheduler/*` requires `requireRole("DEPT_MGR", "GM", "ADMIN")`
- [ ] `/api/analytics/performance` requires `requireRole("DEPT_MGR", "GM", "ADMIN")`
- [ ] `/api/reports/*` requires `requireRole("GM", "ADMIN")`
- [ ] `/api/pos/webhook/*` validates webhook signature
- [ ] Unauthorized user gets 403 Forbidden
- [ ] Test: Access sensitive endpoint as EMPLOYEE role → Returns 403

**Test Command**:
```bash
# Create mock user with EMPLOYEE role
# Try to access /api/staff/rate (requires DEPT_MGR+)
# Should return 403 Forbidden

curl -X POST "http://localhost:8080/api/staff/rate" \
  -H "Authorization: Bearer mock-employee-token" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Should return status 403
```

---

### ✅ Tenant Isolation

- [ ] User from Org A cannot query Org B's data
- [ ] Every request validated that `user.org_id === request.org_id`
- [ ] Test: User in Org A tries to fetch Org B data → Returns 403

**Test Command**:
```bash
# User belongs to org-1
# Try to access org-2 data
curl -X GET "http://localhost:8080/api/schedule?org_id=org-2&outlet_id=outlet-1&dept_id=dept-1"
# Should return 403 (user can't access org-2)
```

---

### ✅ Database Constraints

- [ ] Rating scores enforce 0-5 range (CHECK constraint)
- [ ] Hourly rates cannot be negative (CHECK constraint)
- [ ] Tips declared cannot be negative (CHECK constraint)
- [ ] Unique constraints prevent duplicate records
- [ ] Test: Try to insert invalid data → Database rejects

**Test SQL**:
```sql
-- This should FAIL (quality > 5)
INSERT INTO ratings (employee_id, shift_date, quality, punctuality, teamwork, guest_feedback)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '2024-01-15',
  10,  -- ← Should violate CHECK constraint
  5, 5, 5
);
-- Expected: ERROR: new row for relation "ratings" violates check constraint "quality_range"

-- This should FAIL (negative rate)
INSERT INTO employees (org_id, outlet_id, dept_id, position_id, first_name, last_name, hourly_rate)
VALUES (
  'org-1', 'outlet-1', 'dept-1', 'pos-1',
  'John', 'Doe',
  -10  -- ← Should violate CHECK constraint
);
-- Expected: ERROR: new row for relation "employees" violates check constraint "hourly_rate_nonnegative"
```

---

## Phase 2: Performance & Scale (Week 3-6)

### ✅ Pagination

- [ ] `GET /api/events` supports `?limit=50&offset=0`
- [ ] `GET /api/schedule` supports `?limit=100&offset=0`
- [ ] `GET /api/analytics/performance` supports pagination
- [ ] Response includes `{ data, total, offset, limit, hasMore }`
- [ ] Default limit=50, max limit=500
- [ ] Test: Fetch 1000 records in pages of 50 → No timeouts

**Test Command**:
```bash
# Fetch first 50
curl "http://localhost:8080/api/events?offset=0&limit=50"
# Response: { "data": [...50 items], "total": 250, "hasMore": true }

# Fetch next 50
curl "http://localhost:8080/api/events?offset=50&limit=50"
# Response: { "data": [...50 items], "total": 250, "hasMore": true }

# Fetch last 50
curl "http://localhost:8080/api/events?offset=200&limit=50"
# Response: { "data": [...50 items], "total": 250, "hasMore": false }
```

---

### ✅ Query Performance

- [ ] `/api/analytics/performance` response < 100ms for 50-emp department
- [ ] `/api/staff/skills` response < 200ms
- [ ] `/api/events` response < 150ms
- [ ] No N+1 queries (verify with Supabase Query Inspector)
- [ ] Database indices created on common filters
- [ ] Test: Measure query time before/after optimization

**Test Command (using curl -w for timing)**:
```bash
curl -w "\nTotal time: %{time_total}s\n" \
  "http://localhost:8080/api/analytics/performance?dept_id=dept-1&start=2024-01-01&end=2024-01-31"
# Should complete in < 1 second
```

---

### ✅ Caching

- [ ] Frontend: List endpoints cached for 5 minutes (TanStack Query)
- [ ] Frontend: Tab switches don't re-fetch if data fresh
- [ ] Test: Switch tabs back and forth → No additional API calls

**Browser DevTools Check**:
1. Open Network tab
2. Navigate to Dashboard → Schedule tab (first load)
3. Switch to Events tab (will fetch)
4. Switch back to Schedule tab (should NOT fetch again if < 5 min)
5. Verify: Second switch to Events uses cache

---

### ✅ Error Boundaries

- [ ] Component crashes caught by error boundary
- [ ] Error boundary shows fallback UI (not blank page)
- [ ] Error ID displayed for debugging
- [ ] Test: Throw error in component → See error boundary UI

**Test in Component**:
```typescript
export function TestError() {
  throw new Error("Test error"); // Caught by ErrorBoundary
}

// Add to Dashboard temporarily
<ErrorBoundary>
  <TestError />  {/* Should show error boundary UI, not white screen */}
</ErrorBoundary>
```

---

### ✅ Logging

- [ ] Request ID included in all logs
- [ ] Database errors logged with context
- [ ] Performance metrics logged
- [ ] Test: Check server logs for structured entries

**Log Output Check**:
```bash
# Check logs
tail -f server.log | grep "ERROR\|requestId"
# Should see: { "timestamp": "...", "level": "error", "requestId": "req-123", ... }
```

---

## Phase 3: Enterprise Features (Month 2+)

### ✅ POS Integration (Toast)

- [ ] Webhook endpoint receives Toast events
- [ ] Webhook signature verified (HMAC-SHA256)
- [ ] Revenue data stored correctly
- [ ] Covers/guests parsed and stored
- [ ] Real-time updates visible in dashboard
- [ ] Test: Send mock Toast webhook → Verify data stored

**Test Command**:
```bash
# Mock Toast webhook
curl -X POST "http://localhost:8080/api/pos/webhook/toast" \
  -H "Content-Type: application/json" \
  -H "X-Toast-Signature: (mock-signature)" \
  -d '{
    "event_type": "revenue.updated",
    "business_date": "2024-01-15",
    "revenue": 5000,
    "covers": 125,
    "service_period": "dinner"
  }'
# Should store in revenues table
```

---

### ✅ Multi-Property Dashboard

- [ ] `/api/analytics/corporate/overview` returns org-wide metrics
- [ ] Metrics aggregated across all outlets
- [ ] Property comparison available
- [ ] Benchmarking shows vs. average, vs. best, vs. budget
- [ ] Test: View corporate dashboard → See data for all properties

---

### ✅ GL Code Mapping

- [ ] Departments can be assigned GL codes
- [ ] P&L export includes GL codes
- [ ] QB import format correct
- [ ] Test: Export P&L → Open in QuickBooks → Imports without errors

---

## Load Testing

### Setup (using k6)

```javascript
// loadtest.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95th percentile < 500ms
  },
};

export default function () {
  let url = 'http://localhost:8080/api/schedule?dept_id=dept-1&offset=0&limit=50';
  let res = http.get(url);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

```bash
# Run load test
k6 run loadtest.js

# Expected output:
# ✓ status is 200: 100%
# ✓ response time < 500ms: 95%
```

---

## Security Audit Checklist

### API Security

- [ ] No hardcoded secrets in code
- [ ] All API keys use environment variables
- [ ] OPENAI_API_KEY not exposed to client
- [ ] CORS restricted to known domains (not `*`)
- [ ] Rate limiting enabled (100 req/min default)
- [ ] HTTPS enforced in production
- [ ] HSTS header set (`max-age=31536000`)
- [ ] X-Frame-Options: DENY
- [ ] Content-Security-Policy set
- [ ] No verbose error messages (don't leak server paths)

**Test Commands**:
```bash
# Check for exposed secrets
grep -r "sk-" src/ server/ --include="*.ts" --exclude="*.env"
# Should return 0 results

# Check CORS header
curl -i "http://localhost:8080/api/schedule" -H "Origin: https://malicious.com"
# Should NOT have Access-Control-Allow-Origin: *

# Check security headers
curl -i "http://localhost:8080/" | grep -E "HSTS|X-Frame|CSP"
# Should see security headers
```

---

### Database Security

- [ ] RLS enabled on sensitive tables
- [ ] No user data exposed in error messages
- [ ] PII encrypted at rest (future)
- [ ] Backups configured and tested
- [ ] All queries use parameterized statements

**Test RLS**:
```sql
-- User in Org A tries to see Org B's shifts
-- Connect as org-a-user
SELECT * FROM shifts WHERE org_id = 'org-b';
-- Should return 0 rows (RLS blocks it)
```

---

## Deployment Checklist

### Before Going Live

- [ ] All tests pass
- [ ] TypeScript: 0 errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console.log statements in production code
- [ ] Environment variables configured (all required ones)
- [ ] Database migrations applied
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring configured (uptime, error rate)
- [ ] Backups verified working
- [ ] Staging environment matches production
- [ ] Team trained on monitoring/incident response
- [ ] Rollback plan documented

---

### Smoke Tests (Run After Deployment)

```bash
#!/bin/bash
# smoke-tests.sh

BASE_URL="https://your-production-api.com"

echo "Running smoke tests..."

# Test 1: API is up
echo "Test 1: API health"
curl -f "$BASE_URL/api/health" || exit 1

# Test 2: Can authenticate
echo "Test 2: Authentication"
curl -f "$BASE_URL/api/ping" || exit 1

# Test 3: Schedule endpoint works
echo "Test 3: Schedule endpoint"
curl -f "$BASE_URL/api/schedule?dept_id=test-dept" || exit 1

# Test 4: No 500 errors
echo "Test 4: Error handling (should get 400 on invalid input)"
curl -s "$BASE_URL/api/staff/skills?dept_id=invalid" | grep -q "VALIDATION_ERROR" || exit 1

echo "✓ All smoke tests passed"
```

---

## Production Monitoring

### Key Metrics to Watch

```
API Response Time:
  - Target: < 200ms (95th percentile)
  - Alert if: > 500ms for 5 min

Error Rate:
  - Target: < 0.1%
  - Alert if: > 1% for 5 min

Database Connection Pool:
  - Target: < 50% utilization
  - Alert if: > 80% for 5 min

Memory Usage:
  - Target: < 60% of container
  - Alert if: > 80% for 5 min

Uptime:
  - Target: 99.5%
  - Track: Downtime events, causes

Request Count:
  - Baseline: X req/min
  - Alert if: 2x spike or 50% drop
```

### Setup (Example: Sentry)

```typescript
// server/index.ts
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

const app = express();

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

// ... routes ...

app.listen(3000);
```

---

## Rollback Plan

### If Production Issue Occurs

1. **Assess Severity**
   - P1: Service down or data corruption → Rollback immediately
   - P2: Feature broken but service works → Rollback in 1 hour
   - P3: Minor bug → Can wait for fix

2. **Execute Rollback**
   ```bash
   # Revert to previous deployment
   git revert <commit-hash>
   npm run build
   # Re-deploy
   ```

3. **Communicate**
   - Notify stakeholders
   - Post incident timeline
   - Identify root cause
   - Plan fix

4. **Post-Mortem**
   - What went wrong?
   - How to prevent next time?
   - Update tests/monitoring

---

## Sign-Off

### Checklist for Production Approval

- [ ] **Architecture Review**: System design reviewed and approved
- [ ] **Security Review**: No vulnerabilities found
- [ ] **Performance Review**: Load tested, meets SLAs
- [ ] **Data Integrity**: Constraints and backups in place
- [ ] **Monitoring**: Alerting configured, dashboards ready
- [ ] **Team Training**: Team trained on system, monitoring, incident response
- [ ] **Documentation**: All systems documented
- [ ] **Customer Ready**: Documentation, onboarding, support in place

### Sign-Off Signature

**System**: Infinity Code Pack + Multi-Tenant Scheduling Platform  
**Reviewed By**: _______________________  
**Date**: _______________________  
**Status**: ☐ APPROVED ☐ CONDITIONAL ☐ DENIED

**If conditional, note conditions**:
_________________________________

---

## Next Steps After Launch

1. **Day 1**: Monitor closely, ready for rollback
2. **Week 1**: Gather customer feedback, fix critical issues
3. **Week 2**: Analyze metrics, optimize bottlenecks
4. **Month 1**: Plan next feature release

---

**Use this checklist to ensure production readiness before going live**
