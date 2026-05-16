# Infinity Code Pack – MANIFEST

This bundle adds a comprehensive **Staff Analytics & Development**, **Auto-Scheduling with Interval Forecasting**, and **Production-Aware Scheduling** system, plus enterprise analytics and KPI dashboards.

## Features

- **Staff Analytics** (skills matrix, ratings, development plans, training records)
- **Auto-Scheduling Engine** (deterministic solver for min-cost coverage)
- **Interval Forecasting** (15/30 min demand curves from revenue + events)
- **Production-Aware Scheduling** (BEO/pastry workload injection)
- **KPI + Drilldown Analytics** with CSV exports
- **POS Webhook Placeholders** (Toast, Square, Lightspeed)
- **Seeding & Simulation Scripts** for demo data
- **Role-Based Access Control** (EMPLOYEE vs DEPT_MGR/GM/ADMIN)

## Installation

### 1. Copy Files
All files are already placed in correct paths:
- `/server/api/routes/staff.ts`
- `/server/api/routes/scheduler.ts`
- `/server/api/routes/analytics_infinity.ts`
- `/server/api/routes/pos_webhook.ts`
- `/scripts/seed-infinity.ts`
- `/scripts/simulate-forecast.ts`

### 2. Mount Routes (done in server/index.ts)
```typescript
app.use("/api/staff", staffRoutes);
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/analytics", analyticsInfinityRoutes);
app.use("/api/pos/webhook", posWebhookRoutes);
```

### 3. Database Tables
Ensure these tables exist (create migrations as needed):

**Core:**
- `organizations`, `outlets`, `departments`
- `employees`, `employee_skills`, `skills`
- `shifts`, `revenues`, `tip_runs`, `tip_run_lines`, `tip_pools`

**Analytics:**
- `development_plans`, `training_records`, `ratings`
- `publish_acknowledgements`, `publish_audits`
- `interval_coverage` (for heatmap data)

### 4. Run Seed Script
```bash
npm run seed:infinity
npm run simulate:forecast
```

This creates 50 demo employees, skills, ratings, and 7 days of simulated interval demand.

## API Endpoints

### Staff Management
- `GET /api/staff/skills?dept_id=...` → Skill matrix + catalog
- `POST /api/staff/skills/level` → Set employee skill level
- `POST /api/staff/rate` → Post shift rating
- `GET /api/staff/devplan/:employee_id` → Get dev plan
- `POST /api/staff/devplan/:employee_id` → Create/update dev plan
- `POST /api/staff/devplan/:employee_id/ai` → Get AI suggestion
- `GET /api/staff/trainings/:employee_id` → Get training records

### Scheduler
- `POST /api/scheduler/forecast-interval` → Build 15/30-min demand curve
- `POST /api/scheduler/generate` → Auto-generate shifts from demand + staff pool
- `POST /api/scheduler/guardrails` → Evaluate compliance (OT, labor %, predictability)

### Analytics
- `GET /api/analytics/interval-coverage?dept_id&date&interval=15` → Heatmap data
- `GET /api/analytics/drilldown?...` → Shift-level P&L breakdown
- `GET /api/analytics/drilldown-csv?...` → CSV export
- `GET /api/analytics/performance?dept_id&start&end&includeTips=1` → Employee performance
- `GET /api/analytics/echo-insights?...` → AI-suggested improvements
- `GET /api/analytics/kpi/weekly?...` → Labor %, SPLH, OT risk, ack rate

### POS Webhooks
- `POST /api/pos/webhook/toast` → Toast POS integration
- `POST /api/pos/webhook/square` → Square integration
- `POST /api/pos/webhook/lightspeed` → Lightspeed integration

## React Components

All components support Builder.io widget registration.

### Staff Components
```tsx
<SkillMatrixTable dept_id="dept-foh" />
<RatingEntryForm employee_id={empId} outlet_id="outlet-1" shift_date="2025-10-21" />
<DevelopmentPlanView employee_id={empId} />
<TrainingTracker employee_id={empId} />
```

### Analytics Components
```tsx
<KPIHeaderWidget org_id="org-1" outlet_id="outlet-1" dept_id="dept-foh" week_start="2025-10-20" />
<EchoInsightsPanel org_id="org-1" outlet_id="outlet-1" dept_id="dept-foh" start="2025-10-20" end="2025-10-26" />
<HeatmapIntervals dept_id="dept-foh" date="2025-10-21" interval={15} />
<EmployeePerformanceDashboard dept_id="dept-foh" start="2025-10-01" end="2025-10-31" includeTips={false} />
<DrilldownReport org_id="org-1" outlet_id="outlet-1" dept_id="dept-foh" start="2025-10-20" end="2025-10-26" />
<TrendSurface3D cells={[{day:"2025-10-20", kpi:"labor_pct", value:32}, ...]} />
```

## Row-Level Security (RLS)

**EMPLOYEE** can see:
- Own shifts, ratings, development plans, training records
- Cannot access KPI/revenue endpoints

**DEPT_MGR / GM / ADMIN** can see:
- All shifts/ratings/plans in their department/organization
- Full KPI, analytics, and reports

## Example Workflows

### Manager Dashboard
```tsx
export function ManagerDash() {
  const org_id = "org-1";
  const outlet_id = "outlet-1";
  const dept_id = "dept-foh";
  const week_start = "2025-10-20";

  return (
    <div className="space-y-4">
      <KPIHeaderWidget org_id={org_id} outlet_id={outlet_id} dept_id={dept_id} week_start={week_start} />
      <EchoInsightsPanel org_id={org_id} outlet_id={outlet_id} dept_id={dept_id} start={week_start} end="2025-10-26" />
      <HeatmapIntervals dept_id={dept_id} date={week_start} interval={15} />
      <EmployeePerformanceDashboard dept_id={dept_id} start="2025-10-01" end="2025-10-31" includeTips={false} />
      <DrilldownReport org_id={org_id} outlet_id={outlet_id} dept_id={dept_id} start={week_start} end="2025-10-26" />
    </div>
  );
}
```

### Employee Profile
```tsx
export function EmployeeProfile({ employee_id }: { employee_id: string }) {
  const outlet_id = "outlet-1";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <SkillMatrixTable dept_id="dept-foh" />
      <RatingEntryForm employee_id={employee_id} outlet_id={outlet_id} shift_date={today} />
      <DevelopmentPlanView employee_id={employee_id} />
      <TrainingTracker employee_id={employee_id} />
    </div>
  );
}
```

## Enterprise Features (Batch 14+)

### Publish Workflow & Acknowledgements
- `POST /api/publish/publish` - Publish schedule
- `POST /api/publish/ack` - Employee acknowledges schedule
- `POST /api/publish/reopen` - Reopen for edits
- `GET /api/publish/status` - Check acknowledgement rate
- Component: `PublishTogglePanel` (Manager-facing toggle)

### LMS & Staff Development
- `GET /api/lms/:emp_id` - Get employee skills
- `POST /api/lms/update` - Update skill/certification
- `GET /api/lms/expiring` - Certifications expiring soon
- `GET /api/lms/skills-report` - Organization skill matrix
- Component: `EmployeeSkillMatrix` (Skill display + tracking)

### Forecasting & ML
- `GET /api/forecast` - 7-day labor demand forecast
- `GET /api/forecast/summary` - Trend analysis
- Service: `mlForecast.ts` (Linear regression fallback)
- Service: `forecastProphet.ts` (Python Prophet integration via subprocess)
- Script: `scripts/prophet_runner.py` (Prophet CLI runner)

### Financial Bridge & GL Export
- `GET /api/gl/export?format=quickbooks|xero` - Download GL codes as CSV
- `GET /api/gl/report` - P&L report (text)
- `GET /api/gl/report/json` - P&L report (JSON for UI)
- Service: `glBridge.ts` - Convert payroll to GL entries
- Service: `pdfReport.ts` - Generate financial reports

### Multi-Property Management
- `GET /api/org-summary?org_id=...` - Aggregated outlet metrics
- `GET /api/org-summary/trend?org_id=...&weeks=13` - 13-week trend
- Component: `MultiPropertyDashboard` (Property comparison + KPIs)
- Component: `LaborSurface3D` (3D labor % visualization)

### Echo AI Enhancements
- `POST /api/echo/whisper` - Natural language queries (multilingual)
- `POST /api/echo/whisper/optimize` - Get optimization suggestions
- `POST /api/echo/optimize` - Analyze schedules for staffing issues
- Component: `EchoWhisper` (Floating chat widget)
- Component: `EchoOptimizationPanel` (Issues + recommendations)

### POS System Integration
- Service: `posConnectors.ts` (Toast, Square, Lightspeed adapters)
- Job: `posSyncJob.ts` - Nightly POS sync to property_summary
- Endpoints automatically update revenue/tips in property_summary
- Webhook placeholders: `POST /api/pos/webhook/toast|square|lightspeed`

### Infrastructure & Real-Time
- `GET /api/sse/acks?schedule_id=...` - Server-sent events for acknowledgements
- `GET /api/sse/kpi?dept_id=...` - Real-time KPI updates
- Middleware: `regionRouter.ts` - Multi-region failover + latency optimization
- Service: `autoRepair.ts` - Predictive error analysis + fix suggestions
- `GET /api/auto-repair` - Admin endpoint for repair recommendations

### Internationalization
- Config: `client/i18n/config.ts` - 6 languages (EN, FR, IT, DE, PT-BR, ES)
- Component: `LanguageSelector` - Flag-based language switcher
- All Echo AI responses localized
- All UI strings translatable

### Middleware Bundle
- `server/middleware/validate.ts` - Zod-based input validation
- `server/middleware/auth.ts` - JWT validation + role checking
- `server/middleware/errorHandler.ts` - Centralized error responses

### Database Migrations
- Migration: `migrations/002_enterprise_features.sql`
- Tables added: publish_audits, publish_acknowledgements, gl_codes, property_summary, employee_skills
- Indices created for common queries
- RLS policies defined (optional, based on auth setup)

## Builder.io Widget Registration

All components support Builder.io widget registration:

```typescript
import { registerBuilderWidgets } from "@/lib/builderRegistry";
registerBuilderWidgets();
```

Registered widgets:
- PublishTogglePanel (scheduling)
- EmployeeSkillMatrix (LMS)
- EchoWhisper (AI chat)
- EchoOptimizationPanel (AI insights)
- MultiPropertyDashboard (analytics)
- LaborSurface3D (3D trends)
- LanguageSelector (system)

## Competitive Positioning

To match **Unifocus** (hospitality workforce mgmt), **Fourth** (15-min granularity), and **HotSchedules** (enterprise depth):

1. **Precision**: Keep 15-minute forecasting and add labor standards per task/recipe
2. **Scope**: Expanded multi-outlet P&L drilldowns with GL code mapping ✓
3. **Context**: Include guest count & ADR inputs for lodging-linked outlets
4. **Signals**: For casinos, add pit/load signals + events cadence to forecast queue lengths
5. **Multilingual**: Support global teams with 6-language i18n ✓
6. **Real-time**: SSE streams for live acknowledgements, KPI updates ✓
7. **Predictive**: Linear regression + Prophet for demand forecasting ✓

## Key KPIs to Track

- **Labor %** (per outlet/period) — target ≤32% for fine dining, ≤35% resort
- **SPLH Trend** (Sales Per Labor Hour) — flag if declining
- **Coverage Quality** — % intervals within ±1 headcount of demand
- **Predictability Exposure** — shifts published <24h prior
- **Acknowledgement Rate** — target ≥90% ✓ (tracked via /publish/status)
- **Auto-Schedule Adoption** — % of generated shifts approved by manager
- **Pastry Lead Time** — % BEO workloads fully covered ≥T-24
- **Skill Gap Index** — avg (target_level - current_level) ✓ (tracked in LMS)

## Next Steps

1. ✓ Implement publish workflow + acknowledgements
2. ✓ Build LMS for staff development
3. ✓ Add forecasting (linear + Prophet ready)
4. ✓ GL code mapping for accounting export
5. ✓ Multi-property dashboards + 3D visualization
6. ✓ Echo AI enhancements (whisper + optimization)
7. ✓ POS integrations (Toast, Square, Lightspeed)
8. ✓ Multilingual support (6 languages)
9. Connect real POS webhooks (requires API keys)
10. Implement advanced ML (Prophet training on historical data)
11. Build real-time collaboration (shift swaps, team chat)
12. Add compliance reporting (wage theft detection, union rules)
