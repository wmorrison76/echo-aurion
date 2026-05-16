# API Reference Documentation

Complete API reference with code examples for the Lucca restaurant management platform.

## Table of Contents

- [Authentication](#authentication)
- [Invoices](#invoices)
- [Inventory](#inventory)
- [Purchase Orders](#purchase-orders)
- [Outlets](#outlets)
- [Analytics](#analytics)
- [White-Label Configuration](#white-label-configuration)
- [Payments](#payments)
- [Notifications](#notifications)
- [Error Handling](#error-handling)

---

## Authentication

All API endpoints require authentication using Bearer tokens.

### Base URL

```
https://your-domain.com/api
```

### Headers

```http
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json
```

### Authentication Example

```typescript
// TypeScript/JavaScript
const apiHeaders = {
  Authorization: `Bearer ${authToken}`,
  "Content-Type": "application/json",
};

const response = await fetch("/api/invoices", {
  headers: apiHeaders,
});
```

```python
# Python
import requests

headers = {
    'Authorization': f'Bearer {auth_token}',
    'Content-Type': 'application/json'
}

response = requests.get('/api/invoices', headers=headers)
```

```bash
# cURL
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     https://your-domain.com/api/invoices
```

---

## Invoices

### List Invoices

**Endpoint:** `GET /api/invoices`

**Query Parameters:**

- `outlet_id` (optional): Filter by outlet
- `status` (optional): Filter by status (paid, pending, overdue, partially_paid)
- `limit` (optional): Results per page (default: 50, max: 500)
- `offset` (optional): Pagination offset (default: 0)
- `sort_by` (optional): Sort field (created_at, amount, status)
- `sort_order` (optional): asc or desc (default: desc)

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "invoice_number": "INV-001234",
      "vendor_name": "Fresh Produce Co",
      "amount": 2500.0,
      "status": "paid",
      "outlet_id": "outlet-uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-16T14:20:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Example Requests:**

```typescript
// Get all invoices
const invoices = await fetch("/api/invoices", {
  headers: apiHeaders,
}).then((r) => r.json());

// Get invoices for specific outlet
const outletInvoices = await fetch("/api/invoices?outlet_id=outlet-123", {
  headers: apiHeaders,
}).then((r) => r.json());

// Get pending invoices
const pendingInvoices = await fetch("/api/invoices?status=pending", {
  headers: apiHeaders,
}).then((r) => r.json());

// Get paginated results
const page2 = await fetch("/api/invoices?limit=50&offset=50", {
  headers: apiHeaders,
}).then((r) => r.json());
```

```python
# Get all invoices
response = requests.get('https://api.example.com/api/invoices', headers=headers)
invoices = response.json()

# Get pending invoices
response = requests.get(
    'https://api.example.com/api/invoices',
    params={'status': 'pending'},
    headers=headers
)
pending = response.json()
```

### Get Invoice Details

**Endpoint:** `GET /api/invoices/:id`

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "invoice_number": "INV-001234",
  "vendor_name": "Fresh Produce Co",
  "amount": 2500.0,
  "status": "paid",
  "outlet_id": "outlet-uuid",
  "created_at": "2024-01-15T10:30:00Z",
  "items": [
    {
      "id": "item-uuid-1",
      "description": "Organic Lettuce",
      "quantity": 50,
      "unit_price": 25.0,
      "total_price": 1250.0
    },
    {
      "id": "item-uuid-2",
      "description": "Tomatoes",
      "quantity": 100,
      "unit_price": 12.5,
      "total_price": 1250.0
    }
  ]
}
```

**Example Request:**

```typescript
const invoice = await fetch(
  "/api/invoices/550e8400-e29b-41d4-a716-446655440000",
  {
    headers: apiHeaders,
  },
).then((r) => r.json());

console.log(`Invoice ${invoice.invoice_number}: $${invoice.amount}`);
invoice.items.forEach((item) => {
  console.log(`- ${item.description}: ${item.quantity} x $${item.unit_price}`);
});
```

### Create Invoice

**Endpoint:** `POST /api/invoices`

**Request Body:**

```json
{
  "invoice_number": "INV-001235",
  "vendor_name": "Premium Meats Inc",
  "amount": 3500.0,
  "status": "pending",
  "outlet_id": "outlet-uuid",
  "items": [
    {
      "description": "Ribeye Steak",
      "quantity": 50,
      "unit_price": 65.0,
      "total_price": 3250.0
    },
    {
      "description": "Ground Beef",
      "quantity": 20,
      "unit_price": 12.5,
      "total_price": 250.0
    }
  ]
}
```

**Response:** (201 Created)

```json
{
  "id": "new-uuid",
  "invoice_number": "INV-001235",
  "vendor_name": "Premium Meats Inc",
  "amount": 3500.0,
  "status": "pending",
  "outlet_id": "outlet-uuid",
  "created_at": "2024-01-17T08:00:00Z"
}
```

**Example Request:**

```typescript
const newInvoice = await fetch("/api/invoices", {
  method: "POST",
  headers: apiHeaders,
  body: JSON.stringify({
    invoice_number: "INV-001235",
    vendor_name: "Premium Meats Inc",
    amount: 3500.0,
    status: "pending",
    outlet_id: "outlet-uuid",
    items: [
      {
        description: "Ribeye Steak",
        quantity: 50,
        unit_price: 65.0,
        total_price: 3250.0,
      },
    ],
  }),
}).then((r) => r.json());

console.log(`Created invoice: ${newInvoice.invoice_number}`);
```

### Update Invoice

**Endpoint:** `PATCH /api/invoices/:id`

**Request Body:** (all fields optional)

```json
{
  "status": "paid",
  "amount": 3500.0
}
```

**Example Request:**

```typescript
const updated = await fetch(
  "/api/invoices/550e8400-e29b-41d4-a716-446655440000",
  {
    method: "PATCH",
    headers: apiHeaders,
    body: JSON.stringify({
      status: "paid",
    }),
  },
).then((r) => r.json());

console.log(`Updated invoice status to: ${updated.status}`);
```

### Delete Invoice

**Endpoint:** `DELETE /api/invoices/:id`

**Response:** (204 No Content)

**Example Request:**

```typescript
await fetch("/api/invoices/550e8400-e29b-41d4-a716-446655440000", {
  method: "DELETE",
  headers: apiHeaders,
});

console.log("Invoice deleted");
```

---

## Inventory

### List Inventory Items

**Endpoint:** `GET /api/inventory`

**Query Parameters:**

- `outlet_id` (optional): Filter by outlet
- `category` (optional): Filter by category
- `low_stock` (optional): Boolean - show only low stock items
- `search` (optional): Search by product name

**Response:**

```json
{
  "data": [
    {
      "id": "inv-uuid-1",
      "product_name": "Grilled Salmon",
      "category": "Main Courses",
      "unit_price": 16.95,
      "quantity_on_hand": 45,
      "par_level": 30,
      "outlet_id": "outlet-uuid",
      "status": "in_stock",
      "last_updated": "2024-01-20T14:30:00Z"
    }
  ],
  "summary": {
    "total_items": 36,
    "low_stock_count": 8,
    "out_of_stock_count": 0
  }
}
```

**Example Request:**

```typescript
// Get all inventory
const inventory = await fetch("/api/inventory", {
  headers: apiHeaders,
}).then((r) => r.json());

// Get low stock items
const lowStock = await fetch("/api/inventory?low_stock=true", {
  headers: apiHeaders,
}).then((r) => r.json());

// Search inventory
const results = await fetch("/api/inventory?search=salmon", {
  headers: apiHeaders,
}).then((r) => r.json());
```

### Get Inventory Item

**Endpoint:** `GET /api/inventory/:id`

### Update Inventory Item

**Endpoint:** `PATCH /api/inventory/:id`

**Request Body:**

```json
{
  "quantity_on_hand": 50,
  "par_level": 35
}
```

---

## Purchase Orders

### List Purchase Orders

**Endpoint:** `GET /api/purchase-orders`

**Query Parameters:**

- `outlet_id` (optional): Filter by outlet
- `status` (optional): draft, sent, confirmed, received, cancelled
- `vendor_name` (optional): Filter by vendor

**Example Request:**

```typescript
// Get all purchase orders
const orders = await fetch("/api/purchase-orders", {
  headers: apiHeaders,
}).then((r) => r.json());

// Get confirmed orders
const confirmed = await fetch("/api/purchase-orders?status=confirmed", {
  headers: apiHeaders,
}).then((r) => r.json());
```

### Create Purchase Order

**Endpoint:** `POST /api/purchase-orders`

**Request Body:**

```json
{
  "po_number": "PO-005001",
  "vendor_name": "Beverage Distributor",
  "status": "draft",
  "total_amount": 1500.0,
  "outlet_id": "outlet-uuid",
  "items": [
    {
      "description": "Coffee Beans",
      "quantity": 25,
      "unit_price": 45.0
    }
  ]
}
```

---

## Outlets

### List All Outlets

**Endpoint:** `GET /api/outlets`

**Response:**

```json
{
  "data": [
    {
      "id": "outlet-uuid-1",
      "name": "Downtown Store",
      "location": "123 Main Street",
      "status": "active",
      "created_at": "2023-06-15T10:00:00Z"
    }
  ]
}
```

### Get Outlet Details

**Endpoint:** `GET /api/outlets/:id`

### Create Outlet

**Endpoint:** `POST /api/outlets`

**Request Body:**

```json
{
  "name": "New Location",
  "location": "789 Oak Street",
  "status": "active"
}
```

---

## Analytics

### Get Dashboard Metrics

**Endpoint:** `GET /api/analytics/dashboard`

**Response:**

```json
{
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "metrics": {
    "totalRevenue": 450000.0,
    "totalExpenses": 125450.75,
    "grossProfit": 324549.25,
    "profitMargin": 72.1,
    "invoiceCount": 150,
    "outstandingAmount": 45000.0
  },
  "trends": {
    "revenueChange": 12.5,
    "expenseChange": -3.2,
    "profitChange": 18.7
  }
}
```

### Get Sales Analytics

**Endpoint:** `GET /api/analytics/sales`

**Query Parameters:**

- `outlet_id` (optional): Filter by outlet
- `start_date` (required): YYYY-MM-DD
- `end_date` (required): YYYY-MM-DD

**Response:**

```json
{
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "summary": {
    "totalSales": 450000.0,
    "averageDailySales": 14516.13,
    "totalTransactions": 5620,
    "averageTransactionValue": 80.07
  },
  "byOutlet": [
    {
      "outletId": "outlet-uuid",
      "outletName": "Downtown Store",
      "sales": 150000.0,
      "transactions": 1850,
      "share": 33.3
    }
  ]
}
```

---

## White-Label Configuration

### Get White-Label Config

**Endpoint:** `GET /api/white-label/config?domain=example.com`

**Response:**

```json
{
  "id": "config-uuid",
  "name": "Client Branding",
  "domain": "example.com",
  "isActive": true,
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#8B5CF6"
  },
  "branding": {
    "appName": "Client App",
    "logoUrl": "/logo.svg"
  },
  "featureFlags": {
    "enablePayments": true,
    "enableAnalytics": true
  }
}
```

### Update White-Label Config

**Endpoint:** `PATCH /api/white-label/configs/:id`

**Request Body:**

```json
{
  "colors": {
    "primary": "#FF6B6B"
  },
  "branding": {
    "appName": "Updated Name"
  }
}
```

---

## Payments

### Process Payment

**Endpoint:** `POST /api/payments/process`

**Request Body:**

```json
{
  "amount": 2500.0,
  "currency": "USD",
  "method": "stripe",
  "orderId": "order-uuid",
  "paymentMethod": {
    "type": "card",
    "cardToken": "tok_visa"
  }
}
```

**Response:**

```json
{
  "success": true,
  "paymentId": "pay-uuid",
  "orderId": "order-uuid",
  "amount": 2500.0,
  "status": "completed",
  "timestamp": "2024-01-20T15:30:00Z"
}
```

### Get Payment Status

**Endpoint:** `GET /api/payments/:paymentId`

---

## Notifications

### Create Notification

**Endpoint:** `POST /api/notifications`

**Request Body:**

```json
{
  "userId": "user-uuid",
  "title": "Invoice Paid",
  "message": "Invoice INV-001234 has been paid",
  "type": "success",
  "channels": ["email", "push", "in_app"]
}
```

### Get User Notifications

**Endpoint:** `GET /api/notifications?user_id=user-uuid`

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be greater than 0"
      }
    ]
  }
}
```

### Common HTTP Status Codes

| Code | Meaning      | Example                      |
| ---- | ------------ | ---------------------------- |
| 200  | OK           | Successful GET/PATCH         |
| 201  | Created      | Invoice created successfully |
| 400  | Bad Request  | Invalid parameters           |
| 401  | Unauthorized | Missing/invalid token        |
| 403  | Forbidden    | Insufficient permissions     |
| 404  | Not Found    | Resource doesn't exist       |
| 409  | Conflict     | Duplicate invoice number     |
| 500  | Server Error | Internal error               |

### Handling Errors in Code

```typescript
try {
  const response = await fetch("/api/invoices", {
    method: "POST",
    headers: apiHeaders,
    body: JSON.stringify(invoiceData),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`Error (${response.status}):`, error.error.message);

    if (error.error.details) {
      error.error.details.forEach((detail) => {
        console.error(`- ${detail.field}: ${detail.message}`);
      });
    }
    return;
  }

  const invoice = await response.json();
  console.log("Invoice created:", invoice);
} catch (error) {
  console.error("Network error:", error);
}
```

---

## Rate Limiting

All API endpoints are rate limited to prevent abuse.

- **Rate Limit:** 1000 requests per hour per token
- **Headers:**
  - `X-RateLimit-Limit`: 1000
  - `X-RateLimit-Remaining`: 999
  - `X-RateLimit-Reset`: Unix timestamp

```typescript
// Check rate limit status
const response = await fetch("/api/invoices", { headers: apiHeaders });
const remaining = response.headers.get("X-RateLimit-Remaining");
console.log(`Requests remaining: ${remaining}`);
```

---

## Webhooks

Register webhooks for real-time events.

### Register Webhook

**Endpoint:** `POST /api/webhooks`

**Request Body:**

```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["invoice.created", "invoice.updated", "payment.completed"]
}
```

### Webhook Payload

```json
{
  "id": "webhook-uuid",
  "timestamp": "2024-01-20T15:30:00Z",
  "event": "invoice.created",
  "data": {
    "invoiceId": "inv-uuid",
    "invoiceNumber": "INV-001234",
    "amount": 2500.0
  }
}
```

---

## Code Examples

### Complete Invoice Workflow

```typescript
// Fetch invoices
const invoices = await fetch("/api/invoices?status=pending", {
  headers: apiHeaders,
}).then((r) => r.json());

// Process each invoice
for (const invoice of invoices.data) {
  console.log(`Processing ${invoice.invoice_number}: $${invoice.amount}`);

  // Update status to paid
  const updated = await fetch(`/api/invoices/${invoice.id}`, {
    method: "PATCH",
    headers: apiHeaders,
    body: JSON.stringify({ status: "paid" }),
  }).then((r) => r.json());

  // Send notification
  await fetch("/api/notifications", {
    method: "POST",
    headers: apiHeaders,
    body: JSON.stringify({
      userId: "user-uuid",
      title: "Invoice Marked as Paid",
      message: `${invoice.invoice_number} is now marked as paid`,
      type: "success",
    }),
  });
}
```

### Multi-Outlet Inventory Check

```typescript
// Get all outlets
const outlets = await fetch("/api/outlets", {
  headers: apiHeaders,
}).then((r) => r.json());

// Check inventory at each outlet
for (const outlet of outlets.data) {
  const inventory = await fetch(
    `/api/inventory?outlet_id=${outlet.id}&low_stock=true`,
    {
      headers: apiHeaders,
    },
  ).then((r) => r.json());

  if (inventory.data.length > 0) {
    console.log(`Low stock at ${outlet.name}:`);
    inventory.data.forEach((item) => {
      console.log(
        `- ${item.product_name}: ${item.quantity_on_hand}/${item.par_level}`,
      );
    });
  }
}
```

---

## SDK Availability

Official SDKs are available for:

- JavaScript/TypeScript
- Python
- Ruby
- Go
- PHP

See the [SDK Documentation](./SDK_GUIDE.md) for installation and usage.

---

## Support

For API issues or questions:

- Email: api-support@lucca.io
- Documentation: https://docs.lucca.io
- Status Page: https://status.lucca.io
