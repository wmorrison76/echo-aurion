# Invoice Management Quick Start

## 5-Minute Overview

### The Problem You Had
- Could only see 1 invoice at a time
- Processing 1000 invoices = 1000 × (scroll + approve) cycles 😩
- Categories and GL codes weren't connected
- Low-confidence items weren't highlighted

### The Solution
- **Approval Queue** - See all invoices in a scrollable list
- **Categories & GL Codes** - Auto-assigned per line item
- **Low-Confidence Overlay** - Highlights items < 95% confidence
- **Bulk Approval** - One-click approve all high-confidence items
- **Compact Scanner** - Fast upload with minimal scrolling

## How It Works (The Turtle Way 🐢)

### Phase 1: Upload (Fast)
```
1. Click "Scan" tab
2. Drag 10 invoices
3. OCR extracts: vendor, items, prices
4. AI assigns: category, GL code
5. Confidence calculated
6. Added to Queue
↓ Time: ~2-5 seconds per invoice
```

### Phase 2: Review (Medium)
```
1. Click "Queue" tab
2. See list of all invoices
3. Click invoice with low confidence
4. Fix disputed items (quantity, product, price)
5. Verify category matches GL code
6. Click "Approve"
↓ Time: ~2 minutes per low-confidence invoice
```

### Phase 3: Bulk Approve (Fast!)
```
1. System reaches 99.9% confidence
2. Green button appears: "Bulk Approve 700 Items"
3. Click once
4. 700 invoices approved instantly ⚡
↓ Time: 1 second
```

## What Gets Auto-Assigned

### 1. Category (Per Line Item)
```
"Tomatoes" → FOOD
"Diesel" → FUEL
"Printer ink" → PAPER_SUPPLIES
"Fryer" → EQUIPMENT
```

**Used for:** Recipe costing, inventory levels, depletions

### 2. GL Code (Per Line Item)
```
FOOD → GL 4100 (COGS - Food)
FUEL → GL 5200 (Fuel & Maintenance)
UTILITIES → GL 6300 (Utilities)
```

**Used for:** P&L, balance sheet, account balances

### 3. Confidence Score (Per Item & Invoice)
```
Perfect extraction (qty + unit + product + price)
→ 100% confidence

Missing quantity
→ 65% confidence (needs review)

Blurry image, all fields unclear
→ 40% confidence (manual entry needed)
```

**Used for:** Deciding which items need review

## Processing 1000 Invoices/Day

### Recommended Process

**Hour 1-2: Batch Upload**
```
1. Drop 100 invoices
2. Let OCR run (2-5 min each)
3. Check back every 15 min
4. All 100 in queue
```

**Hour 2-4: Review Low-Confidence**
```
1. Filter queue by "Lowest Confidence"
2. Fix 20-30 invoices with issues
3. ~2 min each = 1-2 hours total
```

**Hour 4-5: Bulk Approve**
```
1. System should be at 99.9%+ confidence
2. Click "Bulk Approve 700 Items"
3. Done! ✓
```

**Total: ~4-5 hours for 1000 invoices**

## The 3 Tabs

### Tab 1: Queue (Default)
```
┌──────────────────────────────────┐
│ 47 pending | 153 approved        │
├──────────────────────────────────┤
│ Search: [_____________]          │
│ Sort: [Lowest Confidence ▼]      │
│                                  │
│ Invoice # │ Vendor   │ $ │ Status│
│ 16-59083  │ Sushi    │2.25K │ ⏳ │
│ 16-59084  │ Sysco    │5.10K │ ⏳ │
│ 16-59085  │ Freshpnt │1.80K │ ✓  │
│                                  │
│ [Bulk Approve 700 Items (≥95%)] │
└──────────────────────────────────┘
```

**Use this for:**
- Viewing all invoices
- Finding specific invoice
- Approving in bulk

### Tab 2: Scan (New)
```
┌──────────────────────────────────┐
│ [Drag files here]                │
│                                  │
│ [📷 Camera] [📁 Choose Files]    │
│                                  │
│ Uploading: 3 of 10  ████░░░░░░   │
└──────────────────────────────────┘
```

**Use this for:**
- Uploading new invoices
- Scanning with camera
- Processing batch files

### Tab 3: Search
```
┌──────────────────────────────────┐
│ Search: [_____________]          │
│ Vendor: [All         ▼]          │
│ GL Code: [All        ▼]          │
│ Date: [Past 30 days  ▼]          │
│                                  │
│ Results: 12 approved invoices    │
└────────���─────────────────────────┘
```

**Use this for:**
- Finding old invoices
- Auditing historical data
- GL code lookup

## Understanding Confidence

### 95%+ (Green Light ✓)
"System is sure. Can auto-approve."
- All fields found: product, qty, unit, price
- Clear text extraction
- Good match to inventory

### 85-94% (Yellow Light ⚠️)
"System guessed pretty well. Review before approving."
- One field unclear (e.g., qty or product)
- Some OCR artifacts
- Needs user confirmation

### <85% (Red Light ✗)
"System unsure. Manual review required."
- Multiple fields missing
- Blurry or damaged scan
- Consider manual entry

## Common Tasks

### Task 1: Bulk Approve High-Confidence Invoices
```
1. Open "Queue" tab
2. Check green button exists
3. Click "Bulk Approve X Items"
4. Confirm dialog
5. All approved! ✓
```

### Task 2: Fix Low-Confidence Item
```
1. Click invoice in queue
2. See "Low-Confidence Items" overlay
3. Click item to expand
4. Edit product/qty/price fields
5. Click "Verify"
6. Confidence recalculates
```

### Task 3: Change Category for Item
```
1. Click invoice in queue
2. Scroll to "Line Item Categories"
3. Hover over item to expand
4. Click different category
5. GL code updates automatically
6. Click "Approve"
```

### Task 4: Search for Old Invoice
```
1. Click "Search" tab
2. Type invoice number or vendor
3. Filter by date/GL code
4. Click result to view details
```

## The Turtle 🐢

### What It Does
```
If invoice pending > 24 hours:
  - Turtle walks across screen
  - Stops at center
  - Looks at you and winks 👁️
  - Keeps walking
  
Message: "Reminder: Invoice approval pending 24+ hours"
```

### Why It Exists
**Compliance requirement:** All invoices must be approved within 4 hours (soft), 24 hours (hard).

If user sees turtle → Invoice is OVERDUE → Approve immediately!

## Troubleshooting

### "I don't see any invoices in queue"
→ Upload some first in "Scan" tab

### "Bulk approve button is grayed out"
→ System confidence < 99.9%. Approve some low-confidence items manually first.

### "Why is this invoice 70% confidence?"
→ Check "Low-Confidence Items" overlay. Multiple fields are missing.

### "Category and GL code don't match"
→ You might have overridden it. Check "Line Item Categories" section.

### "Item was wrong category, how do I fix?"
→ Click invoice, expand item in "Line Item Categories", select new category.

## Tips for Speed

### Tip 1: Process Overnight
```
Upload invoices before bed
OCR runs in background
Review in morning
Bulk approve
Done!
```

### Tip 2: Sort by Lowest Confidence First
```
Approve high-confidence first
Fix low-confidence items
Less context switching
Faster overall
```

### Tip 3: Minimize Scanner When Not Uploading
```
Click "×" button to collapse
More space for approval queue
Easy to expand when needed
```

### Tip 4: Use Search for Edge Cases
```
If vendor name unclear → Search for past invoices
See how it was categorized before
Use same category for consistency
```

## What Happens After Approval

### Finance Team Sees
```
GL 4100: +$2,250 (Sushi invoice food items)
GL 5200: +$150 (Fuel charges)

Updates:
- Trial balance
- P&L report
- Account balances
- Reconciliation
```

### Inventory Team Sees
```
Tomatoes: +40 cases, FOOD category
Oil: +8 gallons, FOOD category
Diesel: +20 gallons, FUEL category

Updates:
- Recipe costing
- Par levels
- Usage trends
- Depletion analysis
```

## Next Steps

1. **Read Full Docs** → `INVOICE_APPROVAL_WORKFLOW.md`
2. **Understand Data Flow** → `INVOICE_DATA_FLOW.md`
3. **Upload Test Invoice** → Try "Scan" tab
4. **Review & Approve** → Try "Queue" tab
5. **Process 1000 Invoices** → Use batch workflow above

## Questions?

- How do categories work? → See "What Gets Auto-Assigned"
- Why is confidence 70%? → Click invoice, see "Low-Confidence Items"
- Can I override GL code? → Click item in "Line Item Categories", change category
- How to fix mistakes? → Review overlay, correct fields, click "Verify"
- Is this stored somewhere? → Yes, in Finance (GL codes) and Inventory (categories)
