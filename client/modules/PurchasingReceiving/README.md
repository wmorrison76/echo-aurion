# Echo Ops - Enterprise Purchasing & Inventory Management System

[![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)](PRODUCTION_READY.md)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-green)]()

> A production-ready, enterprise-grade SaaS platform for hospitality purchasing, receiving, and inventory management. Designed to support everything from single-unit restaurants to mega resorts with 30+ outlets.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Getting Help](#getting-help)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### 🏢 Multi-Outlet Management

- Support for 1-50+ outlets per organization
- Independent inventory tracking per location
- Organization-wide and outlet-specific dashboards
- Consolidated analytics and reporting

### 📊 Advanced Analytics

- Real-time KPI dashboards
- Predictive demand forecasting (14+ days)
- Cost trend analysis with annual projections
- Seasonal pattern detection
- Anomaly detection with confidence scoring
- Outlet performance comparison

### 🔮 Intelligent Forecasting

- Exponential smoothing with trend analysis
- Supplier optimization recommendations
- Inventory optimization calculations
- Procurement recommendations with urgency levels

### 🛒 Purchasing & Ordering

- Purchase order creation and tracking
- Vendor management and comparison
- Order consolidation across outlets
- Cost analysis and variance tracking

### 📦 Receiving & Inventory

- Invoice processing with barcode scanning
- Hardware scanner integration (USB/WiFi)
- Automatic inventory lot creation
- Expiry date tracking
- On-hand balance updates

### 🔗 Enterprise Integrations

- **Accounting**: QuickBooks Online, Xero
- **ERP Systems**: NetSuite, SAP
- **Email**: SendGrid notifications
- Status monitoring and sync logs

### 🔐 Security & Compliance

- GDPR compliant data export and deletion
- Role-based access control (5 roles)
- Audit trail logging for all operations
- Data retention policies
- Encryption at rest and in transit

### 📱 Mobile Ready

- Fully responsive design
- Mobile-optimized interfaces
- Touch-friendly controls
- Works on all devices

### ⚡ Performance Monitoring

- Real-time system metrics
- Response time tracking
- Error rate monitoring
- Resource usage analytics

---

## Quick Start

### For End Users

1. **Access the Application**

   ```
   Visit: https://your-domain.com
   ```

2. **Create Account**
   - Sign up with email
   - Verify email address
   - Set password

3. **Get Started**
   - See [TRAINING_GUIDE.md](TRAINING_GUIDE.md) for role-specific training
   - Check in-app help (click `?` on any page)

### For Developers

**Installation** (5 minutes):

```bash
# Clone and install
git clone <repository>
cd echo-ops
pnpm install

# Setup environment
cp .env.example .env.local

# Start development
pnpm dev

# Open browser
# http://localhost:8080
```

**First Steps**:

- Read [QUICKSTART.md](QUICKSTART.md)
- Explore `/client/pages/` for page structure
- Check `/client/components/` for UI components
- Review tests in `/tests/`

### For Operations

**Deployment**:

```bash
# Push to main branch
git push origin main

# Platform auto-deploys
# Netlify/Vercel handles build & deploy

# Monitor at
# https://your-domain.com/monitoring
```

**Setup**:

- See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) for detailed steps
- See [MONITORING_SETUP.md](MONITORING_SETUP.md) for monitoring
- See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) before going live

---

## Architecture

### Technology Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| **Frontend**   | React 18 + TypeScript + TailwindCSS |
| **Backend**    | Express.js + Node.js                |
| **Database**   | Supabase (PostgreSQL)               |
| **Auth**       | Supabase Auth                       |
| **Deployment** | Netlify / Vercel                    |
| **Monitoring** | Built-in Dashboard + Sentry         |

### Project Structure

```
echo-ops/
├── client/                 # Frontend React application
│   ├── pages/             # Route components (7 new feature pages)
│   ├── components/        # Reusable UI components
│   ├── context/           # State management (MultiOutletContext)
│   ├── lib/               # Utility libraries (forecasting, analytics, etc.)
│   ├── hooks/             # Custom React hooks
│   └── App.tsx            # Main app with routing
├── server/                 # Express backend
│   ├── routes/            # API endpoints
│   └── index.ts           # Server setup
├── shared/                 # Shared types & utilities
├── tests/                  # Test files (50+ test cases)
│   ├── unit/              # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/               # E2E test helpers
├── functions/              # Serverless functions
├── migrations/             # Database migrations
├── docs/                   # Documentation
└── config files            # vite.config.ts, netlify.toml, etc.
```

### Key Components

- **Multi-Outlet Context** (`client/context/MultiOutletContext.tsx`) - Manages organization and outlet state
- **Dashboard** (`client/pages/MultiOutletDashboard.tsx`) - Real-time KPIs and metrics
- **Forecasting Engine** (`client/lib/forecasting.ts`) - Demand prediction and optimization
- **Advanced Analytics** (`client/lib/advanced-analytics.ts`) - Predictive analysis and trends
- **Integration Manager** (`client/pages/IntegrationManager.tsx`) - Accounting, ERP, Email
- **Compliance Tools** (`client/pages/ComplianceManager.tsx`) - GDPR and data management
- **Performance Monitoring** (`client/pages/PerformanceMonitoring.tsx`) - System health dashboard

---

## Documentation

### Getting Started

- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup guide
- **[TRAINING_GUIDE.md](TRAINING_GUIDE.md)** - Role-specific training (619 lines)

### For Developers

- **[SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)** - Complete system overview (639 lines)
- **API Reference** - See SYSTEM_DOCUMENTATION.md#api-reference
- **Code Comments** - Throughout source code

### For Operations

- **[DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md)** - Deploy to Netlify/Vercel (678 lines)
- **[MONITORING_SETUP.md](MONITORING_SETUP.md)** - Monitoring & alerting (650 lines)
- **[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)** - Production launch steps (521 lines)

### Production Readiness

- **[PRODUCTION_READY.md](PRODUCTION_READY.md)** - Completion summary & sign-off
- **[.env.example](.env.example)** - Environment variables template

---

## Features by Role

### Admin

✅ User management
✅ Organization settings
✅ Integration setup
✅ Audit logging
✅ Compliance tools
✅ Full system access

### Manager

✅ Outlet dashboard
✅ Purchase orders
✅ Analytics & reports
✅ Performance tracking
✅ Inventory management
✅ Outlet permissions

### Receiver

✅ Invoice processing
✅ Barcode scanning
✅ Inventory updates
✅ Delivery confirmation
✅ Exception handling

### Chef

✅ Recipe management
✅ Recipe costing
✅ Ingredient availability
✅ Menu planning

### Finance

✅ Financial reports
✅ Invoice analytics
✅ Cost analysis
✅ Spend forecasting
✅ Variance analysis

---

## Key Metrics

### Scalability

- ✅ Supports 1-50+ outlets
- ✅ 100,000+ invoices/year per outlet
- ✅ 10,000+ inventory items
- ✅ 1,000+ concurrent users

### Performance

- Response time: < 300ms average
- Dashboard load: < 2 seconds
- Export generation: < 30 seconds
- Forecast calculation: < 5 seconds

### Uptime

- Target: 99.9% SLA
- Auto-failover enabled
- Monitoring & alerting
- Rollback procedures

---

## Environment Variables

**Minimum for Development:**

```env
VITE_API_URL=http://localhost:8080
VITE_DEBUG=true
```

**Production:**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
VITE_API_URL=https://api.your-domain.com
# ... plus integration keys
```

See [.env.example](.env.example) for complete list.

---

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage

# Specific test file
pnpm test tests/unit/api.test.ts
```

### Coverage

- **Unit Tests**: API utilities, calculations, algorithms
- **Integration Tests**: Workflows, multi-outlet operations
- **E2E Tests**: User flows, authorization, navigation

---

## Development

### Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm typecheck        # Check TypeScript
pnpm format.fix       # Format code
pnpm test             # Run tests

# Production
pnpm start            # Start production server (after build)
```

### Adding Features

See [QUICKSTART.md](QUICKSTART.md#adding-a-new-page) for step-by-step guides on:

- Adding new pages
- Creating new components
- Adding database migrations
- Writing tests

---

## Deployment

### Automatic Deployment

1. Push to main branch: `git push origin main`
2. Platform auto-builds and deploys
3. Deployment takes 3-10 minutes
4. Monitor at `/monitoring` dashboard

### Manual Deployment

**Netlify:**

```bash
# Build locally first
pnpm build

# Deploy to Netlify
netlify deploy --prod
```

**Vercel:**

```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys
# Or manual: vercel --prod
```

See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) for detailed instructions.

---

## Monitoring

### Dashboard

```
Navigate to: /monitoring
Shows: Real-time metrics, system health, error rates
Access: Admin only
```

### Health Checks

```bash
# API health
curl https://your-domain.com/api/health

# Expected response
{
  "status": "healthy",
  "uptime": 86400,
  "database": "connected"
}
```

### Alerts

- Critical alerts: Immediate notification
- Warning alerts: 1-hour digest
- Info alerts: Daily summary

See [MONITORING_SETUP.md](MONITORING_SETUP.md) for configuration.

---

## Security

### Implemented

✅ HTTPS/TLS 1.3
✅ AES-256 encryption
✅ Role-based access control
✅ Audit trail logging
✅ Session management
✅ GDPR compliance
✅ Security headers
✅ Rate limiting

### Best Practices

- Never commit secrets
- Rotate API keys quarterly
- Use environment variables
- Enable 2FA
- Monitor audit logs
- Regular security reviews

---

## Support

### Documentation

- **[SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)** - Complete guide
- **[TRAINING_GUIDE.md](TRAINING_GUIDE.md)** - User training
- **In-app help** - Click `?` on any page

### Getting Help

**For Issues:**

1. Check documentation
2. Search GitHub Issues
3. Create new issue with details

**For Support:**

- Email: support@echo-ops.example.com
- Slack: #echo-ops-support
- Docs: https://docs.echo-ops.example.com

### Known Issues

- See GitHub Issues for current issues
- See [TROUBLESHOOTING.md](#) for common solutions

---

## Contributing

### Development Guidelines

1. Create feature branch: `git checkout -b feature/name`
2. Make changes following code style
3. Write tests for new features
4. Run `pnpm test` to verify
5. Create pull request

### Code Style

- TypeScript for all code
- TailwindCSS for styling
- Functional components with hooks
- Props interfaces
- Error boundaries

### Commit Messages

```
feat: Add feature description
fix: Fix bug description
docs: Update documentation
test: Add tests
chore: Maintenance tasks
```

---

## License

Proprietary - All rights reserved

**Usage**: This software is for authorized use only. Unauthorized copying, distribution, or modification is prohibited.

---

## Changelog

### Version 1.0.0 (Current)

- ✅ Initial production release
- ✅ Multi-outlet support
- ✅ Advanced analytics
- ✅ Enterprise integrations
- ✅ GDPR compliance
- ✅ Comprehensive testing
- ✅ Full documentation

### Planned (v1.1)

- Mobile app (iOS/Android)
- Advanced forecasting models
- Vendor management portal
- Recipe management expansion
- API webhooks

---

## Credits

**Built with:**

- React 18
- TypeScript
- TailwindCSS
- Radix UI
- Express.js
- Supabase

**Inspired by:**

- Modern SaaS best practices
- Enterprise software design
- Hospitality industry needs

---

## Contact

- **Website**: https://echo-ops.example.com
- **Support**: support@echo-ops.example.com
- **Status**: https://status.echo-ops.example.com
- **Docs**: https://docs.echo-ops.example.com

---

## Roadmap

### Q1 2024

- [x] Production release
- [x] Comprehensive documentation
- [ ] Mobile app (iOS)
- [ ] Mobile app (Android)

### Q2 2024

- [ ] Advanced forecasting v2
- [ ] Vendor portal
- [ ] Recipe expansion
- [ ] API webhooks

### Q3 2024

- [ ] White-label support
- [ ] Advanced reporting
- [ ] Custom integrations
- [ ] Performance optimization

### Q4 2024

- [ ] International expansion
- [ ] Multi-currency support
- [ ] Enterprise features
- [ ] Compliance certifications

---

**Status**: ✅ Production Ready | Version 1.0.0 | Last Updated: 2024

For detailed information, see [PRODUCTION_READY.md](PRODUCTION_READY.md).
