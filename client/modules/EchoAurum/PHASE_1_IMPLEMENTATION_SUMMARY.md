# Phase 1: Multi-Outlet P&L Management - Implementation Summary

## Overview

Phase 1 of the hospitality P&L platform has been successfully implemented, providing the foundation for managing 100+ outlets with monthly budget, forecast, and actual tracking.

## What's Built

### 1. Data Models & Types (`shared/outlets.ts`)

**Purpose:** Define all data structures for the multi-outlet system

- **Outlet**: Core entity with type (hotel, restaurant, spa, entertainment, other)
- **PnLDriver**: Monthly KPIs (room nights, covers, occupancy %, etc.)
- **BudgetLineItem**: Monthly budget/forecast/actual by GL account
- **MonthlyPnL**: Aggregated P&L by month with budget/forecast/actual
- **OutletPnLReport**: Outlet-specific P&L with YTD and prior year data
- **ConsolidatedPnL**: Multi-outlet view with rollup and by-outlet breakdown
- **LegacyPnLImport**: Legacy data upload structure
- **OutletPermission**: Line-item level access control

### 2. Backend API Routes (`server/routes/outlets.ts`)

**Purpose:** Provide REST endpoints for outlet and P&L management

#### Outlet Management

```
POST /api/outlets - Create outlet
GET /api/outlets - List all outlets
GET /api/outlets/:id - Get single outlet
PUT /api/outlets/:id - Update outlet
DELETE /api/outlets/:id - Delete outlet
```

#### Budget & Forecast

```
POST /api/outlets/:outletId/budget-line-items - Create budget item
GET /api/outlets/:outletId/budget?year=2024 - Get budget for outlet
GET /api/outlets/:outletId/pnl-report?year=2024 - Get outlet P&L report
GET /api/outlets/consolidated/pnl?year=2024 - Get consolidated P&L
```

#### Driver Configuration

```
POST /api/outlets/:outletId/drivers - Set P&L drivers
GET /api/outlets/:outletId/drivers - Get drivers for outlet
```

#### Legacy Data Import

```
POST /api/outlets/import/legacy-pnl - Upload legacy P&L file
POST /api/outlets/import/:importId/analyze - Analyze imported data
```

All routes require session authentication with appropriate role-based access control.

### 3. Frontend Components

#### OutletManager (`client/modules/aurum/components/OutletManager.tsx`)

**Features:**

- Create/read/update/delete outlets
- Hierarchical structure (parent/child outlets)
- Outlet type indicators
- Status management (active/inactive)
- Location tracking
- Expandable outlet tree view

**Usage:**

```tsx
<OutletManager />
```

#### MultiOutletPnL (`client/modules/aurum/components/MultiOutletPnL.tsx`)

**Features:**

- Consolidated macro view of all outlets
- Monthly trend selection with clickable drill-down
- YTD performance dashboard with key metrics
- Budget vs Forecast vs Actual comparison
- Prior year comparison
- Expandable outlet-level detail cards
- Variance analysis with color-coded indicators
- Year selection dropdown

**Key Metrics Displayed:**

- Total outlets count
- YTD Revenue (Budget vs Actual)
- YTD EBITDA with margin %
- Budget variance %
- Monthly trends

**P&L Line Items:**

- Revenue
- COGS (with sub-items)
- Labor (with sub-items)
- Other Expenses
- Gross Profit
- EBITDA

**Usage:**

```tsx
<MultiOutletPnL />
```

#### DriverConfiguration (`client/modules/aurum/components/DriverConfiguration.tsx`)

**Features:**

- Add/delete P&L drivers
- Monthly value input (Jan-Dec)
- Annual total calculation
- Monthly average calculation
- Peak/low month identification
- Visual sparkline chart
- Monthly change % calculation

**Supported Drivers:**

- Room Nights
- Average Daily Rate
- Occupancy Rate
- Covers (restaurant)
- Check Average (restaurant)
- Custom drivers

**Usage:**

```tsx
<DriverConfiguration outletId="outlet_hotel_1" />
```

### 4. Integration with Console

All three components are integrated into the Console page:

- Accessible via navigation rail
- Embedded in ModuleDetailSection for detailed views
- Added as standalone sections in ConsoleContent

### 5. React Hook

**useMultiOutletPnL** (`client/modules/aurum/hooks/useMultiOutletPnL.ts`)

Load outlet and P&L data efficiently:

```tsx
const { outlets, consolidated, status, loadOutlets, loadConsolidatedPnL } =
  useMultiOutletPnL(2024);
```

## Data Flow

```
Console Page
├── OutletManager
│   └── /api/outlets (CRUD)
├── MultiOutletPnL
│   ├── /api/outlets/consolidated/pnl
│   └── /api/outlets/:outletId/pnl-report
└── DriverConfiguration
    ├── /api/outlets/:outletId/drivers
    └── /api/outlets/:outletId/budget
```

## Key Features

### 1. Hierarchical Outlet Structure

- Parent/child relationships (e.g., Resort → Hotels → Restaurants)
- Automatic rollup calculations
- Collapsible tree view in OutletManager

### 2. Monthly Granularity

- All P&L data tracked monthly (Jan-Dec)
- Three perspectives: Budget, Forecast, Actual
- Variance calculations (Budget vs Actual, Forecast vs Actual)

### 3. Multi-Level Views

**Macro (Consolidated):**

- All outlets aggregated
- Total revenue, expenses, EBITDA
- YTD performance vs budget

**Micro (Outlet-Level):**

- Individual outlet P&L
- Drill-down into drivers
- Performance vs prior year

### 4. Real-time Variance Analysis

- Color-coded variance indicators (red=over budget, green=under, yellow=minor)
- Trending icons (up/down/alert)
- Percent variance from budget/forecast

### 5. Driver-Based Architecture

- KPIs (room nights, covers, ADR, etc.)
- Monthly tracking
- Foundation for forecast generation (Phase 2)

## Sample Data Structure

### Outlet

```json
{
  "id": "outlet_hotel_1",
  "code": "HTL-001",
  "name": "Pacific Grove Resort - Main Hotel",
  "type": "hotel",
  "location": "California",
  "currency": "USD",
  "status": "active"
}
```

### Driver

```json
{
  "name": "Room Nights",
  "description": "Total occupied room nights",
  "unit": "nights",
  "januaryValue": 800,
  "februaryValue": 750,
  // ...monthly values...
  "decemberValue": 950
}
```

### Monthly P&L

```json
{
  "month": 1,
  "monthName": "January",
  "revenue": { "budget": 400000, "forecast": 408500, "actual": 397000 },
  "cogs": { "budget": 45000, "forecast": 46800, "actual": 45600 },
  "labor": { "budget": 120000, "forecast": 122400, "actual": 119000 },
  "otherExpenses": { "budget": 60000, "forecast": 61200, "actual": 59500 },
  "grossProfit": { "budget": 175000, "forecast": 177300, "actual": 172900 },
  "ebitda": { "budget": 175000, "forecast": 177300, "actual": 172900 }
}
```

## Access Control

All routes protected by role-based middleware:

- **Admin**: Full outlet management
- **Controller**: Budget/forecast management
- **Auditor**: P&L reporting
- **Viewer**: Read-only access to summaries

## What's Ready for Phase 2

### AI³-Assisted Forecasting

- Driver integration point ready
- Budget/forecast comparison UI in place
- Data structure supports scenario analysis

### Legacy Data Import

- API endpoints defined
- Import model ready
- Analysis structure prepared

### Advanced Permissions

- Permission model defined in types
- Filter-ready data structure
- Ready for line-item access control

## Testing Endpoints Locally

```bash
# List outlets
curl http://localhost:8080/api/outlets

# Get consolidated P&L
curl http://localhost:8080/api/outlets/consolidated/pnl?year=2024

# Get outlet drivers
curl http://localhost:8080/api/outlets/outlet_hotel_1/drivers
```

## File Structure

```
shared/outlets.ts
├── Outlet, OutletType
├── PnLDriver
├── BudgetLineItem
├── MonthlyPnL, OutletPnLReport, ConsolidatedPnL
├── LegacyPnLImport
└── OutletPermission

server/routes/outlets.ts
├── createOutlet, listOutlets, getOutlet, updateOutlet, deleteOutlet
├── createBudgetLineItem, getBudgetForOutlet
├── getOutletPnLReport, getConsolidatedPnL
├── setPnLDrivers, getPnLDrivers
└── importLegacyPnL, analyzeLegacyPnL

client/modules/aurum/components/
├── OutletManager.tsx
├── MultiOutletPnL.tsx
├── DriverConfiguration.tsx
└── index.ts (exports updated)

client/modules/aurum/hooks/
├── useMultiOutletPnL.ts
└── index.ts

client/pages/Console.tsx
├── Module IDs registered
├── Components imported
└── Sections added to ConsoleContent
```

## Next Steps for Phase 2

1. **AI³-Assisted Forecasting**
   - Chat interface for driver input
   - AI-based P&L generation
   - Scenario building (conservative/expected/optimistic)

2. **Legacy Data Importer**
   - File upload UI
   - Account mapping wizard
   - Data validation dashboard
   - Auto-suggest GL account mapping

3. **Advanced Analytics**
   - Trend analysis by outlet and GL account
   - Seasonal pattern detection
   - Cost behavior analysis (fixed vs variable)
   - Rolling forecast updates

4. **Permissions & Access Control**
   - Implement line-item level permissions
   - P&L-only user views
   - Department/outlet-specific access

## Performance Considerations

- P&L calculations done on backend (server-side aggregation)
- Outlet hierarchy supports efficient parent rollups
- Monthly drill-down reduces payload size
- Pagination ready for 100+ outlets
- Caching strategy ready for forecast data

## Notes

- All sample data is currently mock data in handlers
- Database integration ready in Phase 2
- Neon/Supabase can be connected for persistence
- API structure supports easy migration to real database
