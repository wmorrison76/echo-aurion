# EchoAurum Complete API Documentation

## Overview

EchoAurum is a production-ready hospitality financial management system with:

- GL posting and journal entry management
- Multi-level approval workflows with Guardian AI oversight
- Inventory, scheduling, and revenue metrics integrations
- Bank reconciliation and auto GL posting
- Custom report builder with scheduling

## Base URL

```
/api/aurum
```

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>`

---

## PHASE 1: GL & JOURNAL ENTRIES

### POST /journal-entries

Create and post journal entries

**Request:**

```json
{
  "description": "Room Revenue",
  "posting_date": "2024-01-15",
  "journal_lines": [
    { "account_id": "1010", "debit": 5000, "description": "Cash received" },
    { "account_id": "4000", "credit": 5000, "description": "Room revenue" }
  ]
}
```

**Response:**

```json
{
  "id": "je-001",
  "status": "posted",
  "total_debit": 5000,
  "total_credit": 5000,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## PHASE 2: APPROVAL WORKFLOWS

### GET /approvals/queue

Get pending approvals for current user

**Query Parameters:**

- `status`: pending|escalated|all
- `limit`: 50 (default)
- `offset`: 0 (default)

**Response:**

```json
{
  "approvals": [
    {
      "id": "apr-001",
      "type": "journal_entry",
      "description": "GL Entry - Revenue Adjustment",
      "amount": 5000,
      "status": "pending",
      "created_at": "2024-01-15T09:00:00Z",
      "guardian_risk_score": 18
    }
  ],
  "total": 15
}
```

### POST /approvals/:approvalId/approve

Approve a pending item

**Request:**

```json
{
  "reason": "Verified documentation"
}
```

### POST /approvals/:approvalId/delegate

Delegate to another approver

**Request:**

```json
{
  "delegate_to": "user-002",
  "reason": "Out of office",
  "expires_at": "2024-01-20T23:59:59Z"
}
```

### GET /approvals/rules

Get approval rules for entity

**Response:**

```json
{
  "rules": [
    {
      "id": "rule-1",
      "name": "Large Transaction Amounts",
      "conditions": [{ "field": "amount", "operator": "gte", "value": 50000 }],
      "actions": [{ "type": "require_level", "approval_level": 2 }]
    }
  ]
}
```

---

## PHASE 3: GUARDIAN AI CHECKS

### POST /approvals/guardian-check

Run Guardian AI checks on a transaction

**Request:**

```json
{
  "transaction": {
    "id": "je-001",
    "gl_account_id": "4000",
    "amount": 5000,
    "description": "Revenue entry",
    "transaction_type": "revenue"
  },
  "entity_id": "entity-001"
}
```

**Response:**

```json
{
  "guardian_result": {
    "transaction_id": "je-001",
    "overall_risk_score": 18,
    "can_auto_post": true,
    "argus_result": {
      "passed": true,
      "risk_score": 15,
      "validations": {
        "gl_account_valid": true,
        "amount_in_range": true,
        "description_present": true
      }
    },
    "zelda_result": {
      "passed": true,
      "risk_score": 10,
      "duplicate_detection": {
        "is_duplicate": false
      }
    },
    "phoenix_result": {
      "passed": true,
      "risk_score": 20,
      "fraud_detection": {
        "suspicious_pattern": false,
        "anomaly_score": 0.15
      }
    },
    "odin_result": {
      "passed": true,
      "immutable": true,
      "audit_trail_id": "audit-001",
      "hash_value": "abc123..."
    }
  }
}
```

### GET /approvals/guardian-audit-trail

Get immutable audit trail

**Query Parameters:**

- `limit`: 100 (default)

**Response:**

```json
{
  "audit_trail": [
    {
      "audit_trail_id": "audit-001",
      "immutable": true,
      "hash_value": "abc123...",
      "previous_hash": "xyz789...",
      "compliance_metadata": {
        "created_by": "user-001",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

---

## PHASE 4: INVENTORY INTEGRATION

### POST /inventory/sync

Sync inventory from MarginEdge

**Request:**

```json
{
  "entity_id": "entity-001"
}
```

**Response:**

```json
{
  "inventory": [
    {
      "id": "inv-001",
      "name": "Premium Beef",
      "sku": "BEEF-PREM",
      "quantity": 45,
      "unit_cost": 8.5,
      "gl_account": "1150"
    }
  ],
  "summary": {
    "total_items": 150,
    "total_value": 45000.0,
    "by_category": {
      "produce": 12000,
      "beverage": 15000,
      "other": 18000
    }
  }
}
```

### POST /inventory/variance

Calculate inventory variance

**Request:**

```json
{
  "entity_id": "entity-001",
  "expected_inventory": [...],
  "actual_inventory": [...]
}
```

**Response:**

```json
{
  "variances": [
    {
      "item_id": "inv-001",
      "item_name": "Premium Beef",
      "expected_quantity": 50,
      "actual_quantity": 45,
      "variance_percent": -10,
      "variance_value": -42.5,
      "gl_impact": {
        "account_id": "1150",
        "debit": 42.5,
        "credit": 0
      }
    }
  ],
  "gl_entries_created": 3
}
```

---

## PHASE 5: SCHEDULING INTEGRATION

### POST /scheduling/sync

Sync labor schedule from Toast

**Request:**

```json
{
  "entity_id": "entity-001",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response:**

```json
{
  "schedule": [...],
  "actuals": [...],
  "summary": {
    "total_scheduled_hours": 400,
    "total_actual_hours": 385,
    "labor_cost_percent": 32.5,
    "total_variance_cost": -450.00
  }
}
```

### POST /scheduling/variance

Calculate labor variance

**Response:**

```json
{
  "variances": [
    {
      "employee_id": "emp-001",
      "employee_name": "John Chef",
      "scheduled_hours": 8,
      "actual_hours": 8.5,
      "variance_hours": 0.5,
      "variance_cost": 12.5
    }
  ],
  "forecast": {
    "total_monthly_impact": 195.0,
    "recommendation": "Schedule optimization needed"
  }
}
```

---

## SUPPLEMENTAL: REVENUE METRICS

### GET /revenue/daily

Calculate daily revenue metrics

**Query Parameters:**

- `entity_id`: required
- `date`: YYYY-MM-DD (default: today)

**Response:**

```json
{
  "metrics": {
    "occupancy_percent": 78.5,
    "occupancy_status": "high",
    "occupied_rooms": 117,
    "total_rooms": 150,
    "adr": 185.5,
    "revpar": 145.62,
    "room_revenue": 14100,
    "fb_revenue": 3540,
    "total_revenue": 18240
  },
  "gl_mapping": {
    "room_revenue": {
      "account_id": "4000",
      "amount": 14100
    }
  }
}
```

### GET /revenue/monthly

Calculate monthly revenue metrics

**Query Parameters:**

- `entity_id`: required
- `year`: YYYY
- `month`: 0-11

### POST /revenue/forecast

Generate revenue forecast

**Request:**

```json
{
  "entity_id": "entity-001",
  "start_date": "2024-02-01",
  "days": 30
}
```

---

## SUPPLEMENTAL: BANK FEED INTEGRATION

### POST /bank-feed/sync

Download bank transactions from Stripe

**Request:**

```json
{
  "entity_id": "entity-001",
  "account_id": "acct-001",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response:**

```json
{
  "transactions": [
    {
      "id": "txn-001",
      "date": "2024-01-15",
      "amount": 5000,
      "description": "Stripe deposit",
      "type": "credit",
      "bank_reference": "STRIPE-001"
    }
  ]
}
```

### POST /bank-feed/match

Match bank transactions to GL entries

**Request:**

```json
{
  "entity_id": "entity-001",
  "bank_transactions": [...],
  "gl_entries": [...]
}
```

**Response:**

```json
{
  "matches": [
    {
      "bank_transaction_id": "txn-001",
      "gl_entry_id": "je-001",
      "matched_amount": 5000,
      "confidence_score": 0.95,
      "match_type": "exact"
    }
  ],
  "gl_entries_created": 2,
  "match_rate": "85.7%"
}
```

### POST /bank-feed/reconcile

Perform bank reconciliation

**Response:**

```json
{
  "reconciliation": {
    "account_id": "acct-001",
    "bank_balance": 50000,
    "system_balance": 49999.5,
    "variance": 0.5,
    "status": "reconciled",
    "matched_count": 25,
    "unmatched_count": 2
  }
}
```

---

## SUPPLEMENTAL: CUSTOM REPORT BUILDER

### POST /reports

Create custom report

**Request:**

```json
{
  "name": "Daily Revenue Summary",
  "description": "Daily metrics report",
  "fields": [
    {
      "name": "room_revenue",
      "label": "Room Revenue",
      "type": "amount",
      "source": "revenue"
    },
    {
      "name": "occupancy",
      "label": "Occupancy %",
      "type": "percentage",
      "source": "revenue"
    }
  ],
  "filters": [],
  "is_scheduled": true,
  "schedule_frequency": "daily",
  "recipients": ["manager@company.com"]
}
```

### GET /reports

List all reports

### GET /reports/:reportId

Get specific report

### POST /reports/:reportId/execute

Execute report and generate output

**Response:**

```json
{
  "execution": {
    "report_id": "rpt-001",
    "executed_at": "2024-01-15T10:30:00Z",
    "row_count": 150,
    "execution_time_ms": 245,
    "status": "success",
    "data_url": "/api/reports/rpt-001/data"
  }
}
```

### GET /reports/templates/all

Get available report templates

---

## ERROR HANDLING

All errors follow standard format:

```json
{
  "error": "Description of error",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Status Codes

- `200`: Success
- `400`: Bad request (missing required fields)
- `401`: Unauthorized (invalid JWT)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Server error

---

## RATE LIMITING

- 1000 requests per hour per API key
- Burst: 100 requests per minute

Headers:

- `X-RateLimit-Limit`: 1000
- `X-RateLimit-Remaining`: 999
- `X-RateLimit-Reset`: 1643352600

---

## WEBHOOKS

Subscribe to events:

```
POST /webhooks/subscribe
```

**Events:**

- `approval.pending` - New approval created
- `approval.approved` - Approval granted
- `approval.escalated` - Approval escalated
- `gl.posted` - Journal entry posted
- `bank.reconciled` - Bank reconciliation complete
- `report.generated` - Custom report generated

---

## PAGINATION

For list endpoints, use:

- `limit`: max results (default: 50)
- `offset`: starting position (default: 0)

**Response:**

```json
{
  "items": [...],
  "total": 1000,
  "limit": 50,
  "offset": 0
}
```

---

## CHANGELOG

### v1.0.0 (2024-01-15)

- Initial release
- GL posting, approvals, Guardian AI
- Inventory, scheduling, revenue metrics
- Bank feed integration
- Custom report builder
