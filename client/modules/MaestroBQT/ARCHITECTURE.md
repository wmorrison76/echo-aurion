# MaestroBQT Architecture & Design

## Overview

MaestroBQT is the unified operational orchestrator for LUCCCA. It serves as the "brain" that coordinates all business operations across 7 interconnected builds.

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    MaestroBQT Orchestrator                        │
│                    (client/modules/MaestroBQT/)                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         ┌──────v─────┐  ┌───v────┐  ┌────v──────┐
         │  Event Bus │  │ API    │  │ Module    │
         │            │  │ Layer  │  │ Registry  │
         └──────┬─────┘  └───┬────┘  └────┬──────┘
                │            │            │
         ┌──────v────────────v────────────v─────┐
         │      Central Data Synchronization     │
         │  (Fetch all data in parallel)         │
         └──────┬─────────────────────────────┬──┘
                │                             │
         ┌──────v──────┐            ┌────────v─────┐
         │   Real API  │            │  Mock Data   │
         │   (Future)  │            │ (Fallback)   │
         └─────────────┘            └──────────────┘
```

## Layer Architecture

### 1. **Type Layer** (`types.ts`)
Defines all TypeScript interfaces and types:
- `Event`, `Space`, `Task`, `Change`, `Shortage`, `Financial`, `Conflict`
- `EventBusMessage`, `EventBus` interface
- `LuccaModuleManifest` for module auto-discovery
- `DataUpdatePayload` for cross-module communication

### 2. **Event Bus Layer** (`event-bus.ts`)
Central pub/sub system for module communication:
- `MaestroEventBus` class with subscribe/publish
- Message history tracking (circular buffer)
- Wildcard subscriptions ("*") for monitoring all events
- 30+ predefined event types (EVENT_CREATED, CONFLICT_DETECTED, etc.)

### 3. **Module Registry Layer** (`module-registry.ts`)
Auto-discovery and lifecycle management:
- `ModuleRegistry` class for module loading
- Manifest-based discovery (luccca-module.json files)
- Module lifecycle: `initModule()`, `subscribeToEvents()`, `onDataUpdate()`, `cleanupModule()`
- Dependency tracking
- Status monitoring

### 4. **Data API Layer** (`api.ts`)
Unified data fetching with intelligent fallbacks:
- `MaestroBQTApi` class
- Individual fetch methods: `fetchEvents()`, `fetchSpaces()`, etc.
- `fetchAll()` for parallel data loading
- Mock data generators for each data type
- Automatic fallback when API unavailable
- Event publishing on data sync start/complete

### 5. **Hooks Layer** (`hooks.ts`)
React hooks for component integration:
- `useMaestroData()` - Load all data with auto-refresh
- `useEventBusSubscription()` - Subscribe to specific events
- `useEventUpdates()` - Auto-refetch on updates
- `useConflictDetection()` - Monitor conflicts
- Data filtering hooks (by space, department, date, etc.)
- Metrics calculation hook

### 6. **UI Component Layer** (`components/`)
React components for visualization:
- `EventTimeline.tsx` - Events organized by space
- `ChangeFeed.tsx` - Real-time updates display
- `RiskDashboard.tsx` - Financial metrics and alerts

### 7. **Application Layer** (`index.tsx`)
Main MaestroBQT component:
- Initializes data and module registry
- Renders three-panel layout (timeline + feed + dashboard)
- System health monitoring
- Development mode module status display

## 7 Core Builds Architecture

### Build 1: **Maestro BQT Core** (This Module)
- **Purpose**: Events & Space Brain
- **Owns**: Event timeline, space management, change tracking
- **Emits**: EVENT_CREATED, EVENT_UPDATED, SPACE_CONFLICT_DETECTED
- **Consumes**: All other builds' updates via event bus

### Build 2: **Culinary Engine**
- **Purpose**: Production Brain
- **Owns**: Recipes, prep plans, station workflows, production tracking
- **Emits**: PREP_PLAN_UPDATED, PRODUCTION_CONFLICT, STATION_CAPACITY_WARNING
- **Consumes**: GUEST_COUNT_CHANGED, EVENT_UPDATED

### Build 3: **Inventory Engine**
- **Purpose**: Supply Chain Brain
- **Owns**: Inventory, shortages, reordering, purchasing
- **Emits**: SHORTAGE_DETECTED, INVENTORY_UPDATED, PURCHASING_ORDER_CREATED
- **Consumes**: GUEST_COUNT_CHANGED, PRODUCTION_CONFLICT

### Build 4: **Scheduling Engine**
- **Purpose**: People Brain
- **Owns**: Shifts, departments, staff assignments, task generation
- **Emits**: TASK_CREATED, TASK_ASSIGNED, STAFFING_CONFLICT
- **Consumes**: EVENT_UPDATED, PREP_PLAN_UPDATED, SPACE_CONFLICT_DETECTED

### Build 5: **Engineering/AV/Facilities**
- **Purpose**: Asset & Space Brain
- **Owns**: HVAC, AV systems, maintenance windows, asset tracking
- **Emits**: HVAC_CONFLICT_DETECTED, AV_REQUIREMENT_UPDATED, MAINTENANCE_WINDOW_CREATED
- **Consumes**: EVENT_UPDATED, SPACE_AVAILABILITY_CHANGED

### Build 6: **EchoStratus/Aurum**
- **Purpose**: Numbers Brain (Financial Intelligence)
- **Owns**: Revenue projections, cost tracking, margin calculation, risk scoring
- **Emits**: MARGIN_RISK_DETECTED, REVENUE_PROJECTION_UPDATED, COST_PROJECTION_UPDATED
- **Consumes**: GUEST_COUNT_CHANGED, SHORTAGE_DETECTED, TASK_CREATED

### Build 7: **Echo Orchestrator**
- **Purpose**: Unification Brain
- **Owns**: Event bus, conflict detection, impact analysis, notifications
- **Emits**: CONFLICT_RESOLVED, DATA_SYNC_COMPLETED, MODULE_LOADED
- **Consumes**: All events from other builds

## Data Flow Example

### Scenario: Guest Count Changes for Event

1. **User updates guest count in Maestro BQT Core**
   ```
   User → EventTimeline → publishEvent('GUEST_COUNT_CHANGED')
   ```

2. **Event Bus publishes update**
   ```
   maestroEventBus.publish({
     type: 'GUEST_COUNT_CHANGED',
     source: 'MaestroBQTCore',
     payload: { eventId: '...', newCount: 300 },
     timestamp: Date.now()
   })
   ```

3. **Each build subscribes and reacts**
   ```
   // Culinary Engine updates prep load
   eventBus.subscribeTo('GUEST_COUNT_CHANGED', async (data) => {
     const newPrepLoad = calculatePrepLoad(data.newCount);
     updatePrepPlan(newPrepLoad);
   });

   // Inventory Engine updates shortages
   eventBus.subscribeTo('GUEST_COUNT_CHANGED', async (data) => {
     const shortages = detectShortages(data.newCount);
     if (shortages.length > 0) {
       publishEvent('SHORTAGE_DETECTED', { shortages });
     }
   });

   // Scheduling Engine updates task load
   eventBus.subscribeTo('GUEST_COUNT_CHANGED', async (data) => {
     const newTaskCount = calculateTasks(data.newCount);
     updateTasks(newTaskCount);
   });

   // Financial Engine updates risk
   eventBus.subscribeTo('GUEST_COUNT_CHANGED', async (data) => {
     const riskScore = calculateRisk(data.newCount);
     publishEvent('MARGIN_RISK_DETECTED', { riskScore });
   });
   ```

4. **Risk Dashboard detects new alerts**
   ```
   If riskScore > 0.7 or shortages exist:
     → Display warning
     → Suggest action
   ```

## Module Integration Pattern

### Adding a New Module (GitHub or Internal)

**Step 1: Create Manifest** (`luccca-module.json`)
```json
{
  "name": "MyModule",
  "version": "1.0.0",
  "routes": ["/api/my-endpoint"],
  "events": ["MY_EVENT_TYPE"],
  "ui": ["/my-route"],
  "dependencies": ["MaestroBQT"],
  "lifecycle": {
    "initModule": "initModule",
    "subscribeToEvents": "subscribeToEvents",
    "onDataUpdate": "onDataUpdate",
    "cleanupModule": "cleanupModule"
  }
}
```

**Step 2: Implement Lifecycle** (in module's main file)
```typescript
export async function initModule() {
  // Initialize your module
  console.log("MyModule initialized");
}

export function subscribeToEvents(eventBus: EventBus) {
  eventBus.subscribeTo('EVENT_UPDATED', (data) => {
    // React to event updates
  });
}

export function onDataUpdate(payload: DataUpdatePayload) {
  // Handle incoming data
}

export async function cleanupModule() {
  // Clean up resources
}
```

**Step 3: Place Module**
- Internal: `client/modules/MyModule/`
- External: Clone/pull into modules, ensure manifest exists

**Step 4: Auto-Discovery**
MaestroBQT automatically:
1. Discovers `luccca-module.json`
2. Loads and registers module
3. Calls `initModule()`
4. Sets up event subscriptions
5. Adds to module registry

## API Contract

### Central Endpoints (Expected)
```
GET /api/events           → Event[]
GET /api/spaces           → Space[]
GET /api/tasks            → Task[]
GET /api/changes          → Change[]
GET /api/shortages        → Shortage[]
GET /api/financials       → Financial[]
GET /api/conflicts        → Conflict[]
```

### Response Format
```typescript
{
  data: T[],
  status: "success" | "error" | "mock",
  timestamp: number,
  message?: string
}
```

## Fallback Strategy

When APIs are unavailable:
1. **Mock Data**: Each data type has generator function
2. **No User Impact**: UI displays data from mocks
3. **Status Indicator**: "mock" status indicates fallback
4. **Graceful Degradation**: All features work with mock data

## Performance Characteristics

| Operation | Behavior | Notes |
|-----------|----------|-------|
| Data Fetch | Parallel (Promise.all) | All data loaded simultaneously |
| Auto-Refresh | 30 seconds | Prevents excessive API calls |
| Module Load | Lazy (on demand) | Only when opened |
| Module Preload | Background (2s delay) | Reduces first-open latency |
| Event History | Circular buffer (1000) | Prevents memory leak |
| Component Re-render | On state change | Not on event bus updates |

## Conflict Detection

The system detects multiple conflict types:

1. **Space Conflicts** - Double bookings, capacity exceeded
2. **Time Conflicts** - Overlapping events
3. **Resource Conflicts** - Shared resources scheduled simultaneously
4. **Staffing Conflicts** - Insufficient staff availability
5. **Production Conflicts** - Prep capacity exceeded
6. **HVAC Conflicts** - Environmental control impossible
7. **Financial Conflicts** - Margin risk, cost overruns

Each conflict:
- Gets unique ID
- Severity level (warning/error/critical)
- Affected departments
- Suggested action
- Timestamp

## Deployment Considerations

### Build Process
- MaestroBQT is code-split (dynamic import)
- Loads only when accessed
- ~50KB gzipped (estimated)

### Server Requirements
- No backend required for basic operation
- Mock data works standalone
- When APIs available, automatically used

### Monitoring
- Event bus history for debugging
- Module status dashboard (dev mode)
- Error logging to Sentry

## Future Enhancements

- [ ] WebSocket real-time updates
- [ ] Module dependency resolution
- [ ] Advanced conflict resolution suggestions
- [ ] AI-powered predictions
- [ ] Multi-property support
- [ ] Offline mode
- [ ] Data persistence layer
- [ ] Advanced analytics
