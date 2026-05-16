# 🏗️ BUILDER.IO INTEGRATION GUIDE

## Purchasing_Receiving Unified Module Setup

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Single Entry Point:** `src/modules/PurchRec/index.tsx`

---

## 🎯 OVERVIEW

This guide explains **exactly how to load and configure** the Purchasing_Receiving module in LUCCCA Framework. There is **ONE** entry point—use only this.

### Key Points

- ✅ **Single Unified Module** - No more old separate pages
- ✅ **All Routes Consolidated** - `/purchasing` and `/receiving` both use same module
- ✅ **Production Ready** - Real services, state management, role-based access
- ✅ **Zero Setup Required** - Just import and use

---

## 📍 SINGLE ENTRY POINT

```typescript
// Location: src/modules/PurchRec/index.tsx
// Export: default (PurchasingReceivingModule)

import PurchasingReceivingModule from "@src/modules/PurchRec";

// Use in routes:
<Route path="/purchasing" element={<PurchasingReceivingModule />} />
<Route path="/receiving" element={<PurchasingReceivingModule />} />
```

---

## 🔧 COMPLETE SETUP INSTRUCTIONS

### Step 1: Verify App.tsx Configuration

**Status:** ✅ Already Done

Your `client/App.tsx` has been updated with:

```typescript
// Line ~71
const PurchasingReceiving = lazy(() =>
  import("@src/modules/PurchRec").then(mod => ({
    default: mod.default
  }))
);

// Line ~227-228
<Route path="/receiving" element={<PurchasingReceiving />} />
<Route path="/purchasing" element={<PurchasingReceiving />} />
```

### Step 2: Required Context Providers

The module requires these context wrappers. **Already in place in App.tsx:**

```typescript
<AuthProvider>                 {/* Line 163 - Provides user/role data */}
  <MultiOutletProvider>        {/* Line 164 - Provides outlet selection */}
    <QueryClientProvider>      {/* Line 166 - React Query for API calls */}
      <TooltipProvider>        {/* Line 167 - UI tooltips */}
        <BrowserRouter>        {/* Line 171 - Routes */}
          <Routes>
            <Route path="/purchasing" element={<PurchasingReceiving />} />
            <Route path="/receiving" element={<PurchasingReceiving />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </MultiOutletProvider>
</AuthProvider>
```

✅ **No changes needed** - All providers are in place.

### Step 3: Navigation Links

Navigation automatically routes to the unified module. **Already configured in AppLayout.tsx:**

```typescript
// Purchasing dropdown (Line 120-135)
<DropdownMenu
  label="Purchasing"
  paths={["/purchasing", "/commissary-ordering", ...]}
  items={[
    { label: "Order Guide", path: "/purchasing" },  // Uses unified module
    // ... other purchasing options
  ]}
/>

// Receiving dropdown (Line 139-147)
<DropdownMenu
  label="Receiving"
  paths={["/receiving", "/on-the-dock", ...]}
  items={[
    { label: "Receiving Schedule", path: "/receiving" },  // Uses unified module
    // ... other receiving options
  ]}
/>
```

✅ **No changes needed** - Navigation is configured.

---

## 📦 MODULE STRUCTURE

```
src/modules/PurchRec/
├── index.tsx                          ← ENTRY POINT (main export)
│   └── Exports: PurchasingReceivingModule component
│
├── components/                        (10+ specialized components)
│   ├── OrderGuidePanel.tsx           ← Tab 1: Demand planning
│   ├── ReceivingPanel.tsx            ← Tab 2: Delivery capture
│   ├── InventoryLotsPanel.tsx        ← Tab 3: Lot management
│   ├── StockLedgerPanel.tsx          ← Tab 4: Audit trail
│   ├── OrderFormDrawer.tsx           ← Draft PO creation
│   ├── BarcodeScanner.tsx
│   ├── IngredientCategorizationPanel.tsx
│   ├── DataSourceDebugPanel.tsx
│   └── [Other components]
│
├── hooks/                             (6 custom hooks)
│   ├── useOrderGuide.ts              ← Tab 1 logic
│   ├── useReceiving.ts               ← Tab 2 logic
│   ├── useInventory.ts               ← Tab 3 logic
│   ├── usePurchaseOrder.ts           ← Order form logic
│   ├── useEventLinking.ts            ← Event cost bridge
│   └── index.ts (exports all)
│
├── services/                          (7+ service layers)
│   ├── orderGuide.service.ts
│   ├── receiving.service.ts
│   ├── inventory.service.ts
│   ├── purchaseOrder.service.ts
│   ├── recipe-costing.service.ts
│   ├── adapters.ts
│   └── index.ts
│
├── state/                             (Zustand store)
│   └── purchRec.store.ts             ← Centralized state management
│
├── data/                              (Schemas & fixtures)
│   ├── schemas.ts
│   ├── categorization.ts
│   └── fixtures/
│
├── utils/                             (Utility functions)
│   ├── cost.ts
│   ├── id.ts
│   └── vendors.ts
│
└── README.md                          ← Detailed module documentation
```

---

## 🔄 DATA FLOW

```
User Request
     ↓
Routes: /purchasing or /receiving
     ↓
PurchasingReceivingModule (index.tsx)
     ↓
Active Tab Renders
     ↓
Component (e.g., OrderGuidePanel)
     ↓
Hook (e.g., useOrderGuide)
     ↓
Service (e.g., orderGuide.service.ts)
     ↓
API Call (purchrec.client.ts)
     ↓
Backend Route (server/routes/purchasing.ts, receiving.ts, etc.)
     ↓
Database
     ↓
Data flows back up → UI renders
```

---

## 📋 FOUR MAIN TABS

### 1️⃣ Order Guide

- **Component:** `OrderGuidePanel.tsx`
- **Hook:** `useOrderGuide.ts`
- **Purpose:** Build purchasing plans from menu demand
- **Features:**
  - Pull par levels per item
  - Show vendor pricing
  - Create draft POs
  - Seasonal adjustments
- **Access:** Admin, Manager only

### 2️⃣ Receiving

- **Component:** `ReceivingPanel.tsx`
- **Hook:** `useReceiving.ts`
- **Purpose:** Post deliveries and capture lot data
- **Features:**
  - Track incoming deliveries
  - Update on-hand balances
  - Capture lot numbers & expiration dates
  - QC checkpoints
- **Access:** Admin, Manager, Receiver

### 3️⃣ Inventory Lots

- **Component:** `InventoryLotsPanel.tsx`
- **Hook:** `useInventory.ts`
- **Purpose:** Monitor current lot positions
- **Features:**
  - View vendor batches
  - Track expirations
  - Monitor sourcing trends
  - Lot details (cost, quantity)
- **Access:** Admin, Manager, Chef, Finance

### 4️⃣ Stock Ledger

- **Component:** `StockLedgerPanel.tsx`
- **Hook:** Ledger queries
- **Purpose:** Audit inbound, outbound, adjustments
- **Features:**
  - Full transaction history
  - Cost allocations
  - Adjustment tracking
  - GL code mapping
- **Access:** Admin, Manager, Finance

---

## 👥 ROLE-BASED ACCESS CONTROL

The module automatically handles role-based visibility:

| Tab            | Admin | Manager | Receiver | Chef | Finance |
| -------------- | :---: | :-----: | :------: | :--: | :-----: |
| Order Guide    |  ✅   |   ✅    |    ❌    |  ❌  |   ❌    |
| Receiving      |  ✅   |   ✅    |    ✅    |  ❌  |   ❌    |
| Inventory Lots |  ✅   |   ✅    |    ❌    |  ✅  |   ✅    |
| Stock Ledger   |  ✅   |   ✅    |    ❌    |  ❌  |   ✅    |

**How it works:**

```typescript
// In PurchasingReceivingModule (index.tsx)
const PURCHASING_ROLES: readonly Role[] = ["Admin", "Manager"];
const RECEIVING_ROLES: readonly Role[] = ["Admin", "Manager", "Receiver"];
const INVENTORY_ROLES: readonly Role[] = ["Admin", "Manager", "Chef", "Finance"];
const LEDGER_ROLES: readonly Role[] = ["Admin", "Manager", "Finance"];

// Role check
const canUseOrderGuide = !role || PURCHASING_ROLES.includes(role as any);

// If restricted, shows lock icon with permission notice
{!detailAccess[panel.key] && (
  <PermissionNotice
    title="Access required"
    description="Switch to appropriate role to view this tab"
  />
)}
```

---

## ⚙️ CONFIGURATION CHECKLIST

### Required Environment Variables

None needed for basic functionality. All defaults work.

### Required Plugins/Extensions

✅ React (v18+)  
✅ React Router (v6+)  
✅ TailwindCSS  
✅ lucide-react (icons)

### Required API Routes

Must be running in `server/routes/`:

```
✅ server/routes/purchasing.ts
✅ server/routes/receiving.ts
✅ server/routes/inventory.ts
✅ server/routes/event-cost-bridge.ts
```

### Required Context Providers

✅ AuthProvider (for role & user data)  
✅ MultiOutletProvider (for outlet selection)  
✅ QueryClientProvider (for API calls)

**Status:** ✅ All in place in App.tsx

---

## 🚀 LOADING STATES

Each tab shows **descriptive loading states** via Suspense:

```typescript
<Suspense fallback={
  <PanelLoader
    message="Loading order guide"
    note="Pulling menu demand, pars, and vendor pricing"
  />
}>
  <OrderGuidePanel ... />
</Suspense>
```

### Messages by Tab

- **Order Guide:** "Pulling menu demand, pars, and vendor pricing"
- **Receiving:** "Syncing inbound deliveries and QC checkpoints"
- **Inventory Lots:** "Aggregating vendor batches and expirations"
- **Stock Ledger:** "Compiling adjustments and cost movements"
- **Order Form:** "Preparing draft PO"

---

## 🔗 API INTEGRATION

The module connects to backend routes:

### Purchase Orders

```
GET /api/purchasing/orders
POST /api/purchasing/orders
PUT /api/purchasing/orders/:id
```

### Receiving

```
GET /api/receiving/deliveries
POST /api/receiving/deliveries/:id/receive
GET /api/receiving/deliveries/:id/items
```

### Inventory

```
GET /api/inventory/lots
GET /api/inventory/lots/:id
POST /api/inventory/lots
```

### Event Cost Bridge (NEW)

```
POST /api/event-cost-bridge/link
GET /api/event-cost-bridge/sync
```

**Connection:** `src/modules/PurchRec/api/purchrec.client.ts`

---

## 💾 STATE MANAGEMENT

Central state store using Zustand:

**Location:** `src/modules/PurchRec/state/purchRec.store.ts`

```typescript
import { create } from "zustand";

const usePurchRecStore = create((set) => ({
  orders: [],
  deliveries: [],
  inventoryLots: [],

  // Order management
  addOrder: (order) =>
    set((state) => ({
      orders: [...state.orders, order],
    })),

  // Receiving management
  postDelivery: (delivery) =>
    set((state) => ({
      deliveries: [...state.deliveries, delivery],
    })),

  // Inventory management
  updateLot: (id, updates) =>
    set((state) => ({
      inventoryLots: state.inventoryLots.map((lot) =>
        lot.id === id ? { ...lot, ...updates } : lot,
      ),
    })),
}));
```

**Why Zustand?**

- Lightweight alternative to Redux
- No boilerplate
- Easy to test
- Works well with React hooks
- Integrates with React Query

---

## 🧪 TESTING THE INTEGRATION

### Test 1: Routes Work

```bash
# Navigate to both routes in your browser
http://localhost:3000/purchasing
http://localhost:3000/receiving
# Both should load the same unified module
```

### Test 2: Tab Switching

1. Go to `/purchasing`
2. Click "Order Guide" tab → OrderGuidePanel loads
3. Click "Receiving" tab → ReceivingPanel loads
4. Click "Inventory Lots" tab → InventoryLotsPanel loads
5. Click "Stock Ledger" tab → StockLedgerPanel loads

### Test 3: Role-Based Access

1. Login as **Admin** → All 4 tabs visible
2. Logout, login as **Receiver** → Only "Receiving" visible
3. Logout, login as **Chef** → "Inventory Lots" visible (others locked)

### Test 4: Loading States

1. Open Network tab (DevTools)
2. Throttle to "Slow 3G"
3. Navigate to `/purchasing`
4. Observe Suspense loading messages appearing

### Test 5: API Integration

1. Open Console (DevTools)
2. Navigate to each tab
3. Check Network tab for API calls:
   - OrderGuidePanel → `/api/purchasing/...`
   - ReceivingPanel → `/api/receiving/...`
   - InventoryLotsPanel → `/api/inventory/...`

---

## 🐛 TROUBLESHOOTING

### Problem: Module doesn't load

**Solution:** Check that `src/modules/PurchRec/index.tsx` exists and exports default

### Problem: Tabs don't appear

**Solution:** Check AuthContext - ensure user role is set

### Problem: Data doesn't load

**Solution:** Verify API routes are running in backend. Check Network tab in DevTools.

### Problem: Styles look wrong

**Solution:** Ensure TailwindCSS is configured. Check `tailwind.config.ts`

### Problem: TypeScript errors

**Solution:** Run `npm run type-check`. Rebuild project.

### Problem: Old pages still loading

**Solution:** Clear browser cache. Hard refresh (Ctrl+Shift+R)

---

## 📚 ADDITIONAL RESOURCES

| Resource              | Path                                     |
| --------------------- | ---------------------------------------- |
| Module README         | `src/modules/PurchRec/README.md`         |
| Event Cost Bridge     | `EVENT_COST_BRIDGE_INTEGRATION.md`       |
| API Reference         | `API_REFERENCE.md`                       |
| Module Loading Config | `MODULE_LOADING_CONFIGURATION.md`        |
| Upgrade Guide         | `PURCHASING_RECEIVING_MODULE_UPGRADE.md` |

---

## ✅ COMPLETION CHECKLIST

- [x] Single entry point configured (`src/modules/PurchRec/index.tsx`)
- [x] App.tsx updated with correct import
- [x] Routes pointing to unified module (`/purchasing`, `/receiving`)
- [x] All context providers in place
- [x] Navigation configured
- [x] Role-based access working
- [x] API routes available
- [x] State management in place
- [x] Loading states configured
- [x] Documentation complete

---

## 🎓 QUICK REFERENCE

### Import Pattern

```typescript
import PurchasingReceivingModule from "@src/modules/PurchRec";
```

### Usage Pattern

```typescript
<Route path="/purchasing" element={<PurchasingReceivingModule />} />
```

### Component Hierarchy

```
PurchasingReceivingModule
├── Tabs Container
├── Tab 1: OrderGuidePanel
├── Tab 2: ReceivingPanel
├── Tab 3: InventoryLotsPanel
├── Tab 4: StockLedgerPanel
└── Drawer: OrderFormDrawer
```

### Hook Pattern

```typescript
const { orders, loading } = useOrderGuide();
const { deliveries, postDelivery } = useReceiving();
const { lots, updateLot } = useInventory();
```

### Service Pattern

```typescript
const orders = await orderGuideService.getPARLevels();
const delivery = await receivingService.postDelivery(data);
const lots = await inventoryService.getLots();
```

---

## 📞 SUPPORT

**Need help?** Check the documentation files:

1. **Technical Details:** `src/modules/PurchRec/README.md`
2. **Integration:** `EVENT_COST_BRIDGE_INTEGRATION.md`
3. **API Endpoints:** `API_REFERENCE.md`
4. **Configuration:** `MODULE_LOADING_CONFIGURATION.md`
5. **Migration:** `PURCHASING_RECEIVING_MODULE_UPGRADE.md`

---

**Last Updated:** Today  
**Status:** ✅ Ready for Production  
**Entry Points:** 1 (Single unified module)  
**Breaking Changes:** None (backward compatible routes)  
**Performance Impact:** Minimal (lazy-loaded components)

---

_This guide ensures Builder.io can load and configure the Purchasing_Receiving module correctly without confusion or old entry points._
