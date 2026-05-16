# Sentry Setup & Error Tracking Guide

Complete guide to setting up Sentry for error tracking, performance monitoring, and user session replay.

## Overview

Sentry provides:
- Real-time error tracking and alerting
- Performance monitoring (slow requests, database queries)
- User session replay for debugging
- Source map support
- Multi-team collaboration
- Integration with Slack, PagerDuty, etc.

## Prerequisites

- Sentry account (free tier available at https://sentry.io)
- Project DSN (Data Source Name)
- Environment configured

---

## 1. Create Sentry Project

### Step 1: Sign Up
Visit https://sentry.io and create a free account.

### Step 2: Create Projects
Create two projects:
1. **Lucca Backend** - Node.js project
2. **Lucca Frontend** - React project

### Step 3: Get DSNs
For each project, you'll get a DSN that looks like:
```
https://[KEY]@[ORGANIZATION].ingest.sentry.io/[PROJECT_ID]
```

---

## 2. Install Dependencies

```bash
# Install Sentry packages
npm install @sentry/node @sentry/profiling-node
npm install @sentry/react @sentry/tracing
```

---

## 3. Backend Configuration

### 3.1 Set Environment Variables

Add to `.env` or deployment environment:
```bash
SENTRY_DSN=https://your-backend-dsn@sentry.io/[ID]
NODE_ENV=production
```

### 3.2 Initialize in Server

Update `server/index.ts`:

```typescript
import { initializeSentry } from './lib/sentryInitializer';
import { 
  sentryRequestHandler, 
  sentryErrorHandler,
  sentryTracingMiddleware 
} from './middleware/sentryMiddleware';

// Initialize Sentry FIRST (before other middleware)
initializeSentry();

const app = express();

// Add Sentry request handler EARLY
app.use(sentryRequestHandler());
app.use(sentryTracingMiddleware);

// ... other middleware ...

// Add Sentry error handler LAST
app.use(sentryErrorHandler());

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

### 3.3 Capture Exceptions in Routes

```typescript
import { captureException, setUserContext, addBreadcrumb } from '../lib/sentryInitializer';

// In route handlers
router.get('/invoices', async (req, res) => {
  try {
    // Set user context for better debugging
    if (req.user?.id) {
      setUserContext(req.user.id, { email: req.user.email });
    }

    // Track important actions
    addBreadcrumb('Fetching invoices', 'api', 'info');

    const invoices = await supabase
      .from('invoices')
      .select('*');

    res.json(invoices);
  } catch (error) {
    // Automatically captured by error handler
    captureException(error, { 
      route: '/invoices',
      method: 'GET' 
    });
    
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});
```

---

## 4. Frontend Configuration

### 4.1 Set Environment Variables

Create `.env` or add to deployment:
```bash
REACT_APP_SENTRY_DSN=https://your-frontend-dsn@sentry.io/[ID]
```

### 4.2 Initialize in App

Update `client/App.tsx`:

```typescript
import { initializeSentryClient, SentryErrorBoundary } from './lib/sentryClient';

// Initialize Sentry early
initializeSentryClient();

export default function App() {
  return (
    <SentryErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Your routes */}
        </Routes>
      </BrowserRouter>
    </SentryErrorBoundary>
  );
}
```

### 4.3 Capture Errors in Components

```typescript
import { captureException, setUserContext, addBreadcrumb } from '../lib/sentryClient';

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        addBreadcrumb('Fetching invoices', 'api');

        const response = await fetch('/api/invoices');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch');
        }

        setInvoices(data);
      } catch (err) {
        setError(err.message);
        
        // Capture error with context
        captureException(err, {
          component: 'InvoiceList',
          action: 'fetchInvoices'
        });
      }
    };

    fetchInvoices();
  }, []);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return <InvoiceTable invoices={invoices} />;
}
```

---

## 5. React Router Integration

### Step 1: Wrap Router

```typescript
import * as Sentry from '@sentry/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const SentryRoutes = Sentry.withSentryRouting(Routes);
const SentryRouter = Sentry.withProfiler(Router);

export default function App() {
  return (
    <SentryRouter>
      <SentryRoutes>
        {/* Your routes */}
      </SentryRoutes>
    </SentryRouter>
  );
}
```

---

## 6. Source Maps

### 6.1 Generate Source Maps

Update `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    sourcemap: true,
    minify: 'terser',
  }
});
```

### 6.2 Upload Source Maps

Install CLI:
```bash
npm install --save-dev @sentry/cli
```

Create `.sentryclirc`:
```ini
[auth]
token=YOUR_SENTRY_AUTH_TOKEN

[defaults]
org=YOUR_ORG
project=YOUR_PROJECT
```

Upload in build script:
```bash
# In package.json
"build": "npm run build:client && npm run build:server && sentry-cli releases files upload-sourcemaps dist/spa",
```

---

## 7. Sampling Configuration

### Production Sampling

Avoid excessive costs in production by sampling:

```typescript
// In sentryInitializer.ts
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
```

- **Development:** 100% (capture everything)
- **Production:** 10% (capture 1 in 10 requests)
- **Replay Sessions:** 10% always, 100% on errors

### Adjust Based on Traffic

```typescript
// If you have high traffic, reduce sampling
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0,
// 1% sampling = $0.01 per transaction

// If you have low traffic, increase sampling
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.5 : 1.0,
// 50% sampling
```

---

## 8. Alerting & Notifications

### Setup Slack Integration

1. Go to Sentry Project Settings > Integrations
2. Click "Slack" 
3. Authorize Sentry access
4. Choose channel for alerts

### Create Alert Rule

1. Go to Alerts > Create Alert Rule
2. Set conditions:
   - Error rate > 5% in 5 minutes
   - New issue detected
   - Issue recurrence
3. Set actions: Send Slack message, Email, PagerDuty

### Example Rule Configuration

```
When: An issue is first seen
Then: Send Slack notification to #alerts channel
     Send email to devops@company.com
```

---

## 9. Monitoring Specific Features

### Track Payment Processing

```typescript
import { addBreadcrumb, captureMessage } from '../lib/sentryInitializer';

async function processPayment(orderId: string, amount: number) {
  addBreadcrumb('Processing payment', 'payment', 'info', {
    orderId,
    amount
  });

  try {
    const result = await paymentService.charge(amount);
    
    addBreadcrumb('Payment succeeded', 'payment', 'info', {
      paymentId: result.id
    });

    return result;
  } catch (error) {
    captureException(error, {
      orderId,
      amount,
      step: 'payment_processing'
    });

    throw error;
  }
}
```

### Track Database Operations

```typescript
async function fetchInvoices(outlet_id: string) {
  const startTime = performance.now();

  addBreadcrumb('Fetching invoices', 'database', 'info', {
    outlet_id
  });

  try {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('outlet_id', outlet_id);

    const duration = performance.now() - startTime;

    // Alert on slow queries
    if (duration > 3000) {
      captureMessage(
        'Slow database query',
        'warning',
        { query: 'fetchInvoices', duration, outlet_id }
      );
    }

    return data;
  } catch (error) {
    captureException(error, {
      query: 'fetchInvoices',
      outlet_id
    });

    throw error;
  }
}
```

---

## 10. Release Tracking

### Link Errors to Releases

```typescript
// In sentryInitializer.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: process.env.APP_VERSION, // e.g., "1.0.0"
  // ...
});
```

### Create Release in CI/CD

```bash
# In your deployment script
export SENTRY_RELEASE=$(git describe --tags --always)

# Deploy application...

# Create release
sentry-cli releases create $SENTRY_RELEASE
sentry-cli releases set-commits $SENTRY_RELEASE --auto
sentry-cli releases files upload-sourcemaps dist/spa
sentry-cli releases finalize $SENTRY_RELEASE
```

---

## 11. Testing Sentry

### Test Error Capture

**Backend:**
```bash
# Make a request that triggers an error
curl http://localhost:3000/api/test-error
```

**Frontend:**
```typescript
// In browser console
import { captureException } from './lib/sentryClient';
captureException(new Error('Test error'));
```

### Verify in Sentry Dashboard

1. Log into Sentry
2. Go to Project > Issues
3. Look for your test error
4. Click to view details

---

## 12. Performance Monitoring

### View Performance Data

1. Sentry Dashboard > Performance
2. See slowest transactions
3. Identify bottlenecks
4. Click transaction to see breakdown

### Key Metrics

- **P50/P95/P99:** Response time percentiles
- **Throughput:** Requests per second
- **Error Rate:** Percentage of failed requests
- **Apdex:** Application Performance Index

---

## 13. Session Replay

### Enable Replay

Already configured in `client/lib/sentryClient.ts`:

```typescript
new Sentry.Replay({
  maskAllText: true,    // Privacy: mask text input
  blockAllMedia: true,  // Privacy: block media files
});
```

### View Replay

1. Go to issue in Sentry
2. Click "Replays" tab
3. Watch user session that triggered error

---

## 14. Cost Management

### Estimated Monthly Costs

- **Error Events:** Free tier = 5,000/month
- **Performance Events:** $0.02 per event
- **Replays:** $0.00375 per replay

### Optimize Costs

1. Set appropriate sampling rates
2. Filter out noise (404s, network timeouts)
3. Use release-based alerts
4. Set data retention (30 days)

---

## 15. Security & Privacy

### Secure Your DSN

- Keep DSN in environment variables
- Don't commit to version control
- Rotate auth tokens regularly
- Use separate projects for dev/staging/prod

### Data Privacy

- Personally Identifiable Information (PII) is masked by default
- Additional masking available in settings
- GDPR compliant
- Data stored in EU/US based on project setting

---

## Common Issues

### Issue: Errors not appearing in Sentry

**Solutions:**
1. Verify DSN is correct
2. Check network tab for failed requests to sentry.io
3. Ensure errors are being raised (not caught silently)
4. Check Sentry project permissions

### Issue: Too many errors/high costs

**Solutions:**
1. Increase sampling rate threshold
2. Add filters to reduce noise
3. Set proper `beforeSend` hooks
4. Adjust data retention

### Issue: Source maps not working

**Solutions:**
1. Generate source maps in build
2. Upload source maps to Sentry
3. Check file names match uploaded sources
4. Verify auth token has permission

---

## Next Steps

1. ✅ Create Sentry projects
2. ✅ Install dependencies
3. ✅ Configure environment variables
4. ✅ Initialize in backend & frontend
5. ✅ Test error capture
6. ✅ Setup alerts
7. ✅ Monitor performance
8. Deploy to production

---

## Support & Resources

- **Sentry Docs:** https://docs.sentry.io
- **API Documentation:** https://docs.sentry.io/api/
- **Dashboard:** https://sentry.io/auth/login/
- **Integrations:** https://sentry.io/integrations/

---

**Last Updated:** January 2024
