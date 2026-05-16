# Invoice Data Flow: From Upload to Finance & Inventory

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER UPLOADS INVOICE                         │
│                   (PDF or image file)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  OCR Extraction                    │
        │  (extractInvoiceText)              │
        │  - Convert to text                 │
        │  - Extract page structure          │
        └────────┬─────────────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────┐
    │  Parse Invoice Data             │
    │  (parseHeader, heuristicExtract)│
    │  - Extract vendor name          │
    │  - Extract invoice number       │
    │  - Find line items              │
    │  - Parse quantities & prices    │
    └────────┬────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────┐
│  Classify Line Items                         │
│  (classifyItem + mapInvoiceLineToGL)         │
│                                              │
│  For each line item:                        │
│  1. Detect category (FOOD, FUEL, etc.)      │
│  2. Look up product in inventory             │
│  3. Map to GL code                          │
│  4. Calculate confidence score              │
└─────────┬──────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  Create Approval Queue Item                                 │
│  {                                                          │
│    id: "abc123",                                            │
│    invoiceNumber: "16-59083",                               │
│    vendor: "Sushi Maki Catering",                          │
│    total: 2250.00,                                          │
│    status: "pending",                                       │
│    confidenceScore: 87,  ← Average of all items            │
│    lineItemCount: 10,                                       │
│    lineItems: [                                             │
│      {                                                      │
│        productName: "Tuna Roll",                           │
│        quantity: 40,                                        │
│        unit: "case",                                        │
│        category: "FOOD",    ← Auto-assigned                │
│        glCode: "4100",      ← GL code                       │
│        glLabel: "COGS - Food",                             │
│        totalCost: 300.00,                                   │
│        confidence: 95,      ← Item-level confidence        │
│      },                                                     │
│      ...                                                    │
│    ],                                                       │
│  }                                                          │
└─────────┬──────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────��───┐
│  Add to Approval Queue               │
│  (visible in Queue tab)              │
│                                      │
│  Displays:                          │
│  • Invoice #16-59083                │
│  • Sushi Maki Catering              │
│  • $2,250.00                        │
│  • 87% confidence                   │
│  • 10 items                         │
└──────────┬───────────────────────────┘
           │
    ┌──────┴──────────┐
    │ User selects   │
    │ invoice to     │
    │ review         │
    └────────┬───────┘
             │
             ▼
    ┌────────────────────────────────────────────┐
    │  USER REVIEW PHASE                         │
    │                                            │
    │  System shows:                            │
    │  1. Low-confidence items overlay          │
    │  2. Category review (per line item)       │
    │  3. GL code breakdown                     │
    └────────┬───────���───────────────────────────┘
             │
    ┌────────┴─────────────────┬──────────────┐
    │                          │              │
    ▼                          ▼              ▼
Low-Confidence        Category Review     GL Code
Items (< 95%)         Per Line Item       Verification
│                     │                   │
├─ Product missing?   ├─ Food?            ├─ COGS = 4100
├─ Qty unclear?       ├─ Beverage?        ├─ Fuel = 5200
├─ Price not found?   ├─ Equipment?       ├─ Supplies = 6100
│                     ├─ Fuel?            │
│ User corrects →     └─ Other?           └─ Auto-shows
│ Confidence ↑                               GL code
│ Item stays if                              for category
│ still < 95%                                
│
└─────────────────────────────┐
                              │
                              ▼
                ┌───────────────────────────┐
                │  USER APPROVES            │
                │  - Reviews corrections    │
                │  - Confirms categories    │
                │  - Clicks "Approve"      │
                └─────────────┬─────────────┘
                              │
         ┌────────────────────┴───────────────┐
         │  Individual Approval               │
         │  (item confidence >= 95%)          │
         │                                    │
         │  OR                               │
         │                                    │
         │  Bulk Approval                    │
         │  (system confidence >= 99.9%)     │
         │  Approves all items >= 95%       │
         └────────────────────┬───────────────┘
                              │
                              ▼
                  ┌─────────────────────────┐
                  │  POST /api/invoices/    │
                  │         {id}/approve    │
                  │                         │
                  │  Body:                  │
                  │  {                      │
                  │    categories: {        │
                  │      1: "FOOD",         │
                  │      2: "FOOD",         │
                  │    },                   │
                  │    glCodes: {           │
                  │      1: "4100",         │
                  │      2: "4100",         │
                  │    },                   │
                  │    approvedBy: uid,     │
                  │    approvedAt: ts       │
                  │  }                      │
                  └─────────────┬───────────┘
                                │
                    ┌───────────┴──────────────┐
                    │                         │
                    ▼                         ▼
            ┌──────────────────┐    ┌────────────────────┐
            │  FINANCE         │    │  INVENTORY         │
            │  (GL Codes)      │    │  (Categories)      │
            │                  │    │                    │
            │ Each item sends: │    │ Each item sends:   │
            │ • GL Code        │    │ • Product name     │
            │ • Amount         │    │ • Category         │
            │ • Vendor         │    │ • Quantity/Unit    │
            │                  │    │ • Date/Vendor      │
            │ Used for:        │    │                    │
            │ • P&L tracking   │    │ Used for:          │
            │ • GL balances    │    │ • Inventory levels │
            │ • Reconciliation │    │ • Recipe costing   │
            │                  │    │ • Par levels       │
            │ Updates:         │    │ • Depletions       │
            │ Store.saveGL()   │    │                    │
            │                  │    │ Updates:           │
            │ Example:         │    │ Store.saveItem()   │
            │ Acct 4100        │    │                    │
            │ += $2,250.00     │    │ Example:           │
            │                  │    │ Item.category =    │
            │                  │    │ "FOOD"             │
            └──────────────────┘    │ Item.lastReceived  │
                                    │ = timestamp        │
                                    │                    │
                                    │ Item.purchaseUnits │
                                    │ += {               │
                                    │   vendor: Sushi,   │
                                    │   sku: null,       │
                                    │   unit: case,      │
                                    │   price: 7.50,     │
                                    │ }                  │
                                    └────────────────────┘
```

## Data Structures

### ApprovalQueueItem (In Memory)
```typescript
interface ApprovalQueueItem {
  id: string;
  invoiceNumber: string;
  vendor: string;
  total: number;
  status: "pending" | "approved" | "rejected";
  confidenceScore: number;        // 0-100
  lineItemCount: number;
  issues: string[];               // "Vendor not identified", etc.
  createdAt: string;              // ISO timestamp
  lineItems?: StandardizedLineItem[];
  rawItems?: InvoiceLineItemRaw[];
}
```

### LineItem with Category
```typescript
interface LineItemWithCategory {
  // From OCR extraction
  productName: string;
  quantityPurchaseUnit: {
    quantity: number;
    unit: string;
  };
  totalCost: number;
  
  // From classification
  category: string;               // FOOD, FUEL, etc.
  categoryConfidence?: number;    // 0-100
  
  // From GL mapping
  glCode: string;                 // "4100"
  glLabel: string;                // "COGS - Food"
  glConfidence: number;           // 0-1
  
  // From raw extraction
  confidence: number;             // 0-100
  flags: string[];                // ["quantity_missing"]
}
```

### After Approval (Sent to Backend)

**To Finance:**
```typescript
POST /api/invoices/{id}/approve
{
  glCodes: {
    1: "4100",  // Line 1 → GL 4100
    2: "4100",  // Line 2 → GL 4100
    3: "5200",  // Line 3 → GL 5200 (fuel)
  },
  approvedBy: userId,
  approvedAt: timestamp
}

Response updates accounting:
- GL 4100 (COGS - Food) += $2,200.00
- GL 5200 (Fuel) += $50.00
- Creates journal entry
- Updates trial balance
```

**To Inventory:**
```typescript
POST /api/invoices/{id}/inventory-update
{
  categories: {
    1: "FOOD",      // Tomatoes
    2: "FOOD",      // Eel sauce
    3: "FUEL",      // Delivery charge
  },
  items: [
    {
      productName: "Tomatoes",
      quantity: 40,
      unit: "case",
      category: "FOOD",
      vendor: "Sushi Maki",
      date: "2024-01-15",
    },
    ...
  ]
}

Response updates inventory:
- Store.saveItem() with category
- Store.savePurchaseUnit() with vendor/unit
- Updates lastReceiptDate
- Affects: Recipe costing, Par levels
```

## Category → GL Code Mapping

### Standard Mapping
```typescript
const CATEGORY_TO_GL: Record<string, string> = {
  FOOD: "4100",           // COGS - Food
  BEVERAGES: "4110",      // COGS - Beverages
  NON_FOOD: "4200",       // COGS - Non-Food
  PAPER_SUPPLIES: "6100", // Supplies & Small Equipment
  EQUIPMENT: "6200",      // Equipment
  MAINTENANCE: "5100",    // Repairs & Maintenance
  UTILITIES: "6300",      // Utilities
  FUEL: "5200",           // Fuel & Maintenance
  OTHER: "6900",          // Miscellaneous Expense
};
```

### How User Overrides Work

```
User selects item:
  Current: "Tomatoes" → FOOD → GL 4100

User changes to: FUEL
  System looks up: FUEL → GL 5200
  
Shows: "This item will post to GL 5200-Fuel"

User clicks Approve
  Item category saved as FUEL
  Item GL code saved as 5200
  
When posted:
  Item goes to GL 5200 (not 4100)
  Item marked as FUEL in inventory (not FOOD)
```

## Confidence Calculation Detail

### Per Line Item
```typescript
function calculateLineConfidence(item: InvoiceLineItemRaw): number {
  const hasPrice = item.totalCost ? 0.40 : 0;
  const hasQty = item.quantity ? 0.25 : 0;
  const hasUnit = item.unit ? 0.15 : 0;
  const hasProduct = item.productName && item.productName.length > 2 ? 0.20 : 0;
  
  return Math.min(1, hasPrice + hasQty + hasUnit + hasProduct);
}

// Examples:
// "40 7.50 300.00" (qty only from layout)
//   → hasPrice: 0.40, hasQty: 0.25, hasUnit: 0, hasProduct: 0
//   → confidence: 0.65 (65%)

// "40 cases tomatoes $300.00"
//   → hasPrice: 0.40, hasQty: 0.25, hasUnit: 0.15, hasProduct: 0.20
//   → confidence: 1.00 (100%)
```

### Per Invoice
```typescript
function calculateInvoiceConfidence(items: LineItemWithCategory[]): number {
  if (!items.length) return 0;
  const sum = items.reduce((s, i) => s + i.confidence, 0);
  return sum / items.length;
}

// Example: 10 items
// 9 items at 95%, 1 item at 50%
// Average: (9 * 0.95 + 1 * 0.50) / 10 = 0.905 (90.5%)
```

### System Confidence
```typescript
function calculateSystemConfidence(invoices: ApprovalQueueItem[]): number {
  const pending = invoices.filter(i => i.status === "pending");
  if (!pending.length) return 100;
  const sum = pending.reduce((s, i) => s + i.confidenceScore, 0);
  return sum / pending.length;
}

// When ≥ 99.9%, bulk approval button appears
```

## Example: Mixed Invoice Flow

### Invoice: Restaurant Supply Co
- 3 tomato cases
- 2 gallons oil
- Delivery charge $50
- Diesel fuel 20 gal

### Step 1: OCR Extraction
```
Item 1: "40 cases tomatoes" → confidence: 95%
Item 2: "8 gallons oil" → confidence: 92%
Item 3: "Delivery charge" → confidence: 70% (unclear what for)
Item 4: "20 gal diesel" → confidence: 98%

Invoice confidence: (95+92+70+98)/4 = 88.75%
```

### Step 2: Auto-Classification
```
Item 1: tomatoes → FOOD → GL 4100 ✓
Item 2: oil → FOOD → GL 4100 ✓
Item 3: delivery → ??? (system guesses FUEL based on vendor)
Item 4: diesel → FUEL → GL 5200 ✓
```

### Step 3: User Review
```
LowConfidenceOverlay shows Item 3:
  - "delivery charge"
  - 70% confidence
  - No clear product name

User decides: This is part of food delivery
  - Changes category: FUEL → FOOD
  - GL code updates: 5200 → 4100

All items now reviewed and ready
```

### Step 4: Approval
```
POST /api/invoices/16-59083/approve
{
  categories: {
    1: "FOOD",      // tomatoes
    2: "FOOD",      // oil
    3: "FOOD",      // delivery (user override)
    4: "FUEL",      // diesel
  },
  glCodes: {
    1: "4100",
    2: "4100",
    3: "4100",      // user override
    4: "5200",
  }
}
```

### Step 5: Finance & Inventory Update
```
Finance receives:
  GL 4100 += $610 (tomatoes + oil + delivery)
  GL 5200 += $48 (diesel only)

Inventory receives:
  Item "Tomatoes": +40 cases, FOOD category
  Item "Oil": +8 gallons, FOOD category
  Item "Diesel": +20 gallons, FUEL category
  All get lastReceiptDate + vendor "Restaurant Supply Co"
```

## Bulk Approval Workflow

### Before Bulk Approval
```
10 invoices pending:
  1. 96% confidence ← Can bulk approve
  2. 94% confidence ← Cannot (< 95%)
  3. 98% confidence ← Can bulk approve
  4. 92% confidence ← Cannot (< 95%)
  5. 97% confidence ← Can bulk approve
  6. 85% confidence ← Cannot (< 95%)
  7. 99% confidence ← Can bulk approve
  8. 93% confidence ← Cannot (< 95%)
  9. 96% confidence ← Can bulk approve
  10. 91% confidence ← Cannot (< 95%)

System confidence: (96+94+98+92+97+85+99+93+96+91) / 10 = 94.1%

Bulk approve button: ✗ DISABLED (need ≥ 99.9%)
```

### User Individually Approves Low-Confidence Items
```
User manually approves items 2, 4, 6, 8, 10
(fixes low-confidence items, recalculates confidence)

Now items 2, 4, 6, 8, 10 have higher confidence
System confidence recalculates: 97.2%

Still < 99.9%, bulk button remains disabled
```

### System Reaches 99.9%
```
After more invoices processed...
99 pending invoices:
  97 with confidence >= 95%
  2 with confidence < 95%

System confidence: 99.92%

Bulk approve button: ✓ ENABLED

User clicks: "Bulk Approve 97 Items (≥95%)"

Result:
  - 97 approved instantly
  - 2 remain pending for manual review
```

## Integration Checklist

- [ ] CategoryReview component shows GL codes for categories
- [ ] ApprovalQueue component handles bulk approval button
- [ ] LowConfidenceOverlay corrects items before approval
- [ ] Confidence scoring calculates per item and per invoice
- [ ] GL codes auto-tagged via gl_autotag.ts
- [ ] Categories auto-assigned via classifyItem()
- [ ] Approval endpoint stores categories AND GL codes
- [ ] Finance system receives GL codes for P&L
- [ ] Inventory system receives categories for recipe costing
- [ ] User can override category AND GL code per item
- [ ] Bulk approval filters by confidence >= 95%
- [ ] System confidence calculated for bulk button
