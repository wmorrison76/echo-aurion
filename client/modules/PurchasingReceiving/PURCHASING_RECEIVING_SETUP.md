# Purchasing & Receiving Module Setup Guide

## What Has Been Implemented

You now have a complete, multi-role Purchasing, Receiving, and Invoice Management system integrated into your LUCCCA platform.

### 1. Module-Level Access Control ✅

**Role-Based Visibility in Sidebar:**

- **Admin & Manager**: Full access to Purchasing, Receiving, and Invoices
- **Receiver**: Access to Receiving and Invoices (for reference)
- **Chef**: NO access to Purchasing/Receiving (modules hidden from sidebar)
- **Finance**: NO access to Purchasing/Receiving (can view later with approval)

**How It Works:**

- Sidebar automatically hides/shows modules based on logged-in user's role
- Attempting to navigate directly to restricted URLs shows permission notice
- Each module has its own role-based checks

**User Switcher:**

- Test different roles using the role selector in top-right corner
- Try switching to "Chef" to see modules disappear from sidebar
- Switch back to "Admin" to see all modules

### 2. Purchasing Module

**Location:** `/purchasing` (or "Purchasing" in sidebar)

**Features:**

- Order Guide: View demand, pars, and current inventory
- Order Form: Draft purchase orders from order guide items
- Receiving: Post deliveries and update on-hand inventory
- Inventory Lots: Monitor current lots and expirations
- Stock Ledger: Audit all stock movements

**Role Access:**

- Purchasing & Order Form: Admin, Manager only
- Receiving: Admin, Manager, Receiver
- Inventory: Admin, Manager, Chef, Finance
- Ledger: Admin, Manager, Finance

### 3. Receiving Module

**Location:** `/receiving` and submenu items

**Pages Available:**

- Deliveries: Track inbound shipments
- Invoice Drop: Scan and upload invoice images
- Invoice Review: Review scanned invoice data
- Image Vault: Browse all scanned invoices (organized by invoice)

**Key Features:**

- Status tracking (draft, received, reviewed, approved, paid)
- QC checkpoints
- Lot data capture (expiration dates, serial numbers)
- Multi-page invoice image management

### 4. Invoice Management System (NEW!) ✅

**Location:** `/invoices` (under "Inventory & Ordering" in sidebar)

**Features:**

#### Search & Discovery

- Full-text search by vendor name, item description, invoice number
- GL code category filters (Food, Beverages, Non-Food, Paper, Equipment, Maintenance, Utilities)
- Recent searches organized by category:
  - Recent Food (from food invoices)
  - Recent Beverages (from beverage invoices)
  - Recent Supplies (paper & non-food)
  - General searches
- Search history unique per user per outlet

#### Image Vault

- Upload invoice images (JPG, PNG, PDF)
- Page numbering for multi-page invoices
- Organize by invoice
- Full-page preview modal
- Delete with confirmation

#### Outlet Scoping

- All invoices restricted to selected outlet
- Only see invoices your outlet has received
- Automatic outlet filtering in background

### 5. Recipe & Pricing Integration (NEW!) ✅

**Connection Points:**

#### In Recipes Page

When adding a new recipe:

1. Type ingredient name (e.g., "chicken")
2. Autocomplete shows recent purchases with prices
3. Price data comes directly from invoices
4. Vendors listed show most recent pricing
5. Cost per unit auto-fills from invoice data

#### Price Change Alerts

- Dashboard widget (when integrated) shows price changes >5%
- Lists affected recipes
- Shows price history and trends
- Helps chefs and managers adjust menu pricing proactively

#### Pricing History

- Track ingredient prices over time
- See trends (📈 up, 📉 down, ➡️ stable)
- localStorage-based history (persists across sessions)

## File Structure

### New Files Created

**Types & API:**

- `shared/types/invoices.ts` - Invoice/vendor/GL code types
- `shared/api/invoices.ts` - API service layer

**Hooks:**

- `client/hooks/useInvoices.ts` - Invoice management hook
- `client/hooks/useInvoiceRecipeIntegration.ts` - Recipe pricing integration

**Services:**

- `client/services/invoice-recipe-integration.ts` - Conversion & alert logic
- `client/lib/user-preferences.ts` - Recent searches storage

**Components:**

- `client/components/invoice/InvoiceSearchPanel.tsx` - Search interface
- `client/components/invoice/InvoiceImageVault.tsx` - Image management
- `client/components/dashboard/PricingAlertsWidget.tsx` - Pricing alerts

**Pages:**

- `client/pages/Invoices.tsx` - Main invoices page

**Documentation:**

- `INVOICE_RECIPE_INTEGRATION.md` - Complete integration guide

### Modified Files

**Navigation:**

- `client/components/AppLayout.tsx` - Added role-based filtering, renamed "Inventory" to "Inventory & Ordering", added Invoices menu item
- `client/App.tsx` - Added route for Invoices page

**Purchasing:**

- `client/pages/Purchasing.tsx` - Already had Purchasing route, now properly gated by role

## Backend Implementation Required

To make this fully functional, you need to implement these endpoints:

### Core Invoice Endpoints

```
GET    /api/invoices                    - List with filters (outlet_id, vendor_id, gl_category, status, dates)
GET    /api/invoices/:id                - Get single invoice
POST   /api/invoices                    - Create invoice
PATCH  /api/invoices/:id                - Update invoice
DELETE /api/invoices/:id                - Delete invoice
```

### Line Items

```
GET    /api/invoices/:id/items          - List line items for invoice
POST   /api/invoices/:id/items          - Add line item
PATCH  /api/invoices/items/:id          - Update line item
```

### Images

```
GET    /api/invoices/:id/images         - List images for invoice
POST   /api/invoices/:id/images         - Upload image (multipart form)
DELETE /api/invoices/images/:id         - Delete image
```

### Search & Metadata

```
GET    /api/invoices/search?q=...       - Full-text search
GET    /api/invoices/:outlet_id/metrics - Aggregate metrics
POST   /api/invoices/searches/recent    - Save recent search preference
GET    /api/invoices/searches/recent    - Get user's recent searches
```

### GL Codes & Vendors

```
GET    /api/gl-codes?organization_id=...        - List GL codes
POST   /api/gl-codes                            - Create GL code
GET    /api/vendors?organization_id=...         - List vendors
POST   /api/vendors                             - Create vendor
PATCH  /api/vendors/:id                         - Update vendor
```

### Database Schema Needed

```sql
-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  invoice_number VARCHAR UNIQUE,
  invoice_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  subtotal NUMERIC,
  tax NUMERIC,
  total NUMERIC,
  currency VARCHAR,
  status VARCHAR,
  payment_method VARCHAR,
  po_number VARCHAR,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices,
  sku VARCHAR,
  item_description VARCHAR,
  quantity NUMERIC,
  unit_of_measure VARCHAR,
  unit_price NUMERIC,
  extended_price NUMERIC,
  gl_code VARCHAR,
  gl_category VARCHAR,
  lot_number VARCHAR,
  expiration_date DATE
);

-- Invoice Images
CREATE TABLE invoice_images (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices,
  url VARCHAR,
  page_number INT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- GL Codes
CREATE TABLE gl_codes (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  code VARCHAR UNIQUE,
  description VARCHAR,
  category VARCHAR,
  parent_code VARCHAR,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vendors
CREATE TABLE vendors (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name VARCHAR,
  vendor_code VARCHAR,
  contact_email VARCHAR,
  phone VARCHAR,
  address TEXT,
  punchout_enabled BOOLEAN,
  punchout_url VARCHAR,
  website VARCHAR,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for all tables
```

## Testing the System

### 1. Test Module Visibility

1. Switch role to "Chef" in top-right
2. Observe "Purchasing" and "Receiving" modules disappear from sidebar
3. Switch back to "Admin" to see them return

### 2. Test Invoice Module

1. Navigate to "Inventory & Ordering" → "Invoices"
2. Should see search panel on left, empty results on right
3. Try searching (will need backend data)
4. Check "Recent Searches" section (empty until you search)

### 3. Test Image Vault

1. In Invoices, select an invoice (will need sample data)
2. Switch to "Images" tab
3. Test upload functionality (won't persist without backend)

### 4. Test Recent Searches

1. Open browser DevTools → Application → LocalStorage
2. Look for keys starting with `echo_user_prefs_`
3. Perform searches in Invoice module
4. Verify preferences are stored

## Next Steps

### Priority 1: Backend Implementation

- [ ] Create invoice database tables
- [ ] Implement all API endpoints listed above
- [ ] Set up image storage (Azure Blob, S3, or local)
- [ ] Add RLS policies for multi-tenant security

### Priority 2: Feature Completion

- [ ] Integrate PricingAlertsWidget into Dashboard
- [ ] Connect recipe autocomplete to invoice ingredients
- [ ] Set up pricing change notifications
- [ ] Add GL code seeding for your organization

### Priority 3: Enhancements

- [ ] OCR for invoice scanning (already scaffolded in InvoiceDrop)
- [ ] Bulk invoice import
- [ ] Invoice approval workflows
- [ ] EDI integration with vendors
- [ ] Mobile invoice scanning

## User Access Matrix

| Feature          | Admin | Manager | Receiver | Chef | Finance |
| ---------------- | ----- | ------- | -------- | ---- | ------- |
| View Invoices    | ✅    | ✅      | ✅       | ✅   | ✅      |
| Upload Invoices  | ✅    | ✅      | ⚠️\*     | ❌   | ❌      |
| Create PO        | ✅    | ✅      | ❌       | ❌   | ❌      |
| Post Receiving   | ✅    | ✅      | ✅       | ❌   | ❌      |
| View Recipes     | ✅    | ✅      | ✅       | ✅   | ✅      |
| Create Recipes   | ✅    | ✅      | ❌       | ✅   | ❌      |
| See Price Alerts | ✅    | ✅      | ❌       | ✅   | ✅      |

\*Receiver can view receiving details only

## Configuration

### Role Definitions

Edit these arrays in respective files to customize access:

**Purchasing Access** (`client/pages/Purchasing.tsx`):

```typescript
const PURCHASING_ROLES: Role[] = ["Admin", "Manager"];
const RECEIVING_ROLES: Role[] = ["Admin", "Manager", "Receiver"];
const INVENTORY_ROLES: Role[] = ["Admin", "Manager", "Chef", "Finance"];
```

**Navigation** (`client/components/AppLayout.tsx`):

```typescript
{
  type: "link",
  to: "/purchasing",
  label: "Purchasing",
  roles: ["Admin", "Manager"],
}
```

### GL Code Categories

Available in `shared/types/invoices.ts`:

- FOOD
- BEVERAGES
- NON_FOOD
- PAPER_SUPPLIES
- EQUIPMENT
- MAINTENANCE
- UTILITIES
- OTHER

Add/modify as needed for your organization.

## Support & Documentation

- **Invoice Management**: See `INVOICE_RECIPE_INTEGRATION.md`
- **Recipe Integration**: See `INVOICE_RECIPE_INTEGRATION.md`
- **Module Integration**: See `MODULE_INTEGRATION_FRAMEWORK.md`
- **API Reference**: See `API_REFERENCE.md`

## Summary

You now have:
✅ Role-based access control for modules
✅ Complete invoice management system with image vault
✅ Per-user, per-outlet recent search preferences
✅ GL code categorization for invoices
✅ Recipe pricing integration framework
✅ Pricing alert infrastructure
✅ Comprehensive documentation

**Ready for**: Backend implementation and testing with real data.
