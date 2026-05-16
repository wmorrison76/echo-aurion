# Builder.io Integration Guide: Floating Panel Ecosystem

This guide explains how to integrate the application's modules (Waste Tracking, IoT/RFID Monitoring, and Purchasing/Inventory) into the Builder.io CMS and floating panel ecosystem.

## Overview

The application provides three main modules that can be loaded independently into floating panels or any UI container:

1. **Waste Module**: Track waste, analyze costs, monitor disposal, and implement prevention strategies
2. **IoT Module**: Monitor RFID devices, sensor readings, spoilage risks, and real-time alerts
3. **Purchasing Module**: Manage orders, receiving, inventory lots, and stock ledger

Each module is self-contained, communicates via a standardized event system, and can work within constrained UI spaces (floating panels, drawers, modals, tabs).

## Architecture

### Module Structure

```
├── Floating Panel Ecosystem
│   ├── FloatingPanelWrapper (generic wrapper)
│   ├── WasteModulePanel (waste-specific wrapper)
│   ├── IoTModulePanel (iot-specific wrapper)
│   └── PurchasingModulePanel (purchasing-specific wrapper)
├── Event System
│   ├── DataChangeEvent (when module data changes)
│   ├── SelectionEvent (when user selects items)
│   ├── ActionRequestEvent (when requesting action from other module)
│   └── ErrorEvent (when error occurs)
└── Inter-Module Communication
    └── EventEmitter pattern for loose coupling
```

### Event System

All modules communicate via a standardized event system. Events are emitted when:

- **Data Changes**: When records are created, updated, or deleted
- **User Selections**: When user selects items to send to another module
- **Action Requests**: When one module requests action from another
- **Errors**: When errors occur during operations

## Integration Guide

### 1. Basic Panel Integration

#### Adding a Waste Module Panel

```tsx
import { WasteModulePanel } from "@/components/floating-panels";
import { useAuth } from "@/context/AuthContext";
import { useMultiOutlet } from "@/context/MultiOutletContext";

export function MyPage() {
  const { organization } = useAuth();
  const { selectedOutletId } = useMultiOutlet();

  return (
    <div className="space-y-4">
      <WasteModulePanel
        panelId="waste-1"
        organizationId={organization.id}
        outletId={selectedOutletId}
        title="Waste Tracking"
        defaultTab="logs"
      />
    </div>
  );
}
```

#### Adding an IoT Module Panel

```tsx
import { IoTModulePanel } from "@/components/floating-panels";

export function MyPage() {
  const { organization } = useAuth();
  const { selectedOutletId } = useMultiOutlet();

  return (
    <IoTModulePanel
      panelId="iot-1"
      organizationId={organization.id}
      outletId={selectedOutletId}
      defaultTab="devices"
    />
  );
}
```

#### Adding a Purchasing Module Panel

```tsx
import { PurchasingModulePanel } from "@/components/floating-panels";

export function MyPage() {
  const { organization } = useAuth();
  const { selectedOutletId } = useMultiOutlet();

  return (
    <PurchasingModulePanel
      panelId="purchasing-1"
      organizationId={organization.id}
      outletId={selectedOutletId}
      defaultTab="guide"
    />
  );
}
```

### 2. Event Handling

#### Listen for Data Changes

```tsx
<WasteModulePanel
  panelId="waste-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  onDataChange={(event) => {
    console.log("Waste data changed:", event.payload.changeType);
    // Example: event.payload.changeType = 'waste-log-created'
    // Example: event.payload.data = { id: '123', quantity: 10, ... }
    // Example: event.payload.operation = 'create' | 'update' | 'delete'
  }}
/>
```

#### Listen for User Selections

```tsx
<PurchasingModulePanel
  panelId="purchasing-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  onSelection={(event) => {
    // User selected order guide items
    const { selectedIds, itemType, items } = event.payload;
    console.log(`${itemType} selected:`, selectedIds);
  }}
/>
```

#### Listen for Errors

```tsx
<IoTModulePanel
  panelId="iot-1"
  organizationId={organization.id}
  outletId={selectedOutletId}
  onError={(event) => {
    const { code, message, severity } = event.payload;
    // severity: 'warning' | 'error' | 'critical'
    console.error(`[${severity}] ${code}: ${message}`);
  }}
/>
```

### 3. Inter-Module Communication

Modules emit events that other modules can listen to. Set up a central event bus to coordinate between panels.

```tsx
import { useState, useCallback } from "react";
import {
  WasteModulePanel,
  IoTModulePanel,
  PurchasingModulePanel,
} from "@/components/floating-panels";
import type { AnyPanelEvent } from "@shared/types/panel";

export function ModuleEcosystem() {
  const [events, setEvents] = useState<AnyPanelEvent[]>([]);
  const [organization] = useAuth();
  const [selectedOutletId] = useMultiOutlet();

  const handleModuleEvent = useCallback((event: AnyPanelEvent) => {
    setEvents((prev) => [event, ...prev]);

    // React to events from other modules
    if (event.type === "dataChange" && event.source === "purchasing") {
      // Purchasing module emitted a data change
      // Could trigger updates in waste or IoT modules
      console.log("Inventory changed, may affect IoT spoilage predictions");
    }

    if (event.type === "dataChange" && event.source === "waste") {
      // Waste module emitted a data change
      console.log("Waste recorded, may affect purchasing forecasts");
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

## Module Details

### Waste Module

**Tabs**: Logs, Analysis, Prevention, Disposal

**Key Events**:

- `dataChange` with `changeType`:
  - `waste-log-created`, `waste-log-updated`, `waste-log-deleted`
  - `disposal-method-created`, `disposal-method-updated`, `disposal-method-deleted`
  - `prevention-action-created`, `prevention-action-updated`, `prevention-action-deleted`
  - `alert-created`, `alert-updated`, `alert-deleted`

**Example Data**:

```ts
event.payload.data = {
  id: "waste-log-123",
  organizationId: "org-1",
  outletId: "outlet-1",
  quantity: 10.5,
  unit: "kg",
  category: "produce",
  cost: 25.5,
  rootCause: "Spoilage",
  createdAt: "2024-01-15T10:30:00Z",
};
```

### IoT Module

**Tabs**: Devices & Health, Sensor Monitoring, Alerts & Rules

**Key Events**:

- `dataChange` with `changeType`:
  - `device-created`, `device-updated`, `device-deleted`
  - `sensor-reading-created`, `sensor-reading-updated`
  - `alert-rule-created`, `alert-rule-updated`, `alert-rule-deleted`
  - `device-alert-created`, `device-alert-resolved`

**Example Data**:

```ts
event.payload.data = {
  id: "sensor-reading-456",
  deviceId: "device-123",
  temperature: 4.2,
  humidity: 75,
  timestamp: "2024-01-15T10:30:00Z",
  spoilageRiskLevel: "low" | "medium" | "high",
};
```

### Purchasing Module

**Tabs**: Order Guide, Order Form, Receiving, Inventory, Ledger

**Key Events**:

- `selection` when user selects order guide rows:

  ```ts
  event.payload = {
    selectedIds: ["og-row-1", "og-row-2"],
    itemType: "orderGuideRows",
    items: [
      {
        id: "og-row-1",
        ingredient: "Tomatoes",
        vendorSku: "TOM-001",
        quantity: 50,
      },
      // ...
    ],
  };
  ```

- `dataChange` with `changeType`:
  - `purchase-order-created`, `purchase-order-updated`, `purchase-order-submitted`
  - `receiving-captured`, `receiving-completed`
  - `lot-created`, `lot-updated`
  - `ledger-entry-created`

**Example Data**:

```ts
event.payload.data = {
  id: "po-789",
  vendorId: "vendor-1",
  status: "draft" | "submitted" | "received",
  lines: [{ productId: "prod-1", quantity: 50, unitCost: 0.5 }],
  total: 25.0,
  createdAt: "2024-01-15T10:30:00Z",
};
```

## Configuration Options

### Panel Configuration Interface

```ts
interface PanelInitConfig {
  // Required
  panelId: string; // Unique panel instance ID
  organizationId: string; // Organization context
  outletId: string; // Outlet/Location context

  // Optional
  title?: string; // Custom panel title
  canMinimize?: boolean; // Default: true
  canClose?: boolean; // Default: true
  className?: string; // Custom CSS classes
  defaultTab?: string; // Initial active tab

  // Event handlers
  onDataChange?: (event) => void;
  onSelection?: (event) => void;
  onActionRequest?: (event) => void;
  onError?: (event) => void;
  onClose?: (panelId) => void;
  onMinimize?: (panelId) => void;

  // Event emitter
  emit?: (event: AnyPanelEvent) => void;
}
```

## Advanced: Custom Event Handling

### Example: React to Waste Changes in IoT Module

```tsx
function IntegratedDashboard() {
  const [wasteAlert, setWasteAlert] = useState<any>(null);
  const { organization } = useAuth();
  const { selectedOutletId } = useMultiOutlet();

  const handleWasteDataChange = useCallback((event) => {
    if (event.payload.changeType === "waste-log-created") {
      // New waste recorded - may want to investigate root cause with IoT
      setWasteAlert({
        type: "waste-alert",
        message: `High waste detected: ${event.payload.data.quantity}${event.payload.data.unit}`,
        data: event.payload.data,
      });

      // Automatically scroll IoT module to alerts tab
      // Or trigger sensor review based on waste location
    }
  }, []);

  return (
    <div className="space-y-4">
      {wasteAlert && (
        <div className="p-4 bg-red-950 border border-red-700 rounded">
          <h3 className="font-semibold text-red-100">{wasteAlert.message}</h3>
          <p className="text-sm text-red-200 mt-2">
            Consider reviewing sensor data and devices in this area
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WasteModulePanel
          panelId="waste-1"
          organizationId={organization.id}
          outletId={selectedOutletId}
          onDataChange={handleWasteDataChange}
        />

        <IoTModulePanel
          panelId="iot-1"
          organizationId={organization.id}
          outletId={selectedOutletId}
        />
      </div>
    </div>
  );
}
```

## Best Practices

### 1. **Panel Instance IDs**

Always use unique, descriptive panel IDs:

```ts
// ✅ Good
panelId = "waste-dock-1";
panelId = "iot-cold-storage";
panelId = "purchasing-prime";

// ❌ Bad
panelId = "waste";
panelId = "panel1";
```

### 2. **Context Management**

Always pass the current organization and outlet context:

```ts
<WasteModulePanel
  organizationId={organization.id}    // Required for multi-tenancy
  outletId={selectedOutletId}         // Current location/outlet
/>
```

### 3. **Error Handling**

Listen for errors and provide user feedback:

```ts
const [error, setError] = useState<string | null>(null);

<WasteModulePanel
  onError={(event) => {
    setError(event.payload.message);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  }}
/>
```

### 4. **Loading States**

Handle async operations properly:

```ts
const [isLoadingData, setIsLoadingData] = useState(false);

const handlePurchasingEvent = (event) => {
  if (event.type === "selection") {
    setIsLoadingData(true);
    // Process selection...
    setIsLoadingData(false);
  }
};
```

### 5. **Responsive Layouts**

Use responsive grid layouts for multiple panels:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <WasteModulePanel {...props} />
  <IoTModulePanel {...props} />
  <PurchasingModulePanel {...props} />
</div>
```

## Deployment

### In Builder.io CMS

Modules can be registered as custom components in Builder.io:

1. **Register Component**:

```tsx
// In Builder.io plugin
registerComponent(WasteModulePanel, {
  name: "Waste Module Panel",
  inputs: [
    { name: "panelId", type: "string", defaultValue: "waste-1" },
    { name: "organizationId", type: "string" },
    { name: "outletId", type: "string" },
    { name: "defaultTab", type: "string", defaultValue: "logs" },
  ],
});
```

2. **Use in Pages**: Drag components into Builder.io pages

3. **Connect Data**: Bind to dynamic data sources in Builder.io

### Environment Configuration

Modules require:

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side only, set via env

See `ENVIRONMENT_SECRETS_GUIDE.md` for secure setup.

## Support & Documentation

- **API Reference**: See `API_REFERENCE.md`
- **Type Definitions**: `shared/types/panel.ts`
- **Module Components**: `client/components/floating-panels/`
- **Example Integration**: See `client/pages/Purchasing.tsx` for reference

## Troubleshooting

### Module doesn't load

- Check that `organizationId` and `outletId` are valid
- Verify Supabase credentials in environment
- Check browser console for specific errors

### Events not firing

- Ensure `emit` callback is passed to panel
- Check that event handlers are properly connected
- Verify event type matches handler (e.g., `onDataChange` for `dataChange` events)

### Data not updating across modules

- Verify central event bus is connected
- Check that all relevant modules have `emit` prop
- Monitor event flow in browser dev tools

## Examples

Full working examples can be found in:

- `client/pages/WasteTracking.tsx` - Waste module integration
- `client/pages/IoTDashboard.tsx` - IoT module integration
- `client/pages/Purchasing.tsx` - Purchasing module integration
- `src/modules/PurchRec/README.md` - Detailed purchasing module docs

## Next Steps

1. Choose module(s) to integrate
2. Add panels to your layout
3. Connect event handlers
4. Test inter-module communication
5. Deploy to Builder.io
