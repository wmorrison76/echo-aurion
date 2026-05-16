# Invoice & Recipe Integration Guide

This guide explains how the Invoice Management and Recipe Costing systems work together to provide real-time pricing updates and recipe cost optimization.

## Overview

The Invoice Management system now integrates seamlessly with the Recipe Costing system to:

1. **Track ingredient prices** from vendor invoices
2. **Update recipe costs** automatically when prices change
3. **Alert chefs and managers** when prices change significantly
4. **Autocomplete ingredients** based on recent purchase history
5. **Analyze cost trends** for better menu planning

## Architecture

### 1. Invoice Management (New)

**Location**: `/invoices` page in sidebar under "Inventory & Ordering"

**Features**:

- Searchable invoice database organized by GL code category
- Outlet-scoped data (each outlet sees only their invoices)
- Per-user recent searches stored in localStorage
- Image vault for storing scanned invoice images
- Searchable by:
  - Vendor name
  - Item description
  - GL code category (Food, Beverages, Non-Food, Paper, etc.)
  - Invoice number

**Key Files**:

- `client/pages/Invoices.tsx` - Main page
- `client/components/invoice/InvoiceSearchPanel.tsx` - Search interface
- `client/components/invoice/InvoiceImageVault.tsx` - Image management
- `shared/api/invoices.ts` - API services
- `shared/types/invoices.ts` - Type definitions
- `client/hooks/useInvoices.ts` - Main hook

### 2. Recipe Costing Integration

**Features**:

- Ingredients autocomplete from recent invoices
- Real-time pricing from vendor invoices
- Pricing history and trend analysis
- Smart alerts when prices change

**Key Files**:

- `client/services/invoice-recipe-integration.ts` - Integration service
- `client/hooks/useInvoiceRecipeIntegration.ts` - Integration hook
- `client/components/dashboard/PricingAlertsWidget.tsx` - Dashboard widget

### 3. Pricing Alerts

**Features**:

- Detects price changes > 5%
- Shows affected recipes
- Tracks ingredient price trends
- localStorage-based history

## Usage Workflows

### Workflow 1: Adding an Invoice

1. Go to **Inventory & Ordering → Invoices**
2. Click on search bar and search by vendor, item, or category
3. Or use recent searches grouped by category (Recent Food, Recent Beverages, etc.)
4. Select invoice from results
5. Upload invoice images to the Image Vault for record keeping

```typescript
// Programmatically create an invoice
const invoice = await createInvoice({
  organization_id: orgId,
  outlet_id: outletId,
  vendor_id: vendorId,
  invoice_number: "INV-12345",
  invoice_date: "2024-01-15",
  subtotal: 1500,
  tax: 150,
  total: 1650,
  currency: "USD",
  status: "received",
});
```

### Workflow 2: Creating a Recipe with Invoice Ingredients

1. Go to **Recipes** page
2. Click "Add Recipe"
3. Start typing ingredient name - autocomplete shows recent invoices
4. Select ingredient with vendor and pricing
5. Quantities and costs auto-populate from invoice data
6. As you type, system shows:
   - Most recent pricing
   - Price trend (📈 up, 📉 down, ➡️ stable)
   - Available vendors for that ingredient

```typescript
// In Recipe component, use hook to get ingredients
const { findIngredients, getIngredientHistory } = useInvoiceRecipeIntegration({
  outletId,
  userId,
});

const matches = findIngredients("chicken"); // Returns all chickens from invoices
const history = getIngredientHistory("Chicken Breast", "Fresh Seas"); // Price history
```

### Workflow 3: Monitoring Pricing Changes

1. Dashboard shows **Pricing Alerts** widget (when integrated)
2. Widget displays:
   - Ingredients with significant price changes (>5%)
   - Percentage change and direction
   - Previous vs. current price
   - List of recipes affected

3. Chefs and managers are alerted when prices change materially
4. Can drill into affected recipes to adjust menu pricing

## Data Structures

### Invoice Line Item to Recipe Conversion

Invoices convert their line items to recipe-ready format:

```typescript
// Invoice line item
{
  sku: "CHK-001",
  item_description: "Chicken Breast 10lb",
  quantity: 2,
  unit_of_measure: "case",
  unit_price: 45.99,
  extended_price: 91.98,
  gl_category: "FOOD"
}

// Converts to StandardizedLineItem
{
  vendor: "Fresh Seas Seafood",
  productName: "Chicken Breast 10lb",
  standardized: {
    standardizedName: "Chicken Breast",
    standardUnit: "lb",
    categories: {
      tier1: "Protein",
      tier2: "Poultry",
      tier3: "Chicken"
    }
  },
  quantityPurchaseUnit: {
    quantity: 2,
    unit: "case",
    totalStandardUnits: 20 // 10lb × 2 cases
  },
  totalCost: 91.98,
  costPerStandardUnit: 4.599, // 91.98 / 20
  date: "2024-01-15T10:30:00Z",
  invoiceNumber: "INV-12345"
}
```

### Pricing History Structure

```typescript
{
  "Chicken Breast|Fresh Seas Seafood": [
    { price: 4.50, date: "2024-01-08" },
    { price: 4.49, date: "2024-01-01" },
    { price: 4.60, date: "2023-12-25" }
  ]
}
```

### Price Trend Analysis

```typescript
{
  ingredientName: "Chicken Breast",
  vendor: "Fresh Seas Seafood",
  trend: "up", // "up" | "down" | "stable"
  averagePrice: 4.53,
  lowestPrice: 4.45,
  highestPrice: 4.60,
  entries: [...] // Full history
}
```

## Recent Searches

Per-outlet, per-user recent searches are stored in localStorage:

```typescript
// Organized by category
{
  category: "Recent Food",
  searches: [
    { glCategory: "FOOD", timestamp: "2024-01-15T10:30:00Z" },
    { vendorId: "vendor-123", timestamp: "2024-01-15T09:45:00Z" }
  ]
}
```

Searches are deduplicated and limited to 20 most recent per user/outlet.

## API Endpoints Required

For full functionality, the following backend endpoints are needed:

### Invoice Management

- `GET /api/invoices` - List invoices (with filters)
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices` - Create invoice
- `PATCH /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Invoice Line Items

- `GET /api/invoices/:id/items` - Get line items
- `POST /api/invoices/:id/items` - Add line item
- `PATCH /api/invoices/items/:id` - Update line item

### Invoice Images

- `GET /api/invoices/:id/images` - List images
- `POST /api/invoices/:id/images` - Upload image
- `DELETE /api/invoices/images/:id` - Delete image

### Search & Metadata

- `GET /api/invoices/search` - Full-text search
- `GET /api/invoices/:id/metrics` - Invoice metrics
- `POST /api/invoices/searches/recent` - Save recent search
- `GET /api/invoices/searches/recent` - Get recent searches

### GL Codes & Vendors

- `GET /api/gl-codes` - List GL codes
- `POST /api/gl-codes` - Create GL code
- `GET /api/vendors` - List vendors
- `POST /api/vendors` - Create vendor

## Integration Checklist

- [ ] Deploy invoice management backend endpoints
- [ ] Implement GL code API endpoints
- [ ] Implement vendor CRUD endpoints
- [ ] Set up image upload storage
- [ ] Connect image URLs to Azure Blob/S3
- [ ] Add pricing alert checks on invoice creation
- [ ] Integrate PricingAlertsWidget into Dashboard
- [ ] Test ingredient autocomplete flow
- [ ] Add recipe cost update on price change
- [ ] Set up notification system for pricing alerts

## Role-Based Access

### Purchasing Module Access

- **Admin**: Full access
- **Manager**: Full access
- **Receiver**: Can view receiving/inventory only
- **Chef**: No access (hidden from sidebar)
- **Finance**: No access

### Invoice Module Access

- **Admin**: Full access
- **Manager**: Full access
- **Chef**: Can view invoices for ingredient sourcing
- **Receiver**: Can view (for reference)
- **Finance**: Can view for cost analysis

## Best Practices

1. **Regular Price Monitoring**: Check dashboard alerts daily/weekly
2. **Vendor Consolidation**: Use invoice data to identify top vendors
3. **Seasonal Planning**: Track price trends for seasonal ingredients
4. **Menu Optimization**: Adjust recipes when ingredient costs change significantly
5. **Budget Control**: Set alerts for cumulative category spending

## Troubleshooting

### Images Not Uploading

- Check file size (max 10MB)
- Verify MIME type (JPG, PNG, PDF)
- Ensure storage bucket is configured

### Pricing Alerts Not Showing

- Verify invoices have GL codes assigned
- Check that >5% change threshold is met
- Clear browser cache (alerts are cached)

### Autocomplete Not Working

- Ensure recent invoices exist for outlet
- Check localStorage is not full
- Verify ingredient names match

## Future Enhancements

1. **ML-Powered Forecasting**: Predict ingredient prices based on trends
2. **Supplier Consolidation**: Recommend vendors based on pricing
3. **Menu Engineering**: Auto-suggest price changes based on ingredient costs
4. **Mobile App**: Scan and upload invoices from phone
5. **Real-Time Updates**: WebSocket integration for instant alerts
6. **EDI Integration**: Auto-import invoices from vendor systems
