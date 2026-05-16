# MaestroBQT Integration Guide

## Overview

MaestroBQT is now a unified, tabbed system. Each child module (Kitchen, Culinary, Inventory, Labor, Engineering, Financials) is integrated as a separate tab that feeds data into the central orchestrator via the event bus.

## Current Status

### ✅ Phase 1: Complete
- **Maestro BQT Core** (Timeline, Risk Dashboard, Change Feed)
- **Maestro Kitchen** (Integrated as "Kitchen" tab)

### ⏳ Phases 3-7: Coming Soon
- Phase 3: Culinary Engine, Inventory Engine
- Phase 5: Labor/Scheduling Engine, Engineering/AV
- Phase 7: EchoStratus/Aurum (Financials)

---

## Unified Interface

MaestroBQT now opens as a single panel with 7 tabs:

```
┌─────────────────────────────────────────────────────────────────┐
│  Maestro BQT  📅 ⚡  (Unified Orchestrator)                     │
├──────────────────────────────────────────────────────────────────┤
│  [Timeline] [Kitchen] [Culinary] [Inventory] [Labor] [Eng] [Fin]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Active Tab Content (full height, auto-sized)                   │
│                                                                  │
│  Kitchen Tab = Maestro Kitchen Module (existing)                │
│  Culinary Tab = Culinary Engine (Phase 3)                       │
│  Inventory Tab = Inventory Engine (Phase 3)                     │
│  Labor Tab = Labor/Scheduling (Phase 5)                         │
│  Engineering Tab = Engineering/AV/Facilities (Phase 5)          │
│  Financials Tab = EchoStratus/Aurum (Phase 7)                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## How to Integrate a New Module

### Step 1: Add Tab Definition

In `client/modules/MaestroBQT/index.tsx`, tabs are defined in the `TABS` constant:

```typescript
const TABS: TabConfig[] = [
  { id: "timeline", label: "Timeline", icon: <Calendar size={18} /> },
  { id: "kitchen", label: "Kitchen", icon: <ChefHat size={18} /> },
  { id: "culinary", label: "Culinary", icon: <Package size={18} /> },
  // Add your module here
  { id: "my-module", label: "My Module", icon: <MyIcon size={18} /> },
];
```

### Step 2: Lazy-Load Your Module

At the top of `index.tsx`, add a lazy import:

```typescript
const MaestroKitchen = lazy(() => import("@/modules/Maestro"));
const MyCulinary = lazy(() => import("@/modules/Culinary")); // Add this
```

### Step 3: Add Tab Content Handler

In the tab content section, add a new condition:

```typescript
{/* Culinary Tab (Build #2) */}
{activeTab === "culinary" && (
  <Suspense fallback={<LoadingFallback />}>
    <div className="w-full h-full">
      <MyCulinary />
    </div>
  </Suspense>
)}
```

### Step 4: Publish Events from Your Module

When your module updates data, publish events to the orchestrator:

```typescript
import { maestroEventBus, EVENT_TYPES, publishEvent } from '@/modules/MaestroBQT';

// When guest count changes
publishEvent(
  EVENT_TYPES.GUEST_COUNT_CHANGED,
  { eventId: '123', newCount: 300, oldCount: 250 },
  'CulinaryEngine'
);

// When production status changes
publishEvent(
  EVENT_TYPES.PRODUCTION_CONFLICT,
  { eventId: '123', reason: 'Insufficient prep capacity' },
  'CulinaryEngine'
);
```

### Step 5: Subscribe to Orchestrator Events

Listen for changes from other modules:

```typescript
import { maestroEventBus, EVENT_TYPES } from '@/modules/MaestroBQT';

maestroEventBus.subscribeTo(EVENT_TYPES.GUEST_COUNT_CHANGED, (data) => {
  // Update your recipes/prep load based on new guest count
  console.log(`Guest count changed to ${data.newCount}`);
});
```

---

## Available Event Types

The orchestrator defines 30+ event types. Common ones:

**Event Management**
- `EVENT_CREATED`, `EVENT_UPDATED`, `EVENT_DELETED`
- `EVENT_STATUS_CHANGED`, `EVENT_TIME_CHANGED`

**Guest & Capacity**
- `GUEST_COUNT_CHANGED`, `GUEST_REQUIREMENT_UPDATED`

**Space Management**
- `SPACE_UPDATED`, `SPACE_CONFLICT_DETECTED`

**Production**
- `PREP_PLAN_UPDATED`, `PRODUCTION_CONFLICT`
- `STATION_CAPACITY_WARNING`

**Inventory**
- `SHORTAGE_DETECTED`, `INVENTORY_UPDATED`
- `PURCHASING_ORDER_CREATED`

**Labor**
- `TASK_CREATED`, `TASK_ASSIGNED`, `STAFFING_CONFLICT`

**Financial**
- `MARGIN_RISK_DETECTED`, `REVENUE_PROJECTION_UPDATED`

See `event-bus.ts` for complete list and event naming conventions.

---

## Data Flow Pattern

```
Child Module (Kitchen, Culinary, etc.)
    ↓ (publishes events)
MaestroBQT Event Bus
    ↓ (broadcasts to all subscribers)
Other Child Modules (listen for relevant events)
    ↓ (update their state)
MaestroBQT Orchestrator (Timeline, Risk Dashboard, Change Feed)
    ↓ (displays aggregated data)
User sees unified impact across all systems
```

---

## Example: Kitchen → Culinary Impact

1. **Kitchen** publishes: `GUEST_COUNT_CHANGED { count: 300 }`
2. **Event Bus** broadcasts to all subscribers
3. **Culinary** listens and recalculates:
   - New prep load
   - Station requirements
   - Timeline impact
4. **Culinary** publishes: `PREP_PLAN_UPDATED { ... }`
5. **Event Bus** broadcasts again
6. **Orchestrator** captures change and displays in Change Feed
7. **Financial Engine** listens and recalculates margin impact
8. **Risk Dashboard** updates with new risk scores

---

## Sidebar Navigation

**Important**: There's now **only one entry in the sidebar**:

```
Maestro BQT → Opens unified panel with all 7 tabs
```

The old separate "Maestro" entry has been removed from the sidebar to avoid confusion.

---

## Testing Event Bus Connections

In browser console:

```javascript
// See all events being published
import { maestroEventBus } from '@/modules/MaestroBQT';

// Subscribe to all events
const unsub = maestroEventBus.subscribeTo('*', (data) => {
  console.log('Event:', data);
});

// See event history
console.log(maestroEventBus.getHistory());

// See current subscriptions
console.log(maestroEventBus.getSubscriptions());
```

---

## Performance Considerations

- **Lazy Loading**: Modules only load when their tab is clicked
- **Suspense Fallback**: Loading spinner shown while module loads
- **Event Debouncing**: Consider debouncing frequent events (e.g., every keystroke)
- **Memory Cleanup**: Always unsubscribe from events in useEffect cleanup

```typescript
useEffect(() => {
  const unsub = maestroEventBus.subscribeTo('EVENT_UPDATED', handleUpdate);
  return () => unsub(); // Clean up on unmount
}, []);
```

---

## Deployment Checklist

- [ ] Module imports lazy-loaded in `MaestroBQT/index.tsx`
- [ ] Tab definition added to `TABS` array
- [ ] Tab content handler added to JSX
- [ ] Module publishes events on data changes
- [ ] Module subscribes to relevant event types
- [ ] Error handling for failed events
- [ ] Testing event flow between modules
- [ ] Tested in browser with all 7 modules visible (even if not implemented)

---

## Troubleshooting

**Events not triggering?**
- Verify event type matches exactly (case-sensitive)
- Check module is subscribed before event is published
- Look at event history: `maestroEventBus.getHistory()`

**Tab not showing?**
- Verify lazy import is correct
- Check Suspense boundary has fallback
- Look at browser console for module load errors

**Performance issues?**
- Check if modules are re-rendering unnecessarily
- Verify event subscriptions are cleaned up on unmount
- Consider memoizing event handlers with useCallback

---

## Next Steps

**Phase 3 (Days 13-30)**
- Implement Culinary Engine
- Implement Inventory Engine
- Wire event subscriptions between Kitchen, Culinary, Inventory

**Phase 5 (Days 31-50)**
- Implement Labor/Scheduling Engine
- Implement Engineering/AV/Facilities
- Add advanced conflict detection

**Phase 7 (Days 51-75)**
- Implement EchoStratus/Aurum (Financials)
- Full orchestrator with predictive analytics
- Notification system
