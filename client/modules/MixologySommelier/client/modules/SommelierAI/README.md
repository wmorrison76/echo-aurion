# SommelierAI Module

Premium wine management system for 5-star hospitality venues. Complete with AI pairing recommendations, inventory tracking, real-time analytics, IoT monitoring, and sommelier training.

## 🚀 Quick Start

### Prerequisites

- React 18+
- Node.js 16+
- PostgreSQL database
- 8 backend microservices running (see Backend Services section)

### Installation

1. **Module already integrated** (if you're reading this, it's in place)

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your API endpoints
   ```

4. **Start backend services**

   ```bash
   docker-compose up -d
   ```

5. **Run dev server**

   ```bash
   npm run dev
   ```

6. **Open module**
   ```typescript
   // In any component
   import { openPanel } from "@/lib/panel-registry";
   openPanel("sommelier-ai");
   ```

## 📦 Module Contents

### 22 Pages

- **Home** - Premium landing page
- **Catalog** - Wine browser with advanced search
- **Recommendations** - AI pairing engine
- **TastingNotes** - Personal tasting journal
- **Inventory** - Stock tracking
- **LiquorInventory** - Liquor management
- **TransferWorkflow** - Inter-location transfers
- **CompedDrinks** - Promotional items
- **VarianceAudit** - Reconciliation
- **PurchaseOrders** - Supplier ordering
- **CostingReport** - Financial analysis
- **Analytics** - Sales metrics
- **AdvancedAnalytics** - Forecasting
- **CellarMonitoring** - IoT temperature
- **POSDashboard** - Sales overview
- **POSSettings** - POS configuration
- **WineArchive** - 75-year vintage history
- **SommelierTraining** - Education system
- **MenuSommelierBridge** - Menu pairing
- **Settings** - Configuration
- **Onboarding** - Setup wizard
- **NotFound** - 404 page

### Components

- **ThemeProvider** - Dark/light theme system
- **Navigation** - Top navigation bar
- **WineCard** - Wine display component
- **AlertsNotificationPanel** - Alert management
- **WinePairingPanel** - Pairing details modal
- **PanelFrame** - Module wrapper with chrome

### Services & Utilities

- **api.ts** - API service layer
- **pos-api.ts** - POS integration
- **wines.ts** - Wine data & types
- **theme.ts** - Theme configuration

## 🎨 Features

### Wine Management

- 🍷 Comprehensive wine catalog
- 📊 Advanced search and filtering
- ⭐ Rating and review system
- 🎯 Smart pairing recommendations
- 📸 Wine images and descriptions

### Inventory

- 📦 Real-time stock tracking
- 📍 Multi-location support
- 🚚 Transfer management
- 📈 Reorder level alerts
- 💰 Cost tracking

### Analytics

- 📊 Sales metrics dashboard
- 📈 Trend analysis
- 🔮 Demand forecasting
- 🔍 Anomaly detection
- 📉 Variance reporting

### IoT Monitoring

- 🌡️ Temperature tracking
- 🚨 Real-time alerts
- 📡 MQTT integration
- 📊 Historical data
- 🎯 Location-based monitoring

### Training

- 📚 Sommelier education
- 🎓 Interactive flashcards
- 👃 Blind tasting scenarios
- 🏆 Leaderboard tracking
- 📖 Knowledge management

### POS Integration

- 💳 Sales system sync
- 📦 Order management
- 💰 Revenue tracking
- 📊 Margin analysis
- 🔄 Real-time updates

## 🔌 Backend Services

### Core API (Port 8080)

```
GET  /api/wines           - Wine catalog
GET  /api/wines/:id       - Wine details
POST /api/wines           - Create wine
PATCH /api/wines/:id      - Update wine
GET  /api/inventory       - Stock levels
PATCH /api/inventory/:id  - Update stock
```

### Pairing Engine (Port 8090)

```
POST /pairings/compute    - Get recommendations
GET  /pairings/rationale  - Pairing explanation
```

### Costing Service (Port 8100)

```
POST /costing/calculate   - COGS calculation
GET  /costing/report      - Monthly report
```

### Analytics (Port 8120)

```
GET  /analytics/sales     - Sales metrics
GET  /analytics/trends    - Trend analysis
GET  /analytics/forecast  - Demand forecast
```

### IoT Monitor (Port 8140)

```
GET  /iot/sensors         - Sensor list
GET  /iot/readings/:id    - Sensor data
POST /iot/alerts          - Alert management
```

### Training (Port 8150)

```
GET  /training/courses    - Course list
GET  /training/lessons/:id - Lesson content
POST /training/progress   - Update progress
```

### Archive (Port 8160)

```
GET  /archive/vintages    - Vintage search
GET  /archive/decade/:id  - Decade analysis
```

### MQTT Broker (Port 1883)

```
Topics:
  cellar/temperature      - Temperature data
  cellar/humidity         - Humidity data
  cellar/alerts           - Alert events
```

## 🎨 Theme System

### Light Theme

- Clean, professional appearance
- High contrast for readability
- Blue primary color (#007AFF)
- Light backgrounds

### Dark Theme

- Modern, premium feel
- Neon green primary (#00FF9F)
- Dark backgrounds
- Reduced eye strain

### Customization

```typescript
import { useTheme } from "./components/ThemeProvider";

export const MyComponent = () => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <div style={{ backgroundColor: theme.colors.background }}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};
```

## 🔐 Authentication

Uses JWT token-based authentication:

```typescript
import { apiService } from "./lib/api";

// Login
const data = await apiService.login("user@example.com", "password");
// Token stored in localStorage

// Authenticated requests
const wines = await apiService.getWines();
// Authorization header added automatically
```

## 📊 State Management

Uses React Query for server state:

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiService } from "./lib/api";

export const WineList = () => {
  const { data: wines, isLoading } = useQuery({
    queryKey: ["wines"],
    queryFn: () => apiService.getWines(),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{/* Render wines */}</div>;
};
```

## 🚀 Performance Optimizations

- React Query for API caching
- Code splitting for pages
- Memoized components
- Lazy loading where needed
- Optimized bundle size

## 🧪 Testing

To run tests:

```bash
npm run test
```

Current test coverage:

- Component tests: API integration, rendering
- Integration tests: Page flows, data loading
- E2E tests: User workflows

## 📚 Documentation

- **TRANSFER_SUMMARY.md** - Project overview
- **INTEGRATION_GUIDE.md** - Integration steps
- **MIGRATION_HELPER.md** - Technical details
- **MISC_QUESTIONS.md** - Architecture decisions

## 🐛 Troubleshooting

### Module doesn't open

1. Check panel registry is updated
2. Verify module path is correct
3. Check browser console for errors

### API errors

1. Ensure backend services are running
2. Check environment variables
3. Verify database connection

### Theme not applying

1. Check ThemeProvider wraps App
2. Verify theme.ts exports colors
3. Clear browser cache

### Import errors

1. Verify all files are in correct locations
2. Check relative import paths
3. Run `npm run typecheck`

## 📞 Support

For issues or questions:

1. Check INTEGRATION_GUIDE.md
2. Review MIGRATION_HELPER.md
3. Check browser console for errors
4. Verify backend services are running

## 📝 License

Part of the Builder.io platform. Used under project license.

## 🎯 Version

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: 2024-12-18

---

**Built with ❤️ for luxury hospitality venues.**
