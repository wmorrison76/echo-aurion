# Complete Procurement-to-Payment Workflow

## Implementation Roadmap for LUCCCA

**Status**: Foundation phase → Full system deployment  
**Scope**: End-to-end order → receiving → processing → payment system  
**Estimated Duration**: 6-8 weeks (8 phases)

---

## COMPLETE WORKFLOW OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROCUREMENT-TO-PAYMENT FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: ORDER PLACEMENT
├─ Outlet places order via:
│  ├─ Punchout (vendor portal integration)
│  └─ Order form (internal system)
├─ Order created in system
└─ Status: PENDING_DELIVERY

PHASE 2: DELIVERY & RECEIVING
├─ Driver en route (ETA notification)
├─ ON DOCK notification sent to Dashboard
├─ Receiving performs HACCP check:
│  ├─ Temperature verification
│  ├─ Product condition check
│  └─ Compliance validation
├─ PASS → Check-in with mobile scan
│  ├─ Scan delivery barcode
│  ├─ Scan/read vendor code
│  ├─ System routes to correct outlet
│  └─ "Product has arrived" notification to outlet
├─ Shortage detection:
│  ├─ Compare delivery vs. order
│  └─ Dashboard alert to vendor/rep + receiving
└─ Status: DELIVERED

PHASE 3: DELIVERY ROUTING & TIME TRACKING
├─ Delivery taken to outlet
├─ Time logged:
│  ├─ On-dock timestamp (when driver arrived)
│  ├─ Delivery complete timestamp (when left receiving)
│  └─ Arrival at outlet timestamp
├─ Dashboard notified of time taken
├─ Status: IN_OUTLET

PHASE 4: INVOICE PROCESSING & OCR
├─ Mobile/tablet scan of invoice
├─ Google Vision OCR:
│  ├─ Confidence level: 99.9%+ ideal
│  ├─ Extract all line items
│  └─ Categorize items (food category, temp control, etc.)
├─ Line item processing:
│  ├─ Update food system categories
│  ├─ Update pricing (from invoice)
│  ├─ Update case weights
│  └─ Validate against order
├─ Status: PROCESSING

PHASE 5: INVENTORY UPDATE
├─ For each line item:
│  ├─ Add quantity to outlet inventory
│  ├─ Update recipe ingredients (auto-sync)
│  ├─ Update pricing in recipes
│  └─ Update case weights in system
├─ Outlet dashboard notified:
│  ├─ "Stock received: 50 items"
│  ├─ "Prices updated"
│  └─ "Inventory change: +$2,450"
├─ Status: INVENTORY_UPDATED

PHASE 6: IMAGE VAULT & AUDIT TRAIL
├─ Invoice image stored in image vault:
│  ├─ Receiving access
│  ├─ Outlet access
│  └─ Accounting access
├─ Full audit trail created:
│  ├─ OCR scan timestamp
│  ├─ Confidence level
│  ├─ Line items extracted
│  └─ Inventory changes made
├─ Status: ARCHIVED

PHASE 7: ACCOUNTING & PAYMENT
├─ Invoice sent to Accounting module:
│  ├─ GL codes auto-assigned (AI learning)
│  ├─ Amount verified vs. total
│  └─ Terms of agreement applied
├─ Accounting review & approval:
│  ├─ Three-way match (order/receipt/invoice)
│  ├─ GL code verification
│  └─ Payment terms applied
├─ Invoice ready for payment:
│  ├─ Three-way match: ✅ PASSED
│  ├─ GL codes: ✅ ASSIGNED
│  └─ Payment terms: ✅ APPLIED
├─ Status: READY_FOR_PAYMENT

PHASE 8: PAYMENT & SETTLEMENT
├─ Automatic payment processing:
│  ├─ Payment terms calculated (net 30, 2/10, etc.)
│  ├─ Due date determined
│  └─ Scheduled payment
├─ Payment made:
│  ├─ Payment method determined (ACH, wire, check)
│  ├─ Record created in AP ledger
│  └─ GL posted
├─ Vendor notification:
│  ├─ Payment confirmation
│  ├─ Invoice marked PAID
│  └─ Bank reconciliation
├─ Status: PAID

SPECIAL FLOW: COMMISSARY/STOREROOM
├─ Storeroom order arrives (same as outlet):
│  ├─ HACCP check
│  ├─ Check-in scan
│  └─ Inventory updated (in storeroom)
├─ Storeroom now acts as supplier:
│  ├─ Outlets can place internal orders
│  ├─ Outlets order via order form
│  ├─ Items transferred from storeroom to outlet
│  └─ Internal "invoice" generated
└─ Outlet receives:
   ├─ Same processing as normal delivery
   ├─ Inventory updated
   └─ Cost allocated to outlet
```

---

## DATABASE SCHEMA REQUIREMENTS

### New/Modified Tables

#### 1. invoices (MODIFIED)

```sql
-- Add new fields
ALTER TABLE invoices ADD COLUMN status TEXT;
  -- Values: queued, approved, denied, processing, archived, trash
  -- Default: queued

ALTER TABLE invoices ADD COLUMN approval_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN approved_by UUID;
ALTER TABLE invoices ADD COLUMN denial_reason TEXT;
ALTER TABLE invoices ADD COLUMN denial_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN trash_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN auto_delete_date TIMESTAMPTZ; -- 45 days after trash
ALTER TABLE invoices ADD COLUMN is_commissary BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN delivery_id UUID REFERENCES deliveries(id);
ALTER TABLE invoices ADD COLUMN confidence DECIMAL(5,2); -- 99.99% format
ALTER TABLE invoices ADD COLUMN processed_at TIMESTAMPTZ;
```

#### 2. NEW: deliveries

```sql
CREATE TABLE deliveries (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  vendor_id UUID,
  outlet_id UUID REFERENCES outlets(id),
  order_id UUID, -- Link to original order

  -- Timeline
  on_dock_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  delivery_complete_at TIMESTAMPTZ,
  arrived_at_outlet_at TIMESTAMPTZ,

  -- HACCP
  haccp_check_passed BOOLEAN,
  haccp_check_date TIMESTAMPTZ,
  haccp_checked_by UUID,
  temperature_verified BOOLEAN,
  temperature_reading DECIMAL(5,2),
  haccp_notes TEXT,

  -- Logistics
  driver_name TEXT,
  vehicle_id TEXT,
  barcode BIGINT,
  vendor_delivery_code TEXT,

  -- Status
  status TEXT, -- on_dock, checked_in, routed, delivered

  -- Shortages
  shortage_detected BOOLEAN,
  shortage_items JSONB, -- [{item_name, expected_qty, actual_qty}]

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_deliveries_outlet ON deliveries(outlet_id);
CREATE INDEX idx_deliveries_on_dock ON deliveries(on_dock_at);
```

#### 3. NEW: approval_queue

```sql
CREATE TABLE approval_queue (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  invoice_id UUID REFERENCES invoices(id),
  confidence DECIMAL(5,2),
  auto_approvable BOOLEAN, -- true if confidence >= 99.9%

  -- Bulk approval batch
  batch_id UUID, -- Group of up to 10 for bulk approval
  batch_size INT, -- How many in this batch

  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  approval_status TEXT, -- pending, approved, denied, auto_approved

  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. NEW: invoice_audit_log

```sql
CREATE TABLE invoice_audit_log (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  org_id UUID REFERENCES organizations(id),

  action TEXT, -- created, approved, denied, processing, archived, trashed
  action_by UUID,
  action_at TIMESTAMPTZ DEFAULT now(),

  details JSONB, -- {reason, confidence, line_count, etc}

  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5. NEW: inventory_updates

```sql
CREATE TABLE inventory_updates (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  outlet_id UUID REFERENCES outlets(id),
  invoice_id UUID REFERENCES invoices(id),

  item_code TEXT,
  item_name TEXT,
  qty_before DECIMAL(10,2),
  qty_added DECIMAL(10,2),
  qty_after DECIMAL(10,2),
  unit_price DECIMAL(10,4),
  case_weight DECIMAL(10,4),

  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 6. NEW: commissary_transfers

```sql
CREATE TABLE commissary_transfers (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),

  from_commissary_id UUID REFERENCES outlets(id), -- Storeroom
  to_outlet_id UUID REFERENCES outlets(id),

  invoice_id UUID REFERENCES invoices(id),

  -- Transfer details
  transfer_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,

  items JSONB, -- [{item_code, qty, unit_price}]
  total_amount DECIMAL(12,2),

  status TEXT, -- pending, delivered, invoiced, paid

  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 7. NEW: terms_of_agreement

```sql
CREATE TABLE terms_of_agreement (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  vendor_id UUID,
  outlet_id UUID REFERENCES outlets(id),

  payment_terms TEXT, -- net_30, net_60, 2/10_net_30, etc
  discount_percent DECIMAL(5,2),
  discount_days INT,
  net_days INT,

  credit_limit DECIMAL(12,2),
  current_balance DECIMAL(12,2),

  -- Auto-update from invoices
  last_invoice_date TIMESTAMPTZ,
  last_invoice_amount DECIMAL(12,2),

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## IMPLEMENTATION PHASES

### PHASE 1: Foundation & Critical Fixes ⚠️ **CURRENT**

**Duration**: 1-2 days  
**Blocker**: System not usable without fixes

**Tasks**:

- [ ] Fix OCR image loading (BoundingBoxEditor)
- [ ] Fix InvoiceSearchPanel rendering errors
- [ ] Fix telemetry 404 endpoints
- [ ] Verify database connectivity
- [ ] Test end-to-end OCR → extraction → database

**Deliverables**:

- ✅ System boots without errors
- ✅ Can upload and process one invoice
- ✅ Line items appear in database
- ✅ Image loads in scan area

---

### PHASE 2: Invoice Status & Workflow Schema

**Duration**: 1-2 days  
**Dependencies**: Phase 1

**Tasks**:

- [ ] Design invoice status enum: queued → approved/denied → processing → archived
- [ ] Design approval_queue table structure
- [ ] Design invoice_audit_log for compliance
- [ ] Create database migrations
- [ ] Update Invoice TypeScript types
- [ ] Create helper functions: approveInvoice(), denyInvoice(), moveToTrash()

**Deliverables**:

- ✅ Database schema deployed
- ✅ Invoice status system working
- ✅ API endpoints for approval/denial

---

### PHASE 3: Approval Workflow UI & API

**Duration**: 2-3 days  
**Dependencies**: Phase 2

**Tasks**:

- [ ] Create ApprovalQueue component (shows pending invoices)
- [ ] Build confidence-based routing:
  - 99.9%+ → Auto-approve immediately
  - 98-99.8% → Show in "Bulk Approve" (max 10 items)
  - <98% → Show in "Manual Review"
- [ ] Build bulk approve action (select 10, approve all)
- [ ] Build deny action (capture denial reason)
- [ ] Create trash/recovery interface (45-day retention)
- [ ] Add audit logging for all approvals

**Deliverables**:

- ✅ Approval queue UI
- ✅ Confidence-based routing logic
- ✅ Deny/trash workflow
- ✅ Audit trail for compliance

---

### PHASE 4: HACCP & Delivery Integration

**Duration**: 2-3 days  
**Dependencies**: Phase 2

**Tasks**:

- [ ] Create Receiving Dashboard (see scheduled deliveries)
- [ ] Build delivery check-in workflow:
  - Scan barcode → load delivery details
  - Perform HACCP check (temp, condition)
  - Mark as received
- [ ] Build shortage detection (compare delivery vs order)
- [ ] Time tracking: on-dock → checked-in → routed → outlet
- [ ] Notification system: dashboard alerts for shortages
- [ ] Mobile/tablet UI for receiving

**Deliverables**:

- ✅ Delivery check-in system
- ✅ HACCP compliance tracking
- ✅ Shortage detection & alerts
- ✅ Time tracking (on-dock to delivery)

---

### PHASE 5: Inventory System Integration

**Duration**: 3-4 days  
**Dependencies**: Phase 3 (approved invoices)

**Tasks**:

- [ ] When invoice approved:
  - Extract line items from invoice
  - For each item:
    - Add quantity to outlet inventory
    - Update recipe ingredients (auto-sync)
    - Update pricing in recipes
    - Update case weights
- [ ] Create inventory_updates log (audit trail)
- [ ] Build inventory dashboard:
  - Show changes per invoice
  - Show new prices
  - Show recipe impacts
- [ ] Notification system: outlet notified of stock arrival
- [ ] Handle commissary inventory separately

**Deliverables**:

- ✅ Automatic inventory updates on approval
- ✅ Recipe ingredient sync
- ✅ Pricing updates
- ✅ Inventory audit log

---

### PHASE 6: Commissary/Storeroom System

**Duration**: 2-3 days  
**Dependencies**: Phase 5

**Tasks**:

- [ ] Flag outlets as "commissary" (storeroom)
- [ ] When commissary receives order:
  - Same HACCP check
  - Same invoice processing
  - Inventory updates in commissary, not outlet
- [ ] Allow outlets to order from commissary:
  - Build "order from commissary" form
  - Create internal transfer orders
  - Generate internal "invoices"
- [ ] When outlet receives from commissary:
  - Same processing as vendor order
  - Cost allocated to receiving outlet
  - Commissary inventory decreases
- [ ] Commissary reporting (stock levels, transfers)

**Deliverables**:

- ✅ Commissary order placement
- ✅ Internal transfer processing
- ✅ Commissary inventory management
- ✅ Cost allocation per outlet

---

### PHASE 7: Accounting Integration

**Duration**: 3-4 days  
**Dependencies**: Phase 3, Phase 5

**Tasks**:

- [ ] When invoice approved, send to Accounting:
  - All line items with GL codes
  - Total amount
  - Vendor info
  - Terms of agreement
- [ ] Three-way match verification:
  - Order → Delivery → Invoice amounts match
  - Flag discrepancies
- [ ] GL code assignment:
  - Use AI learning (historical patterns)
  - Allow manual override
  - Track confidence
- [ ] Payment terms management:
  - Apply terms of agreement
  - Calculate due dates
  - Discount tracking (2/10 net 30, etc)
- [ ] AP ledger posting:
  - Create AP record
  - GL posting
  - Balance tracking

**Deliverables**:

- ✅ Accounting module integration
- ✅ Three-way matching
- ✅ GL code assignment
- ✅ Payment terms management
- ✅ AP ledger entries

---

### PHASE 8: Dashboard & Real-time Notifications

**Duration**: 2-3 days  
**Dependencies**: All phases

**Tasks**:

- [ ] Central Dashboard (show key metrics):
  - Invoices in approval queue
  - Pending deliveries
  - Inventory changes
  - Shortages detected
  - Payment status
- [ ] Real-time notifications:
  - WebSocket updates for status changes
  - Dashboard alerts for shortages
  - Vendor/rep notifications (shortages, delays)
  - Outlet notifications (stock received, prices updated)
- [ ] LUCCCA integration (when ready):
  - Send events to LUCCCA dashboard
  - Receive order notifications
  - Integration point for future expansion
- [ ] Audit trail dashboard:
  - All approvals logged
  - All denials logged
  - All inventory changes logged
  - 45-day trash history

**Deliverables**:

- ✅ Central dashboard
- ✅ Real-time notifications
- ✅ LUCCCA integration ready
- ✅ Full audit trail visibility

---

## DEPLOYMENT SEQUENCE

```
Week 1:
├─ Day 1-2: Phase 1 (Foundation fixes)
└─ Day 3-5: Phase 2 (Schema design) + Phase 3 (Approval workflow)

Week 2:
├─ Day 1-2: Phase 4 (HACCP/Delivery)
└─ Day 3-5: Phase 5 (Inventory integration)

Week 3:
├─ Day 1-2: Phase 6 (Commissary)
└─ Day 3-5: Phase 7 (Accounting integration)

Week 4:
├─ Day 1-2: Phase 8 (Dashboard)
├─ Day 3-4: Testing & bug fixes
└─ Day 5: Go-live prep & training

Total: 4 weeks of active development
```

---

## SUCCESS CRITERIA

**Phase 1 Complete**: ✅

- System is stable, no crashes
- Can upload invoice and see extraction
- Image loads in UI

**Phase 3 Complete**: ✅

- Can approve invoice
- Invoice moves out of queue
- Appears in accounting
- Audit log created

**Phase 5 Complete**: ✅

- Outlet inventory increases on approval
- Recipes updated with new ingredients
- Pricing updates reflected

**Full System Complete**: ✅

- Entire flow: order → receiving → approval → inventory → accounting → payment
- Commissary orders working
- All notifications sent
- Audit trail complete
- Ready for payment automation

---

## IMMEDIATE NEXT STEPS

1. **Confirm this matches your vision**: Review this roadmap - does it capture the complete flow?
2. **Prioritize**: Are Phases 1-3 the MVP (minimum viable product)?
3. **Resources**: Can we commit 4 weeks of development?
4. **Start Phase 1**: Begin fixing blocking issues today

Once approved, I'll start Phase 1 immediately.

---

**Questions before we proceed**:

1. Does this roadmap match your complete vision?
2. Should we focus on Phase 1-3 first (approval workflow) before Phases 4-8?
3. Are there other systems (e.g., vendor management, contracts) that need to be integrated?
4. Timeline: Can we commit to this 4-week plan?
