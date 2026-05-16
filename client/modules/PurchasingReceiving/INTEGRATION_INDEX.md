# Integration Index - Floating Panel Ecosystem

**Quick Navigation for Builder.io Integration**

This file serves as a master index for all floating panel ecosystem components and documentation.

## 📚 Documentation Files (Start Here)

### For Beginners

1. **[FLOATING_PANEL_QUICKSTART.md](FLOATING_PANEL_QUICKSTART.md)** - Start here!
   - 5-minute quick start
   - Copy-paste examples
   - Common patterns
   - Module references

### For Complete Integration

2. **[BUILDER_IO_INTEGRATION_GUIDE.md](BUILDER_IO_INTEGRATION_GUIDE.md)** - Complete reference
   - Architecture overview
   - Detailed integration steps
   - Event system explained
   - Advanced examples
   - Deployment instructions
   - Troubleshooting guide

### For Reference

3. **[FLOATING_PANEL_ECOSYSTEM_SUMMARY.md](FLOATING_PANEL_ECOSYSTEM_SUMMARY.md)** - Implementation overview
   - What was built
   - File structure
   - API reference
   - Best practices
   - Code statistics

## 💻 Component Files (Use These)

### Import Floating Panels

```tsx
import {
  WasteModulePanel,
  IoTModulePanel,
  PurchasingModulePanel,
  FloatingPanelWrapper,
} from "@/components/floating-panels";
```

**Location**: `client/components/floating-panels/`

| File                        | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `FloatingPanelWrapper.tsx`  | Generic floating panel container (reusable wrapper) |
| `WasteModulePanel.tsx`      | Waste Tracking & Cost Optimization integration      |
| `IoTModulePanel.tsx`        | IoT & Real-Time Monitoring integration              |
| `PurchasingModulePanel.tsx` | Purchasing & Inventory integration                  |
| `index.ts`                  | Barrel exports for easy importing                   |

### Import Type Definitions

```tsx
import type {
  PanelConfig,
  PanelInitConfig,
  AnyPanelEvent,
  DataChangeEvent,
  SelectionEvent,
  ErrorEvent,
  PanelCallbacks,
} from "@shared/types/panel";
```

**Location**: `shared/types/panel.ts`

### Import Module Utilities

```tsx
import {
  MODULE_METADATA,
  getModuleMetadata,
  canAccessModule,
  getAvailableModules,
  createModuleEcosystem,
  EventTypes,
  ModuleActions,
} from "@shared/modules";
```

**Location**: `shared/modules/index.ts`

## 🌐 Routes to Test

### Available Routes

- **`/waste`** - Full-page Waste Tracking module
- **`/iot`** - Full-page IoT Dashboard module
- **`/purchasing`** - Full-page Purchasing & Inventory module
- **`/module-ecosystem`** - Example page with all 3 modules integrated

### Example Page

Visit `/module-ecosystem` to see:

- All three modules running together
- Real-time event logging
- Cross-module communication in action
- Event statistics
- Selection tracking

## 🎯 Common Use Cases

### 1. Single Panel in Custom Layout

```tsx
import { WasteModulePanel } from "@/components/floating-panels";

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

👉 See: `FLOATING_PANEL_QUICKSTART.md` → Basic Usage

### 2. Multiple Panels with Event Communication

```tsx
const [events, setEvents] = useState<AnyPanelEvent[]>([]);

const handleModuleEvent = (event: AnyPanelEvent) => {
  setEvents((prev) => [event, ...prev]);
  // React to specific events...
};

return (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <WasteModulePanel emit={handleModuleEvent} {...props} />
    <IoTModulePanel emit={handleModuleEvent} {...props} />
    <PurchasingModulePanel emit={handleModuleEvent} {...props} />
  </div>
);
```

👉 See: `FLOATING_PANEL_QUICKSTART.md` → Multiple Panels with Event Handling

### 3. Register in Builder.io

```tsx
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

👉 See: `BUILDER_IO_INTEGRATION_GUIDE.md` → Deployment section

## 📋 Module Details

### Waste Module

- **Location**: `client/components/floating-panels/WasteModulePanel.tsx`
- **Default Tab**: `logs`
- **Available Tabs**: logs, analysis, prevention, disposal
- **Events**: dataChange, error
- **Documentation**: `BUILDER_IO_INTEGRATION_GUIDE.md` → Module Details → Waste Module

### IoT Module

- **Location**: `client/components/floating-panels/IoTModulePanel.tsx`
- **Default Tab**: `devices`
- **Available Tabs**: devices, sensors, alerts
- **Events**: dataChange, error
- **Documentation**: `BUILDER_IO_INTEGRATION_GUIDE.md` → Module Details → IoT Module

### Purchasing Module

- **Location**: `client/components/floating-panels/PurchasingModulePanel.tsx`
- **Default Tab**: `guide`
- **Available Tabs**: guide, form, receiving, inventory, ledger
- **Events**: dataChange, selection, error
- **Documentation**: `BUILDER_IO_INTEGRATION_GUIDE.md` → Module Details → Purchasing Module

## 🔧 Type Reference

### Panel Configuration

```ts
interface PanelInitConfig {
  panelId: string; // Unique instance ID
  organizationId: string; // Multi-tenant context
  outletId: string; // Location/outlet context
  title?: string; // Custom title
  defaultTab?: string; // Initial tab
  canMinimize?: boolean; // Allow minimizing
  canClose?: boolean; // Allow closing
  className?: string; // CSS classes

  // Event handlers
  onDataChange?: (event) => void;
  onSelection?: (event) => void;
  onError?: (event) => void;
  onClose?: (panelId) => void;
  onMinimize?: (panelId) => void;
  emit?: (event) => void; // Send to other modules
}
```

👉 See: `shared/types/panel.ts` for complete type definitions

### Event Types

```ts
type AnyPanelEvent =
  | DataChangeEvent // data.changeType, data.operation
  | SelectionEvent // selectedIds, itemType
  | ActionRequestEvent // action, params, requestId
  | ErrorEvent; // code, message, severity
```

👉 See: `BUILDER_IO_INTEGRATION_GUIDE.md` → Event System

## 🚀 Getting Started Checklist

- [ ] Read `FLOATING_PANEL_QUICKSTART.md` (5 min)
- [ ] Copy one of the quickstart examples
- [ ] Test locally at `/waste`, `/iot`, or `/purchasing`
- [ ] Visit `/module-ecosystem` to see all modules working together
- [ ] Read `BUILDER_IO_INTEGRATION_GUIDE.md` for full details
- [ ] Register components in Builder.io
- [ ] Deploy to production

## 📊 Statistics

| Item                      | Count |
| ------------------------- | ----- |
| New TypeScript files      | 8     |
| New documentation files   | 4     |
| Total lines of code       | 1,584 |
| Total documentation lines | 1,424 |
| \*\*Total                 | 3,008 |
| Module panels created     | 3     |
| Event types               | 4     |
| Routes added              | 4     |

## 🔗 Related Files (Existing)

### Module Pages (Full Page Views)

- `client/pages/WasteTracking.tsx` - Original waste page
- `client/pages/IoTDashboard.tsx` - Original IoT page
- `client/pages/Purchasing.tsx` - Original purchasing page

### Module Components (Used by Panels)

- `client/components/waste/*` - Waste tracking components
- `client/components/hardware/*` - IoT components
- `src/modules/PurchRec/components/*` - Purchasing components

### Type Definitions

- `shared/types/waste.ts` - Waste types
- `shared/types/iot.ts` - IoT types
- `shared/types/panel.ts` - **NEW** Panel types

### Services/APIs

- `shared/api/waste-*.ts` - Waste APIs
- `shared/api/iot-*.ts` - IoT APIs
- `src/modules/PurchRec/api/` - Purchasing APIs

## 💡 Pro Tips

### 1. Use Responsive Layouts

```tsx
// Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* panels */}
</div>
```

### 2. Listen to Specific Events

```tsx
const handleModuleEvent = (event: AnyPanelEvent) => {
  if (event.type === "dataChange" && event.source === "waste") {
    // Handle waste data change
  }
};
```

### 3. Debug Events

Visit `/module-ecosystem` and interact with modules to see real-time event logging.

### 4. Error Handling

```tsx
<WasteModulePanel
  onError={(event) => {
    const { severity, message } = event.payload;
    if (severity === "critical") {
      // Send alert, notify user
    }
  }}
/>
```

## 🆘 Need Help?

### For Quick Questions

→ Check `FLOATING_PANEL_QUICKSTART.md` (405 lines)

### For Integration Details

→ Read `BUILDER_IO_INTEGRATION_GUIDE.md` (532 lines)

### For Understanding Architecture

→ See `FLOATING_PANEL_ECOSYSTEM_SUMMARY.md` (487 lines)

### For Type Definitions

→ Check `shared/types/panel.ts` (231 lines)

### For Working Example

→ Visit `/module-ecosystem` route

### For Module Details

→ See individual module files or original pages

## 📝 Next Steps

1. **Test Locally**: Visit `/module-ecosystem` to see the ecosystem in action
2. **Integrate**: Choose modules to use in your pages
3. **Deploy**: Follow Builder.io integration guide for production
4. **Monitor**: Check event logs to verify inter-module communication
5. **Extend**: Add custom events or actions as needed

---

**Created**: January 2024
**Status**: Production Ready ✅
**Documentation**: Complete ✅
**Type Safety**: 100% TypeScript ✅
