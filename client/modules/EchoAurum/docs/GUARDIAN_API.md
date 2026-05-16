# Guardian API Documentation

## Overview

This document describes all Guardian API endpoints used to trigger Guardian checks, retrieve results, and access audit trails.

## Base URL
```
https://api.echoaurum.com/api/guardian
```

## Authentication
All Guardian endpoints require valid session authentication. Include the session token in request headers.

---

## POST /api/aurum/journal-entries

**Purpose:** Create and validate a journal entry with full Guardian checks

**Request:**
```json
{
  "entryNumber": "JE-2024-001",
  "entityId": "ent-001",
  "periodDate": "2024-01-15",
  "description": "Monthly revenue posting",
  "lines": [
    {
      "accountCode": "1010",
      "accountName": "Bank Account",
      "debitAmount": 5000,
      "creditAmount": 0,
      "costCenter": "CC-001"
    },
    {
      "accountCode": "4000",
      "accountName": "Room Revenue",
      "debitAmount": 0,
      "creditAmount": 5000
    }
  ]
}
```

**Response (Success - PASSED):**
```json
{
  "success": true,
  "entryId": "je-001",
  "status": "posted",
  "guardianResults": {
    "transactionId": "je-001",
    "timestamp": "2024-01-15T10:30:00Z",
    "passedAll": true,
    "overallStatus": "PASSED",
    "blockingErrors": [],
    "warnings": [],
    "riskScore": 0,
    "argus": {
      "passed": true,
      "errors": [],
      "warnings": [],
      "checksRun": [
        "JOURNAL_LINES_EXIST",
        "GL_ACCOUNTS_VALID",
        "DEBITS_EQUAL_CREDITS",
        "LINE_VALIDITY",
        "REQUIRED_COST_CENTERS",
        "REQUIRED_DEPARTMENTS",
        "NO_DUPLICATE_LINES",
        "CURRENCY_CONSISTENCY"
      ],
      "riskScore": 0
    },
    "zelda": {
      "passed": true,
      "duplicatesDetected": [],
      "autoHeals": [],
      "warnings": []
    },
    "phoenix": {
      "passed": true,
      "anomalies": [],
      "riskScore": 0,
      "warnings": []
    },
    "odin": {
      "passed": true,
      "transactionHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "auditTrailId": "audit_1705316400000_abc123",
      "warnings": []
    }
  }
}
```

**Response (BLOCKED - Argus Failure):**
```json
{
  "success": false,
  "status": 400,
  "error": "Guardian validation failed",
  "guardianResults": {
    "transactionId": "je-001",
    "timestamp": "2024-01-15T10:30:00Z",
    "passedAll": false,
    "overallStatus": "BLOCKED",
    "blockingErrors": [
      "GL Account 9999 does not exist"
    ],
    "warnings": [],
    "riskScore": 100,
    "argus": {
      "passed": false,
      "errors": [
        "GL Account 9999 does not exist"
      ],
      "warnings": [],
      "checksRun": [
        "JOURNAL_LINES_EXIST",
        "GL_ACCOUNTS_VALID"
      ],
      "riskScore": 100
    }
  }
}
```

**Response (WARNINGS - Phoenix Alert):**
```json
{
  "success": true,
  "entryId": "je-001",
  "status": "posted",
  "guardianResults": {
    "transactionId": "je-001",
    "timestamp": "2024-01-15T10:30:00Z",
    "passedAll": true,
    "overallStatus": "WARNINGS",
    "blockingErrors": [],
    "warnings": [
      "Amount $50,000 is 2x average ($25,000)"
    ],
    "riskScore": 15,
    "phoenix": {
      "passed": true,
      "anomalies": [
        {
          "type": "LARGE_AMOUNT",
          "severity": "WARNING",
          "message": "Amount $50,000 is 2x average ($25,000)"
        }
      ],
      "riskScore": 15,
      "warnings": [
        "Amount $50,000 is 2x average ($25,000)"
      ]
    }
  }
}
```

**Status Codes:**
- `200 OK` - Entry created and posted (PASSED or WARNINGS)
- `400 Bad Request` - Guardian validation failed (BLOCKED)
- `401 Unauthorized` - Invalid session
- `422 Unprocessable Entity` - Invalid request data

---

## POST /api/aurum/ap-invoices

**Purpose:** Create and validate an AP invoice with Guardian checks

**Request:**
```json
{
  "invoiceNumber": "INV-00001",
  "entityId": "ent-001",
  "vendorId": "v-sysco",
  "vendorName": "Sysco Coastal",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-14",
  "totalAmount": 5000,
  "description": "Food supplies"
}
```

**Response (Success):**
```json
{
  "success": true,
  "invoiceId": "inv-001",
  "status": "matched",
  "guardianResults": {
    "transactionId": "inv-001",
    "timestamp": "2024-01-15T10:30:00Z",
    "passedAll": true,
    "overallStatus": "PASSED",
    "blockingErrors": [],
    "warnings": [],
    "riskScore": 0,
    "zelda": {
      "passed": true,
      "duplicatesDetected": [],
      "autoHeals": [],
      "warnings": []
    },
    "phoenix": {
      "passed": true,
      "anomalies": [],
      "riskScore": 0,
      "warnings": []
    },
    "odin": {
      "passed": true,
      "transactionHash": "xyz789abc...",
      "auditTrailId": "audit_1705316400000_xyz789"
    }
  }
}
```

**Response (Duplicate Detected):**
```json
{
  "success": true,
  "invoiceId": "inv-001",
  "status": "duplicate_review",
  "guardianResults": {
    "passedAll": true,
    "overallStatus": "WARNINGS",
    "warnings": [
      "Possible exact duplicate: Sysco invoice INV-00001 for $5,000 from 1/10/2024"
    ],
    "zelda": {
      "passed": false,
      "duplicatesDetected": [
        {
          "type": "EXACT_DUPLICATE",
          "message": "Exact duplicate: Sysco invoice INV-00001 for $5,000",
          "confidence": 0.98,
          "matchingTransactionId": "inv-999"
        }
      ],
      "autoHeals": [],
      "warnings": [
        "Exact duplicate: Sysco invoice INV-00001 for $5,000"
      ]
    }
  }
}
```

---

## GET /api/guardian/checks/:transactionId

**Purpose:** Retrieve Guardian check results for a posted transaction

**Parameters:**
- `transactionId` (string, required) - ID of journal entry or invoice

**Response:**
```json
{
  "success": true,
  "transactionId": "je-001",
  "guardianResults": {
    "transactionId": "je-001",
    "timestamp": "2024-01-15T10:30:00Z",
    "passedAll": true,
    "overallStatus": "PASSED",
    "blockingErrors": [],
    "warnings": [],
    "riskScore": 0,
    "argus": { ... },
    "zelda": { ... },
    "phoenix": { ... },
    "odin": { ... }
  }
}
```

**Status Codes:**
- `200 OK` - Results retrieved
- `404 Not Found` - Transaction not found
- `401 Unauthorized` - Invalid session

---

## GET /api/guardian/audit/:transactionId

**Purpose:** Retrieve Odin audit trail for a specific transaction

**Parameters:**
- `transactionId` (string, required) - ID of transaction
- `includeChain` (boolean, optional) - Include full hash chain (default: false)

**Response:**
```json
{
  "success": true,
  "transactionId": "je-001",
  "auditTrail": {
    "id": "audit_1705316400000_abc123",
    "transactionId": "je-001",
    "transactionType": "journal_entry",
    "action": "posted",
    "actor": "sarah.johnson@hotel.com",
    "actorRole": "controller",
    "occurredAt": "2024-01-15T10:30:00Z",
    "reason": "Monthly revenue posting",
    "transactionHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "prevHash": "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4",
    "chainVerified": true,
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "immutable": true
  }
}
```

**With Chain (includeChain=true):**
```json
{
  "success": true,
  "auditTrail": { ... },
  "hashChain": [
    {
      "order": 1,
      "hash": "hash1",
      "prevHash": null,
      "timestamp": "2024-01-15T08:00:00Z"
    },
    {
      "order": 2,
      "hash": "hash2",
      "prevHash": "hash1",
      "timestamp": "2024-01-15T08:30:00Z"
    },
    {
      "order": 3,
      "hash": "hash3",
      "prevHash": "hash2",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "chainIntegrity": "VERIFIED"
}
```

---

## POST /api/guardian/audit-report

**Purpose:** Generate audit report for a date range (for compliance/audit)

**Request:**
```json
{
  "entityId": "ent-001",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "includeLowRisk": false,
  "format": "pdf"
}
```

**Response (JSON format):**
```json
{
  "success": true,
  "report": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "summary": {
      "totalTransactions": 487,
      "passedTransactions": 450,
      "warningTransactions": 35,
      "blockedTransactions": 2,
      "chainIntegrity": "VERIFIED"
    },
    "byStatus": {
      "PASSED": 450,
      "WARNINGS": 35,
      "BLOCKED": 2
    },
    "anomalies": [
      {
        "date": "2024-01-15",
        "transactionId": "je-001",
        "anomalyType": "LARGE_AMOUNT",
        "severity": "WARNING",
        "description": "Amount $50,000 is 2x average"
      }
    ],
    "chainVerification": {
      "firstHash": "a1b2c3...",
      "lastHash": "z9y8x7...",
      "linksVerified": 487,
      "brokenLinks": 0,
      "tamperedRecords": 0,
      "verdict": "CHAIN INTEGRITY VERIFIED"
    }
  },
  "downloadUrl": "https://api.echoaurum.com/audit-reports/report_2024_01.pdf"
}
```

**Response (PDF format):**
```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="audit_report_2024_01.pdf"
```

---

## GET /api/guardian/status

**Purpose:** Get current Guardian system status and statistics

**Response:**
```json
{
  "success": true,
  "status": {
    "system": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "uptime": "45 days, 23 hours",
    "guardians": {
      "argus": {
        "status": "healthy",
        "avgLatency": "42ms",
        "p99Latency": "89ms",
        "checksPerHour": 14500
      },
      "zelda": {
        "status": "healthy",
        "avgLatency": "56ms",
        "p99Latency": "124ms",
        "duplicatesDetected": 45,
        "autoHealsApplied": 12
      },
      "phoenix": {
        "status": "healthy",
        "avgLatency": "87ms",
        "p99Latency": "203ms",
        "anomaliesDetected": 128,
        "avgRiskScore": 12
      },
      "odin": {
        "status": "healthy",
        "avgLatency": "28ms",
        "p99Latency": "45ms",
        "auditTrailsCreated": 14500,
        "chainIntegrity": "VERIFIED"
      }
    },
    "performance": {
      "throughput": "3.2 transactions/sec",
      "avgOrchestrationTime": "213ms",
      "p99OrchestrationTime": "461ms",
      "cacheHitRate": "78.4%"
    },
    "reliability": {
      "successRate": "99.97%",
      "errorCount": "4 (last 24h)",
      "downtimeMinutes": "0"
    }
  }
}
```

---

## Error Responses

### Guardian Validation Failed (400)
```json
{
  "error": "Guardian validation failed",
  "status": 400,
  "guardianResults": {
    "blockingErrors": ["Error message 1", "Error message 2"],
    "overallStatus": "BLOCKED"
  }
}
```

### Unauthorized (401)
```json
{
  "error": "Unauthorized",
  "status": 401,
  "message": "Invalid or expired session token"
}
```

### Not Found (404)
```json
{
  "error": "Not Found",
  "status": 404,
  "message": "Transaction 'je-999' not found"
}
```

### Rate Limited (429)
```json
{
  "error": "Too Many Requests",
  "status": 429,
  "message": "Rate limit exceeded: 100 requests per minute",
  "retryAfter": 45
}
```

### Server Error (500)
```json
{
  "error": "Internal Server Error",
  "status": 500,
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **Guardian Checks:** 100 per minute per entity
- **Audit Reports:** 10 per day per entity
- **Status Queries:** 1000 per hour per session

---

## Examples

### Example 1: Create and Check Journal Entry
```bash
curl -X POST https://api.echoaurum.com/api/aurum/journal-entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session-token>" \
  -d '{
    "entryNumber": "JE-2024-001",
    "entityId": "ent-001",
    "periodDate": "2024-01-15",
    "description": "Monthly revenue",
    "lines": [
      {"accountCode": "1010", "debitAmount": 5000},
      {"accountCode": "4000", "creditAmount": 5000}
    ]
  }'
```

### Example 2: Retrieve Audit Trail
```bash
curl -X GET "https://api.echoaurum.com/api/guardian/audit/je-001?includeChain=true" \
  -H "Authorization: Bearer <session-token>"
```

### Example 3: Generate Audit Report
```bash
curl -X POST https://api.echoaurum.com/api/guardian/audit-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session-token>" \
  -d '{
    "entityId": "ent-001",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "format": "pdf"
  }' \
  --output audit_report.pdf
```

---

## Webhook Events (Optional)

If configured, Guardian can send webhook notifications:

```json
{
  "event": "guardian.transaction.blocked",
  "timestamp": "2024-01-15T10:30:00Z",
  "transactionId": "je-001",
  "reason": "GL Account 9999 does not exist",
  "guardian": "argus"
}
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { GuardianClient } from '@echoaurum/sdk';

const client = new GuardianClient({ sessionToken: '...' });

// Create and check journal entry
const result = await client.journalEntries.create({
  entryNumber: 'JE-2024-001',
  lines: [...]
});

if (result.guardianResults.overallStatus === 'PASSED') {
  console.log('Entry posted successfully');
} else if (result.guardianResults.overallStatus === 'WARNINGS') {
  console.log('Posted with warnings:', result.guardianResults.warnings);
} else {
  console.error('Entry blocked:', result.guardianResults.blockingErrors);
}
```

### Python
```python
from echoaurum import GuardianClient

client = GuardianClient(session_token='...')

result = client.create_journal_entry({
    'entryNumber': 'JE-2024-001',
    'lines': [...]
})

if result['guardianResults']['overallStatus'] == 'PASSED':
    print('Entry posted')
```

---

## Performance Tips

1. **Use Pagination** for audit reports (dates > 90 days)
2. **Cache Results** locally if checking same transaction multiple times
3. **Batch Operations** - Post multiple entries and check in parallel
4. **Monitor Latencies** - Set alerts if p99 > 500ms
5. **Use WebSocket** for real-time status updates (if available)

---

## Support & Troubleshooting

For API issues or questions:
- Documentation: https://echoaurum.com/docs/guardian
- Support: support@echoaurum.com
- Status: https://status.echoaurum.com
