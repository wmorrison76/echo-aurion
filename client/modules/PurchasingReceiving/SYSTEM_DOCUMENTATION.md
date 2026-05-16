# Echo Ops System Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Multi-Outlet Management](#multi-outlet-management)
4. [Features](#features)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Testing Infrastructure](#testing-infrastructure)
7. [Integration Guide](#integration-guide)
8. [Compliance & Security](#compliance--security)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## System Overview

Echo Ops is a comprehensive cloud-based purchasing, receiving, and inventory management system designed for hospitality industry operations. It supports organizations ranging from single-unit restaurants to enterprise-scale multi-outlet hospitality groups with 30+ properties.

### Key Capabilities

- **Multi-outlet management** with centralized control
- **Real-time inventory tracking** across properties
- **Intelligent forecasting** and procurement optimization
- **Advanced analytics** with predictive modeling
- **Comprehensive compliance** (GDPR, CCPA)
- **Mobile-responsive** interface for on-the-go management
- **Enterprise integrations** (QuickBooks, NetSuite, SendGrid)

---

## Architecture

### Technology Stack

**Frontend**

- React 18 with TypeScript
- React Router 6 for SPA routing
- TailwindCSS 3 for styling
- Recharts for data visualization
- Radix UI component library

**Backend**

- Express.js server
- Supabase for authentication and database
- Serverless functions for integrations

**Testing**

- Vitest for unit and integration tests
- E2E test helpers for workflow testing
- Mock data factories for test scenarios

**Deployment**

- Netlify/Vercel for hosting
- Automatic builds and deployment
- CI/CD integration

### Core Modules

1. **Multi-Outlet Context** (`client/context/MultiOutletContext.tsx`)
   - Manages organization and outlet state
   - Handles outlet switching
   - Tracks user permissions

2. **Dashboard System** (`client/pages/`)
   - Multi-outlet dashboard with KPIs
   - Outlet-specific views
   - Real-time data visualization

3. **Forecasting Engine** (`client/lib/forecasting.ts`)
   - Demand prediction
   - Inventory optimization
   - Supplier recommendations

4. **Advanced Analytics** (`client/lib/advanced-analytics.ts`)
   - Predictive modeling
   - Cost trend analysis
   - Seasonal pattern detection

---

## Multi-Outlet Management

### Outlet Structure

Each outlet is an independent location with:

- Unique inventory levels
- Separate purchase orders and invoices
- Individual user management
- Outlet-specific analytics

### Organization Hierarchy

```
Organization
├── Admin Users (full system access)
├── Outlet 1
│   ├── Manager
│   ├── Receivers
│   ├── Chef
│   └── Finance Staff
├── Outlet 2
│   └── [Same role structure]
└── Outlet N
```

### Switching Between Outlets

Users with multi-outlet access can switch outlets using:

- Outlet Selector dropdown in navigation
- Outlet switcher component
- Direct URL parameters

Permissions are enforced at all levels - users can only see data for outlets they're assigned to.

---

## Features

### 1. Receiving & Inventory

**Workflow**

1. Invoice received and scanned
2. Items matched to purchase orders
3. Quantities verified and entered
4. Inventory lots created with expiry dates
5. On-hand balances automatically updated

**Scanner Integration**

- WebUSB for USB scanners
- WiFi scanner polling
- Automatic barcode matching
- Multi-device support

### 2. Purchasing & Orders

**Purchase Order Management**

- Create orders from demand forecasts
- Consolidate orders across outlets
- Track order status (draft, sent, acked, complete)
- Automatically calculate totals

**Supplier Optimization**

- Analyze cost trends
- Compare supplier performance
- Recommendations for consolidation or negotiation
- Lead time and reliability tracking

### 3. Analytics & Reporting

**Organization-Level Analytics**

- Total spend across all outlets
- Outlet performance comparison
- Aggregate metrics and trends

**Outlet-Level Analytics**

- Invoice analysis
- Cost per unit tracking
- Supplier performance
- Inventory efficiency

**Advanced Analytics**

- Predictive demand forecasting (14-day lookhead)
- Seasonal pattern detection
- Cost trend analysis with trend direction
- Anomaly detection with confidence scoring

### 4. Forecasting & Optimization

**Demand Forecasting**

- Exponential smoothing with trend
- 7, 14, or 30-day forecasts
- Confidence intervals
- Anomaly detection

**Supplier Optimization**

- Historical cost analysis
- Lead time evaluation
- Reliability scoring
- Actionable recommendations (consolidate, negotiate, diversify)

**Inventory Optimization**

- EOQ calculation
- Safety stock determination
- Reorder point analysis
- Low stock alerts

### 5. Integrations

**Accounting Software**

- QuickBooks Online
- Xero
- Automatic invoice sync
- Expense categorization

**ERP Systems**

- NetSuite
- SAP
- Inventory sync
- Purchase order integration

**Email Notifications**

- SendGrid integration
- Invoice notifications
- Low inventory alerts
- Daily digest reports

### 6. Compliance & Privacy

**GDPR Compliance**

- Data export functionality (JSON/CSV/PDF)
- Retention policy management
- Audit trail logging
- Right to be forgotten support

**Security Features**

- End-to-end encryption
- Role-based access control
- Comprehensive audit logging
- Session management

---

## User Roles & Permissions

### Admin

- **Access**: Full system access
- **Capabilities**:
  - Manage users across organization
  - Configure organization settings
  - View all outlets and data
  - Access admin panel
  - Configure integrations

### Manager

- **Access**: Assigned outlet(s)
- **Capabilities**:
  - View outlet dashboard
  - Create and manage purchase orders
  - View analytics
  - Manage outlet inventory
  - Cannot access other outlets

### Receiver

- **Access**: Assigned outlet
- **Capabilities**:
  - Receive and process invoices
  - Update inventory
  - Process purchase orders
  - Limited to receiving operations

### Chef

- **Access**: Assigned outlet
- **Capabilities**:
  - View menu items
  - Access recipe costing
  - View inventory availability
  - Recipe management

### Finance

- **Access**: Assigned outlet(s)
- **Capabilities**:
  - View financial reports
  - Invoice analytics
  - Cost analysis
  - Export financial data

---

## Testing Infrastructure

### Test Coverage

**Unit Tests** (`tests/unit/`)

- API utilities (unit conversion, normalization)
- Inventory calculations
- Forecasting algorithms
- Cost analysis functions

**Integration Tests** (`tests/integration/`)

- Multi-outlet operations
- Invoice processing workflows
- Supplier optimization
- Data consolidation

**E2E Tests** (`tests/e2e/`)

- User authentication and authorization
- Multi-outlet navigation
- Complete workflows (receiving, invoicing, purchasing)
- Cross-outlet operations

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/unit/api.test.ts

# Run with coverage
pnpm test --coverage

# Run in watch mode
pnpm test --watch
```

### Test Utilities

**Test Factories** (`tests/factories.ts`)

- Generate realistic test data
- Create multi-outlet setups
- Build complex scenarios

**E2E Helpers** (`tests/e2e/test-helpers.ts`)

- `E2ETestContext` for state management
- `NavigationHelper` for routing
- `AssertHelper` for common assertions

---

## Integration Guide

### Accounting Integration (QuickBooks)

1. **Setup**

   ```
   Admin Panel → Integrations → Add Integration
   Select: QuickBooks Online
   Authorize: Follow OAuth flow
   ```

2. **Configuration**
   - Select sync interval (hourly/daily)
   - Choose data types to sync
   - Map G/L accounts

3. **Sync**
   - Automatic on schedule
   - Manual sync available
   - Real-time error monitoring

### ERP Integration (NetSuite)

1. **Setup**

   ```
   Admin Panel → Integrations → Add Integration
   Select: NetSuite
   Enter: Account ID, API credentials
   ```

2. **Configuration**
   - Select subsidiary
   - Map inventory items
   - Configure order sync

3. **Data Flow**
   - Inventory → NetSuite
   - Purchase Orders → NetSuite
   - Master data ← NetSuite

### Email Integration (SendGrid)

1. **Setup**

   ```
   Admin Panel → Integrations → Add Integration
   Select: SendGrid
   Enter: API Key
   ```

2. **Configuration**
   - Set from address
   - Configure notification types
   - Schedule digests

3. **Notifications**
   - Invoice received
   - Low inventory alert
   - Daily digest
   - Custom alerts

---

## Compliance & Security

### GDPR Compliance

**Right to Access**

- Users can download their data
- Supports JSON, CSV, PDF formats
- Historical access requests tracked

**Right to be Forgotten**

- User can request data deletion
- Soft delete with anonymization
- Audit trail preserved

**Data Retention**

- Configurable policies per data type
- Auto-deletion of expired data
- Archive before delete option

**Audit Logging**

- All data access logged
- Modification history tracked
- Export available for compliance

### Data Security

**Encryption**

- AES-256 encryption at rest
- TLS 1.3 in transit
- Key rotation on schedule

**Access Control**

- Role-based permissions
- IP whitelisting option
- Session management
- 2FA support

---

## Troubleshooting

### Common Issues

**Issue: Multi-outlet context not loading**

- Ensure MultiOutletProvider wraps app
- Check localStorage for outlet data
- Verify user permissions

**Issue: Forecasting not accurate**

- Check data freshness (90+ days recommended)
- Verify no anomalies in historical data
- Review seasonal patterns

**Issue: Integration sync failing**

- Test connection in admin panel
- Verify API credentials
- Check rate limits
- Review error logs

### Debug Mode

Enable debug logging:

```javascript
localStorage.setItem("DEBUG_ECHO_OPS", "true");
```

### Support

- Documentation: https://docs.echo-ops.example.com
- Slack: #echo-ops-support
- Email: support@echo-ops.example.com

---

## API Reference

### Multi-Outlet Context

```typescript
useMultiOutlet(): MultiOutletContextType
- organization: Organization | null
- outlets: Outlet[]
- currentOutlet: Outlet | null
- selectOutlet(outletId: string): boolean
- getAccessibleOutlets(): Outlet[]
- isMultiOutlet(): boolean
```

### Forecasting

```typescript
exponentialSmoothing(data: TimeSeriesData[], alpha?: number, periods?: number): ForecastResult[]

optimizeSuppliers(suppliers: SupplierData[], weeklyDemand: number): SupplierOptimization[]

detectSeasonalPatterns(data: TimeSeriesData[], period?: number): SeasonalPattern[]
```

### Advanced Analytics

```typescript
predictiveForecast(data: TimeSeriesData[], periods?: number): PredictiveAnalysis

analyzeCostTrends(data: TimeSeriesData[], period?: "month" | "quarter"): CostTrendAnalysis

compareOutlets(metrics: OutletMetric[]): OutletComparison[]

calculateKPIs(data: KPIData): Record<string, number>
```

### Integrations

```typescript
AccountingIntegration
- syncInvoices(invoices: Invoice[]): Promise<SyncResult>
- syncExpenses(expenses: Expense[]): Promise<SyncResult>
- getChartOfAccounts(): Promise<Account[]>

ERPIntegration
- syncInventory(items: InventoryItem[]): Promise<SyncResult>
- syncPurchaseOrders(orders: PurchaseOrder[]): Promise<SyncResult>
- getMasterData(type: string): Promise<any[]>

EmailNotificationService
- sendInvoiceNotification(recipients: string[], invoice: Invoice): Promise<SyncResult>
- sendLowInventoryAlert(recipients: string[], items: InventoryItem[]): Promise<SyncResult>
- sendDailyDigest(recipient: string, summary: Summary): Promise<SyncResult>
```

### Compliance

```typescript
DataExportManager
- generateJSONExport(data: any): string
- generateCSVExport(data: any[]): string
- downloadExport(data: string | Blob, filename: string): void

GDPRAuditTrail
- logAccess(userId: string, dataType: string, details: any): void
- logExport(userId: string, dataTypes: string[]): void
- getEntriesForUser(userId: string): AuditTrailEntry[]
```

---

## Release Notes

### v1.0.0 - Initial Release

#### Features Implemented

- ✅ Multi-outlet dashboard
- ✅ Comprehensive testing (unit, integration, E2E)
- ✅ Demand forecasting and optimization
- ✅ Advanced analytics and reporting
- ✅ Admin panel with user management
- ✅ Enterprise integrations (Accounting, ERP, Email)
- ✅ GDPR compliance and data privacy
- ✅ Mobile-responsive design
- ✅ Performance monitoring
- ✅ Comprehensive documentation

#### Supported Organizations

- Startup: 1-2 outlets
- Growth: 3-10 outlets
- Enterprise: 10+ outlets (tested with 50+)

#### System Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- Internet connectivity
- 4GB minimum RAM recommended
- 500MB storage for caching

---

## Getting Started Guide

### For Admins

1. **Initial Setup**
   - Create organization account
   - Add outlets
   - Configure user roles
   - Set retention policies

2. **Integration Setup**
   - Connect accounting software
   - Connect ERP system
   - Configure email notifications

3. **Team Training**
   - Assign roles to team members
   - Schedule training sessions
   - Configure user permissions

### For Managers

1. **First Steps**
   - Familiarize yourself with dashboard
   - Review outlet data
   - Set up purchase orders
   - Configure suppliers

2. **Daily Operations**
   - Check inventory levels
   - Review forecasts
   - Process purchase orders
   - Monitor analytics

### For Receivers

1. **Getting Started**
   - Learn scanner usage
   - Practice invoice processing
   - Understand inventory updates

2. **Daily Tasks**
   - Receive and scan invoices
   - Update inventory
   - Process deliveries
   - Report discrepancies

---

## Performance Metrics

### System Performance

- Dashboard load time: < 2 seconds
- Data export: < 30 seconds (1000+ records)
- Forecast calculation: < 5 seconds
- Audit trail search: < 2 seconds

### Scalability

- Support for 50+ outlets in single organization
- 100,000+ invoices/year per outlet
- 10,000+ inventory items
- 1,000+ concurrent users

---

## Additional Resources

- **Video Tutorials**: https://learn.echo-ops.example.com
- **Admin Manual**: `/docs/admin-manual.pdf`
- **User Guide**: `/docs/user-guide.pdf`
- **API Documentation**: https://api.echo-ops.example.com/docs
- **Community Forum**: https://community.echo-ops.example.com

---

_Last Updated: 2024_
_Version: 1.0.0_
