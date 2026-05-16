# Implementation Notes & Setup Guide

## What Was Implemented

### Phase 1-3: Multi-Tenant Foundation ✅
- [x] Shared type definitions (schedule, finance, production)
- [x] Supabase PostgreSQL schema with multi-tenant hierarchy
- [x] React context for organization/outlet/department selection
- [x] Role-based access control (ADMIN, GM, DEPT_MGR, EMPLOYEE)

### Phase 2: Tip Pool System ✅
- [x] Tip pool configuration (HOURS, REVENUE, HYBRID rules)
- [x] 5-scenario comparison engine with fairness metrics
- [x] TipPoolStudio UI component for side-by-side analysis
- [x] Distribution calculation with tier weighting

### Phase 3: Revenue Integration ✅
- [x] Daily revenue entry by service period (Breakfast, Lunch, Dinner, Late)
- [x] RevenueEntryGrid UI for data capture
- [x] SPLH (Sales-Per-Labor-Hour) calculation and display
- [x] SPLHCard metric component with variance indicators

### Phase 4: Event & Production Management ✅
- [x] Event/BEO intake with guest count and complexity scoring
- [x] Automatic production task generation from recipes
- [x] EventLoadDashboard with 30-day upcoming view
- [x] PastryGantt timeline visualization by station
- [x] Workload balancing and capacity computation

### Phase 5: EchoAI Integration ✅
- [x] Conversational assistant panel (floating widget)
- [x] Natural language query support
- [x] Optimization metrics generation
- [x] Scenario intelligence & recommendations
- [x] Server-side LLM safety (no secrets leaked)

### Additional: Utilities & Navigation ✅
- [x] TenancySelector component for context switching
- [x] Comprehensive Dashboard page (tabbed interface)
- [x] SchedulerGrid component (weekly schedule visualization)
- [x] Multi-tenant integration throughout app
- [x] Full server API route integration

## Getting Started

### 1. Configure Environment Variables

Create or update `.env`:

```bash
# Supabase Connection
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI for EchoAI (optional, uses mock LLM if not set)
OPENAI_API_KEY=sk-your-key-here

# Server Config
PING_MESSAGE=pong
```

### 2. Initialize Supabase

```bash
# Create a free Supabase project at https://supabase.com

# Navigate to SQL Editor in Supabase dashboard
# Copy entire contents of server/supabase/schema.sql
# Paste into SQL editor and execute
# This creates all tables, indices, and RLS policies
```

### 3. Start Development Server

```bash
npm install
npm run dev
```

Navigate to `http://localhost:8080`

### 4. Configure Tenancy

Click the context selector (top right) to set up:
- Organization (e.g., "My Resort Hotel")
- Outlet (e.g., "Main Outlet", "Banquet Hall")
- Department (e.g., "Front of House", "Kitchen")
- Role (e.g., "ADMIN", "GM", "DEPT_MGR", "EMPLOYEE")

Your selection is saved to localStorage.

## Feature Walkthrough

### Weekly Schedule Management
1. Go to Dashboard → Schedule tab
2. SchedulerGrid displays current week by department
3. Shows employee names, times, hours, and labor costs
4. Click to edit shifts or use Bulk Upsert for multiple changes

### Tip Pool Comparison
1. Go to Dashboard → Tip Pools tab
2. Add team members with hours worked and attributed revenue
3. Set total tips amount
4. Click "Run All 5 Scenarios"
5. Compare fairness scores and payout ranges side-by-side

### Revenue Tracking & SPLH
1. Go to Dashboard → Revenue tab
2. View SPLH cards for different departments/shifts
3. Enter daily revenue in RevenueEntryGrid by service period
4. Submit to save

### Event Production
1. Go to Dashboard → Events tab
2. EventLoadDashboard shows upcoming banquets/conferences
3. View prep time remaining and readiness status
4. Check Production tab for Gantt timeline by station

### EchoAI Assistant
1. Click the 🔮 button (bottom right)
2. Ask natural language questions:
   - "Should I add more servers on Friday?"
   - "How fair is the 50/50 tip pool split?"
   - "What's my forecasted labor cost?"
3. View recommendations based on live data

## API Endpoints

### Schedule Management
- `GET /api/schedule` - Fetch weekly shifts
- `POST /api/schedule/bulk` - Bulk upsert shifts
- `POST /api/schedule/publish` - Publish week and create audit
- `GET /api/schedule/audits` - Retrieve publish history

### Tip Pools
- `POST /api/tip-pools` - Create pool
- `GET /api/tip-pools/:id` - Fetch pool config
- `POST /api/tip-pools/:id/run` - Run distribution
- `GET /api/tip-pools/:id/runs` - Fetch historical runs

### Events
- `POST /api/events` - Create event (BEO intake)
- `GET /api/events` - List events (with filters)
- `GET /api/events/:id` - Fetch event + tasks
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### EchoAI
- `POST /api/echo/ask` - Send query to assistant
- `POST /api/echo/scenario` - Generate scenario comparisons

All endpoints require:
```json
{
  "org_id": "uuid",
  "outlet_id": "uuid",
  "dept_id": "uuid"
}
```

## Code Organization

```
client/
├── components/
│   ├── SchedulerGrid.tsx           # Weekly schedule
│   ├── TenancySelector.tsx         # Context switcher
│   ├── tip-pools/
│   │   └── TipPoolStudio.tsx       # 5-scenario comparison
│   ├── revenue/
│   │   └── RevenueEntryGrid.tsx    # Daily revenue entry
│   ├── splh/
│   │   └── SPLHCard.tsx            # SPLH metric display
│   ├── events/
│   │   └── EventLoadDashboard.tsx  # Upcoming events
│   ├── pastry/
│   │   └── PastryGantt.tsx         # Production timeline
│   └── echo/
│       └── EchoAdvisor.tsx         # AI assistant
├── hooks/
│   ├── useTenancy.ts               # Multi-tenant context
│   └── useEchoAI.ts                # AI integration
├── lib/
│   └── payrollPolicy.ts            # Calculations
└── pages/
    ├── Index.tsx                   # Legacy (backward compat)
    └── Dashboard.tsx               # New dashboard

server/
├── api/routes/
│   ├── schedule.ts                 # Schedule CRUD
│   ├── tipPools.ts                 # Tip pool engine
│   ├── events.ts                   # Event management
│   └── echo.ts                     # AI endpoints
├── services/
│   ├── payrollPolicy.ts            # Payroll calculations
│   ├── aiAssist.ts                 # EchoAI core
│   ├── aiOptimizer.ts              # Metrics & forecasting
│   ├── productionBalancer.ts       # Task generation
│   └── reporting/pnlLite.ts        # P&L generation
├── lib/
│   └── db.ts                       # Supabase connection
└── supabase/
    └── schema.sql                  # Database schema

shared/
└── types/
    ├── schedule.d.ts               # Scheduling types
    ├── finance.d.ts                # Financial types
    └── production.d.ts             # Event types
```

## Testing Checklist

- [ ] Supabase connection successful
- [ ] TenancySelector loads all organizations/outlets
- [ ] Schedule page loads and displays shifts
- [ ] TipPoolStudio runs all 5 scenarios
- [ ] RevenueEntryGrid calculates daily totals
- [ ] SPLHCard displays metrics correctly
- [ ] EventLoadDashboard shows upcoming events
- [ ] PastryGantt displays timeline
- [ ] EchoAdvisor responds to queries
- [ ] Tenancy persists after page refresh

## Common Issues & Solutions

### "Cannot find module" errors
- Run `npm install` to ensure all dependencies are installed
- Check that imports use correct relative paths

### Supabase connection fails
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Check that schema.sql has been executed in Supabase SQL Editor
- Test connection: `curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" https://$SUPABASE_URL/rest/v1/orgs?limit=1`

### TenancySelector shows empty lists
- Verify data in Supabase tables (orgs, outlets, departments)
- Currently uses hardcoded mock data; integrate real API queries in production

### EchoAI returns generic responses
- If `OPENAI_API_KEY` not set, uses mock LLM
- To enable real OpenAI: set `OPENAI_API_KEY` environment variable

### TypeError: Cannot read property 'name' of undefined
- Ensure tenancy context is set (use TenancySelector)
- Wrap components in TenancyProvider

## Next Steps & Enhancements

### Immediate (1-2 weeks)
1. [ ] Connect real data sources (fetch orgs/outlets/depts from API)
2. [ ] Implement employee mobile view
3. [ ] Add employee time tracking (clock in/out)
4. [ ] Set up OpenAI integration for EchoAI

### Short Term (1 month)
1. [ ] Implement user authentication (Supabase Auth)
2. [ ] Add row-level security (RLS) policies
3. [ ] Create mobile app for iOS/Android
4. [ ] Build employee self-service portal

### Medium Term (3 months)
1. [ ] POS system integration (Toast, Square)
2. [ ] Advanced forecasting (Prophet, LSTM)
3. [ ] Compliance report automation
4. [ ] Integration with payroll vendors

### Long Term (6+ months)
1. [ ] Multi-region deployment
2. [ ] AI-powered auto-scheduling
3. [ ] Predictive analytics dashboard
4. [ ] Union compliance module
5. [ ] Custom GL code mapping for accounting

## Support

For issues or questions:
1. Check SYSTEM_ARCHITECTURE.md for detailed overview
2. Review component JSDoc comments
3. Inspect browser console for JavaScript errors
4. Check Supabase dashboard for database issues

---

**Version:** 1.0.0 - Multi-Tenant MVP
**Last Updated:** 2024
