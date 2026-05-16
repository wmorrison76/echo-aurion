# EchoCellar Ops – Inventory & Costing Service

**Purpose:** Real-time inventory tracking, COGS reconciliation, and month-end beverage cost reporting.

## Features

- **Month-End COGS** — Opening + Purchases - Closing = COGS
- **Beverage Cost %** �� (COGS / Revenue) × 100
- **Variance Analysis** — Expected (par level) vs Actual inventory
- **Purchase History** — Invoice tracking and supplier costing
- **FIFO Valuation** — First-In-First-Out inventory costing method
- **Multi-venue Support** — Track costs per venue/location

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase or local)

### Installation

1. Create `.env` file:

   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/sommelier_db
   COSTING_PORT=8100
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start service:
   ```bash
   npm run dev
   ```

Service will run on `http://localhost:8100`

## API Endpoints

### GET /reports/month-end/:venueId/:month

Compute month-end COGS and beverage cost percentage.

**Parameters:**

- `venueId` — UUID of venue
- `month` — Format: `YYYY-MM` (e.g., `2024-01`)

**Response:**

```json
{
  "status": "ok",
  "data": {
    "venueId": "uuid",
    "month": "2024-01",
    "opening": 5000.0,
    "purchases": 8500.0,
    "closing": 4200.0,
    "cogs": 9300.0,
    "costPct": "28.50",
    "revenue": 32625.0
  }
}
```

### GET /reports/variance/:venueId/:month

Analyze inventory variance (expected par vs actual).

**Response:**

```json
{
  "status": "ok",
  "data": {
    "venueId": "uuid",
    "month": "2024-01",
    "variances": [
      {
        "wine_id": "uuid",
        "expected_qty": 24,
        "actual_qty": 22,
        "variance": -2,
        "variance_pct": "-8.33"
      }
    ],
    "totalVariance": -8
  }
}
```

### GET /reports/purchases

Get purchase history for a date range.

**Query Parameters:**

- `startDate` — ISO format (required)
- `endDate` — ISO format (required)

**Example:**

```
GET /reports/purchases?startDate=2024-01-01&endDate=2024-01-31
```

### POST /reports/purchases

Record a new purchase order.

**Body:**

```json
{
  "supplier_id": "uuid (optional)",
  "invoice_number": "INV-2024-001",
  "total_cost": 1250.5
}
```

### GET /reports/fifo/:venueId/:month

Calculate FIFO (First-In-First-Out) inventory valuation.

**Response:**

```json
{
  "status": "ok",
  "data": {
    "venueId": "uuid",
    "month": "2024-01",
    "method": "FIFO",
    "lots": [
      {
        "wine_id": "uuid",
        "lot_code": "LOT-001",
        "qty_bottles": 12,
        "cost_per_bottle": 50.0,
        "received_date": "2024-01-05"
      }
    ],
    "totalValue": 4200.0
  }
}
```

## Database Schema Requirements

### wines

- id, sku, name, producer, region, vintage, retail_price, cost_price

### inventory_lots

- id, wine_id, venue_id, bin_location, qty_bottles, cost_per_bottle, received_date, lot_code, par_level

### purchases

- id, supplier_id, invoice_number, total_cost, created_at

### sales (optional)

- id, venue_id, total, created_at

## Calculations

### COGS Formula

```
COGS = Opening Inventory + Purchases - Closing Inventory
```

### Beverage Cost %

```
Beverage Cost % = (COGS / Revenue) × 100
```

Typical target: 20-28% depending on venue type and pricing strategy.

### Variance Analysis

```
Variance = Actual Qty - Expected Qty (Par Level)
Variance % = (Variance / Expected Qty) × 100
```

Negative variance indicates over-pouring or loss; positive indicates under-usage.

## Integration

### With Backend API

Call from main backend to supplement wine catalog data:

```typescript
const monthEnd = await fetch(
  `http://localhost:8100/reports/month-end/${venueId}/${month}`,
  { method: "GET" },
);
```

### With Mobile App

Query variance to show cellar team where adjustments are needed.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `COSTING_PORT` — Port to run on (default: 8100)

## Next Steps

- Section 4: Mobile/Tablet App (React Native)
- Section 5: Sales History & Menu Integration
- Section 6: Multi-Venue Sync Hub
