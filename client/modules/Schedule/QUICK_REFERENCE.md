# Quick Reference Guide

## Common Imports

### Hooks
```typescript
import { useTenancy, useIsManager, useIsAdmin } from "@/hooks/useTenancy";
import { useEchoAI } from "@/hooks/useEchoAI";
```

### Components
```typescript
import { SchedulerGrid } from "@/components/SchedulerGrid";
import { TipPoolStudio } from "@/components/tip-pools/TipPoolStudio";
import { RevenueEntryGrid } from "@/components/revenue/RevenueEntryGrid";
import { SPLHCard } from "@/components/splh/SPLHCard";
import { PastryGantt } from "@/components/pastry/PastryGantt";
import { EventLoadDashboard } from "@/components/events/EventLoadDashboard";
import { EchoAdvisor } from "@/components/echo/EchoAdvisor";
import { TenancySelector } from "@/components/TenancySelector";
```

### Utilities
```typescript
import { calculateHours, computePayroll, formatCurrency, formatHours } from "@/lib/payrollPolicy";
```

## useTenancy Hook

### Get Current Context
```typescript
const { tenancy, setTenancy, loading } = useTenancy();

// tenancy = { org_id, org_name, outlet_id, outlet_name, dept_id, dept_name, role, user_id }
```

### Switch Context
```typescript
setTenancy({
  org_id: "org-123",
  org_name: "My Resort",
  outlet_id: "outlet-456",
  outlet_name: "Main Outlet",
  dept_id: "dept-789",
  dept_name: "Front of House",
  role: "GM",
});
```

### Check Role
```typescript
const isManager = useIsManager(); // GM or DEPT_MGR
const isAdmin = useIsAdmin();     // ADMIN only
const hasRole = useHasRole("GM"); // Check specific role
```

## useEchoAI Hook

### Query Assistant
```typescript
const { ask, response, loading, error, clear } = useEchoAI();

// Send query
const result = await ask("Should I add more servers on Friday?");
// result = { text: "...", optimization: { summary: {...}, recommendations: [...] } }

// Clear history
clear();
```

### Generate Scenarios
```typescript
const scenarios = await generateScenarios(500, [
  { employee_id: "emp1", hours_worked: 8, revenue_attrib: 500 },
  { employee_id: "emp2", hours_worked: 6, revenue_attrib: 300 },
]);
```

## Payroll Calculations

### Calculate Hours Between Timestamps
```typescript
const hours = calculateHours("2024-01-15T09:00:00Z", "2024-01-15T17:00:00Z", 30);
// Result: 7.5 hours (accounting for 30-min break)
```

### Compute Payroll
```typescript
const payroll = computePayroll(
  8,      // hours worked
  20,     // hourly rate
  1.5,    // OT multiplier
  40      // OT threshold (hours)
);
// Result: { regularPay: 160, otPay: 0, totalPay: 160, regularHours: 8, overtimeHours: 0 }
```

### Format Display
```typescript
formatCurrency(1234.56);  // "$1,234.56"
formatHours(7.5);         // "7.50h"
```

## API Endpoints Cheat Sheet

### Schedule
```bash
# Fetch weekly shifts
GET /api/schedule?outlet_id=UUID&dept_id=UUID&week_start=2024-01-15

# Bulk upsert shifts
POST /api/schedule/bulk
{
  "shifts": [
    {
      "org_id": "org-1",
      "outlet_id": "outlet-1",
      "dept_id": "dept-1",
      "employee_id": "emp-1",
      "position_id": "pos-1",
      "starts_at": "2024-01-15T09:00:00Z",
      "ends_at": "2024-01-15T17:00:00Z",
      "break_min": 30,
      "tips_declared": 50
    }
  ]
}

# Publish week
POST /api/schedule/publish
{
  "org_id": "org-1",
  "outlet_id": "outlet-1",
  "dept_id": "dept-1",
  "week_start": "2024-01-15",
  "notes": "Final schedule for week"
}

# Get audit history
GET /api/schedule/audits?outlet_id=UUID&dept_id=UUID
```

### Tip Pools
```bash
# Create pool
POST /api/tip-pools
{
  "org_id": "org-1",
  "outlet_id": "outlet-1",
  "dept_id": "dept-1",
  "name": "FOH Tips",
  "rule": "HYBRID",
  "hours_weight": 70,
  "revenue_weight": 30
}

# Run distribution
POST /api/tip-pools/pool-1/run
{
  "total_tips": 500,
  "business_date": "2024-01-15",
  "service": "DINNER",
  "members": [
    {
      "employee_id": "emp-1",
      "hours_worked": 8,
      "revenue_attrib": 400,
      "tier_weight": 1
    }
  ]
}

# Get historical runs
GET /api/tip-pools/pool-1/runs?limit=30
```

### Events
```bash
# Create event
POST /api/events
{
  "outlet_id": "outlet-1",
  "dept_id": "dept-1",
  "name": "Executive Dinner",
  "service_date": "2024-01-20",
  "service_time": "18:00",
  "guest_count": 50,
  "menus": ["recipe-1", "recipe-2"],
  "chef_in_charge": "emp-1",
  "complexity_score": 4.5
}

# List upcoming events
GET /api/events?outlet_id=UUID&dept_id=UUID&start_date=2024-01-15&end_date=2024-02-15

# Get event with tasks
GET /api/events/event-1

# Update event
PATCH /api/events/event-1
{ "guest_count": 60 }

# Delete event
DELETE /api/events/event-1
```

### EchoAI
```bash
# Query assistant
POST /api/echo/ask
{
  "org_id": "org-1",
  "outlet_id": "outlet-1",
  "dept_id": "dept-1",
  "prompt": "Should I increase staff for Friday service?"
}

# Generate scenarios
POST /api/echo/scenario
{
  "org_id": "org-1",
  "outlet_id": "outlet-1",
  "dept_id": "dept-1",
  "scenarios": [...]
}
```

## Component Props Reference

### SchedulerGrid
```typescript
<SchedulerGrid />
// No props required, uses useTenancy internally
// Fetches and displays weekly shifts for current dept
```

### TipPoolStudio
```typescript
<TipPoolStudio />
// No props required
// Allows creating members and running 5 scenarios
```

### RevenueEntryGrid
```typescript
<RevenueEntryGrid />
// No props required
// 7-day grid for revenue entry by service period
```

### SPLHCard
```typescript
<SPLHCard 
  sales={15000}
  laborHours={200}
  target={100}
  currency="USD"
/>
// Shows SPLH metric with variance to target
```

### PastryGantt
```typescript
<PastryGantt
  tasks={[
    {
      id: "task-1",
      recipe_id: "recipe-1",
      scheduled_start: "2024-01-15T14:00:00Z",
      scheduled_end: "2024-01-15T15:30:00Z",
      prep_station: "OVEN",
      labor_minutes: 90
    }
  ]}
  title="Production Timeline"
/>
```

### EventLoadDashboard
```typescript
<EventLoadDashboard />
// No props required, uses useTenancy internally
// Shows upcoming 30-day events with readiness status
```

### EchoAdvisor
```typescript
<EchoAdvisor />
// Floating widget (auto-positioned bottom-right)
// Already included in App.tsx
// No props needed
```

### TenancySelector
```typescript
<TenancySelector />
// Renders as button with dropdown dialog
// Use in header or toolbar
```

## Common Patterns

### Fetch Data with Tenancy
```typescript
import { useTenancy } from "@/hooks/useTenancy";

export function MyComponent() {
  const { tenancy } = useTenancy();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!tenancy.outlet_id) return; // Wait for tenancy
    
    fetch(`/api/schedule?outlet_id=${tenancy.outlet_id}&dept_id=${tenancy.dept_id}`)
      .then(r => r.json())
      .then(setData);
  }, [tenancy.outlet_id, tenancy.dept_id]);

  return <div>{/* render data */}</div>;
}
```

### Conditional Rendering by Role
```typescript
import { useIsManager } from "@/hooks/useTenancy";

export function Dashboard() {
  const isManager = useIsManager();

  return (
    <div>
      <h1>Schedule</h1>
      {isManager && <TipPoolStudio />}
      {isManager && <RevenueEntryGrid />}
    </div>
  );
}
```

### Call EchoAI
```typescript
import { useEchoAI } from "@/hooks/useEchoAI";

export function AssistantPanel() {
  const { ask, response, loading } = useEchoAI();

  const handleQuery = async (prompt: string) => {
    const result = await ask(prompt);
    if (result) {
      console.log(result.text);
      console.log(result.optimization.summary);
    }
  };

  return (
    <div>
      <input onBlur={e => handleQuery(e.target.value)} />
      {loading && <p>Thinking...</p>}
      {response && <p>{response.text}</p>}
    </div>
  );
}
```

## Database Queries (Supabase)

### Query with Supabase Client
```typescript
import { supabase } from "@/lib/db";

// Fetch shifts
const { data, error } = await supabase
  .from("shifts")
  .select("*")
  .eq("dept_id", deptId)
  .gte("starts_at", weekStart)
  .lt("starts_at", weekEnd);

// Create record
const { data, error } = await supabase
  .from("shifts")
  .insert({ org_id, outlet_id, dept_id, /* ... */ });

// Update record
const { data, error } = await supabase
  .from("shifts")
  .update({ published: true })
  .eq("id", shiftId);

// Delete record
const { data, error } = await supabase
  .from("shifts")
  .delete()
  .eq("id", shiftId);
```

## Environment Variables

```bash
# Required for Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional for OpenAI (uses mock if not set)
OPENAI_API_KEY=sk-your-key

# Server config
PING_MESSAGE=pong
```

## Development Commands

```bash
# Start dev server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm run test
```

## Deployment URLs

After building and deploying:
- Netlify: Auto-deploys from git
- Vercel: Auto-deploys from git
- Self-hosted: `npm start` on specified PORT

## Troubleshooting

### "Cannot find module" 
→ Check imports use correct relative paths (@/components, @/hooks, etc.)

### Tenancy not set
→ Use TenancySelector to configure org/outlet/dept

### API returns 400/401
→ Ensure all requests include org_id, outlet_id, dept_id

### Supabase connection fails
→ Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env

### EchoAI returns generic responses
→ Set OPENAI_API_KEY, or it uses mock LLM

## Resources

- **Full Docs**: See SYSTEM_ARCHITECTURE.md
- **Setup Guide**: See IMPLEMENTATION_NOTES.md
- **Build Summary**: See BUILD_SUMMARY.md
- **API Routes**: Check server/api/routes/*.ts files
- **Components**: Check client/components/**/*.tsx files

---

**Last Updated**: 2024  
**Version**: 1.0.0
