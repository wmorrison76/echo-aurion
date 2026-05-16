# EchoAurum Phase 2 API Reference

## Rule Engine APIs

### List All Rules
**Endpoint:** `GET /api/aurum/rules`

**Authentication:** Required (Bearer token)

**Query Parameters:**
```
entityId: string (required)    # Entity/location ID
limit: number (optional)        # Max results (default: 100, max: 1000)
offset: number (optional)       # Pagination offset (default: 0)
status: string (optional)       # "active" | "paused" | "all" (default: "all")
```

**Response:**
```json
{
  "data": [
    {
      "id": "rule-123",
      "entity_id": "entity-1",
      "rule_name": "Auto-Post Toast Sales >$1000",
      "rule_description": "Auto-post Toast POS sales over $1,000",
      "rule_type": "auto_post",
      "rule_version": 1,
      "is_active": true,
      "is_paused": false,
      "conditions": [
        {
          "field": "amount",
          "operator": "greater_than",
          "value": 1000
        },
        {
          "field": "vendor",
          "operator": "equals",
          "value": "Toast"
        }
      ],
      "actions": [
        {
          "type": "auto_post",
          "data": {
            "account": "4100",
            "description": "Toast POS Revenue"
          }
        }
      ],
      "approval_required": false,
      "created_by_user_id": "user-1",
      "created_by_ai": false,
      "times_triggered": 247,
      "times_auto_executed": 247,
      "times_approved": 0,
      "times_rejected": 0,
      "last_triggered_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-10T14:22:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "limit": 100,
    "offset": 0
  }
}
```

**Error Responses:**
```json
{
  "error": "Missing entityId",
  "code": "MISSING_ENTITY_ID"
}
```

---

### Get Single Rule
**Endpoint:** `GET /api/aurum/rules/:ruleId`

**Response:** Single rule object (see List All Rules for schema)

**Error Responses:**
```json
{
  "error": "Rule not found",
  "code": "RULE_NOT_FOUND"
}
```

---

### Create Rule
**Endpoint:** `POST /api/aurum/rules`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "entity_id": "entity-1",
  "rule_name": "Auto-Post Invoices <$500",
  "rule_description": "Auto-post small invoices for faster processing",
  "rule_type": "auto_post",
  "conditions": [
    {
      "field": "amount",
      "operator": "less_than",
      "value": 500
    },
    {
      "field": "is_three_way_matched",
      "operator": "equals",
      "value": true,
      "logic": "AND"
    }
  ],
  "actions": [
    {
      "type": "auto_post",
      "data": {
        "account": "2000",
        "description": "Small invoice posting"
      }
    }
  ],
  "approval_required": false
}
```

**Response:** Created rule object with status 201

**Error Responses:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "rule_name": "required",
    "rule_type": "must be one of: auto_post, auto_approve, alert, escalate"
  }
}
```

---

### Update Rule
**Endpoint:** `PUT /api/aurum/rules/:ruleId`

**Authentication:** Required (Bearer token)

**Request Body:** (partial update)
```json
{
  "rule_name": "Updated Rule Name",
  "conditions": [
    {
      "field": "amount",
      "operator": "less_than",
      "value": 1000
    }
  ]
}
```

**Response:** Updated rule object

---

### Delete Rule (Soft Delete)
**Endpoint:** `DELETE /api/aurum/rules/:ruleId`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "message": "Rule deleted successfully"
}
```

---

### Pause Rule
**Endpoint:** `POST /api/aurum/rules/:ruleId/pause`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "reason": "Testing new configuration"
}
```

**Response:** Updated rule with `is_paused: true`

---

### Resume Rule
**Endpoint:** `POST /api/aurum/rules/:ruleId/resume`

**Authentication:** Required (Bearer token)

**Response:** Updated rule with `is_paused: false`

---

### Copy Rule
**Endpoint:** `POST /api/aurum/rules/:ruleId/copy`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "new_name": "Auto-Post Invoices <$1000"
}
```

**Response:** New copied rule object

---

### Get Rule Execution History
**Endpoint:** `GET /api/aurum/rules/:ruleId/history`

**Query Parameters:**
```
limit: number (default: 50, max: 500)
offset: number (default: 0)
status: string ("success" | "failed" | "pending" | "all")
```

**Response:**
```json
{
  "data": [
    {
      "id": "execution-123",
      "rule_id": "rule-123",
      "transaction_id": "txn-456",
      "executed_at": "2024-01-15T10:30:00Z",
      "execution_status": "success",
      "result": {
        "account_posted": "4100",
        "amount_posted": 1500
      },
      "error": null
    }
  ],
  "meta": {
    "total": 247,
    "success_count": 245,
    "failed_count": 2,
    "success_rate": "99.19%"
  }
}
```

---

## Rule Templates APIs

### List All Templates
**Endpoint:** `GET /api/aurum/rule-templates`

**Response:**
```json
{
  "data": [
    {
      "id": "template-1",
      "name": "Auto-Post Toast Sales >$1000",
      "description": "Auto-post Toast POS sales over $1,000",
      "category": "pos_integration",
      "rule_template": {
        "conditions": [...],
        "actions": [...]
      },
      "success_rate": 99.8,
      "usage_count": 1247
    }
  ]
}
```

---

## AI Learning & Suggestions APIs

### Get AI Rule Suggestions
**Endpoint:** `GET /api/aurum/rules/ai-suggested`

**Query Parameters:**
```
entity_id: string (required)
confidence_min: number (optional, default: 70)
limit: number (optional, default: 20)
```

**Response:**
```json
{
  "data": [
    {
      "id": "ai-suggestion-123",
      "rule_name": "Auto-Defer Sysco Posting 2 Hours",
      "confidence_score": 95,
      "pattern": {
        "detected_in": 5,
        "identical_decisions": 5,
        "consistency": "100%"
      },
      "example_transactions": [
        {
          "transaction_id": "txn-1",
          "operator_decision": "defer_2_hours",
          "timestamp": "2024-01-10T14:22:00Z"
        }
      ],
      "estimated_impact": {
        "matching_transactions_per_week": 3,
        "potential_time_savings_hours": 2.5
      }
    }
  ]
}
```

---

### Accept AI Suggestion
**Endpoint:** `POST /api/aurum/rules/ai-suggested/:suggestionId/accept`

**Request Body:**
```json
{
  "modify_conditions": [
    {
      "field": "amount",
      "operator": "less_than",
      "value": 5000
    }
  ]
}
```

**Response:** Created rule object

---

### Reject AI Suggestion
**Endpoint:** `POST /api/aurum/rules/ai-suggested/:suggestionId/reject`

**Request Body:**
```json
{
  "reason": "Too specific to this vendor"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Suggestion rejected"
}
```

---

### Track Operator Override
**Endpoint:** `POST /api/aurum/rules/override/track`

**Request Body:**
```json
{
  "entity_id": "entity-1",
  "operator_id": "user-123",
  "transaction_id": "txn-456",
  "ai_recommendation": "auto_approve",
  "operator_decision": "defer",
  "override_reason": "Waiting for PO clarification",
  "confidence_was": 87
}
```

**Response:**
```json
{
  "id": "override-123",
  "recorded_at": "2024-01-15T10:30:00Z"
}
```

---

### Get Learning Statistics
**Endpoint:** `GET /api/aurum/learning/statistics`

**Query Parameters:**
```
entity_id: string (required)
days: number (optional, default: 30)
```

**Response:**
```json
{
  "period_days": 30,
  "total_overrides": 12,
  "unique_patterns": 4,
  "suggested_rules": 2,
  "accepted_rules": 1,
  "rejected_rules": 1,
  "estimated_time_saved_hours": 4.5,
  "top_patterns": [
    {
      "reason": "Defer Sysco posting",
      "occurrences": 5,
      "consistency": "100%"
    }
  ]
}
```

---

## Forensic Accounting APIs

### Log Human Action
**Endpoint:** `POST /api/aurum/forensic/human-action`

**Request Body:**
```json
{
  "entity_id": "entity-1",
  "user_id": "user-123",
  "user_name": "John Smith",
  "user_role": "controller",
  "user_ip": "192.168.1.1",
  "transaction_type": "invoice_approval",
  "transaction_id": "inv-2024-001",
  "transaction_data": {
    "vendor": "Sysco",
    "amount": 15000
  },
  "decision_type": "approve",
  "reason": "3-way match verified, PO matches"
}
```

**Response:**
```json
{
  "id": "audit-entry-123",
  "user_id": "user-123",
  "user_name": "John Smith",
  "decision_type": "approve",
  "this_hash": "sha256:abcd1234...",
  "prev_hash": "sha256:xyz9876...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### Log AI Action
**Endpoint:** `POST /api/aurum/forensic/ai-action`

**Request Body:**
```json
{
  "entity_id": "entity-1",
  "ai_component": "echo",
  "ai_action": "recommended_approval",
  "ai_confidence": 92.5,
  "transaction_type": "invoice",
  "transaction_id": "inv-2024-001",
  "decision_type": "approval_recommendation",
  "reasoning": "Amount within normal range, vendor verified"
}
```

**Response:** Audit entry object

---

### Verify Audit Trail Integrity
**Endpoint:** `GET /api/aurum/forensic/verify-integrity`

**Query Parameters:**
```
entity_id: string (required)
```

**Response:**
```json
{
  "is_valid": true,
  "entries_checked": 1247,
  "first_break_at": null,
  "warnings": []
}
```

---

### Get Forensic Report
**Endpoint:** `GET /api/aurum/forensic/report`

**Query Parameters:**
```
entity_id: string (required)
start_date: string (ISO 8601, optional)
end_date: string (ISO 8601, optional)
transaction_types: string[] (optional, comma-separated)
limit: number (optional, default: 100, max: 10000)
offset: number (optional, default: 0)
```

**Response:**
```json
{
  "period": "2024-01-01 to 2024-01-31",
  "total_entries": 1247,
  "summary": {
    "human_actions": 589,
    "ai_actions": 658,
    "human_approvals": 247,
    "human_rejections": 12,
    "unique_users": 8
  },
  "compliance_ready": true,
  "data": [...]
}
```

---

### Get User Activity Audit
**Endpoint:** `GET /api/aurum/forensic/user-activity/:userId`

**Query Parameters:**
```
entity_id: string (required)
days: number (optional, default: 30)
```

**Response:**
```json
{
  "user_id": "user-123",
  "user_name": "John Smith",
  "action_count": 47,
  "period_days": 30,
  "actions": [...]
}
```

---

### Get AI Activity Audit
**Endpoint:** `GET /api/aurum/forensic/ai-activity`

**Query Parameters:**
```
entity_id: string (required)
ai_component: string (optional)
days: number (optional, default: 30)
```

**Response:**
```json
{
  "component": "echo",
  "action_count": 658,
  "period_days": 30,
  "actions": [...]
}
```

---

## Error Handling

All API endpoints follow standard error response format:

```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "error details"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req-123456"
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|------|------------|---------|
| MISSING_ENTITY_ID | 400 | entityId query parameter required |
| VALIDATION_ERROR | 400 | Request validation failed |
| RULE_NOT_FOUND | 404 | Rule ID doesn't exist |
| INSUFFICIENT_PERMISSIONS | 403 | User lacks required permission |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## Rate Limiting

API requests are rate limited:

| Endpoint Type | Limit | Window |
|---|---|---|
| General API | 100 req/IP | 15 minutes |
| Rule Creation | 50 rules/user | 1 hour |
| Forensic Queries | 20 queries/user | 1 hour |
| Authentication | 5 attempts/IP | 15 minutes |

Response includes rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705334400
```

---

## Authentication

All endpoints require Bearer token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Token obtained from login endpoint:

```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Status**: PRODUCTION READY
