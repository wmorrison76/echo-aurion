# Module Loading Configuration for Purchasing_Receiving in LUCCCA Framework

## Current Status (Outdated)

The LUCCCA Framework main branch is currently loading **separate, outdated modules**:

- **`client/pages/Purchasing.tsx`** - Mock data implementation with basic tabs
- **`client/pages/Receiving.tsx`** - Mock data implementation with basic tabs

These pages are:

- ❌ Using mock data only
- ❌ Not integrated with real services
- ❌ Lacking modern state management
- ❌ Missing role-based access control
- ❌ Using basic tab navigation without professional workflow integration

---

## Unified Module (Current Implementation)

The **new unified module** that should be loaded is:

### Entry Point

```
src/modules/PurchRec/index.tsx
```

### Export

```typescript
export default function PurchasingReceivingModule();
```

### Module Characteristics

✅ **Unified Purchasing → Inventory workflow** (not separate pages)
✅ **Real integration** with:

- `src/modules/PurchRec/components/*` (10+ specialized components)
- `src/modules/PurchRec/hooks/*` (6 custom hooks including useEventLinking)
- `src/modules/PurchRec/services/*` (7+ service layers)
- `src/modules/PurchRec/state/purchRec.store.ts` (Zustand store)
- `src/modules/PurchRec/data/*` (schemas, fixtures, categorization)

✅ **Role-Based Access Control** for:

- Admin, Manager (Purchasing)
- Admin, Manager, Receiver (Receiving)
- Admin, Manager, Chef, Finance (Inventory)
- Admin, Manager, Finance (Ledger)

✅ **Integrated Tabs**:

1. **Order Guide** - Pull menu demand, pars, and vendor pricing
2. **Receiving** - Post deliveries, capture lot data, update on-hand
3. **Inventory Lots** - Monitor expirations, vendor sourcing trends
4. **Stock Ledger** - Audit inbound, outbound, adjustment history

✅ **Modern Features**:

- Lazy-loaded sub-components for performance
- Suspense fallbacks with descriptive loading states
- Permission notices with clear role requirements
- Event Cost Bridge integration (EchoEvents ↔ EchoAurum)
- Order form drawer for draft PO creation

---

## How to Load in LUCCCA Framework

### Step 1: Import the Module

In the page/route where you want to load Purchasing_Receiving:

```typescript
import PurchasingReceivingModule from "@src/modules/PurchRec";
```

### Step 2: Use in Route (Example)

Replace the old separate routes in `client/App.tsx`:

**OLD (Remove these):**

```typescript
const Purchasing = lazy(() => import("./pages/Purchasing"));
const Receiving = lazy(() => import("./pages/Receiving"));
```

**NEW (Add this):**

```typescript
const PurchasingReceiving = lazy(() =>
  import("@src/modules/PurchRec").then((mod) => ({
    default: mod.default,
  })),
);
```

### Step 3: Route Configuration

```typescript
// Remove old routes:
// <Route path="/purchasing" element={<Purchasing />} />
// <Route path="/receiving" element={<Receiving />} />

// Add unified route:
<Route path="/purchasing-receiving" element={<PurchasingReceiving />} />

// Or use as fallback for both old paths:
<Route path="/purchasing" element={<PurchasingReceiving />} />
<Route path="/receiving" element={<PurchasingReceiving />} />
```

### Step 4: Use as Floating Panel

The module can also be used in floating panel contexts:

```typescript
import PurchasingReceivingModule from "@src/modules/PurchRec";

export function PurchasingModulePanel() {
  return (
    <FloatingPanelWrapper title="Purchasing Operations">
      <PurchasingReceivingModule />
    </FloatingPanelWrapper>
  );
}
```

---

## Module Dependencies

### Context Providers (Required)

The module uses these context providers - ensure they wrap the module:

```typescript
import { AuthProvider } from "@/context/AuthContext";
import { MultiOutletProvider } from "@/context/MultiOutletContext";

// Wrap module with:
<AuthProvider>
  <MultiOutletProvider>
    <PurchasingReceivingModule />
  </MultiOutletProvider>
</AuthProvider>
```

### Internal Dependencies

The module imports from:

- `@/components/ui/*` - UI component library
- `@/context/AuthContext` - User/role data
- `@/context/MultiOutletContext` - Outlet selection
- React hooks (useState, useMemo, lazy, Suspense)
- lucide-react icons

---

## File Structure

```
src/modules/PurchRec/
├── index.tsx                          ← ENTRY POINT (main export)
├── components/
│   ├── OrderGuidePanel.tsx           ← Tab 1 component
│   ├── ReceivingPanel.tsx            ← Tab 2 component
│   ├── InventoryLotsPanel.tsx        ← Tab 3 component
│   ├── StockLedgerPanel.tsx          ← Tab 4 component
│   ├── OrderFormDrawer.tsx           ← Draft PO drawer
│   ├── InventoryLotsPanelLazy.tsx    ← Lazy variant
│   ├── OrderFormDrawerLazy.tsx       ← Lazy variant
│   ├── BarcodeScanner.tsx
│   ├── IngredientCategorizationPanel.tsx
│   ├── DataSourceDebugPanel.tsx
│   └── index.ts                      ← Component exports
├── hooks/
│   ├── index.ts
│   ├── useOrderGuide.ts
│   ├── usePurchaseOrder.ts
│   ├── useReceiving.ts
│   ├── useInventory.ts
│   ├── useEventLinking.ts           ← NEW: Event Cost Bridge
│   └── ... others
├── services/
│   ├── orderGuide.service.ts
│   ├── purchaseOrder.service.ts
│   ├── receiving.service.ts
│   ├── inventory.service.ts
│   ├── recipe-costing.service.ts
│   ├── adapters.ts
│   ├── realAdapters.ts
│   ├── fixtures.ts
│   └── index.ts
├── state/
│   └── purchRec.store.ts             ← Zustand store
├── data/
│   ├── schemas.ts
│   ├── categorization.ts
│   └── fixtures/
├── utils/
│   ├── cost.ts
│   ├── id.ts
│   └── vendors.ts
├── api/
│   └── purchrec.client.ts
└── README.md
```

---

## API Integration

The module connects to these backend routes (all in `server/routes/`):

- `purchasing.ts` - Purchase orders
- `receiving.ts` - Delivery receiving
- `inventory.ts` - Inventory management
- `event-cost-bridge.ts` - Event ↔ Cost integration (NEW)

---

## Role-Based Visibility

### Tab Access By Role

| Tab                | Admin | Manager | Receiver | Chef | Finance |
| ------------------ | ----- | ------- | -------- | ---- | ------- |
| **Order Guide**    | ✅    | ✅      | ❌       | ❌   | ❌      |
| **Receiving**      | ✅    | ✅      | ✅       | ❌   | ❌      |
| **Inventory Lots** | ✅    | ✅      | ❌       | ✅   | ✅      |
| **Stock Ledger**   | ✅    | ✅      | ❌       | ❌   | ✅      |

### Permission Denied States

If a user lacks access to a tab, the module displays:

- 🔒 Icon with lock symbol
- Clear message: "Access required"
- Instructions: "Switch to [role] profile"
- Fallback option to next accessible tab

---

## Loading States

Each tab has **Suspense fallbacks** with contextual loading messages:

- **Order Guide:** "Loading order guide... Pulling menu demand, pars, and vendor pricing"
- **Receiving:** "Loading receiving workspace... Syncing inbound deliveries and QC checkpoints"
- **Inventory Lots:** "Loading inventory lots... Aggregating vendor batches and expirations"
- **Stock Ledger:** "Loading stock ledger... Compiling adjustments and cost movements"
- **Order Form:** "Loading order form... Preparing draft PO"

---

## Migration Checklist for Builder.io

- [ ] **Remove** old `client/pages/Purchasing.tsx` route from App.tsx
- [ ] **Remove** old `client/pages/Receiving.tsx` route from App.tsx
- [ ] **Add** import for `PurchasingReceivingModule` from `src/modules/PurchRec`
- [ ] **Add** unified route(s) for `/purchasing` or `/receiving` pointing to the new module
- [ ] **Test** role-based access (ensure all roles see correct tabs)
- [ ] **Test** loading states (check Suspense fallbacks appear)
- [ ] **Test** cross-outlet functionality (MultiOutletContext)
- [ ] **Update** navigation menu to point to unified module
- [ ] **Update** floating panel registry if using floating panels
- [ ] **Verify** API routes in `server/routes/purchasing.ts`, `server/routes/receiving.ts` are live
- [ ] **Verify** Event Cost Bridge is connected if using EchoEvents integration

---

## Quick Integration Example

**Before (outdated):**

```typescript
// App.tsx
const Purchasing = lazy(() => import("./pages/Purchasing"));
const Receiving = lazy(() => import("./pages/Receiving"));

// Routes:
<Route path="/purchasing" element={<Purchasing />} />
<Route path="/receiving" element={<Receiving />} />
```

**After (unified module):**

```typescript
// App.tsx
const PurchasingReceiving = lazy(() =>
  import("@src/modules/PurchRec").then(mod => ({
    default: mod.default
  }))
);

// Single route:
<Route path="/purchasing" element={<PurchasingReceiving />} />
<Route path="/receiving" element={<PurchasingReceiving />} />
```

---

## Support

- **Module README:** `src/modules/PurchRec/README.md`
- **Event Cost Integration:** `EVENT_COST_BRIDGE_INTEGRATION.md`
- **Implementation Summary:** `EVENT_COST_BRIDGE_IMPLEMENTATION_SUMMARY.md`
- **API Reference:** `API_REFERENCE.md`

---

**Last Updated:** Today
**Module Status:** ✅ Production Ready
**Integration Point:** `src/modules/PurchRec/index.tsx`
