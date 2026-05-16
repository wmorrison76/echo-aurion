# Inventory Integration System

## Overview

The Inventory Integration System connects your recipe management with physical inventory tracking, enabling:
- Real-time inventory tracking with scanned items
- Ingredient-to-inventory mapping for accurate costing
- Inter-outlet inventory transfers
- Automatic stock alerts
- Purchasing/receiving workflow integration

## Components Built

### 1. Inventory Service (`client/lib/inventory-service.ts`)

Core inventory management functionality:
- **InventoryItem Management**
  - Add/update inventory items with SKU, quantity, cost
  - Outlet-specific inventory tracking
  - Stock level alerts (low stock, no stock, expired)

- **Scanned Items**
  - Record items as they're received
  - Automatic quantity updates
  - Batch/lot number tracking
  - Expiry date management

- **Transactions**
  - Track all inventory movements
  - Types: scan, adjustment, use, transfer, damage, return
  - Full audit trail with timestamps

- **Stock Alerts**
  - Automatic alerts on low/no stock
  - Expiry tracking
  - Acknowledgment workflow

#### Key Functions:
```typescript
// Add inventory
upsertInventoryItem(outletId, item)

// Record received items
recordScannedItem(outletId, sku, quantity, scannedBy, metadata)

// Adjust stock
adjustInventory(outletId, itemId, quantityChange, reason, adjustedBy)

// Get transactions
getInventoryTransactions(outletId, itemId, limit)

// Manage alerts
getStockAlerts(outletId)
acknowledgeAlert(alertId, acknowledgedBy)
```

### 2. Ingredient-Inventory Mapping (`client/lib/ingredient-inventory-mapping.ts`)

Links recipe ingredients to physical inventory items:

- **Ingredient Mapping**
  - Map recipe ingredients to inventory SKUs
  - Conversion factors (e.g., 1000g inventory = 1kg ingredient)
  - Unit conversion handling

- **Recipe Costing**
  - Calculate ingredient costs
  - Determine cost per serving
  - Track total recipe cost

- **Availability Checking**
  - Check if ingredients are in stock
  - Calculate shortfalls
  - Flag low inventory items

- **Inventory Allocation**
  - Reserve inventory for recipe preparation
  - Track remaining allocations
  - Prevent overselling

#### Key Functions:
```typescript
// Map ingredient to inventory
mapIngredientToInventory(recipeId, ingredientId, inventoryItemId, conversionFactor, units)

// Check availability
checkIngredientAvailability(recipeId, outletId, servings, baseServings)

// Calculate costs
getRecipeIngredientCost(recipeId, servings, baseServings)

// Allocate inventory
allocateInventoryForRecipe(recipeId, outletId, servings, baseServings, allocatedBy)
```

### 3. Inter-Outlet Transfers (`client/lib/inter-outlet-transfers.ts`)

Manage inventory transfers between outlets:

- **Transfer Workflow**
  - Draft → Requested → Approved → In Transit → Received
  - Approval workflow with tracking
  - Comment system for communication

- **Transfer Types**
  - Outgoing: From this outlet to another
  - Incoming: From another outlet to this
  - Full tracking and audit trail

- **Transfer Management**
  - Create transfer requests
  - Approve/reject with reasons
  - Mark in transit with tracking
  - Receive and reconcile

- **Permissions**
  - Only accessible to users with EDIT_INVENTORY permission
  - Outlet-specific access control
  - Full audit logging

#### Transfer Lifecycle:
```
DRAFT (Create)
  ↓
REQUESTED (Submit for approval)
  ↓
APPROVED (Approved, inventory deducted from source)
  ↓
IN_TRANSIT (Shipped with tracking)
  ↓
RECEIVED (Received and added to destination)

Alternative paths:
REQUESTED → REJECTED (with reason)
Any status → CANCELLED
```

#### Key Functions:
```typescript
// Create and manage transfers
createTransferRequest(fromOutlet, toOutlet, item, qty, reason, requester, context)
submitTransferForApproval(transferId, submittedBy)
approveTransfer(transferId, approvedBy, tracking, estimatedDelivery)
rejectTransfer(transferId, rejectedBy, reason)
receiveTransfer(transferId, receivedBy, actualQuantity)

// Get information
getOutletTransfers(outletId, direction, status)
getTransferSummary(outletId)

// Communication
addTransferComment(transferId, authorId, authorUsername, content)
```

## Database Schema

### inventory_items
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  minimum_stock DECIMAL NOT NULL DEFAULT 0,
  maximum_stock DECIMAL NOT NULL DEFAULT 1000,
  unit_cost DECIMAL NOT NULL DEFAULT 0,
  supplier TEXT,
  last_stock_check_date TIMESTAMP,
  expiry_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(outlet_id, sku)
);
```

### scanned_items
```sql
CREATE TABLE scanned_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  sku TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  scanned_at TIMESTAMP DEFAULT now(),
  scanned_by UUID NOT NULL,
  expiry_date TIMESTAMP,
  lot_number TEXT,
  batch_id TEXT,
  receipt_id TEXT
);
```

### inventory_transactions
```sql
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  transaction_type TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  reason TEXT,
  reference TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  metadata JSONB
);
```

### stock_alerts
```sql
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  item_name TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  current_level DECIMAL NOT NULL,
  threshold DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP
);
```

### ingredient_inventory_mappings
```sql
CREATE TABLE ingredient_inventory_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL,
  ingredient_id UUID NOT NULL,
  ingredient_name TEXT NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  inventory_item_sku TEXT NOT NULL,
  conversion_factor DECIMAL NOT NULL DEFAULT 1,
  source_unit TEXT NOT NULL,
  target_unit TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(recipe_id, ingredient_id)
);
```

### inter_outlet_transfers
```sql
CREATE TABLE inter_outlet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_outlet_id UUID NOT NULL REFERENCES outlets(id),
  to_outlet_id UUID NOT NULL REFERENCES outlets(id),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  item_name TEXT NOT NULL,
  item_sku TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  reason TEXT,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMP,
  received_by UUID,
  received_at TIMESTAMP,
  rejection_reason TEXT,
  tracking_number TEXT,
  estimated_delivery TIMESTAMP,
  actual_delivery TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

## Usage Examples

### Record Receiving Inventory

```tsx
import { recordScannedItem } from '@/lib/inventory-service';

const handleItemScanned = async (sku, quantity, metadata) => {
  const result = await recordScannedItem(
    outletId,
    sku,
    quantity,
    userId,
    {
      expiryDate: new Date('2024-12-31').getTime(),
      lotNumber: 'LOT-001',
      receiptId: 'RECV-2024-001'
    }
  );

  if (result.success) {
    toast.success('Item received');
  }
};
```

### Map Recipe Ingredient to Inventory

```tsx
import { mapIngredientToInventory } from '@/lib/ingredient-inventory-mapping';

const handleMapIngredient = async () => {
  const result = await mapIngredientToInventory(
    recipeId,
    ingredientId,
    'Flour',
    inventoryItemId,
    'SKU-001',
    1000, // 1000g (inventory) = 1000g (recipe)
    'g',
    'g'
  );
};
```

### Check Recipe Ingredient Availability

```tsx
import { checkIngredientAvailability } from '@/lib/ingredient-inventory-mapping';

const availability = await checkIngredientAvailability(
  recipeId,
  outletId,
  10, // servings requested
  1   // base recipe servings
);

if (availability.available) {
  // All ingredients in stock
} else {
  // Show missing/low items
  console.log(availability.missingIngredients);
  console.log(availability.lowIngredients);
}
```

### Transfer Inventory Between Outlets

```tsx
import { createTransferRequest, approveTransfer } from '@/lib/inter-outlet-transfers';

// Create transfer
const transfer = await createTransferRequest(
  sourceOutletId,
  destOutletId,
  inventoryItemId,
  'Flour',
  'SKU-001',
  50, // quantity
  'kg',
  'Low stock at destination outlet',
  userId,
  context
);

// Later, manager approves
await approveTransfer(
  transfer.data.id,
  managerId,
  'TRK-12345', // tracking number
  Date.now() + 3 * 24 * 60 * 60 * 1000 // 3 day delivery
);

// After shipping
await markTransitInProgress(transfer.data.id, shippingUserId);

// Upon receiving
await receiveTransfer(
  transfer.data.id,
  receivingUserId,
  50 // actual quantity received
);
```

## Integration with RBAC

The inventory system respects the role-based access control:

| Role | Permissions |
|------|------------|
| ADMIN | Full access to all inventory operations |
| CHEF | View inventory, manage recipes, create mapping |
| MANAGER | Edit inventory, approve transfers, view analytics |
| STAFF | View inventory and allocations |
| FOH | View-only access |

Key permission checks:
- `view_inventory`: View inventory items
- `edit_inventory`: Create/modify/receive items
- `manage_suppliers`: Manage supplier information
- `approve_purchasing`: Approve transfers and adjustments

## Next Steps (To Be Implemented)

### 4. Inventory UI Components
- Inventory list with real-time updates
- Scanning interface for receiving
- Transfer request creation/approval UI
- Stock alert dashboard
- Inventory history/audit log

### 5. Purchasing/Receiving Integration
- Connect to Purchase Orders
- Link scanning to receiving
- Supplier integration
- Receipt management
- Return merchandise management

### 6. Inventory Analytics
- Stock level trends
- Cost analysis
- Turnover rates
- Waste tracking
- Supplier performance

## Permissions Required

All inventory operations are protected by RBAC checks:

```tsx
import { usePermissions } from '@/hooks/use-permissions';

function InventoryManager() {
  const permissions = usePermissions(outletId);

  const canViewInventory = permissions.canViewInventory(outletId);
  const canEditInventory = permissions.canEditInventory(outletId);
  const canApprovePurchasing = permissions.canApprovePurchasing(outletId);

  // Render UI based on permissions
}
```

## Security Considerations

1. **Outlet Isolation**: Users can only access inventory for their outlets
2. **Audit Trail**: All changes logged with user and timestamp
3. **Approval Gates**: Critical operations (transfers, approvals) require authorization
4. **Permission Checks**: Backend validates all operations
5. **Stock Verification**: System validates quantities before transfers

## Files Created

- `client/lib/inventory-service.ts` - Inventory tracking and management
- `client/lib/ingredient-inventory-mapping.ts` - Recipe ingredient mapping
- `client/lib/inter-outlet-transfers.ts` - Inter-outlet transfer system
- `INVENTORY_INTEGRATION_SUMMARY.md` - This documentation

## Performance Considerations

- Inventory lookups indexed by SKU for fast searching
- Transaction history limited by default (pagination)
- Stock alert queries filtered by acknowledged status
- Transfer queries indexed by outlet and status

## Future Enhancements

- Real-time inventory syncing with POS systems
- Barcode/QR code scanning
- Predictive analytics for reordering
- Automated low-stock ordering
- Integration with supplier portals
- Batch operations for bulk transfers
