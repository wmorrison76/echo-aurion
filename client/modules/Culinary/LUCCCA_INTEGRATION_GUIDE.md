# LUCCCA Enterprise Integration Guide
## EchoRecipePro Module Detachment for Enterprise Suite

**Status**: Ready for LUCCCA Framework Integration  
**Version**: 1.0  
**Last Updated**: Current Session  

---

## Overview

This document describes how to integrate EchoRecipePro modules that have been **detached from the main navigation** into the LUCCCA Enterprise Framework as floating panels or standalone modules.

The following modules have been removed from the main sidebar navigation but **all code, components, and functionality remain intact** for easy reintegration into LUCCCA.

---

## Detached Modules (Ready for Floating Panels)

### 1. **Customers / Guest Management**
**Module**: Customer Service Workspace  
**Tab Reference**: `customer-service`  
**Component Path**: `client/pages/sections/saas/CustomerServiceWorkspace.tsx`  
**Status**: ✅ Fully implemented, removed from sidebar

**Features**:
- Guest feedback tracking
- Dietary preference management
- Allergen alerts
- Preference history
- Complaint handling

**LUCCCA Integration Strategy**:
- Load as floating panel from `/?tab=customer-service`
- Can be opened from recipe interface when viewing guest interactions
- Pairs with Recipe + Server Notes modules
- Suggested panel size: Medium (600px × 800px)

**Environment Variables Needed**: None (uses existing Supabase connection)

---

### 2. **Inventory & Supplies**
**Module**: Inventory Supplies Workspace  
**Tab Reference**: `inventory`  
**Component Path**: `client/pages/sections/saas/InventorySuppliesWorkspace.tsx`  
**Status**: ✅ Fully implemented, removed from sidebar

**Features**:
- Inventory tracking
- Stock levels management
- Reorder points configuration
- Usage tracking
- Waste logging
- Location-based management

**LUCCCA Integration Strategy**:
- Load as floating panel from `/?tab=inventory`
- Can be opened from Recipe Editor (ingredient availability check)
- Can be opened from Production module (stock check during service)
- Integrates with Purchasing/Receiving workflow
- Suggested panel size: Large (800px × 900px)

**Integrations**:
- Links to Suppliers (currently detached)
- Links to Purchasing/Receiving module
- Pulls inventory from Recipe ingredient consumption

**Environment Variables Needed**: None

---

### 3. **Suppliers / Vendor Management**
**Module**: Supplier Management Workspace  
**Tab Reference**: `suppliers`  
**Component Path**: `client/pages/sections/saas/SupplierManagementWorkspace.tsx`  
**Status**: ✅ Fully implemented, removed from sidebar

**Features**:
- Supplier database
- Contact management
- Product catalogs
- Pricing history
- Performance tracking

**LUCCCA Integration Strategy**:
- Load as floating panel from `/?tab=suppliers`
- Accessed from Inventory module (link suppliers to inventory items)
- Accessed from Purchasing/Receiving (supplier order management)
- Can open from Recipe Editor (ingredient sourcing)
- Suggested panel size: Large (900px × 900px)

**Parent-Child Relationships**:
- Child of: Inventory & Supplies
- Child of: Purchasing & Receiving
- Related to: Plate Costing (supplier pricing affects recipe costs)

**Environment Variables Needed**: None

---

### 4. **Nutrition & Allergens** (Special: Now Integrated into Recipe Editor)
**Original Module**: Nutrition/Allergens Workspace  
**Tab Reference**: `nutrition` (still exists as standalone module if needed)  
**Component Path**: `client/pages/sections/saas/NutritionAllergensWorkspace.tsx`  
**New Integration**: Icon popup in Recipe Editor  
**Status**: ✅ Moved to recipe icon popup, original module remains for advanced editing

**Features**:
- Nutrition label generation
- Allergen tracking (8 types)
- Dietary restriction management
- Nutritional analysis by ingredient
- Label compliance documentation

**LUCCCA Integration Strategy**:
- Primary access: **Icon popup in Recipe Editor** (not a separate module)
- Secondary access: Standalone module still available at `/?tab=nutrition`
- Recipe interface shows allergen badge icon
- Click icon to see quick allergen check, full allergen popup, or open full module
- Suggested quick popup size: Small (400px × 500px)
- Suggested full module size: Large (1000px × 900px)

**How to Trigger in LUCCCA**:
```
1. Open recipe editor
2. Click allergen/nutrition icon in toolbar (appears next to other quick actions)
3. Quick popup shows: allergens, nutrition summary, dietary info
4. "Open Full Editor" button opens standalone module if needed
```

**Environment Variables Needed**: None

---

## Implementation Plan for LUCCCA

### Phase 1: Module Loading as Floating Panels
```javascript
// LUCCCA should load modules via URL params:
// panel: { type: "module", id: "customers", title: "Guest Management" }
// panel: { type: "module", id: "inventory", title: "Inventory & Supplies" }
// panel: { type: "module", id: "suppliers", title: "Vendor Management" }

// URL pattern:
// /?tab=customer-service&mode=floating
// /?tab=inventory&mode=floating
// /?tab=suppliers&mode=floating
```

### Phase 2: Context Menu Integration
```javascript
// Right-click in recipe should show:
// - Check Allergens (opens nutrition popup)
// - Check Inventory (opens inventory floating panel)
// - Check Suppliers (opens suppliers floating panel)
// - Check Guest Preferences (opens customers floating panel)
```

### Phase 3: Toolbar Icon Buttons
```javascript
// Recipe toolbar should include buttons for:
// - [Allergen Icon] → Opens nutrition popup
// - [Inventory Icon] → Opens inventory panel
// - [Supplier Icon] → Opens suppliers panel
// - [Guest Icon] → Opens customers panel
```

---

## Database Schema References

All modules use the existing Supabase PostgreSQL database. Key tables:

### Customers
```sql
TABLE: public.guest_preferences
COLUMNS: id, user_id, guest_name, dietary_preferences, allergen_info, created_at
```

### Inventory
```sql
TABLE: public.inventory_items
COLUMNS: id, name, quantity, unit, location, reorder_point, supplier_id, last_updated
```

### Suppliers
```sql
TABLE: public.suppliers
COLUMNS: id, name, contact_email, contact_phone, products, pricing, rating, created_at
```

### Nutrition & Allergens (already embedded in recipes)
```sql
TABLE: public.recipes
COLUMNS: ... nutrition_info (JSON), allergens (JSON array), ...
```

---

## API Endpoints (for LUCCCA to Call)

### Customers API
```
GET    /api/customers              → List all guests
POST   /api/customers              → Create new guest
GET    /api/customers/:id          → Get guest details
PUT    /api/customers/:id          → Update guest preferences
DELETE /api/customers/:id          → Delete guest record
```

### Inventory API
```
GET    /api/inventory              → List all inventory items
POST   /api/inventory              → Add inventory item
GET    /api/inventory/:id          → Get item details
PUT    /api/inventory/:id          → Update stock level
DELETE /api/inventory/:id          → Remove item
GET    /api/inventory/low-stock    → Get items below reorder point
```

### Suppliers API
```
GET    /api/suppliers              → List all suppliers
POST   /api/suppliers              → Add new supplier
GET    /api/suppliers/:id          → Get supplier details
PUT    /api/suppliers/:id          → Update supplier info
DELETE /api/suppliers/:id          → Delete supplier
GET    /api/suppliers/:id/products → Get supplier's product catalog
```

### Nutrition/Allergens API
```
GET    /api/recipes/:id/nutrition  → Get nutrition info
PUT    /api/recipes/:id/nutrition  → Update nutrition data
GET    /api/recipes/:id/allergens  → Get allergen info
PUT    /api/recipes/:id/allergens  → Update allergens
```

---

## Authentication & Access Control

All modules respect:
- **Supabase Auth**: User must be logged in
- **Row-Level Security (RLS)**: Users only see data they have access to
- **Multi-tenant**: Organized users can only see their organization's data
- **Role-Based Access**: Chef/Manager vs Line Staff vs Admin permissions

### LUCCCA Implementation Notes:
- Pass Supabase auth token with all API calls
- Include `authorization` header: `Bearer {supabaseToken}`
- No additional authentication needed beyond parent Supabase session

---

## Component Exports

For easy access in LUCCCA:

```typescript
// Import modules directly:
import CustomerServiceWorkspace from '@/pages/sections/saas/CustomerServiceWorkspace';
import InventorySuppliesWorkspace from '@/pages/sections/saas/InventorySuppliesWorkspace';
import SupplierManagementWorkspace from '@/pages/sections/saas/SupplierManagementWorkspace';
import NutritionAllergensWorkspace from '@/pages/sections/saas/NutritionAllergensWorkspace';

// Or load via URL:
// Navigate to /?tab=customer-service
// Navigate to /?tab=inventory
// Navigate to /?tab=suppliers
// Navigate to /?tab=nutrition
```

---

## State Management

### Modules Use Zustand Stores:
- Recipe state: `rdLabStore` (shared with R&D)
- Inventory state: Local component state + Supabase real-time
- Supplier state: Local component state + Supabase real-time
- Customer state: Local component state + Supabase real-time

### LUCCCA Integration Note:
- Maintain separate Zustand stores per module for isolation
- Use Supabase real-time for cross-module synchronization
- Subscribe to changes in real-time to update floating panels

---

## Keyboard Shortcuts (No Longer in Sidebar)

These shortcuts still work but are documented in Help modal:

```
Ctrl+1 or Cmd+1  → Recipes
Ctrl+2 or Cmd+2  → Add Recipe
Ctrl+D or Cmd+D  → Dish Assembly
Ctrl+M or Cmd+M  → Menu Design Studio
Ctrl+3 or Cmd+3  → Server Notes
Ctrl+O or Cmd+O  → Operations Docs
Ctrl+4 or Cmd+4  → Production
Ctrl+0 or Cmd+0  → Purchasing/Receiving
Ctrl+7 or Cmd+7  → Nutrition/Allergens
Ctrl+8 or Cmd+8  → HACCP Compliance
Ctrl+9 or Cmd+9  → Gallery
Ctrl+Shift+N     → Toggle navigation collapse
```

---

## Migration Checklist for LUCCCA

- [ ] Create floating panel container for each module
- [ ] Implement panel opening/closing animation
- [ ] Pass Supabase auth token to modules
- [ ] Wire allergen icon in recipe editor to nutrition popup
- [ ] Create context menu in recipe for quick access
- [ ] Add toolbar buttons with icons for each module
- [ ] Test real-time sync between modules
- [ ] Implement drag-resizable panels (optional)
- [ ] Add pin/unpin panel functionality (optional)
- [ ] Create module grouping (Inventory + Suppliers together, etc.)
- [ ] Update help documentation with new navigation flow
- [ ] Test on mobile/responsive modes

---

## Support & Questions

For questions about integration:
- Check component source files for implementation details
- Review existing RDLab module integration (similar floating panel pattern)
- Reference Supabase documentation for real-time subscriptions
- Check API routes in `server/routes/*.ts` for endpoint details

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Current | Initial detachment of Customers, Inventory, Suppliers |
| | | Nutrition/Allergens moved to recipe popup |
| | | Ready for LUCCCA floating panel integration |

---

**Next Steps**: Follow the Phase 1-3 implementation plan to integrate these modules into LUCCCA as floating panels with appropriate toolbar buttons and context menu access.
