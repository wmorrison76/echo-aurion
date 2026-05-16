# Acknowledgements + Realtime + Role Gating Implementation

This document describes the complete acknowledgements system with real-time SSE updates and role-based access control.

## Overview

The system provides:
- **Employee acknowledgements**: One-tap confirmation that they received the published schedule
- **Real-time updates**: SSE (Server-Sent Events) stream broadcasts acknowledgement events to managers
- **KPI monitoring**: Auto-refreshing labor %, OT risk, predictability, and acknowledgement rate metrics
- **Role-based gating**: Employees see only their schedule and acknowledgement button; managers see KPIs and rollups
- **Mobile-first PWA**: Bottom-tab navigation shell with offline support

## Architecture

### Database

**New table: `publish_acknowledgements`**
```sql
create table publish_acknowledgements (
  id uuid primary key,
  org_id uuid,
  outlet_id uuid,
  dept_id uuid,
  employee_id uuid,
  week_start date,
  acknowledged_at timestamptz,
  unique(employee_id, outlet_id, dept_id, week_start)
);
```

### Server-Side Components

#### 1. Realtime Service (`server/services/realtime.ts`)
- EventEmitter-based bus for lightweight pub/sub
- `publishAck()`: broadcasts acknowledgement events to all connected clients
- `sseHandler()`: HTTP response handler for SSE stream
- Keeps last 20 events for late-joiner clients

#### 2. API Routes

**Acknowledgements (`/api/acks`)**
- `POST /api/acks/ack`: Employee records acknowledgement
  - Input: `{ org_id, outlet_id, dept_id, week_start, employee_id }`
  - Inserts into DB and broadcasts via SSE
- `GET /api/acks/stream`: SSE endpoint for real-time updates
- `GET /api/acks/rollup`: Manager view of ack status
  - Query: `outlet_id, dept_id, week_start`
  - Returns: total scheduled + list of employees who acked

**KPI Metrics (`/api/kpi`)**
- `GET /api/kpi/header`: Calculates weekly KPIs
  - Query: `org_id, outlet_id, dept_id, week_start`
  - Returns:
    - `labor_pct`: Labor cost as % of revenue (wages + tips ÷ revenue)
    - `ot_risk_count`: Number of employees scheduled > 40h
    - `predictability_exposure_hours`: Hours scheduled last-minute
    - `ack_rate_pct`: (employees acked) / (employees scheduled) × 100

#### 3. Authorization Middleware (`server/middleware/authz.ts`)

```typescript
// Require specific roles
requireRole("DEPT_MGR", "GM", "ADMIN")

// Require user owns the resource
requireSelf("employee_id")

// Require user in same department
requireDept("dept_id")
```

Mount example:
```typescript
app.use("/api/kpi", requireRole("DEPT_MGR", "GM", "ADMIN"), kpiRoutes);
```

### Client-Side Components

#### 1. AcknowledgeButton
```tsx
<AcknowledgeButton
  org_id={org_id}
  outlet_id={outlet_id}
  dept_id={dept_id}
  week_start="2025-10-13"
  employee_id={currentUserId}
/>
```
- One-click button to record ack
- Disables after success, shows "✔ Acknowledged"

#### 2. DeptAckRollup (Manager only)
```tsx
<DeptAckRollup
  outlet_id={outlet_id}
  dept_id={dept_id}
  week_start={week_start}
/>
```
- Shows total scheduled vs. acked count
- Lists employees + ack timestamps
- Manual refresh button

#### 3. KPIHeader (Manager only)
```tsx
<KPIHeader
  org_id={org_id}
  outlet_id={outlet_id}
  dept_id={dept_id}
  week_start={week_start}
/>
```
- Four cards: Labor %, OT Risk, Predictability, Ack Rate
- Color-coded intent: good (green) / neutral (white) / bad (red)
- **Auto-refreshes** when any acknowledgement is posted (via SSE)
- Manual refresh button

#### 4. Mobile Shell (`client/mobile/MobileShell.tsx`)
```tsx
<MobileShell
  org_id={org_id}
  outlet_id={outlet_id}
  dept_id={dept_id}
  week_start={week_start}
  employee_id={userId}
  role="EMPLOYEE" // or "DEPT_MGR" | "GM" | "ADMIN"
/>
```

**Tab navigation (role-gated):**
- **EMPLOYEE**: Home | Schedule | Ack
  - Home shows: acknowledgement button + prompt
  - Tips tab hidden
  - No KPI/forecast access
- **MANAGER**: Home | Schedule | Tips | Ack
  - Home shows: KPI cards + dept ack rollup
  - Full access

#### 5. Mobile Home (`client/mobile/pages/MobileHome.tsx`)
- Employees: Large acknowledge button, "confirm receipt" message
- Managers: KPI header + Dept ack rollup

### PWA Integration

**Manifest (`public/manifest.webmanifest`)**
- App name: "LUCCCA Resort Ops"
- Display: standalone (full-screen)
- Theme: dark (#0b0f19)
- Icons: 192px, 512px (place in `/public/icons/`)

**Service Worker (`client/sw/service-worker.ts`)**
- Offline cache for app shell (/, /manifest.webmanifest)
- Network-first strategy: try fetch, fallback to cache
- Caches all same-origin GETs

**Registration (`client/sw/registerSW.ts`)**
- Called in `App.tsx` on load
- Gracefully fails if SW not supported

**HTML Updates**
- Added PWA meta tags: viewport-fit, theme-color, apple-web-app-capable
- Linked manifest: `<link rel="manifest" href="/manifest.webmanifest" />`

## Usage Examples

### Setting up role in your auth system

```typescript
// In your authentication middleware:
req.user = {
  id: userId,
  role: "EMPLOYEE", // or "DEPT_MGR", "GM", "ADMIN"
  org_id: orgId,
  outlet_id: outletId,
  dept_id: deptId,
};
```

### Integrating into a page

```tsx
import { KPIHeader } from "@/components/kpi/KPIHeader";
import { DeptAckRollup } from "@/components/acks/DeptAckRollup";
import { AcknowledgeButton } from "@/components/acks/AcknowledgeButton";

export default function ManagerDashboard() {
  const weekStart = "2025-10-13"; // Monday of the week
  
  return (
    <div className="space-y-4 p-4">
      {/* Manager views these: */}
      <KPIHeader
        org_id="org-123"
        outlet_id="outlet-456"
        dept_id="dept-789"
        week_start={weekStart}
      />
      
      <DeptAckRollup
        outlet_id="outlet-456"
        dept_id="dept-789"
        week_start={weekStart}
      />
      
      {/* Employees see this: */}
      <AcknowledgeButton
        org_id="org-123"
        outlet_id="outlet-456"
        dept_id="dept-789"
        week_start={weekStart}
        employee_id="emp-123"
      />
    </div>
  );
}
```

### Mobile page wiring

```tsx
import { MobileShell } from "@/mobile/MobileShell";

export default function MobileApp() {
  const role = "EMPLOYEE"; // from auth
  
  return (
    <MobileShell
      org_id="org-123"
      outlet_id="outlet-456"
      dept_id="dept-789"
      week_start="2025-10-13"
      employee_id="emp-123"
      role={role}
    />
  );
}
```

## Testing

### Posting an acknowledgement (via curl or API test)

```bash
curl -X POST http://localhost:8080/api/acks/ack \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "org-123",
    "outlet_id": "outlet-456",
    "dept_id": "dept-789",
    "week_start": "2025-10-13",
    "employee_id": "emp-123"
  }'
```

### Testing SSE stream

```bash
curl http://localhost:8080/api/acks/stream
# Keep this open; should receive ping every 25s
# When an ack is posted, will receive: event: ack\ndata: {...}
```

### Testing KPI endpoint

```bash
curl 'http://localhost:8080/api/kpi/header?org_id=org-123&outlet_id=outlet-456&dept_id=dept-789&week_start=2025-10-13'
```

### Testing with role-gated middleware

```bash
# This should work if you're an admin
curl 'http://localhost:8080/api/kpi/header?...&user_id=user-123&role=DEPT_MGR'

# This should be 403 if you're an employee
curl 'http://localhost:8080/api/kpi/header?...&user_id=user-123&role=EMPLOYEE'
```

## Security Notes

### Role Enforcement

1. **API level**: `/api/kpi` is guarded by `requireRole("DEPT_MGR", "GM", "ADMIN")`
2. **UI level**: Components check role and don't render restricted content
3. **Database (optional)**: RLS policies can further restrict access

Example RLS policy (if using Supabase):
```sql
alter table publish_acknowledgements enable row level security;

create policy no_employee_kpi_read on employees
for select using (
  current_setting('request.role', true) in ('DEPT_MGR', 'GM', 'ADMIN')
);
```

### Data Protection

- Employees cannot see revenue, tips, or KPI data
- Each employee can only acknowledge their own shifts
- Acknowledgements are immutable (upsert on conflict only updates timestamp)

## Extending the System

### Adding push notifications for "Schedule published"

You can add a `/api/push/send` endpoint that:
1. Stores VAPID keys for Web Push
2. Sends push notifications when schedules are published
3. Clients subscribe via `serviceWorkerRegistration.pushManager.subscribe()`

### Adding more KPI metrics

Update `server/api/routes/kpi.ts` to calculate additional metrics:
- Labor cost variance vs. budget
- Skill gaps (missing positions)
- Next-day scheduling gaps

### Customizing SSE broadcasts

Update `server/services/realtime.ts` to emit other events:
- Schedule published
- Tip run posted
- Shift swaps approved

## File Structure

```
server/
  services/
    realtime.ts              # SSE bus & event emitter
  api/routes/
    acks.ts                  # Ack endpoints
    kpi.ts                   # KPI calculation
  middleware/
    authz.ts                 # Role gating

client/
  components/
    acks/
      AcknowledgeButton.tsx  # Employee button
      DeptAckRollup.tsx      # Manager rollup
    kpi/
      KPIHeader.tsx          # Auto-refreshing KPI cards
  mobile/
    MobileShell.tsx          # Bottom-tab layout
    pages/
      MobileHome.tsx         # Role-gated landing
  sw/
    service-worker.ts        # PWA offline cache
    registerSW.ts            # SW registration

public/
  manifest.webmanifest       # PWA manifest
  icons/
    icon-192.png
    icon-512.png

server/supabase/
  schema.sql                 # New: publish_acknowledgements table
```

## Troubleshooting

### KPI not auto-refreshing
1. Check that KPIHeader is rendering (manager role)
2. Open browser DevTools → Network → filter "stream" → should see SSE connection
3. Post an ack via `/api/acks/ack` → KPI should refresh
4. If still not working, check that `dept_id` and `week_start` match exactly

### SSE connection closes immediately
- Check CORS headers (enabled in server/index.ts)
- Ensure `/api/acks/stream` is not blocked by other middleware

### Acknowledgement button doesn't appear
- Check that `role` is not "EMPLOYEE" (or render it for all roles)
- Verify query params are valid (outlet_id, dept_id, week_start format)

### Service worker not caching
- Ensure `public/icons/` has PNG files (192x512px)
- Check browser DevTools → Application → Service Workers
- Force refresh (Cmd+Shift+R) to clear old cache
