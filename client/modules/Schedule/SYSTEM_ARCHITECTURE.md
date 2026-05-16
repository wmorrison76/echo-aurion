# System Architecture Documentation

## Overview

This is a comprehensive multi-tenant scheduling and payroll management system designed for resort hotels with multiple outlets, departments, and complex tip pooling needs.

## Project Structure

### Shared Types (`shared/types/`)

- **schedule.d.ts** - Core scheduling entities (Org, Outlet, Department, Position, Employee, Shift, PublishAudit)
- **finance.d.ts** - Financial entities (TipPool, TipRun, TipRunLine, RevenueEntry, BudgetEntry, PnLRow)
- **production.d.ts** - Event and production entities (Event, Recipe, Task, Skill, Equipment, LoadSummary)

### Server Layer (`server/`)

#### Database (`server/lib/db.ts`)
- Supabase PostgreSQL connection wrapper
- Mock DB fallback for development

#### API Routes (`server/api/routes/`)
- **schedule.ts** - Weekly schedule management (fetch, bulk upsert, publish)
- **tipPools.ts** - Tip pool CRUD, distribution runs, scenario comparison
- **events.ts** - Event/BEO management, production task generation
- **echo.ts** - EchoAI conversational assistant endpoints

#### Services (`server/services/`)
- **payrollPolicy.ts** - Payroll calculations, OT thresholds, predictability pay
- **aiAssist.ts** - EchoAI core (LLM wrapper, context retrieval, recommendations)
- **aiOptimizer.ts** - Numerical reasoning (SPLH, labor variance, forecasting)
- **productionBalancer.ts** - Event workload computation and task generation
- **reporting/pnlLite.ts** - P&L report generation by department

#### Database Schema (`server/supabase/schema.sql`)
PostgreSQL tables for:
- Organizations, outlets, departments, positions
- Employees with multi-outlet capability
- Shifts with comprehensive tracking
- Tip pools and distributions
- Revenue entries and budgets
- Events and production tasks
- Load summaries and audits

### Client Layer (`client/`)

#### Hooks (`client/hooks/`)
- **useTenancy.ts** - Multi-tenant context (org/outlet/dept selection, role-based access)
- **useEchoAI.ts** - EchoAI backend integration, scenario generation

#### Components (`client/components/`)

**Scheduling**
- **SchedulerGrid.tsx** - Weekly schedule visualization with hours/cost aggregation

**Financial Management**
- **tip-pools/TipPoolStudio.tsx** - 5-scenario tip pool comparison with fairness metrics
- **revenue/RevenueEntryGrid.tsx** - Daily revenue entry by service period
- **splh/SPLHCard.tsx** - Sales-per-labor-hour metric with variance indicators

**Event Management**
- **events/EventLoadDashboard.tsx** - Upcoming events with workload readiness status
- **pastry/PastryGantt.tsx** - Production timeline visualization by station

**AI Assistant**
- **echo/EchoAdvisor.tsx** - Floating conversational assistant panel

**Utilities**
- **TenancySelector.tsx** - Multi-tenant context switcher in UI

#### Pages (`client/pages/`)
- **Index.tsx** - Legacy home page (kept for backward compatibility)
- **Dashboard.tsx** - New comprehensive dashboard with tabbed interface

#### Library (`client/lib/`)
- **payrollPolicy.ts** - Client-side payroll calculations and formatting utilities

## Architecture Patterns

### Multi-Tenancy

Every entity is scoped to `org_id` → `outlet_id` → `dept_id` hierarchy.

```
Organization (Resort)
  └── Outlet (Location: Main, Banquet, Room Service, etc.)
      └─�� Department (FOH, Kitchen, Pastry, etc.)
          └── Positions, Employees, Shifts, Events, etc.
```

### Role-Based Access Control (RBAC)

Roles: `ADMIN`, `GM`, `DEPT_MGR`, `EMPLOYEE`

Used in:
- Dashboard tab visibility
- API endpoint authorization (future)
- Component rendering logic

### Context Management

`useTenancy()` hook provides current context:
```typescript
{
  org_id: string;
  org_name?: string;
  outlet_id: string;
  outlet_name?: string;
  outlet_tz?: string;
  dept_id: string;
  dept_name?: string;
  role: string;
  user_id?: string;
}
```

Persisted to localStorage, available throughout app.

## Key Features

### 1. Scheduling Management
- Weekly schedule grid by department/outlet
- Flexible time parsing (9-5, 09:30, 9am-1pm, etc.)
- Break time tracking
- Shift history with audit trail
- Bulk operations and publishing

### 2. Tip Pool System
- **Three distribution rules:**
  - Hours only: Split by hours worked
  - Revenue only: Split by attributed revenue
  - Hybrid: Weighted combination (configurable)

- **5-Scenario Comparison:**
  - 70% Hours / 30% Revenue
  - 50% / 50% Split
  - Hours Only
  - Revenue Only
  - 30% Hours / 70% Revenue

- **Fairness Metrics:**
  - Fairness score (0-100%)
  - Min/max payout range
  - Per-employee impact analysis

### 3. Financial Analysis
- **Sales-Per-Labor-Hour (SPLH) Tracking**
  - By outlet/department
  - Variance to target
  - Color-coded performance indicators

- **Revenue Entry**
  - Daily entry by service period (Breakfast, Lunch, Dinner, Late)
  - Aggregation and totaling
  - SPLH calculation

- **P&L Reporting**
  - Revenue by department
  - Labor costs (regular + OT + tips)
  - Labor percentage
  - Budget variance

### 4. Event Management
- **Event/BEO Intake**
  - Service date/time
  - Guest count
  - Menu selection
  - Chef assignment

- **Production Task Generation**
  - Automatic task explosion from recipes
  - Labor minute estimation (scalable by guest count)
  - Task sequencing

- **Load Dashboard**
  - Upcoming events 30-day view
  - Prep time remaining
  - Readiness status (urgent, short prep, on track)
  - Workload summaries

### 5. Production Planning
- **Gantt-style Timeline**
  - Visual task scheduling
  - Color-coded by station (Oven, Chill, Decor, Mix, Prep, Plating)
  - Duration and labor minute visibility

- **Workload Balancing**
  - Department capacity computation
  - Available staff calculations
  - Deficit identification

### 6. EchoAI Assistant
- **Natural Language Interface**
  - Multi-turn conversational
  - Context-aware responses

- **Capabilities:**
  - Labor optimization recommendations
  - Tip pool fairness analysis
  - Revenue forecasting
  - Event workload assessment
  - Compliance risk flagging

- **Scenario Intelligence:**
  - Generate 5 competing scenarios
  - Compare fairness metrics
  - Risk assessment

## Data Flow

### Scheduling Workflow
```
User inputs shifts → SchedulerGrid → POST /api/schedule/bulk → Supabase
← GET /api/schedule → Display
Publish week → POST /api/schedule/publish → PublishAudit table
```

### Tip Pool Workflow
```
User inputs members + total tips → TipPoolStudio
Run scenario → POST /api/tip-pools/:id/run → Calculation → Results
Compare 5 scenarios side-by-side → Fairness analysis
```

### Revenue & SPLH Workflow
```
Daily revenue entry → RevenueEntryGrid → POST /api/revenues
← GET /api/revenues + shifts → SPLH calculation
SPLHCard display with variance
```

### Event Workflow
```
Event intake → POST /api/events → computeWorkload()
← Recipe metadata → Generate tasks
Load summary → EventLoadDashboard
Production timeline → PastryGantt
```

### EchoAI Workflow
```
User query → EchoAdvisor → POST /api/echo/ask
← DB context retrieval (shifts, revenue, events)
Generate optimization metrics → LLM prompt → Response
Display with recommendations
```

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# OpenAI (for EchoAI)
OPENAI_API_KEY=sk-...

# Server
PING_MESSAGE="pong"
```

## Database Setup

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project

2. **Run Schema**
   ```bash
   # Copy contents of server/supabase/schema.sql
   # Paste into Supabase SQL Editor
   # Run to create all tables and indices
   ```

3. **Enable RLS (optional)**
   - Set Row Level Security policies for multi-tenant isolation
   - Example policy in schema.sql

## Development

### Starting the Dev Server
```bash
npm run dev
```

This starts:
- Vite dev server on port 8080
- Express API on same port (proxied)
- Both hot-reload on file changes

### Building for Production
```bash
npm run build
```

Generates:
- `/dist/spa/` - React SPA bundle
- `/dist/server/` - Express server bundle

### Running Production Build
```bash
npm start
```

Starts Express server serving built SPA.

## Future Enhancements

1. **AI Features**
   - Vector embeddings for historical pattern matching
   - Multi-region forecasting (EchoStratus Brain)
   - Real-time labor re-optimization
   - Automated scheduling suggestions

2. **Integrations**
   - POS system sync (Toast, Square, TouchBistro)
   - HR/HRIS systems (Workday, BambooHR)
   - Accounting software (QuickBooks, Xero)
   - SMS/push notifications

3. **Mobile Apps**
   - Native iOS/Android for employees
   - Mobile scheduling management
   - Real-time shift notifications

4. **Advanced Features**
   - Predictability pay automation
   - Multi-property aggregation
   - Custom GL code mapping
   - Wage theft prevention reports
   - Union compliance tracking

## Security Considerations

1. **Multi-Tenant Isolation**
   - All queries scoped by org_id/outlet_id
   - RLS policies enforce tenant boundaries
   - User assignments control access

2. **API Security**
   - Validate org/outlet/dept ownership
   - Rate limiting on critical endpoints
   - Audit all payroll modifications

3. **Data Protection**
   - Encrypt sensitive fields at rest
   - HTTPS/TLS in transit
   - Regular backups to Supabase

4. **LLM Safety**
   - OpenAI API key server-side only
   - Sanitize user prompts
   - No PII in LLM context

## Deployment Options

### Netlify
```bash
npm run build
# Netlify auto-deploys from git
```

### Vercel
```bash
npm run build
# Vercel auto-deploys from git
```

### Self-Hosted
```bash
npm run build
npm start
# Runs on specified PORT (default 3000)
```

## Testing

```bash
npm run test    # Run Vitest
npm run typecheck  # TypeScript validation
```

## Support & Documentation

- **API Documentation:** Each route file has JSDoc comments
- **Component Documentation:** Props documented in component files
- **Type Definitions:** All types in shared/types/*.d.ts

---

**Last Updated:** 2024
**Version:** 1.0.0 (Multi-Tenant MVP)
