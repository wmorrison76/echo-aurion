# Production-Ready Action Plan - Implementation Guide

**This document maps the audit recommendations to specific, actionable tasks.**

---

## Phase 1: Critical Safety (Week 1-2) - DO NOT SKIP

### Task 1.1: Input Validation Layer
**Why**: Routes currently accept invalid data, causing crashes and security issues  
**Effort**: 2-3 days | **Impact**: CRITICAL

```
Step 1: Create validation schemas
  File: server/schemas/staff.ts
  File: server/schemas/analytics.ts
  File: server/schemas/scheduler.ts
  
  Example schema:
  export const staffSkillsSchema = z.object({
    dept_id: z.string().uuid('Invalid department ID'),
  });

Step 2: Create validation middleware
  File: server/middleware/validation.ts
  
  Export: validateQuery(schema), validateBody(schema)
  Usage:
    router.get("/skills", 
      validateQuery(staffSkillsSchema),
      async (req, res) => { /* req.query is now typed and validated */ }
    )

Step 3: Standardize error responses
  File: server/lib/errors.ts
  
  Export: AppError class
  Response format: { error: string, code: string, details?: {}, timestamp: string }
  Status codes: 400 (validation), 401 (auth), 403 (forbidden), 500 (server)

Step 4: Apply to all routes
  Files to modify:
  - server/api/routes/staff.ts
  - server/api/routes/analytics_infinity.ts
  - server/api/routes/scheduler.ts
  - server/api/routes/pos_webhook.ts
  - server/api/routes/events.ts
  - ... (all 20 route files)
  
  Verify each endpoint has Zod schema + validation middleware
```

**Verification**: All routes return 400 on invalid input, 500 on server error (never 200 on error)

---

### Task 1.2: Authorization on All Sensitive Endpoints
**Why**: Any user can currently access staff ratings, dev plans, analytics  
**Effort**: 1 day | **Impact**: CRITICAL

```
Step 1: Audit which routes need auth
  List of routes WITHOUT requireRole (need fixing):
  - /api/staff/* (currently unprotected)
  - /api/scheduler/* (currently unprotected)
  - /api/analytics/drilldown (currently unprotected)
  - /api/analytics/performance (currently unprotected)
  - /api/pos/webhook/* (currently unprotected)
  - /api/reports/* (currently unprotected)

Step 2: Add tenant scope validation
  File: server/lib/tenantValidation.ts
  
  Export: validateTenantAccess(req, requiredRole)
  Checks:
  - user.org_id === req.body.org_id (prevent cross-tenant queries)
  - user.outlet_id has access to req.body.outlet_id (if provided)
  - user role >= requiredRole

Step 3: Apply to routes
  Pattern:
    router.post("/rate", 
      requireRole("DEPT_MGR", "GM", "ADMIN"),
      validateTenantAccess,
      async (req, res) => { /* Only managers can access */ }
    )

Step 4: Test with wrong user
  Create test user in different org_id
  Verify they get 403 Forbidden on staff endpoints
```

**Verification**: `curl -H "Authorization: Bearer wrong-user" /api/staff/rate` returns 403

---

### Task 1.3: Database Integrity Constraints
**Why**: Missing constraints allow invalid data (negative rates, scores > 5)  
**Effort**: 1 day | **Impact**: CRITICAL

```
Step 1: Run SQL migrations in Supabase
  
  Migration 001_add_org_to_departments.sql:
    ALTER TABLE departments ADD COLUMN org_id uuid NOT NULL 
      REFERENCES orgs(id) ON DELETE CASCADE;

  Migration 002_add_constraints_to_ratings.sql:
    ALTER TABLE ratings ADD CONSTRAINT punctuality_range 
      CHECK (punctuality >= 0 AND punctuality <= 5);
    ALTER TABLE ratings ADD CONSTRAINT quality_range 
      CHECK (quality >= 0 AND quality <= 5);
    ALTER TABLE ratings ADD CONSTRAINT teamwork_range 
      CHECK (teamwork >= 0 AND teamwork <= 5);

  Migration 003_add_unique_constraints.sql:
    ALTER TABLE employee_skills ADD CONSTRAINT unique_emp_skill 
      UNIQUE(employee_id, skill_slug);
    ALTER TABLE skills ADD CONSTRAINT unique_skill_slug 
      UNIQUE(org_id, slug);

  Migration 004_add_monetary_constraints.sql:
    ALTER TABLE shifts ADD CONSTRAINT tips_nonnegative 
      CHECK (tips_declared >= 0);
    ALTER TABLE employees ADD CONSTRAINT rate_nonnegative 
      CHECK (hourly_rate >= 0);
    ALTER TABLE positions ADD CONSTRAINT rate_nonnegative 
      CHECK (base_rate >= 0);

Step 2: Complete RLS policies
  Apply row-level security to:
  - ratings table (employees see own, managers see dept)
  - development_plans table (employees see own, managers see dept)
  - training_records table (employees see own, managers see dept)

Step 3: Test constraints
  Try to create rating with score=10 → Should fail with constraint error
  Try to create skill with negative rate → Should fail
```

**Verification**: `INSERT INTO ratings (..., quality = 10)` fails with CHECK constraint error

---

### Task 1.4: Error Handling Standardization
**Why**: Silent failures hide bugs, inconsistent response formats confuse clients  
**Effort**: 1-2 days | **Impact**: CRITICAL

```
Step 1: Create error handler middleware
  File: server/middleware/errorHandler.ts
  
  Catches ALL route errors and returns consistent format:
  {
    error: "Database connection failed",
    code: "DB_CONNECTION_FAILED",
    details: { table: "shifts", operation: "upsert" },
    requestId: "req-12345",
    timestamp: "2024-01-15T10:30:00Z"
  }

Step 2: Refactor all routes to throw AppError
  Before:
    if (error) {
      res.status(500).json({ error: String(err) });
    }
  
  After:
    if (error) {
      throw new AppError(500, error.message, 'DB_ERROR', { table: 'shifts' });
    }

Step 3: Remove silent failures
  Find all: res.json({ rows: [] }); when error occurs
  Replace with: throw new AppError(...)
  
  Pattern:
  router.get("/interval-coverage", async (req, res) => {
    try { /* ... */ }
    catch (err) {
      // ❌ OLD: res.json({ rows: [] });
      // ✅ NEW: Let error bubble to middleware
      throw err;
    }
  });

Step 4: Add request ID logging
  Middleware adds requestId to req
  Every log includes requestId for correlation
  
  Example: logger.error("Shift creation failed", { requestId, error })
```

**Verification**: Call broken endpoint, verify it returns 500, not 200

---

## Phase 2: Stability & Scale (Week 3-6)

### Task 2.1: Pagination on All List Endpoints
**Effort**: 1.5 days | **Impact**: HIGH (prevents timeouts)

```
Affected endpoints to update:

1. GET /api/schedule
   Before: Returns all shifts for week
   After: /api/schedule?offset=0&limit=100 → Returns 100 + hasMore flag

2. GET /api/events
   Before: Returns all events
   After: /api/events?offset=0&limit=50 → Returns 50 + hasMore flag

3. GET /api/analytics/performance
   Before: Returns all employees
   After: /api/analytics/performance?offset=0&limit=100 → Returns 100 + hasMore flag

4. GET /api/staff/trainings
   Before: Returns all training records
   After: /api/staff/trainings?offset=0&limit=50 → Returns 50 + hasMore flag

Pattern to implement:
  const limit = Math.min(parseInt(req.query.limit || 50), 500);
  const offset = parseInt(req.query.offset || 0);
  
  const { data, count } = await supabase
    .from("table")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1);
  
  res.json({
    data,
    total: count,
    offset,
    limit,
    hasMore: count > offset + limit
  });
```

---

### Task 2.2: N+1 Query Fixes
**Effort**: 2 days | **Impact**: HIGH (10-50x faster)

```
Issue 1: /api/analytics/performance
Current code:
  const shifts = await supabase.from("shifts").select("*")...
  const emps = await supabase.from("employees").select("*")... // ← Separate query
  
Fix: Use JOIN
  const results = await supabase.from("shifts")
    .select("*, employees(*)")
    .in("employee_id", empIds)
  Result: 1 query instead of 2

Issue 2: /api/events/:id fetches tasks separately
Current code:
  const event = await supabase.from("events").select("*").eq("id", id)
  const tasks = await supabase.from("tasks").select("*")... // ← Separate query
  
Fix: Use JOIN
  const result = await supabase.from("events")
    .select("*, tasks(*)")
    .eq("id", id)
  Result: 1 query instead of 2

Issue 3: /api/staff/skills loads all employee_skills
Current code:
  const { data: empSkillsData } = await supabase
    .from("employee_skills")
    .select("*"); // ← No filter!
  
Fix: Filter by department
  const { data: empSkillsData } = await supabase
    .from("employee_skills")
    .select("*")
    .in("employee_id", (
      await supabase.from("employees").select("id").eq("dept_id", dept_id)
    ).data.map(e => e.id))
  Or better: Use database view
  CREATE VIEW employee_skills_by_dept AS ...

Verification:
  - Add query logging to Supabase
  - Measure query count before/after
  - Target: < 2 queries per endpoint
```

---

### Task 2.3: Frontend Error Boundaries
**Effort**: 1 day | **Impact**: MEDIUM (prevents white screens)

```
File: client/components/ErrorBoundary.tsx

Creates React error boundary that:
- Catches component crashes
- Displays fallback UI with "Something went wrong"
- Logs to error tracking (Sentry)
- Offers reload/report buttons

Usage in App.tsx:
  <ErrorBoundary>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </ErrorBoundary>

Fallback UI:
  <div className="flex flex-col items-center justify-center min-h-screen">
    <h1>Something went wrong</h1>
    <p>We're looking into it</p>
    <button onClick={() => window.location.reload()}>Reload</button>
  </div>
```

---

### Task 2.4: Structured Logging
**Effort**: 1.5 days | **Impact**: MEDIUM (enables debugging)

```
File: server/lib/logger.ts

Creates logger with:
- JSON-formatted output (for parsing)
- Request ID injection
- Environment-aware (dev = console, prod = JSON)
- Log levels: debug, info, warn, error

File: server/middleware/logging.ts

Middleware that:
- Generates unique requestId per request
- Logs: method, path, status, duration
- Attaches requestId to req for use in routes

Usage in routes:
  const { requestId } = req;
  logger.info("Shift created", { requestId, emp_id, shift_id })
  logger.error("Database failed", { requestId, error, table })

Benefit: Can trace a request end-to-end
  - Frontend: Include requestId in error reports
  - Backend: Look up requestId in logs
  - Database: Correlate with slow queries
```

---

### Task 2.5: Frontend Query Caching
**Effort**: 1 day | **Impact**: MEDIUM (faster UX)

```
Current issue:
  - Every tab switch refetches data
  - No caching between page loads
  
Use TanStack Query (already installed):

Example:
  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', deptId, week],
    queryFn: () => fetch(`/api/schedule?dept_id=${deptId}&week=${week}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,        // Keep data fresh for 5 min
    cacheTime: 30 * 60 * 1000,       // Keep in memory for 30 min
    refetchOnWindowFocus: false,     // Don't refetch when window regains focus
  });

Apply to all components that fetch data:
  - SchedulerGrid
  - EventLoadDashboard
  - EmployeePerformanceDashboard
  - TipPoolStudio

Benefit: Switching between tabs no longer re-fetches if data is < 5 min old
```

---

## Phase 3: Enterprise Features (Month 2-3)

### Task 3.1: Real POS Integration - Toast
**Effort**: 5-7 days | **Impact**: HIGH (major competitive feature)

```
Step 1: Implement Toast webhook handler
  File: server/api/routes/pos_webhook.ts (expand existing)
  
  POST /api/pos/webhook/toast
  Validates Toast webhook signature (HMAC-SHA256)
  Parses revenue, covers, items, timing
  Stores in revenues table with service_date + period

Step 2: Create Toast adapter service
  File: server/connectors/toastAdapter.ts
  
  Parses Toast webhook payload:
  - Extract revenue amount
  - Extract covers (guest count)
  - Extract service time
  - Map to your interval_coverage / revenues schema

Step 3: Trigger forecasting on revenue
  When revenue arrives:
  - Update interval_coverage demand based on POS signal
  - Notify scheduler to suggest staffing changes
  - Update SPLH real-time display

Step 4: Configure webhook in Toast
  Toast POS → Settings → Integrations → Webhooks
  URL: https://yourapi.com/api/pos/webhook/toast
  Secret: Stored in env variable
  Events: 'ticket.created', 'revenue.updated'

Testing:
  - Mock Toast webhook payload
  - Verify revenue data stored correctly
  - Verify demand curves updated
```

---

### Task 3.2: Multi-Property Consolidation
**Effort**: 3-4 days | **Impact**: HIGH (enterprise requirement)

```
Step 1: Create corporate dashboard route
  File: client/pages/CorporateDashboard.tsx
  
  Shows data across ALL outlets in organization
  Tabs: Overview, Properties, Reports, Benchmarks

Step 2: Add aggregation API endpoints
  GET /api/analytics/corporate/overview
  {
    org_id,
    metrics: {
      total_labor_cost: 50000,
      total_revenue: 500000,
      labor_percent: 10,
      splh: 125,
      avg_splh_target: 120,
      coverage_quality: 92,
      acknowledgement_rate: 88
    }
  }

  GET /api/analytics/corporate/properties
  Returns array of:
  {
    outlet_id, outlet_name,
    labor_cost, revenue, labor_pct, splh, coverage, ack_rate
  }

  GET /api/analytics/corporate/trends?weeks=13
  Returns time series of org-wide metrics

Step 3: Create aggregation service
  File: server/services/corporateAnalytics.ts
  
  Queries shifts/revenues across all outlets
  Aggregates labor hours, labor cost, revenue
  Computes KPIs at org level
  Returns comparable metrics

Step 4: Add benchmark comparison
  Compare each property against:
  - Org average
  - Best performer
  - Budget target
  
  Show variance as % and $

Benefit: Corporate users can see full picture without drilling into each property
```

---

### Task 3.3: GL Code Mapping
**Effort**: 2-3 days | **Impact**: HIGH (accounting integration)

```
Step 1: Create GL mapping tables
  File: server/supabase/schema.sql (add migration)
  
  CREATE TABLE gl_mappings (
    id uuid primary key,
    org_id uuid references orgs(id),
    entity_type text (department, position, cost_type),
    entity_id uuid,
    gl_code text,
    gl_description text,
    created_at timestamptz
  );

Step 2: UI for mapping configuration
  File: client/pages/GlCodeMapping.tsx
  
  Table showing:
  - Department name → GL code input
  - Position name → GL code input
  - Cost types (labor, tips, benefits) → GL code input
  
  Save → Stores in gl_mappings table

Step 3: Update P&L export
  File: server/services/reporting/pnlLite.ts
  
  When generating P&L:
  - Look up gl_code from gl_mappings
  - Include gl_code + gl_description in export row
  - Format for QuickBooks import

Step 4: Add export to QB format
  File: server/routes/exports/quickbooks.ts
  
  GET /api/exports/quickbooks?week=2024-01-15
  Returns CSV formatted for QB import:
  
  Account,Debit,Credit
  6100-100 (FOH Labor),5000.00,
  6100-110 (BOH Labor),3000.00,
  6100-120 (Kitchen Labor),2000.00,

Benefit: P&L can be imported directly to QB without manual entry
```

---

### Task 3.4: ML-Driven Forecasting
**Effort**: 7-10 days | **Impact**: VERY HIGH (competitive advantage)

```
Step 1: Install Prophet library
  npm install pymc prophet --save
  (Note: Python dependency, may require node bindings or separate service)
  Or use alternative: statsmodels ARIMA

Step 2: Create forecasting service
  File: server/services/mlForecasting.ts
  
  exports: trainForecast(dept_id, end_date) → Trained model
  exports: predict(model, periods) → Forecast with intervals

Step 3: Training data collection
  Collect historical data:
  - Historical revenue by interval
  - Historical covers/guests
  - Day of week patterns
  - Holidays/seasonality
  - Events metadata
  
  Store in materialized view or table for fast access

Step 4: Forecast endpoint
  POST /api/forecast/predict
  {
    dept_id,
    start_date: "2024-02-01",
    periods: 28,
    frequency: "15min"  // 15 or 30
  }
  
  Returns:
  [
    {
      ts: "2024-02-01T09:00:00Z",
      demand: 3.2,
      ci_lower: 2.1,
      ci_upper: 4.5,
      source: "ml"
    },
    ...
  ]

Step 5: Compare with static forecast
  Keep existing demand curves as baseline
  Compare accuracy:
  - ML forecast vs actual (weekly)
  - Static forecast vs actual (weekly)
  - Track improvement over time

Benefit: Forecast accuracy increases 20-40%, enables proactive staffing

Steps to iterate:
1. Month 1: Basic Prophet with 4-week historical
2. Month 2: Add POS signal as external regressor
3. Month 3: Add events/holidays, refine hyperparameters
```

---

## Phase 4: Polish & Scale (Month 3+)

### Task 4.1: Mobile Notifications
**Effort**: 2-3 days | **Impact**: MEDIUM

```
Service: Twilio (SMS) + Firebase Cloud Messaging (push)

Create notification service:
  File: server/services/notificationEngine.ts
  
  Triggers:
  1. Shift published → SMS to employees
     "Your schedule for next week is ready. Check app."
  
  2. Shift swap request → SMS to manager
     "John requested to swap Jan 15 with Jane. Approve in app?"
  
  3. Short-staffed alert → SMS to manager
     "Sunday dinner understaffed by 2 servers. Auto-schedule suggests adding Jane (OT ok)."
  
  4. Acknowledgement reminder → Push notification
     "Don't forget to acknowledge your schedule."

New endpoint:
  POST /api/notifications/send
  {
    user_id,
    channel: "sms|email|push",
    template: "shift_published",
    data: { week_start, shifts_count }
  }

User preferences:
  - Allow/block by notification type
  - Opt-in SMS (requires opt-in per TCPA)
  - Time window (don't send after 9pm)
```

---

## Deployment & Testing

### Pre-Production Checklist

Before deploying to production:

**Code Quality**
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run build` completes without warnings
- [ ] `npm run test` passes all tests
- [ ] No `any` types in production code
- [ ] No `console.log` statements in routes

**Security**
- [ ] No hardcoded secrets (API keys, passwords)
- [ ] All sensitive endpoints have requireRole
- [ ] CORS restricted to known domains
- [ ] Rate limiting configured
- [ ] HTTPS enforced
- [ ] Security headers set (HSTS, CSP, X-Frame-Options)

**Database**
- [ ] All migrations applied
- [ ] RLS policies enabled
- [ ] Backups configured (daily)
- [ ] Indexes created
- [ ] Constraints verified

**Monitoring**
- [ ] Error tracking configured (Sentry)
- [ ] Logging configured (CloudWatch or similar)
- [ ] Alerting rules set (error rate, latency)
- [ ] Uptime monitoring configured

**Testing**
- [ ] Smoke tests pass (basic CRUD operations)
- [ ] Load test with 100 concurrent users
- [ ] All critical workflows tested manually
- [ ] Auth flows tested (login, logout, token refresh)

---

## Success Criteria

### Phase 1 (Week 2)
✅ All routes have input validation  
✅ All sensitive endpoints require authentication  
✅ No more silent failures (all errors return proper HTTP status codes)  
✅ Database constraints prevent invalid data  

### Phase 2 (Week 6)
✅ List endpoints paginated (no timeouts)  
✅ N+1 queries eliminated (API responses < 100ms)  
✅ Frontend has error boundaries (no white screens)  
✅ Structured logging in place (can debug issues)  

### Phase 3 (Month 3)
✅ Toast POS integration working (revenue feeds into forecast)  
✅ Multi-property dashboard accessible to corporate users  
✅ GL codes exported in P&L (QB integration ready)  
✅ ML forecasting beats static forecast by 15%+  

### Readiness for Production
✅ All critical items complete  
✅ Load tested to 500 concurrent users  
✅ Error tracking active  
✅ Security audit passed  
✅ Team trained on monitoring/incident response  

---

## Escalation Path

If you hit blockers, here's the escalation order:

1. **Architecture question** → Review SYSTEM_ARCHITECTURE.md
2. **Specific API issue** → Check server/api/routes/*.ts
3. **Component question** → Check client/components/ examples
4. **Database question** → Review server/supabase/schema.sql
5. **Deployment question** → Review IMPLEMENTATION_NOTES.md
6. **Still blocked?** → File as GitHub issue with context

---

**Next Step**: Start with Phase 1, Task 1.1 (Input Validation)

Time estimate to production-ready: **2-3 weeks** (full-time focus)
