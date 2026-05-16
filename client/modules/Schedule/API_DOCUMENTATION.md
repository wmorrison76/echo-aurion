# API Documentation

Complete API reference for all endpoints including authentication, data models, and examples.

## Table of Contents

1. [Authentication](#authentication)
2. [Base URLs](#base-urls)
3. [Response Format](#response-format)
4. [Core Endpoints](#core-endpoints)
5. [Advanced Features](#advanced-features)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Pagination](#pagination)

---

## Authentication

All API endpoints require JWT authentication via the `Authorization` header.

### Getting Started

```bash
# 1. Authenticate user
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Response includes JWT token
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "..." }
}

# 2. Include token in future requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Base URLs

| Environment | URL |
|---|---|
| Development | `http://localhost:8080` |
| Staging | `https://staging-api.example.com` |
| Production | `https://api.example.com` |

---

## Response Format

All endpoints return JSON with consistent structure:

### Success Response (2xx)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response (4xx, 5xx)
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

---

## Core Endpoints

### Predictive Operations Intelligence

#### Get Predictive Insights
```
GET /api/predictive-ops?org_id={org_id}
```

**Response:**
```json
{
  "success": true,
  "insights": [
    {
      "alert": "High labor costs detected",
      "severity": "high",
      "recommendation": "Review staffing levels",
      "metric": "labor_pct"
    }
  ]
}
```

#### Get Recent Anomalies
```
GET /api/predictive-ops/recent?org_id={org_id}&limit=10
```

#### Check Critical Alerts
```
GET /api/predictive-ops/critical-check?org_id={org_id}
```

---

### Advanced AI & Anomaly Detection

#### Labor Anomalies
```
GET /api/advanced-ai/labor-anomalies?org_id={org_id}&outlet_id={outlet_id}&days=30
```

**Parameters:**
- `org_id` (required): Organization ID
- `outlet_id` (required): Outlet ID
- `days` (optional, default: 30): Number of days to analyze

**Response:**
```json
{
  "success": true,
  "count": 3,
  "anomalies": [
    {
      "metric": "labor_pct_2024-01-15",
      "value": 35.5,
      "expected": 28.0,
      "zscore": 2.4,
      "severity": "high",
      "confidence": 0.92,
      "over_budget_pct": 26.8,
      "recommended_action": "Reduce hours: Labor exceeds budget significantly"
    }
  ]
}
```

#### Revenue Anomalies
```
GET /api/advanced-ai/revenue-anomalies?org_id={org_id}&outlet_id={outlet_id}&days=30
```

#### Schedule Optimization
```
GET /api/advanced-ai/schedule-optimization?org_id={org_id}&outlet_id={outlet_id}&dept_id={dept_id}
```

**Response:**
```json
{
  "success": true,
  "optimization": {
    "recommended_headcount": 8,
    "expected_revenue": 12500.50,
    "optimal_labor_pct": 27.5,
    "confidence": 0.85
  }
}
```

---

### Data Pipeline

#### Ingest Property Summary
```
POST /api/data-pipeline/ingest
```

**Request:**
```json
{
  "org_id": "org-123",
  "outlet_id": "outlet-456",
  "pos_system": "square",
  "date": "2024-01-15",
  "labor_cost": 2500,
  "pos_config": {
    "access_token": "sq_...",
    "location_id": "loc_..."
  }
}
```

#### Manual Data Entry
```
POST /api/data-pipeline/manual
```

**Request:**
```json
{
  "org_id": "org-123",
  "outlet_id": "outlet-456",
  "report_date": "2024-01-15",
  "labor_cost": 2500,
  "revenue": 10000,
  "tips": 1500
}
```

#### Get Property Summary
```
GET /api/data-pipeline/summary?org_id={org_id}&outlet_id={outlet_id}&start_date=2024-01-01&end_date=2024-01-31
```

---

### Performance Monitoring

#### Get Performance Stats
```
GET /api/performance/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "requests": {
      "total": 10234,
      "avgDuration": 125,
      "slowRequests": 45,
      "errorRate": 0.8,
      "percentiles": {
        "p50": 50,
        "p95": 500,
        "p99": 2000
      }
    },
    "queries": {
      "total": 8932,
      "avgDuration": 45,
      "slowQueries": 12
    }
  }
}
```

#### Get Recommendations
```
GET /api/performance/recommendations
```

#### Get Endpoint Analysis
```
GET /api/performance/endpoints?sort_by=avgDuration&limit=10
```

---

### Auto-Healing

#### Check System Health
```
GET /api/auto-healing/health
```

**Response:**
```json
{
  "success": true,
  "status": {
    "endpoints": [
      {
        "endpoint": "predictiveOps",
        "healthy": true,
        "responseTime": 145,
        "lastChecked": "2024-01-15T10:30:00Z"
      }
    ],
    "overallHealth": "healthy"
  }
}
```

#### Run Comprehensive Health Check
```
GET /api/auto-healing/check-all?org_id={org_id}&outlet_id={outlet_id}
```

#### Check Specific Endpoint
```
GET /api/auto-healing/check/predictiveops?org_id={org_id}
GET /api/auto-healing/check/datapipeline
GET /api/auto-healing/check/advancedai?org_id={org_id}&outlet_id={outlet_id}
GET /api/auto-healing/check/echo
```

---

### Security & Compliance

#### Get Security Status
```
GET /api/security/status
```

#### Get Audit Log
```
GET /api/security/audit-log?limit=50&offset=0&user_id={user_id}&table_name={table_name}
```

#### Get RLS Status
```
GET /api/security/rls-status
```

#### Get Compliance Status
```
GET /api/security/compliance-status
```

---

### Employee Onboarding

#### Complete Onboarding
```
POST /api/employees/onboard
```

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St, City, State 12345",
  "ssn": "123-45-6789",
  "dateOfBirth": "1990-01-15",
  "emergencyName": "Jane Doe",
  "emergencyPhone": "(555) 987-6543",
  "emergencyRelationship": "Spouse",
  "bankRoutingNumber": "123456789",
  "bankAccountNumber": "9876543210",
  "accountType": "checking",
  "position": "server",
  "department": "foh",
  "startDate": "2024-02-01"
}
```

#### Get Onboarding Status
```
GET /api/employees/{id}/onboarding-status
```

#### Upload Document
```
POST /api/employees/{id}/documents
```

**Request:**
```json
{
  "documentType": "w4",
  "content": "base64_encoded_file_content"
}
```

#### List Employees
```
GET /api/employees
```

---

## Advanced Features

### Echo Voice & AI

#### Send Echo Query
```
POST /api/echo-multilingual
```

**Request:**
```json
{
  "prompt": "What are my labor costs for today?",
  "lang": "en",
  "context": {
    "org_id": "org-123",
    "dept_id": "dept-456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "reply": "Your labor costs for today are $2,450, which is 12% above the daily standard.",
  "lang": "en",
  "model": "gpt-4o-mini",
  "usage": {
    "input_tokens": 45,
    "output_tokens": 25
  }
}
```

#### Detect Language
```
POST /api/echo-multilingual/detect-language
```

**Request:**
```json
{
  "text": "Quels sont mes coûts de main-d'œuvre?"
}
```

---

## Error Handling

### Common Error Codes

| Code | Status | Description |
|------|--------|---|
| UNAUTHORIZED | 401 | Invalid or missing authentication token |
| FORBIDDEN | 403 | User lacks permission for resource |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

### Example Error Response

```json
{
  "success": false,
  "error": "Invalid org_id parameter",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "org_id",
    "message": "org_id is required"
  }
}
```

---

## Rate Limiting

All endpoints enforce rate limiting:

- **Default**: 100 requests/minute per IP
- **Authenticated**: 1000 requests/minute per user

### Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705334400
```

### Handling Rate Limits

```javascript
if (response.status === 429) {
  const resetTime = parseInt(response.headers['x-ratelimit-reset']);
  const waitMs = (resetTime * 1000) - Date.now();
  console.log(`Rate limited. Wait ${waitMs}ms before retry.`);
}
```

---

## Pagination

Endpoints supporting pagination accept:

- `limit` (default: 50, max: 500): Number of items per page
- `offset` (default: 0): Starting position

### Example

```
GET /api/employees?limit=25&offset=50
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "total": 127,
  "limit": 25,
  "offset": 50,
  "employees": [...]
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get labor anomalies
const anomalies = await api.get('/api/advanced-ai/labor-anomalies', {
  params: {
    org_id: 'org-123',
    outlet_id: 'outlet-456',
    days: 30
  }
});
```

### Python

```python
import requests

headers = {
    'Authorization': f'Bearer {token}'
}

response = requests.get(
    'https://api.example.com/api/advanced-ai/labor-anomalies',
    headers=headers,
    params={
        'org_id': 'org-123',
        'outlet_id': 'outlet-456',
        'days': 30
    }
)
```

### cURL

```bash
curl -X GET 'https://api.example.com/api/advanced-ai/labor-anomalies' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...' \
  -H 'Content-Type: application/json' \
  -d '{
    "org_id": "org-123",
    "outlet_id": "outlet-456",
    "days": 30
  }'
```

---

## Postman Collection

Import the Postman collection to test all endpoints:

[Download Postman Collection](./postman-collection.json)

**Steps:**
1. Open Postman
2. Click "Import"
3. Select the collection file
4. Set `base_url` environment variable
5. Set `token` environment variable from login endpoint
6. Start testing!

---

## Webhooks

### Available Webhooks

- `order.created` - When order is created
- `employee.onboarded` - When employee completes onboarding
- `anomaly.detected` - When anomaly is detected
- `schedule.published` - When schedule is published

### Setting Up Webhooks

```
POST /api/webhooks/subscribe
```

**Request:**
```json
{
  "event": "anomaly.detected",
  "url": "https://your-domain.com/webhook",
  "secret": "webhook_secret_key"
}
```

---

## Support

- **Documentation**: https://docs.example.com
- **Issues**: https://github.com/example/issues
- **Email**: api-support@example.com
- **Slack**: #api-support channel
