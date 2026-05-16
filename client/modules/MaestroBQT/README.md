# MaestroBQT Orchestrator

Unified operational brain for hospitality management. Maestro BQT orchestrates 7 core builds across the LUCCCA ecosystem.

## Architecture

### 7 Core Builds
1. **Maestro BQT Core** - Events & Space Brain
2. **Culinary Engine** - Production Brain
3. **Inventory Engine** - Supply Chain Brain
4. **Scheduling Engine** - People Brain
5. **Engineering/AV** - Asset & Space Brain
6. **EchoStratus/Aurum** - Numbers Brain
7. **Echo Orchestrator** - Unification Brain

## Components

### Core Services
- **Event Bus** (`event-bus.ts`) - Central pub/sub for cross-module communication
- **Module Registry** (`module-registry.ts`) - Auto-discovery and lifecycle management
- **Central API** (`api.ts`) - Unified data fetching with fallbacks
- **Custom Hooks** (`hooks.ts`) - React hooks for data management

### UI Components
- **EventTimeline** - Events organized by space with status tracking
- **ChangeFeed** - Real-time updates across the system
- **RiskDashboard** - Financial metrics and alerts

## Data Flow

```
┌─────────────────────────────────────────────┐
│         MaestroBQT Orchestrator             │
│  (Central API + Event Bus + Module Registry)│
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴────────────┐
        │                       │
   ┌────v────┐           ┌─────v─────┐
   │ Real    │           │   Mock    │
   │  APIs   │           │   Data    │
   │         │           │           │
   └────┬────┘           └─────┬─────┘
        │                       │
        └──────────┬────────────┘
                   │
        ┌──────────v──────────┐
        │   Central Data      │
        │   (Events, Tasks,   │
        │    Spaces, etc.)    │
        └──────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
  ┌─v──┐      ┌────v────┐    ┌──v─┐
  │ UI │      │ Modules │    │Bus │
  │    │      │         │    │    │
  └────┘      └─────────┘    └────┘
```

## Module Interface

All modules imported via GitHub should expose:

```typescript
export async function initModule() {
  // Initialize module
}

export function subscribeToEvents(eventBus: EventBus) {
  // Subscribe to relevant events
}

export function onDataUpdate(payload: DataUpdatePayload) {
  // Handle data updates
}

export async function cleanupModule() {
  // Clean up resources
}
```

## Usage

### Opening in Sidebar
The Maestro BQT panel is available in the sidebar under "Maestro BQT".

### Subscribing to Events
```typescript
import { maestroEventBus, EVENT_TYPES } from '@/modules/MaestroBQT';

maestroEventBus.subscribeTo(EVENT_TYPES.EVENT_UPDATED, (data) => {
  console.log('Event updated:', data);
});
```

### Fetching Data
```typescript
import { maestroApi } from '@/modules/MaestroBQT';

const result = await maestroApi.fetchEvents();
const events = result.data;
```

### Using Hooks
```typescript
import { useMaestroData, useEventBusSubscription } from '@/modules/MaestroBQT';

function MyComponent() {
  const { events, spaces, loading } = useMaestroData();
  const conflictEvent = useEventBusSubscription('SPACE_CONFLICT_DETECTED');
  
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

## Module Discovery

MaestroBQT automatically discovers and loads modules with `luccca-module.json` manifest files.

### Creating a Manifest
Place `luccca-module.json` at the root of your module:

```json
{
  "name": "MyModule",
  "version": "1.0.0",
  "routes": ["/api/my-endpoint"],
  "events": ["MY_EVENT_TYPE"],
  "ui": ["/my-route"],
  "dependencies": [],
  "lifecycle": {
    "initModule": "initModule",
    "subscribeToEvents": "subscribeToEvents",
    "onDataUpdate": "onDataUpdate",
    "cleanupModule": "cleanupModule"
  }
}
```

## API Endpoints

### Supported Endpoints
- `GET /api/events` - List all events
- `GET /api/spaces` - List all spaces
- `GET /api/tasks` - List all tasks
- `GET /api/changes` - List all changes
- `GET /api/shortages` - List inventory shortages
- `GET /api/financials` - List financial data
- `GET /api/conflicts` - List detected conflicts

### Response Format
```typescript
{
  data: T[],
  status: "success" | "error" | "mock",
  timestamp: number,
  message?: string
}
```

## Event Types

See `event-bus.ts` for complete list of event types. Examples:

- `EVENT_CREATED`, `EVENT_UPDATED`, `EVENT_DELETED`
- `GUEST_COUNT_CHANGED`
- `SPACE_CONFLICT_DETECTED`
- `SHORTAGE_DETECTED`
- `MARGIN_RISK_DETECTED`

## Development

### Mock Data
When API is unavailable, mock data is automatically used. This allows development without backend implementation.

### Event Bus Debugging
In development mode, all events are logged to console.

### Module Status
Check module registry status in the dev panel at the bottom of the main component.

## Performance

- Data fetches occur in parallel (Promise.all)
- Event subscriptions are cleaned up automatically
- Module preloading reduces open-time latency
- Mock data provides instant feedback during development

## Integration with GitHub Modules

To integrate an external module:

1. Add `luccca-module.json` manifest
2. Implement required lifecycle functions
3. Expose event handlers
4. MaestroBQT will auto-discover and load it

## Roadmap

- [ ] Real Microsoft Graph integration for calendar
- [ ] WebSocket support for real-time updates
- [ ] Module dependency resolution
- [ ] Conflict resolution suggestions
- [ ] Advanced conflict detection algorithms
- [ ] Multi-property support
