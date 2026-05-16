# Procurement-to-Payment API Reference

## Base URL

```
/api/purchasing/*  - Purchase order and vendor management
/api/receiving/*   - Receiving operations
/api/accounting/*  - Payment and accounting
/api/invoices/*    - Invoice processing
/api/approvals/*   - Approval workflows
```

---

## PHASE 1: ORDERING APIs

### Vendor Management

#### GET /api/purchasing/vendors

Retrieve all vendors

```json
Query Params:
  - organization_id (required)
  - active (optional): "true"|"false"

Response:
[
  {
    "id": "vendor-1",
    "name": "US Foods",
    "contact_email": "john@usfoods.com",
    "contact_phone": "(555) 123-4567",
    "is_active": true,
    "payment_methods": ["ACH", "Check"],
    "default_payment_terms": "net_30"
  }
]
```

#### POST /api/purchasing/vendors

Create new vendor

```json
Body:
{
  "organization_id": "org-1",
  "name": "New Vendor",
  "contact_name": "Contact Name",
  "contact_email": "email@vendor.com",
  "contact_phone": "(555) 123-4567",
  "payment_methods": ["ACH"],
  "default_payment_terms": "net_30"
}

Response: vendor object with id
```

#### GET /api/purchasing/vendors/:vendorId/detail

Get vendor with contracts and volume pricing

```json
Response:
{
  "vendor": { ... },
  "contracts": [
    {
      "id": "contract-1",
      "contract_number": "USFD-2024-001",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "payment_terms": "net_30",
      "contract_volume_tiers": [ ... ],
      "contract_rebates": [ ... ]
    }
  ]
}
```

---

### Purchase Order Management

#### POST /api/purchasing/purchase-orders

Create purchase order

```json
Body:
{
  "organization_id": "org-1",
  "outlet_id": "outlet-1",
  "vendor_id": "vendor-1",
  "delivery_date": "2024-12-20",
  "lines": [
    {
      "product_id": "prod-1",
      "product_name": "Ribeye Steak 12oz",
      "quantity": 50,
      "unit": "lbs",
      "unit_price": 12.50
    }
  ]
}

Response:
{
  "po": { po object with id and po_number },
  "lines": [ line items ],
  "approval_url": "/po-approvals/po-id"
}
```

#### GET /api/purchasing/purchase-orders

List purchase orders

```json
Query Params:
  - organization_id (required)
  - status (optional): "draft"|"approved"|"received"|"rejected"
  - outlet_id (optional)

Response: array of POs with related data
```

#### GET /api/purchasing/purchase-orders/:poId

Get single PO with approval workflow

```json
Response:
{
  "po": { ... },
  "purchase_order_lines": [ ... ],
  "approvals": [ approval workflow objects ]
}
```

---

### PO Approval Workflow

#### GET /api/purchasing/approvals/pending

Get pending approvals

```json
Query Params:
  - organization_id (required)
  - approval_role (optional): "manager"|"finance"|"owner"

Response: array of pending approval objects
```

#### POST /api/purchasing/approvals/:approvalId/approve

Approve purchase order

```json
Body:
{
  "approver_user_id": "user-1",
  "notes": "Approved per budget allocation"
}

Response: updated approval object
```

#### POST /api/purchasing/approvals/:approvalId/reject

Reject purchase order

```json
Body:
{
  "approver_user_id": "user-1",
  "rejection_reason": "Budget exceeded for this period"
}

Response: updated approval object with rejection details
```

---

### Supplier Contracts

#### GET /api/purchasing/contracts

Get supplier contracts

```json
Query Params:
  - organization_id (required)
  - status (optional): "active"|"expired"|"draft"

Response: array of contracts with volume tiers and rebates
```

#### POST /api/purchasing/contracts

Create supplier contract

```json
Body:
{
  "organization_id": "org-1",
  "supplier_id": "vendor-1",
  "contract_number": "USFD-2025-001",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "payment_terms": "net_30",
  "primary_contact_email": "contact@vendor.com"
}

Response: contract object with id
```

---

## PHASE 2: RECEIVING APIs

### Receiving Sessions

#### POST /api/receiving/sessions

Start receiving session

```json
Body:
{
  "organization_id": "org-1",
  "outlet_id": "outlet-1",
  "po_id": "po-1"
}

Response: session object with id
```

#### GET /api/receiving/sessions/:sessionId

Get receiving session with scanned items

```json
Response:
{
  "id": "session-1",
  "po_id": "po-1",
  "status": "in_progress",
  "started_at": "2024-12-19T14:30:00Z",
  "receiving_items": [ scanned items ]
}
```

---

### Barcode Scanning

#### POST /api/receiving/sessions/:sessionId/scan

Scan barcode and record item

```json
Body:
{
  "barcode": "BEEF-001",
  "quantity": 45,
  "temperature": 32,
  "notes": "Good condition",
  "product_id": "prod-1"
}

Response:
{
  "item": { scanned item object },
  "message": "Item scanned successfully"
}
```

#### GET /api/receiving/sessions/:sessionId/shortages

Get shortage analysis

```json
Response:
[
  {
    "product_name": "Ribeye Steak",
    "ordered": 50,
    "received": 45,
    "shortage": 5,
    "unit": "lbs",
    "is_short": true
  }
]
```

---

### Quality & Temperature

#### POST /api/receiving/sessions/:sessionId/temperature-issue

Record temperature issue

```json
Body:
{
  "receiving_item_id": "item-1",
  "temperature": 42,
  "required_temp": 0,
  "notes": "Freezer malfunction"
}

Response: quality issue object
```

#### POST /api/receiving/sessions/:sessionId/damage-issue

Record damage or shortage issue

```json
Body:
{
  "receiving_item_id": "item-1",
  "issue_type": "damage",
  "description": "5 cases damaged in transit",
  "severity": "warning"
}

Response: quality issue object
```

#### GET /api/receiving/sessions/:sessionId/quality-issues

Get all quality issues for session

```json
Response: array of quality issue objects
```

---

### Receiving Completion

#### POST /api/receiving/sessions/:sessionId/complete

Complete receiving with signature

```json
Body:
{
  "signed_by": "John Warehouse Manager",
  "signature_image": "base64_encoded_image",
  "notes": "All items received and verified"
}

Response:
{
  "session": { completed session },
  "items_received": 18,
  "message": "Receiving session completed"
}
```

---

### Inventory Conversion

#### POST /api/receiving/calculate-inventory

Calculate inventory quantity from case weight

```json
Body:
{
  "product_id": "prod-1",
  "case_weight_lbs": 45,
  "weight_per_unit": 12,
  "unit_of_measure": "pieces"
}

Response:
{
  "case_weight_lbs": 45,
  "weight_per_unit": 12,
  "calculated_inventory_quantity": 3.75,
  "message": "Conversion calculated"
}
```

---

## PHASE 4: INVOICE APIS

### Processing (Existing System)

#### GET /api/invoices?status=pending

Get pending invoices for review

#### POST /api/invoices/process-queue

Process queued invoices through OCR

#### GET /api/invoices/:invoiceId/validate

Validate three-way match (PO > REC > INV)

---

## PHASE 5: PAYMENT APIS

### Payment Processing (Existing System)

#### GET /api/accounting/payments?status=pending

Get pending payments

#### POST /api/accounting/payments/:paymentId/process

Process payment (ACH/Check)

#### GET /api/accounting/early-discounts

Get available early discount opportunities

---

## Data Models

### Vendor

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "name": "string",
  "contact_name": "string",
  "contact_email": "email",
  "contact_phone": "phone",
  "is_active": boolean,
  "payment_methods": ["ACH", "Check", "Credit Card"],
  "default_payment_terms": "net_30",
  "created_at": "ISO8601"
}
```

### Purchase Order

```json
{
  "id": "uuid",
  "po_number": "PO-24001",
  "vendor_id": "uuid",
  "outlet_id": "uuid",
  "status": "draft|approved|received|rejected",
  "eta": "ISO8601",
  "total_amount": number,
  "approval_required": boolean,
  "created_at": "ISO8601"
}
```

### Receiving Item

```json
{
  "id": "uuid",
  "receiving_session_id": "uuid",
  "po_id": "uuid",
  "product_id": "uuid",
  "barcode": "string",
  "quantity_scanned": number,
  "temperature": number,
  "notes": "string",
  "scanned_at": "ISO8601"
}
```

### Quality Issue

```json
{
  "id": "uuid",
  "receiving_session_id": "uuid",
  "receiving_item_id": "uuid",
  "issue_type": "temperature|damage|shortage",
  "description": "string",
  "severity": "warning|critical",
  "detected_at": "ISO8601"
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

HTTP Status Codes:

- 200: Success
- 201: Created
- 400: Bad Request (missing/invalid params)
- 404: Not Found
- 500: Server Error

---

## Authentication

All endpoints require:

- `X-Request-ID` header (request tracing)
- `Authorization` header (JWT token)
- `X-Org-Id` header (organization context)

---

## Rate Limiting

- Standard endpoints: 100 req/min
- Payment operations: 10 req/min (see paymentLimiter middleware)
- Webhook endpoints: 50 req/min

---

## WebSocket Events

Subscribe to real-time updates:

```
Channel: delivery-updates
Message: { poNumber, status, eta }

Channel: shortage-alerts
Message: { productName, shortage, severity }

Channel: approval-notifications
Message: { poNumber, requiredApprovals, amount }
```
