# Forecast System Implementation

## Overview

The forecast system enables managers to:
1. **Project** labor needs and revenue for 7/30/90-day horizons
2. **Simulate** what-if scenarios (sales growth, wage increases, staffing changes)
3. **Compare** up to 5 scenarios side-by-side with KPI metrics
4. Make data-driven decisions about resource allocation

## Architecture

### Server-Side

**forecastBrain.ts**
- Pulls last 90 days of actual revenue & labor data
- Computes weekly seasonality (averages by day-of-week)
- Applies what-if modifiers (sales growth, wage increases, staffing delta)
- Returns DailyPoint series with revenue, labor hours, SPLH

**scenarioGenerator.ts**
- Takes 1-5 scenario specs
- Runs forecast for each scenario
- Computes KPIs:
  - `labor_pct`: (labor$ + tips$) / revenue%
  - `variance_vs_base`: revenue change % vs baseline

**API Routes (forecast.ts)**
- `POST /api/forecast/run` - Single forecast with modifiers
- `POST /api/forecast/scenario` - 5-way comparison with KPIs

### Client-Side

**ForecastDashboard.tsx**
- Interactive controls for horizon (7/30/90), sales growth, wage increase, staffing delta
- Displays summary cards: Total Revenue, Labor Hours, Avg SPLH
- Shows daily breakdown table (first 14 days)
- What-if applied summary

**ScenarioCompare.tsx**
- Scenario builder UI (up to 5)
- Dynamic scenario editor for each spec
- Results grid showing outcomes side-by-side
- Variance vs base metric for quick comparison

## API Contract

### POST /api/forecast/run

**Request:**
```json
{
  "org_id": "org-uuid",
  "outlet_id": "outlet-uuid",
  "dept_id": "dept-uuid",
  "horizon": 7 | 30 | 90,
  "sales_growth_pct": 5,
  "wage_increase_pct": 3,
  "staffing_delta_hours": 12
}
```

**Response:**
```json
{
  "horizon": 7,
  "series": [
    {
      "date": "2024-01-15",
      "revenue": 5000,
      "labor_hours": 40,
      "splh": 125
    }
  ],
  "totals": {
    "revenue": 35000,
    "labor_hours": 280,
    "avg_splh": 125
  }
}
```

### POST /api/forecast/scenario

**Request:**
```json
{
  "base": {
    "org_id": "org-uuid",
    "outlet_id": "outlet-uuid",
    "dept_id": "dept-uuid",
    "horizon": 7 | 30 | 90
  },
  "specs": [
    {
      "id": "base",
      "label": "Baseline",
      "sales_growth_pct": 0,
      "wage_increase_pct": 0,
      "staffing_delta_hours": 0
    },
    {
      "id": "growth_5",
      "label": "Growth +5%",
      "sales_growth_pct": 5,
      "wage_increase_pct": 0,
      "staffing_delta_hours": 0
    }
  ]
}
```

**Response:**
```json
{
  "base": { /* ForecastResult */ },
  "outcomes": [
    {
      "id": "base",
      "label": "Baseline",
      "forecast": { /* ForecastResult */ },
      "kpis": {
        "labor_pct": 32.5,
        "variance_vs_base": 0
      }
    }
  ]
}
```

## How It Works

### 1. Baseline Computation

```
Last 90 days of data
  ↓
Group by date
  ↓
Calculate weekly seasonality (avg by day-of-week)
  ↓
Generate N-day forecast using seasonality pattern
```

**Example:**
- Monday avg revenue: $6,000
- Tuesday avg revenue: $5,500
- ...
- If forecasting 7 days starting Monday: [Mon=$6k, Tue=$5.5k, ...]

### 2. What-If Modifiers

**Sales Growth %**
- Multiplier: `revenue * (1 + pct/100)`
- Example: +5% means revenue * 1.05

**Wage Increase %**
- Does not directly affect forecast
- Reserved for KPI calculation (future tie-in to payroll)

**Staffing Delta Hours**
- Spread evenly across forecast period
- Example: +12 hours over 7 days = +1.71h per day

### 3. KPI Calculation

```
labor_pct = (labor_hours * wage_proxy_rate + tips$) / revenue * 100
variance_vs_base = (scenario_revenue - base_revenue) / base_revenue * 100
```

## Usage Examples

### Example 1: Simple 7-Day Forecast

Manager wants to see labor needs for next week:
1. Open Forecast tab
2. Leave all modifiers at 0
3. Click "Run Forecast"
4. See daily breakdown of required hours

### Example 2: Growth Scenario

"What if we grow sales by 10%?"
1. ForecastDashboard
2. Set Sales Growth % to 10
3. Click "Run Forecast"
4. See how labor hours and SPLH change

### Example 3: Staffing Decision

Manager wants to compare 3 staffing options:
1. ScenarioCompare
2. Delete "Staff +12h", add "Staff +8h"
3. Add 4th scenario "Staff +16h"
4. Click "Run Comparison"
5. Compare KPIs side-by-side

## Data Source

### Revenue Data
- Table: `revenues`
- Fields: `business_date`, `amount`, `dept_id`
- Query: Last 120 days, grouped by date

### Labor Data
- Table: `shifts`
- Fields: `starts_at`, `ends_at`, `break_min`, `dept_id`
- Query: Last 120 days, calculate hours by date

**Note:** If insufficient historical data (<7 days per day-of-week), baseline returns zeros. Add more historical revenue/shift data for better forecasts.

## Future Enhancements

### ML Integration
Currently uses simple weekly seasonality. Future versions can:
- Use Prophet or LSTM for trend detection
- Factor in seasonality + trend + special events
- Detect anomalies and adjust baselines

### Tip Pool Integration
Currently uses fixed wage proxy ($20/hr). Future:
- Pull actual department wage rates
- Connect to tip pool models
- Include tips in labor % KPI

### Event Awareness
Currently ignores events. Future:
- Spike revenue on banquet days
- Automatically adjust staffing recommendations
- Alert when forecast unlikely based on events

### Budget Comparison
Currently standalone. Future:
- Compare forecast to budget
- Flag if over/under budget scenarios
- Suggest budget revisions

## Testing the System

### Manual Test: Simple Forecast

```bash
curl -X POST http://localhost:8080/api/forecast/run \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "org-1",
    "outlet_id": "outlet-1",
    "dept_id": "dept-1",
    "horizon": 7,
    "sales_growth_pct": 0,
    "wage_increase_pct": 0,
    "staffing_delta_hours": 0
  }'
```

### Manual Test: Scenario Comparison

```bash
curl -X POST http://localhost:8080/api/forecast/scenario \
  -H "Content-Type: application/json" \
  -d '{
    "base": {
      "org_id": "org-1",
      "outlet_id": "outlet-1",
      "dept_id": "dept-1",
      "horizon": 7
    },
    "specs": [
      { "id": "base", "label": "Baseline", "sales_growth_pct": 0, "wage_increase_pct": 0, "staffing_delta_hours": 0 },
      { "id": "growth", "label": "Growth +5%", "sales_growth_pct": 5, "wage_increase_pct": 0, "staffing_delta_hours": 0 }
    ]
  }'
```

## Integration Points

### ForecastDashboard Integration
```typescript
<ForecastDashboard
  org_id={tenancy.org_id}
  outlet_id={tenancy.outlet_id}
  dept_id={tenancy.dept_id}
/>
```

Uses `useTenancy()` internally. Already integrated in Dashboard.tsx Forecast tab.

### ScenarioCompare Integration
```typescript
<ScenarioCompare
  org_id={tenancy.org_id}
  outlet_id={tenancy.outlet_id}
  dept_id={tenancy.dept_id}
  horizon={7}  // or 30, 90
/>
```

Already integrated in Dashboard.tsx Forecast tab.

## Troubleshooting

### "Internal Server Error" on /api/forecast/run

**Cause:** Missing or invalid tenancy IDs
**Solution:** Ensure org_id, outlet_id, dept_id are valid UUIDs

**Cause:** Database connection issue
**Solution:** Check Supabase connection in server logs

**Cause:** No historical data
**Solution:** Add revenue and shift records to database. System needs at least 7 days of data.

### Forecast shows all zeros

**Cause:** No historical data in database
**Solution:** 
1. Add sample revenue entries to `revenues` table
2. Add sample shift entries to `shifts` table
3. Run forecast again

### Scenario comparison not working

**Cause:** Specs array has 0 or >5 items
**Solution:** Provide 1-5 scenario specs

**Cause:** Specs missing required fields
**Solution:** Each spec must have `id` and `label` at minimum

---

**Version:** 1.0.0 - Forecasting MVP  
**Last Updated:** 2024

