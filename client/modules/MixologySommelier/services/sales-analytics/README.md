# LUCCCA Sales & Menu Analytics Service

**Purpose:** Link sales transactions and menu items to wines and recipes for profit analysis, pairing success tracking, and future forecasting.

## Features

- **Sales Mix Analysis** — Wine vs food revenue breakdown
- **Top Pairings** — AI-scored wine-food combos ranked by sales volume
- **Missed Opportunities** — Identify recommended pairings not yet sold
- **Menu Trends** — Sales velocity per item over time
- **POS Integration** — Sync menu items from Toast, Square, etc.
- **Recipe Management** — Flavor profiles for pairing calculation

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (Supabase)

### Installation

1. Create `.env` file:

   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/sommelier_db
   ANALYTICS_PORT=8120
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start service:
   ```bash
   npm run dev
   ```

Service will run on `http://localhost:8120`

## API Endpoints

### GET /analytics/mix/:venueId

Sales revenue breakdown (wine vs food).

**Query Parameters:**

- `startDate` — ISO date (optional, default: 30 days ago)
- `endDate` — ISO date (optional, default: today)

**Response:**

```json
{
  "status": "ok",
  "data": {
    "venueId": "uuid",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "totalRevenue": 45000.00,
    "wineRevenue": 12600.00,
    "foodRevenue": 32400.00,
    "winePercent": "28.00",
    "foodPercent": "72.00",
    "itemCount": 47,
    "items": [...]
  }
}
```

### GET /analytics/top/:venueId

Top-performing wine-food pairings by sales volume.

**Query Parameters:**

- `limit` — Number of results (default: 10)

**Response:**

```json
{
  "status": "ok",
  "count": 10,
  "data": [
    {
      "recipe": "Grilled Salmon",
      "wine": "Sauvignon Blanc",
      "sold": 24,
      "avg_score": 87.5,
      "region": "Loire",
      "vintage": 2022
    }
  ]
}
```

### GET /analytics/missed/:venueId

Recommended pairings not yet sold.

**Query Parameters:**

- `days` — Look back N days (default: 30)

**Response:**

```json
{
  "status": "ok",
  "count": 5,
  "data": [
    {
      "recipe": "Duck Confit",
      "times_sold": 18,
      "recommended_wines": ["Pinot Noir", "Burgundy Red"]
    }
  ]
}
```

### GET /analytics/trend/:venueId/:menuItemId

Sales velocity for a specific menu item.

**Query Parameters:**

- `days` — Number of days to analyze (default: 30)

**Response:**

```json
{
  "status": "ok",
  "data": {
    "venueId": "uuid",
    "menuItemId": "item-123",
    "days": 30,
    "trend": [
      {
        "date": "2024-01-31",
        "qty": 12,
        "revenue": 450.0
      }
    ]
  }
}
```

### POST /analytics/menu/sync

Sync menu from POS system (Toast, Square, etc.).

**Body:**

```json
{
  "menu": [
    {
      "id": "menu-001",
      "name": "Grilled Salmon",
      "cuisine": "Modern",
      "intensity": 6,
      "acidity": 7,
      "sweetness": 1,
      "fatness": 7,
      "umami": 5,
      "spice": 2,
      "sauce": "lemon butter"
    }
  ]
}
```

### GET /analytics/recipes

Get all synced recipes.

**Response:**

```json
{
  "status": "ok",
  "count": 47,
  "data": [...]
}
```

### GET /analytics/recipes/:id

Get single recipe by ID.

### PATCH /analytics/recipes/:id

Update recipe flavor profile (manual override).

**Body:**

```json
{
  "intensity": 7,
  "acidity": 8
}
```

## Database Schema Requirements

### sales

- id, venue_id, menu_item_id, menu_item, menu_item_type (wine/food), wine_id, recipe_id, qty, total, created_at

### recipes

- id, name, cuisine, intensity, acidity, sweetness, fatness, umami, spice, sauce

### wines

- id, sku, name, region, vintage, varietals, acidity, sweetness, body, aromas

### pairing_evidence

- id, wine_id, recipe_id, pairing_score, rationale, computed_at

## Calculations

### Wine Revenue Ratio

```
Wine % = (Wine Revenue / Total Revenue) × 100
```

Target: 25-35% for most restaurants.

### Missed Pairings

Dishes that sold multiple times but had few wine pairings suggested (low conversion of recommendations).

### Top Pairings

Ranked by:

1. Sales volume (popularity)
2. Average pairing score (AI quality)
3. Profit margin (margin not yet calculated)

## Integration

### With Backend

Enrich `/api/sales` endpoint to call:

```typescript
const analytics = await fetch(
  `http://localhost:8120/analytics/mix/${venueId}?startDate=${start}&endDate=${end}`,
  { method: "GET" },
);
```

### With Mobile App

Display top pairings in "Popular Pairings" section.

### With POS

Set up webhook from Toast/Square:

```
POST http://localhost:8120/analytics/menu/sync
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `ANALYTICS_PORT` — Port (default: 8120)

## Next Steps

- Section 6: Multi-Venue Sync Hub
- Section 7: IoT Cooler Monitoring
- Section 8: Master Sommelier Education
- Section 9: EchoVinum Archive
- Section 10: Builder.io UI Components
