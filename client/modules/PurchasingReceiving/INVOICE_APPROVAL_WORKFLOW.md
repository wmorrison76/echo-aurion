# Invoice Approval Workflow - Bulk Processing for 1000+ Invoices/Day

## Overview

The redesigned invoice management system supports high-volume processing with intelligent categorization, confidence-based filtering, and bulk approval workflows. Optimized for processing 1000+ invoices per day with minimal manual intervention.

## Architecture

### 1. **Approval Queue System**

The approval queue is the central hub for invoice management:

- **Location:** Top of Invoices page, always visible
- **Capacity:** Scrollable list for unlimited invoices
- **Display:** One line per invoice with key info
  - Invoice number (cyan)
  - Vendor name
  - Total amount
  - Status badge (Pending/Approved/Rejected)
  - Confidence score
  - Line item count
  - Issues flagged

### 2. **Three-Tab Interface**

```
┌─────────────────────────────────────┐
│ Queue    │ Scan    │ Search         │
└─────────────────────────────────────┘
```

**Tab 1: Queue (Default)**
- Shows all invoices pending approval
- Search by vendor or invoice #
- Sort: Newest, Vendor A-Z, Z-A, Lowest Confidence
- Bulk approval button (when system confidence ≥ 99.9%)
- Click invoice to view details

**Tab 2: Scan (Compact)**
- Drag & drop uploader
- Camera scanner
- Minimal padding, quick upload
- Auto-adds to queue after extraction
- Progress indicator

**Tab 3: Search**
- Historical invoice search
- Filter by date, vendor, GL code
- View previously approved invoices

## Workflow: From Upload to Approval

### Step 1: Scan Invoice
```
User: Drag 3 PDFs onto "Scan" tab
↓
System: Processes all 3 files
↓
OCR extracts: Vendor, Invoice #, Line items
↓
Each line item assigned: Category, GL Code
↓
Confidence calculated per item
↓
Items < 95% flagged for review
↓
All invoices added to Queue tab
```

### Step 2: Review Queue
```
User: Switches to "Queue" tab
↓
System: Shows all 3 invoices in list
↓
User: Clicks invoice to view details
↓
System: Shows:
  - Invoice header (vendor, #, total)
  - Low-confidence items (if any)
  - Line item categories
  - GL code breakdown
```

### Step 3: Fix Low-Confidence Items
```
If any item < 95% confidence:
↓
System: Shows overlay with:
  - Which field was uncertain (qty? product? price?)
  - Current extracted value
  - Input fields to correct
↓
User: Reviews & corrects disputed items
↓
User: Clicks "Verify"
↓
System: Updates item & recalculates confidence
```

### Step 4: Verify Categories
```
For each line item:
↓
System: Shows category selected by AI
↓
User: Can click to change category (hover or expand)
↓
System: Auto-shows GL code for that category
↓
User: Reviews GL code is correct
↓
User: Clicks "Approve" or "Confirm All Categories"
```

### Step 5: Bulk Approval (Optional)
```
If system confidence ≥ 99.9%:
↓
Green button appears: "Bulk Approve X Items (≥95%)"
↓
User: Clicks button
↓
System: Approves all items with confidence ≥ 95%
↓
Items < 95% remain pending for manual review
↓
Approved items marked with checkmark
↓
Compliance: Slow Turtle animation triggers after 24 hours
```

## Confidence Scoring

### How Confidence is Calculated

**Per Line Item:**
- Price found: +40%
- Quantity found: +25%
- Unit found: +15%
- Product name found (>2 chars): +20%

Example:
- "40 7.50 300.00" (price only) = 40% confidence
- "40 cases $300.00" (qty + unit + price) = 80% confidence
- "40 cases tomatoes $300.00" (all fields) = 100% confidence

**Per Invoice:**
- Average of all line item confidences
- If any item < 95%, invoice flagged for review

**System Confidence:**
- Average of all pending invoices
- ≥ 99.9% = Bulk approval enabled

### Low-Confidence Thresholds

| Confidence | Action |
|-----------|--------|
| ≥ 95% | Ready for auto-approval |
| 85-94% | Needs manual review |
| 70-84% | Review recommended |
| < 70% | Likely needs manual entry |

## Categories & GL Codes

### Category System

Categories are assigned **per line item** and serve two purposes:

1. **Inventory Tracking** - What category is this item in storage?
   - Used for: Recipe costing, inventory forecasting, depletion analysis
   - Categories: FOOD, BEVERAGES, NON_FOOD, PAPER_SUPPLIES, EQUIPMENT, MAINTENANCE, UTILITIES, FUEL, OTHER

2. **Financial GL Codes** - What GL account for this expense?
   - Used for: GL code assignment, P&L tracking, balance sheet
   - Examples:
     - FOOD → GL 4100 (COGS - Food)
     - FUEL → GL 5200 (Fuel & Maintenance)
     - UTILITIES → GL 6100 (Utilities)

### Example: Mixed Invoice

**Invoice from Restaurant Supply Co:**

| Line Item | Category | GL Code | Notes |
|-----------|----------|---------|-------|
| Tomatoes (40 cases) | FOOD | 4100-COGS Food | Auto-assigned |
| Oil (2 gallons) | FOOD | 4100-COGS Food | Auto-assigned |
| Delivery Charge | FUEL | 5200-Fuel | Could be FOOD or FUEL |
| Diesel (20 gal) | FUEL | 5200-Fuel | Auto-assigned |

**User Decision:** Verify delivery is fuel-related (or change to FOOD if included in food costs)

### How Categories Auto-Assign

1. **Product Name Matching** - "Tomatoes" → FOOD
2. **Vendor Hints** - "Fuel Supply Co" → FUEL
3. **Price/Unit Heuristics** - "20 gal" + vendor = FUEL
4. **GL Rules Engine** - Apply gl_autotag.ts rules

### How User Overrides

During approval, user can:
1. **Per-item override** - Click item, select different category
2. **GL code shown immediately** - "This will go to GL 5200-Fuel"
3. **Category applies to inventory** - Used for recipe costing
4. **GL applies to finance** - Used for P&L

## Bulk Approval Logic

### Requirements

```
CAN bulk approve when:
  ✓ System confidence ≥ 99.9%
  ✓ Invoice count > 1
  
ITEMS bulk approved:
  ✓ Confidence ≥ 95% (high confidence only)
  
ITEMS EXCLUDED from bulk:
  ✗ Confidence < 95% (low confidence)
  ✗ Any disputed category
  ✗ Missing GL code
```

### Process

```
User clicks: "Bulk Approve 47 Items (≥95%)"
↓
System:
  1. Filter invoices with confidence ≥ 95%
  2. Skip items < 95% (stay pending)
  3. Mark selected items as "Approved"
  4. Update GL codes in accounting
  5. Update categories in inventory
  6. Log approval with user/timestamp
↓
Result: 47 approved, 3 pending for manual review
```

### Safety

- **No data loss** - Low confidence items remain for review
- **Audit trail** - All bulk approvals logged
- **Reversible** - Can reject and re-review
- **Learning** - Each correction improves future matches

## UI Components

### ApprovalQueue Component
- Scrollable list of invoices
- Search input (vendor, invoice #)
- Sort dropdown (date, vendor, confidence)
- Status badges (Pending, Approved, Rejected)
- Issues display (quantity missing, etc.)
- Bulk approval button (conditional)
- Click to select and view details

**Props:**
```typescript
<ApprovalQueue
  items={ApprovalQueueItem[]}
  selectedInvoice={ApprovalQueueItem | null}
  onSelectInvoice={(item) => void}
  onBulkApprove={(items) => Promise<void>}
/>
```

### LowConfidenceOverlay Component
- Shows items < 95% confidence
- Explains what's uncertain
- Provides input fields for corrections
- Shows current extracted values
- "Verify" button to confirm

**Props:**
```typescript
<LowConfidenceOverlay
  items={LowConfidenceItem[]}
  threshold={95}
  onItemCorrected={(lineNumber, data) => void}
/>
```

### LineItemCategoryReview Component
- Shows all line items grouped by category
- Allows per-item category override
- Shows GL code for selected category
- Progress bar showing review completion
- "Confirm All Categories" when done

**Props:**
```typescript
<LineItemCategoryReview
  items={LineItemWithCategory[]}
  onReviewComplete={(reviews) => void}
  glCodesByCategory={Record<string, string>}
/>
```

### CompactInvoiceScanner Component
- Minimalist uploader interface
- Drag & drop area
- Camera button
- Minimize/expand toggle
- Progress indicator

## Compliance: The Turtle 🐢

### 24-Hour Compliance Animation

```
Timeline:
  0h  - Invoice uploaded
  4h  - Manual approval deadline
  24h - COMPLIANCE ALERT: Slow Turtle animation
```

**Animation:**
1. Turtle walks across screen (right to left)
2. Pauses at center
3. Turns head and winks 👁️
4. Continues walking off screen

**Trigger:**
- Any invoice pending > 24 hours
- Shows once per invoice per day
- Dismissible but reappears if still pending

**Code Location:**
- `client/components/invoice/ComplianceTurtle.tsx` (to be created)
- Hooks into approval queue status

## Performance Tips for 1000+ Invoices/Day

### Scanner Tab
- Drop 10 files at a time (not 100 at once)
- System processes sequentially
- Each extraction takes ~2-5 seconds
- Progress bar shows current file

### Queue Tab
- Only pending invoices show by default
- Approved items can be filtered out
- Search to find specific invoice quickly
- Sort by "Lowest Confidence" to find problem invoices first

### Approval Process
- Skip low-confidence items initially
- Bulk approve high-confidence batches
- Return to manual review of remaining items
- Process order:
  1. Bulk approve 99%+ confidence (0 manual steps)
  2. Review low-confidence items (manual edits)
  3. Move to next batch

### Estimated Throughput
```
Scenario: 1000 invoices, 70% > 95% confidence

Bulk Approval Phase:
  - 700 invoices bulk approved in 1 batch
  - Time: 30 seconds

Manual Review Phase:
  - 300 invoices need manual review
  - 5 low-confidence items each = 1500 items
  - 2 minutes per invoice = 10 hours total
  - With team of 5: 2 hours

Total: ~2.5 hours for 1000 invoices
```

## API Integration Points

### Invoice Extraction
```typescript
POST /api/invoices/extract
Body: File (PDF or image)
Response: InvoiceExtractionResult
  - vendor
  - invoiceNumber
  - date
  - standardized[] (with GL codes)
  - rawItems[] (with confidence)
  - header (seller, customer, etc.)
```

### Approval Action
```typescript
POST /api/invoices/{id}/approve
Body: {
  categories: { lineNumber: category },
  glCodes: { lineNumber: glCode },
  approvedBy: userId,
  approvedAt: timestamp
}
Response: { success: true, id }
```

### Bulk Approval
```typescript
POST /api/invoices/bulk-approve
Body: {
  invoiceIds: string[],
  approvedBy: userId,
  approvedAt: timestamp
}
Response: { approved: 700, failed: 3, errors: [] }
```

## Related Files

- `client/pages/Invoices.tsx` - Main page
- `client/components/invoice/ApprovalQueue.tsx` - Queue list
- `client/components/invoice/LowConfidenceOverlay.tsx` - Item review
- `client/components/invoice/LineItemCategoryReview.tsx` - Category approval
- `client/components/invoice/CompactInvoiceScanner.tsx` - Uploader
- `client/lib/extract.ts` - OCR extraction & confidence
- `client/lib/gl_autotag.ts` - GL code assignment
- `shared/api/invoices.ts` - Type definitions

## Future Enhancements

1. **Drag to Reorder** - Reorder items in approval queue
2. **Keyboard Shortcuts** - Space to approve, arrow to navigate
3. **Notification Bell** - Alert when new invoices uploaded
4. **Export Summary** - CSV of approved invoices with GL codes
5. **Smart Defaults** - Remember user's category preferences
6. **Auto-Categorization Learning** - ML learns from corrections
7. **Email Approval** - Approve via email with secure link
8. **Webhook Notifications** - Post to Slack/Teams when ready
