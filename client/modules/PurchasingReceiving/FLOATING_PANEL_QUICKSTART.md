# Floating Panel Quick Start Guide

Quick reference for integrating modules into floating panels. For detailed documentation, see `BUILDER_IO_INTEGRATION_GUIDE.md`.

## Installation

All modules are pre-built. Just import and use:

```tsx
import {
  WasteModulePanel,
  IoTModulePanel,
  PurchasingModulePanel,
} from "@/components/floating-panels";
```

## Basic Usage

### Single Panel

```tsx
import { WasteModulePanel } from "@/components/floating-panels";
import { useAuth } from "@/context/AuthContext";
import { useMultiOutlet } from "@/context/MultiOutletContext";

export function MyPage() {
  const { organization } = useAuth();
  const { selectedOutletId } = useMultiOutlet();

  return (
    <WasteModulePanel
      panelId="waste-1"
      organizationId={organization.id}
      outletId={selectedOutletId}
    />
  );
}
```

### Multiple Panels with Event Handling

```tsx
import { useState, useCallback } from "react";
import {
  WasteModulePanel,
  IoTModulePanel,
  PurchasingModulePanel,
} from "@/components/floating-panels";
import type { AnyPanelEvent } from "@shared/types/panel";

export function Dashboard() {
  const { organization } = useAuth();
  const { selectedOutletId } = useMultiOutlet();
  const [events, setEvents] = useState<AnyPanelEvent[]>([]);

  const handleModuleEvent = useCallback((event: AnyPanelEvent) => {
    setEvents((prev) => [event, ...prev]);

    // React to specific events
    if (event.type === "dataChange" && event.source === "waste") {
      console.log("Waste data changed:", event.payload.changeType);
    }
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <WasteModulePanel
        panelId="waste-1"
        organizationId={organization.id}
        outletId={selectedOutletId}
        emit={handleModuleEvent}
      />
      <IoTModulePanel
        panelId="iot-1"
        organizationId={organization.id}
        outletId={selectedOutletId}
        emit={handleModuleEvent}
      />
      <PurchasingModulePanel
        panelId="purchasing-1"
        organizationId={organization.id}
        outletId={selectedOutletId}
        emit={handleModuleEvent}
      />
    </div>
  );
}
```

## Panel Props Reference

### Required Props

```ts
interface RequiredProps {
  panelId: string; // Unique ID for panel instance
  organizationId: string; // Organization context
  outletId: string; // Outlet/location context
}
```

### Optional Props

```ts
interface OptionalProps {
  title?: string; // Custom title (uses module default if omitted)
  defaultTab?: string; // Initial active tab
  canMinimize?: boolean; // Default: true
  canClose?: boolean; // Default: true
  className?: string; // Custom CSS classes
}
```

### Event Callbacks

```ts
interface EventCallbacks {
  emit?: (event: AnyPanelEvent) => void; // Send events to other modules
  onDataChange?: (event: DataChangeEvent) => void; // Listen for data changes
  onSelection?: (event: SelectionEvent) => void; // Listen for selections
  onError?: (event: ErrorEvent) => void; // Listen for errors
  onClose?: (panelId: string) => void; // Panel close callback
  onMinimize?: (panelId: string) => void; // Panel minimize callback
}
```

## Common Patterns

### Pattern 1: Listen for Data Changes

```tsx
<WasteModulePanel
  panelId="waste-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  onDataChange={(event) => {
    const { changeType, data, operation } = event.payload;
    console.log(`${changeType} - ${operation}:`, data);
    // Update UI, sync with other modules, etc.
  }}
/>
```

### Pattern 2: Handle User Selections

```tsx
<PurchasingModulePanel
  panelId="purchasing-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  onSelection={(event) => {
    const { selectedIds, itemType, items } = event.payload;
    console.log(`Selected ${itemType}:`, selectedIds);
    // Process selection...
  }}
/>
```

### Pattern 3: Error Handling

```tsx
const [error, setError] = useState<string | null>(null);

<IoTModulePanel
  panelId="iot-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  onError={(event) => {
    const { message, severity } = event.payload;
    setError(message);
    if (severity === "critical") {
      // Send alert, log to monitoring service, etc.
    }
  }}
/>;
```

### Pattern 4: Panel Lifecycle

```tsx
<WasteModulePanel
  panelId="waste-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  onClose={(panelId) => {
    // Panel was closed by user
    console.log(`Panel ${panelId} closed`);
    // Remove from layout state, save preferences, etc.
  }}
  onMinimize={(panelId) => {
    // Panel was minimized by user
    console.log(`Panel ${panelId} minimized`);
    // Collapse in layout, save state, etc.
  }}
/>
```

## Module Details

### Waste Module

**Available Tabs**: `logs` | `analysis` | `prevention` | `disposal`

```tsx
<WasteModulePanel
  panelId="waste-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  defaultTab="logs" // Start on logs tab
/>
```

**Events Emitted**:

- `dataChange`: When waste logs, disposal methods, or prevention actions are modified
- `error`: When operations fail

### IoT Module

**Available Tabs**: `devices` | `sensors` | `alerts`

```tsx
<IoTModulePanel
  panelId="iot-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  defaultTab="devices" // Start on devices tab
/>
```

**Events Emitted**:

- `dataChange`: When devices, sensors, or alerts are modified
- `error`: When operations fail

### Purchasing Module

**Available Tabs**: `guide` | `form` | `receiving` | `inventory` | `ledger`

```tsx
<PurchasingModulePanel
  panelId="purchasing-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  defaultTab="guide" // Start on order guide tab
/>
```

**Events Emitted**:

- `dataChange`: When orders, receiving, or inventory is modified
- `selection`: When user selects order guide rows
- `error`: When operations fail

## Layout Examples

### Full Width Layout

```tsx
<div className="w-full space-y-4">
  <WasteModulePanel {...props} />
  <IoTModulePanel {...props} />
  <PurchasingModulePanel {...props} />
</div>
```

### Two Column Layout

```tsx
<div className="grid grid-cols-2 gap-4">
  <WasteModulePanel {...props} />
  <IoTModulePanel {...props} />
  <PurchasingModulePanel className="col-span-2" {...props} />
</div>
```

### Three Column Layout

```tsx
<div className="grid grid-cols-3 gap-4">
  <WasteModulePanel {...props} />
  <IoTModulePanel {...props} />
  <PurchasingModulePanel {...props} />
</div>
```

### Responsive Grid Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <WasteModulePanel {...props} />
  <IoTModulePanel {...props} />
  <PurchasingModulePanel {...props} />
</div>
```

## Inter-Module Communication Example

```tsx
export function IntegratedDashboard() {
  const [state, setState] = useState({
    wasteAlert: null,
    lastPurchase: null,
    iotStatus: null,
  });

  const handleModuleEvent = (event: AnyPanelEvent) => {
    if (event.type === "dataChange") {
      if (
        event.source === "waste" &&
        event.payload.changeType === "waste-log-created"
      ) {
        // High waste detected - notify other modules
        setState((prev) => ({
          ...prev,
          wasteAlert: `High waste: ${event.payload.data.quantity}`,
        }));
      }

      if (
        event.source === "purchasing" &&
        event.payload.changeType === "purchase-order-submitted"
      ) {
        // Purchase order submitted - notify other modules
        setState((prev) => ({
          ...prev,
          lastPurchase: event.payload.data.id,
        }));
      }
    }
  };

  return (
    <div className="space-y-4">
      {state.wasteAlert && <Alert>{state.wasteAlert}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WasteModulePanel
          panelId="waste-1"
          {...baseProps}
          emit={handleModuleEvent}
        />
        <IoTModulePanel
          panelId="iot-1"
          {...baseProps}
          emit={handleModuleEvent}
        />
        <PurchasingModulePanel
          panelId="purchasing-1"
          {...baseProps}
          emit={handleModuleEvent}
        />
      </div>
    </div>
  );
}
```

## Environment Setup

Modules require Supabase configuration:

```env
# .env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

For server-side operations:

```bash
# Set via environment variables (not .env file)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

See `ENVIRONMENT_SECRETS_GUIDE.md` for details.

## Testing Locally

See `client/pages/ModuleEcosystem.tsx` for a full working example of all three modules integrated together with event logging.

Run the dev server and navigate to `/module-ecosystem` to see the example in action.

## Deployment to Builder.io

1. **Register Components** in Builder.io plugin:

```tsx
import { WasteModulePanel } from "@/components/floating-panels";

registerComponent(WasteModulePanel, {
  name: "Waste Module Panel",
  inputs: [
    { name: "panelId", type: "string", defaultValue: "waste-1" },
    { name: "organizationId", type: "string", required: true },
    { name: "outletId", type: "string", required: true },
    { name: "defaultTab", type: "string", defaultValue: "logs" },
  ],
});
```

2. **Use in Builder.io Pages**: Drag registered components into page editor

3. **Connect Data Bindings**: Use Builder.io data sources for `organizationId` and `outletId`

4. **Handle Events**: Use Builder.io custom actions for event callbacks

## Troubleshooting

### Panels not loading

- Verify `organizationId` and `outletId` are valid
- Check Supabase connection in browser dev tools
- Look for console errors

### Events not firing

- Ensure `emit` prop is passed to all panels
- Check that event handlers are properly connected
- Verify event types match handlers

### Data not syncing between modules

- Confirm central event bus is receiving events
- Check that all modules have `emit` prop connected
- Monitor Network tab for API calls

## Need Help?

- **Full Documentation**: `BUILDER_IO_INTEGRATION_GUIDE.md`
- **API Reference**: `API_REFERENCE.md`
- **Examples**: `client/pages/ModuleEcosystem.tsx`
- **Type Definitions**: `shared/types/panel.ts`
