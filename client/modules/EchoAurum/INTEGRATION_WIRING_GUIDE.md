# Server Integration Wiring Guide

## ADD THESE IMPORTS TO server/index.ts

```typescript
// Add these imports at the top of server/index.ts

// New Connectors
import { InventoryConnector } from "./connectors/inventoryConnector";
import { SchedulingConnector } from "./connectors/schedulingConnector";
import { BankFeedConnector } from "./connectors/bankFeedConnector";

// New Route Handlers
import {
  handleGetRevenueMetrics,
  handleGetKPItoGLMapping,
  handleGetRevenueForecastVariance,
  handleCreateKPIMapping,
} from "./routes/aurumRevenueMetrics";

// Existing imports (already in your file)
import { AurumDatabaseService } from "./services/aurumDatabase";
```

---

## ADD THESE ROUTE DEFINITIONS (After existing approval routes around line 1000)

```typescript
// ============================================================================
// INVENTORY INTEGRATION ROUTES
// ============================================================================

app.post(
  "/api/aurum/inventory/sync",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new InventoryConnector(db);

    const { entityId, apiKey, locationId } = req.body;

    try {
      const items = await connector.syncFromMarginEdge(
        entityId,
        apiKey,
        locationId,
      );
      return res.json({ items, count: items.length });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync inventory";
      return res.status(500).json({ error: message });
    }
  },
);

app.get(
  "/api/aurum/inventory/variance",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new InventoryConnector(db);

    const { entityId, startDate, endDate } = req.query;

    try {
      const analysis = await connector.getVarianceAnalysis(
        entityId as string,
        startDate as string,
        endDate as string,
      );
      return res.json(analysis);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get variance";
      return res.status(500).json({ error: message });
    }
  },
);

app.get(
  "/api/aurum/inventory/:varianceId/drill-down",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new InventoryConnector(db);

    const { entityId } = req.query;
    const { varianceId } = req.params;

    try {
      const items = await connector.getDrillDownData(
        entityId as string,
        varianceId,
      );
      return res.json(items);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get drill-down";
      return res.status(500).json({ error: message });
    }
  },
);

// ============================================================================
// SCHEDULING/LABOR INTEGRATION ROUTES
// ============================================================================

app.post(
  "/api/aurum/labor/sync-toast",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new SchedulingConnector(db);

    const { entityId, apiKey, locationId } = req.body;

    try {
      const shifts = await connector.syncFromToast(
        entityId,
        apiKey,
        locationId,
      );
      return res.json({ shifts, count: shifts.length });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync labor";
      return res.status(500).json({ error: message });
    }
  },
);

app.get(
  "/api/aurum/labor/variance",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new SchedulingConnector(db);

    const { entityId, startDate, endDate } = req.query;

    try {
      const analysis = await connector.getLaborAnalysis(
        entityId as string,
        startDate as string,
        endDate as string,
      );
      return res.json(analysis);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get labor analysis";
      return res.status(500).json({ error: message });
    }
  },
);

app.get(
  "/api/aurum/labor/forecast",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new SchedulingConnector(db);

    const { entityId, forecastDate } = req.query;

    try {
      const forecast = await connector.getScheduleImpactForecast(
        entityId as string,
        forecastDate as string,
      );
      return res.json(forecast);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get forecast";
      return res.status(500).json({ error: message });
    }
  },
);

// ============================================================================
// BANK FEED & RECONCILIATION ROUTES
// ============================================================================

app.post(
  "/api/aurum/bank-feed/sync-stripe",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new BankFeedConnector(db);

    const { entityId, apiKey } = req.body;

    try {
      const transactions = await connector.fetchFromStripe(entityId, apiKey);
      return res.json({ transactions, count: transactions.length });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch from Stripe";
      return res.status(500).json({ error: message });
    }
  },
);

app.post(
  "/api/aurum/bank-feed/reconcile",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new BankFeedConnector(db);

    const { entityId, transactions } = req.body;

    try {
      const matches = await connector.reconcileTransactions(
        entityId,
        transactions,
      );
      return res.json({ matches, count: matches.length });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reconcile";
      return res.status(500).json({ error: message });
    }
  },
);

app.post(
  "/api/aurum/bank-feed/detect-duplicates",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new BankFeedConnector(db);

    const { entityId, transactions } = req.body;

    try {
      const duplicates = await connector.detectDuplicates(
        entityId,
        transactions,
      );
      return res.json({ duplicates, count: duplicates.length });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to detect duplicates";
      return res.status(500).json({ error: message });
    }
  },
);

app.get(
  "/api/aurum/bank-feed/status",
  requireSession({ role: "controller" }),
  async (req, res) => {
    const db = req.app.get("aurumDb") as AurumDatabaseService;
    const connector = new BankFeedConnector(db);

    const { entityId } = req.query;

    try {
      const status = await connector.getReconciliationStatus(
        entityId as string,
      );
      return res.json(status);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get status";
      return res.status(500).json({ error: message });
    }
  },
);

// ============================================================================
// REVENUE METRICS & KPI ROUTES
// ============================================================================

app.get(
  "/api/aurum/revenue-metrics",
  requireSession({ role: "controller" }),
  handleGetRevenueMetrics,
);

app.get(
  "/api/aurum/revenue-metrics/forecast-variance",
  requireSession({ role: "controller" }),
  handleGetRevenueForecastVariance,
);

app.get(
  "/api/aurum/kpi-mappings",
  requireSession({ role: "controller" }),
  handleGetKPItoGLMapping,
);

app.post(
  "/api/aurum/kpi-mappings",
  requireSession({ role: "auditor" }),
  handleCreateKPIMapping,
);
```

---

## DATABASE MIGRATION STEPS

Run these migrations in order after updating server/index.ts:

```bash
# This should be done before deploying:
# psql -h your-db-host -U postgres -d aurum < server/migrations/031_approval_workflows.sql
# psql -h your-db-host -U postgres -d aurum < server/migrations/032_supplemental_features.sql
```

Or use your migration system (e.g., Flyway, Liquibase, or TypeORM migrations).

---

## ENVIRONMENT VARIABLES NEEDED

Add these to your `.env` file:

```bash
# Integrations
STRIPE_API_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

TOAST_API_KEY=your_toast_api_key
TOAST_MERCHANT_ID=your_merchant_id

MARGINEDGE_API_KEY=your_marginedge_key
MARGINEDGE_PARTNER_ID=your_partner_id

# Database
DATABASE_URL=postgresql://user:password@host:5432/aurum
DB_POOL_MAX=20
DB_POOL_MIN=2

# Features
APPROVAL_WORKFLOW_ENABLED=true
AI_LEARNING_ENABLED=true
FORENSIC_AUDIT_ENABLED=true
INVENTORY_SYNC_ENABLED=true
LABOR_SYNC_ENABLED=true
BANK_FEED_ENABLED=true

# Security
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=86400 # 24 hours
```

---

## TESTING THE INTEGRATION

After wiring everything up, test with:

```bash
# Test Inventory Sync
curl -X POST http://localhost:3000/api/aurum/inventory/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"ent_123","apiKey":"key","locationId":"loc_456"}'

# Test Labor Sync
curl -X POST http://localhost:3000/api/aurum/labor/sync-toast \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"ent_123","apiKey":"key","locationId":"loc_456"}'

# Test Bank Feed
curl -X POST http://localhost:3000/api/aurum/bank-feed/sync-stripe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"ent_123","apiKey":"sk_live_xxxxx"}'

# Test Revenue Metrics
curl -X GET "http://localhost:3000/api/aurum/revenue-metrics?entityId=ent_123&startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All routes added to server/index.ts
- [ ] All imports added
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Security: Rate limiting configured
- [ ] Monitoring: Error tracking enabled
- [ ] Documentation: API docs updated

---

## TROUBLESHOOTING

**Issue:** "Cannot find module" errors

- **Solution:** Check all imports match actual file paths

**Issue:** Database migrations fail

- **Solution:** Ensure migrations are applied in order (001-032)

**Issue:** API returns 401 Unauthorized

- **Solution:** Verify JWT token is valid and includes correct role

**Issue:** Integration API calls fail

- **Solution:** Check environment variables are set correctly

---

## NEXT STEPS

1. ✅ Add all routes to server/index.ts
2. ✅ Apply database migrations
3. ✅ Configure environment variables
4. ✅ Test all endpoints
5. ✅ Deploy to staging
6. ✅ Run integration tests
7. ✅ Deploy to production
8. ✅ Monitor for 24 hours

**Total time to integration:** ~2-3 hours (depends on testing)

---

**Ready to ship! 🚀**
