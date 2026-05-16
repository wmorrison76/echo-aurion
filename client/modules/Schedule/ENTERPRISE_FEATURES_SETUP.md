# Enterprise Features Setup Guide

**Batch 14+ Implementation - Production Deployment**

---

## Installation & Setup

### 1. Install New Dependencies

```bash
npm install
```

**New packages added:**
- `axios` - HTTP client for POS integrations
- `compression` - Response compression middleware
- `helmet` - Security headers
- `jsonwebtoken` - JWT validation
- `openai` - Echo AI integration
- `zod` - Input validation (already included)

### 2. Database Migrations

Apply the enterprise features migration:

```sql
-- Run in Supabase SQL Editor
-- Copy contents of: server/supabase/migrations/002_enterprise_features.sql
```

Creates tables:
- `publish_audits` - Schedule publication history
- `publish_acknowledgements` - Employee confirmations
- `gl_codes` - GL code mappings for accounting
- `property_summary` - Multi-property aggregation
- `employee_skills` - LMS tracking (skills, certifications)

### 3. Environment Variables

Add to your `.env` file:

```bash
# JWT (for authentication)
JWT_SECRET=your-secret-key-here

# OpenAI (for Echo AI)
OPENAI_API_KEY=sk-...

# POS System API Keys (optional)
TOAST_API_TOKEN=your-toast-token
SQUARE_API_TOKEN=your-square-token
LIGHTSPEED_API_TOKEN=your-lightspeed-token
LIGHTSPEED_ACCOUNT_ID=your-lightspeed-account-id

# Regional endpoints (optional)
REGION_US_EAST=https://us-east.luccca.cloud
REGION_EU_WEST=https://eu-west.luccca.cloud
REGION_AP_SOUTH=https://ap-south.luccca.cloud

# Logging (optional)
LOG_PATH=/var/log/luccca/api_errors.log
LOG_LEVEL=info
```

### 4. Build & Test

```bash
# Type checking
npm run typecheck

# Build
npm run build

# Run tests
npm run test

# Start production server
npm start
```

---

## API Endpoints Reference

### Publish Workflow
- `POST /api/publish/publish` - Publish schedule
- `POST /api/publish/ack` - Acknowledge schedule
- `POST /api/publish/reopen` - Reopen for edits
- `GET /api/publish/status?schedule_id=...` - Check acknowledgement rate

### LMS (Skills & Training)
- `GET /api/lms/:emp_id` - Get employee skills
- `POST /api/lms/update` - Update skill/certification
- `GET /api/lms/expiring?days=30` - Expiring certifications
- `GET /api/lms/skills-report?org_id=...` - Organization skill matrix

### Forecasting
- `GET /api/forecast?dept_id=...&days=7` - 7-day labor forecast
- `GET /api/forecast/summary?dept_id=...` - Trend analysis

### Financial Export
- `GET /api/gl/export?org_id=...&format=quickbooks` - GL CSV export
- `GET /api/gl/report?org_id=...` - P&L report (text)
- `GET /api/gl/report/json?org_id=...` - P&L report (JSON)

### Multi-Property Dashboard
- `GET /api/org-summary?org_id=...` - Aggregated outlet metrics
- `GET /api/org-summary/trend?org_id=...&weeks=13` - 13-week trend

### Echo AI
- `POST /api/echo/whisper` - Natural language assistant (multilingual)
- `POST /api/echo/optimize` - Staffing optimization suggestions

### Real-Time Updates (SSE)
- `GET /api/sse/acks?schedule_id=...` - Acknowledgement stream
- `GET /api/sse/kpi?dept_id=...` - KPI updates stream

### Infrastructure
- `GET /api/auto-repair` - Predictive error analysis
- `POST /api/auto-repair/suggest?error=...` - Get fix suggestion

---

## Feature Configuration

### 1. Publish Workflow

Enable schedule publishing with acknowledgements:

```typescript
// In your scheduling page
import PublishTogglePanel from "@/components/scheduler/PublishTogglePanel";

<PublishTogglePanel
  schedule_id="schedule-123"
  manager_id="manager-456"
  org_id="org-789"
/>
```

### 2. LMS Setup

Display employee skills and certifications:

```typescript
import EmployeeSkillMatrix from "@/components/lms/EmployeeSkillMatrix";

<EmployeeSkillMatrix emp_id="emp-123" showActions={true} />
```

### 3. Echo AI Assistant

Add conversational AI to your app:

```typescript
import EchoWhisper from "@/components/echo/EchoWhisper";

<EchoWhisper 
  org_id="org-123"
  dept_id="dept-456"
  lang="en"
/>
```

### 4. Multi-Property Dashboard

View metrics across all outlets:

```typescript
import MultiPropertyDashboard from "@/components/analytics/MultiPropertyDashboard";
import LaborSurface3D from "@/components/analytics/LaborSurface3D";

<MultiPropertyDashboard org_id="org-123" />
<LaborSurface3D org_id="org-123" />
```

### 5. Language Support

Switch between 6 languages:

```typescript
import LanguageSelector from "@/components/system/LanguageSelector";

<LanguageSelector 
  onChange={(lang) => {
    localStorage.setItem("luccca_lang", lang);
    window.location.reload(); // Or trigger i18n update
  }}
/>
```

---

## POS Integration Setup

### Toast POS

1. Get API token from Toast dashboard
2. Set `TOAST_API_TOKEN` in `.env`
3. Run sync job:

```bash
npm run job:pos-sync org-123
```

This will:
- Fetch daily revenue from Toast API
- Store in `property_summary` table
- Trigger demand forecast update

### Square

1. Get API token from Square dashboard
2. Set `SQUARE_API_TOKEN` in `.env`
3. Run sync job:

```bash
npm run job:pos-sync org-123
```

### Lightspeed

1. Get API token and Account ID from Lightspeed
2. Set `LIGHTSPEED_API_TOKEN` and `LIGHTSPEED_ACCOUNT_ID` in `.env`
3. Run sync job:

```bash
npm run job:pos-sync org-123
```

---

## Builder.io Integration

### Register Widgets

Widgets are auto-registered in `App.tsx` via:

```typescript
import { registerBuilderWidgets } from "@/lib/builderRegistry";
registerBuilderWidgets();
```

Available widgets:
- `PublishTogglePanel` - Schedule publishing
- `EmployeeSkillMatrix` - Skills display
- `EchoWhisper` - AI chat assistant
- `EchoOptimizationPanel` - Optimization insights
- `MultiPropertyDashboard` - Property comparison
- `LaborSurface3D` - 3D trend visualization
- `LanguageSelector` - Language switcher

### Use in Builder Canvas

1. Open Builder.io project
2. Drag components onto canvas
3. Widgets appear as custom elements
4. Configure props in Builder UI

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All migrations applied to Supabase
- [ ] Environment variables set
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] Security review completed
- [ ] Load testing performed
- [ ] Monitoring configured (Sentry, DataDog, etc.)

### Deploy to Netlify

```bash
# Connected via Netlify MCP
# Push to main branch - auto-deploys
git push origin main
```

### Deploy to Vercel

```bash
# Connected via Vercel MCP
# Push to main branch - auto-deploys
git push origin main
```

### Self-Hosted Deployment

```bash
# Build
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start dist/server/node-build.mjs --name luccca
```

---

## Monitoring & Maintenance

### Real-Time Metrics

Monitor via SSE streams:

```typescript
// Acknowledgement rate
const ackStream = fetch("/api/sse/acks?schedule_id=...");

// KPI updates
const kpiStream = fetch("/api/sse/kpi?dept_id=...");
```

### Error Tracking

Auto-repair suggestions:

```bash
curl http://localhost:3000/api/auto-repair
# Returns: [
#   {
#     error_pattern: "...",
#     root_cause: "...",
#     suggested_fix: "...",
#     severity: "high"
#   }
# ]
```

### Database Maintenance

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum & analyze
VACUUM ANALYZE;
```

---

## Troubleshooting

### Echo AI Not Responding

```
Issue: Echo whisper returns "Echo AI not configured"
Fix: Set OPENAI_API_KEY in environment variables
```

### POS Sync Fails

```
Issue: npm run job:pos-sync returns auth error
Fix: Verify API token is correct and has proper scopes
```

### Database Connection Failed

```
Issue: Routes return "Database not initialized"
Fix: Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables
```

### Type Errors on Build

```
Issue: npm run typecheck fails
Fix: Run npm install to ensure all deps are installed
```

---

## Support & Documentation

- **Architecture**: See `SYSTEM_ARCHITECTURE.md`
- **Audit & Competitive Analysis**: See `PRODUCTION_AUDIT.md`
- **API Reference**: See `docs/MANIFEST.md`
- **Components**: Check component JSDoc comments
- **Features**: See development guidelines

---

## Next Steps

1. ✅ Deploy to production
2. ✅ Monitor error logs (first 24 hours)
3. ✅ Train team on new features
4. ✅ Enable POS integrations
5. ✅ Configure ML forecasting (Prophet)
6. ✅ Set up automated POS sync jobs (cron)
7. ✅ Launch to end users

---

**Version**: 1.0.0 (Enterprise Features Complete)  
**Last Updated**: 2024  
**Status**: 🟢 Production Ready
