# Echo Ops - Quick Start Guide

## For Developers

### Prerequisites

- Node.js 20+
- pnpm 10.14.0+
- Git

### Installation (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/your-org/echo-ops.git
cd echo-ops

# 2. Install dependencies
pnpm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Update .env.local with local values
# (Use dummy values for development)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:8080

# 5. Start dev server
pnpm dev

# 6. Open browser
# http://localhost:8080
```

### Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm dev:ssl         # Dev server with HTTPS

# Building
pnpm build            # Build for production
pnpm build:client    # Build client only
pnpm build:server    # Build server only

# Testing
pnpm test            # Run all tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # Coverage report

# Code Quality
pnpm typecheck       # TypeScript validation
pnpm format.fix     # Auto-format code
pnpm lint            # Run linter (if configured)

# Production
pnpm start          # Start production server (after build)
```

### Project Structure

```
echo-ops/
├── client/              # Frontend React app
│   ├── components/      # Reusable UI components
│   ├── context/         # State management
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions
│   ├── pages/           # Route pages
│   └── App.tsx          # Main app component
├── server/              # Express backend
│   ├── routes/          # API routes
│   └── index.ts         # Server setup
├── shared/              # Shared types & interfaces
├── tests/               # Test files
├── functions/           # Netlify/Vercel functions
├── migrations/          # Database migrations
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config
├── netlify.toml         # Netlify config
└── README.md            # This file
```

### Adding a New Page

1. **Create page component**

   ```bash
   touch client/pages/MyPage.tsx
   ```

2. **Add route in App.tsx**

   ```typescript
   const MyPage = lazy(() => import("./pages/MyPage"));

   // In Routes:
   <Route path="/my-page" element={<MyPage />} />
   ```

3. **Create page content**

   ```typescript
   export function MyPage() {
     return (
       <div>
         <h1>My Page</h1>
       </div>
     );
   }

   export default MyPage;
   ```

### Adding a New Component

1. **Create component file**

   ```bash
   touch client/components/MyComponent.tsx
   ```

2. **Write component**

   ```typescript
   import React from "react";

   interface MyComponentProps {
     title: string;
     onClick?: () => void;
   }

   export function MyComponent({ title, onClick }: MyComponentProps) {
     return (
       <div onClick={onClick}>
         {title}
       </div>
     );
   }
   ```

3. **Use in pages/components**

   ```typescript
   import { MyComponent } from "@/components/MyComponent";

   export function MyPage() {
     return <MyComponent title="Hello" />;
   }
   ```

### Database

#### Local Development

For local development, the app works with mock data. No database setup required.

#### Production

Production uses Supabase. See DEPLOYMENT_SETUP.md for configuration.

### Testing

```bash
# Run tests
pnpm test

# Run specific test file
pnpm test tests/unit/api.test.ts

# Watch mode (re-run on file changes)
pnpm test --watch

# Coverage report
pnpm test --coverage
```

### Debugging

#### In Browser

```javascript
// Open browser console
console.log(data);
debugger; // Pause execution
```

#### In VS Code

1. Install "Debugger for Chrome" extension
2. Create `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "chrome",
         "request": "launch",
         "name": "Launch Chrome",
         "url": "http://localhost:8080",
         "webRoot": "${workspaceFolder}/client",
         "sourceMapPathOverride": {
           "webpack:///./client/*": "${webRoot}/*"
         }
       }
     ]
   }
   ```
3. Press F5 to start debugging

### Environment Variables

See `.env.example` for all available variables.

**Minimum for development:**

```env
VITE_API_URL=http://localhost:8080
VITE_DEBUG=true
```

### Troubleshooting

**Port already in use**

```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Or use different port
pnpm dev -- --port 3000
```

**Dependencies not installing**

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**TypeScript errors**

```bash
# Check for errors
pnpm typecheck

# Auto-fix formatting
pnpm format.fix
```

**Tests failing**

```bash
# Run with verbose output
pnpm test -- --reporter=verbose

# Run specific test
pnpm test tests/unit/api.test.ts
```

### Performance

Check the Performance Monitoring dashboard:

```
http://localhost:8080/monitoring
```

Or use Chrome DevTools:

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform actions
5. Click Stop
6. Analyze flamegraph

---

## For DevOps/Operations

### Deploying Updates

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
pnpm install

# 3. Build
pnpm build

# 4. Test
pnpm test

# 5. Push to deployment platform
git push origin main
# Netlify/Vercel auto-deploys
```

### Monitoring Production

```
Dashboard:   https://your-domain.com/monitoring
Sentry:      https://sentry.io/organizations/your-org
Status Page: https://status.your-domain.com
```

### Health Checks

```bash
# Basic health check
curl https://your-domain.com/api/health

# Full system check
curl https://your-domain.com/api/health/full
```

### Database Backup

```bash
# Backup with Supabase CLI
supabase db dump -f backup.sql

# Restore from backup
supabase db restore backup.sql
```

### Logs

```bash
# View deployment logs
# Netlify: Go to Deploys → Build logs
# Vercel: Go to Deployments → Logs

# View function logs
# Netlify: Functions → Logs
# Vercel: Functions → Logs
```

---

## For End Users

### Accessing the App

1. Go to https://your-domain.com
2. Create account with email
3. Set password
4. Verify email
5. Login

### First Steps

1. **Set up organization** (Admin only)
   - Go to Admin Panel
   - Enter organization details
   - Create outlets

2. **Add team members**
   - Admin Panel → User Management
   - Click Add User
   - Assign roles

3. **Start using**
   - Dashboard - View KPIs
   - Receiving - Process invoices
   - Purchasing - Create orders
   - Analytics - View reports

### Getting Help

- **In-app help**: Click `?` on any page
- **Documentation**: https://docs.echo-ops.example.com
- **Support**: support@echo-ops.example.com
- **Training**: TRAINING_GUIDE.md

---

## Key Features

✅ Multi-outlet dashboard
✅ Invoice processing
✅ Purchase order management
✅ Inventory tracking
✅ Advanced analytics
✅ Forecasting & optimization
✅ Integrations (Accounting, ERP, Email)
✅ GDPR compliance
✅ Mobile responsive
✅ Performance monitoring

---

## Version

- **Current**: 1.0.0
- **Node**: 20+
- **React**: 18+
- **TypeScript**: 5+

---

## Support

- **Issues**: GitHub Issues
- **Documentation**: See SYSTEM_DOCUMENTATION.md
- **Deployment**: See DEPLOYMENT_SETUP.md
- **Monitoring**: See MONITORING_SETUP.md
- **Training**: See TRAINING_GUIDE.md

---

_Last Updated: 2024_
