# Error Logging & Observability Guide

Complete guide to logging, error tracking, and observability in production.

## Overview

A good logging strategy includes:
- **Structured Logging:** JSON format for easy parsing
- **Log Levels:** DEBUG, INFO, WARN, ERROR, FATAL
- **Log Aggregation:** Centralized log management
- **Error Tracking:** Integration with Sentry
- **Performance Monitoring:** Track slow operations
- **Audit Logging:** Security and compliance

---

## 1. Logging System

### Setup

The application uses **Pino** logger with structured JSON output:

```typescript
import { logger, logInfo, logError } from '../lib/logger';

// Basic logging
logInfo('Invoice created', { invoiceId: '123', amount: 100 });

// Error logging
logError(error, { action: 'payment_processing' });

// Performance logging
logPerformance('database_query', duration, { query: 'SELECT invoices' });
```

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| DEBUG | Detailed diagnostic info | Variable values, function entry/exit |
| INFO | General informational messages | "User logged in", "Invoice created" |
| WARN | Warning conditions | "Slow query", "High memory usage" |
| ERROR | Error events | Exceptions, failed operations |
| FATAL | Critical system failure | Database connection lost |

### Set Log Level

```bash
# Via environment variable
LOG_LEVEL=debug npm start

# In production (less verbose)
LOG_LEVEL=info

# In development (more verbose)
LOG_LEVEL=debug
```

---

## 2. Structured Logging

### Format

All logs use JSON format for machine parsing:

```json
{
  "level": 30,
  "time": "2024-01-20T10:30:45.123Z",
  "pid": 1234,
  "hostname": "app-server",
  "type": "http_request",
  "method": "POST",
  "url": "/api/invoices",
  "status": 201,
  "duration": "145ms",
  "ip": "192.168.1.1",
  "userId": "user-123"
}
```

### Logging Examples

**HTTP Request:**
```typescript
logRequest(req, res, 145);
// Logs: method, url, status, duration, ip, userAgent
```

**Database Operation:**
```typescript
logDatabaseOperation('SELECT', 'invoices', 234, 50);
// Logs: operation, table, duration, rowsAffected
```

**Error:**
```typescript
logError(error, {
  action: 'payment_processing',
  invoiceId: 'inv-123'
});
// Logs: error message, stack trace, context
```

**Audit Event:**
```typescript
logAudit('CREATE', 'invoice', 'inv-123', 'user-456', {
  amount: 100,
  vendor: 'Vendor Inc'
});
// Logs: action, resource, user, changes
```

---

## 3. Application Logging

### Express Integration

Add logging middleware to your Express app:

```typescript
import { requestLoggingMiddleware, errorHandlingMiddleware } from './middleware/loggingMiddleware';

app.use(requestLoggingMiddleware);

// ... your routes ...

app.use(errorHandlingMiddleware);
```

### API Endpoint Logging

```typescript
import { logInfo, logError, logPerformance } from '../lib/logger';

router.post('/api/invoices', async (req, res) => {
  const startTime = Date.now();

  try {
    logInfo('Creating invoice', { userId: req.user.id });

    const invoice = await invoiceService.create(req.body);

    const duration = Date.now() - startTime;
    logPerformance('create_invoice', duration, { invoiceId: invoice.id });

    res.json(invoice);
  } catch (error) {
    logError(error, {
      action: 'create_invoice',
      userId: req.user.id
    });

    res.status(500).json({ error: 'Failed to create invoice' });
  }
});
```

### Database Operation Logging

```typescript
import { logDatabaseOperation } from '../lib/logger';

async function fetchInvoices(outlet_id: string) {
  const startTime = Date.now();

  const { data, count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('outlet_id', outlet_id);

  const duration = Date.now() - startTime;
  logDatabaseOperation('SELECT', 'invoices', duration, count);

  return data;
}
```

### Service Layer Logging

```typescript
async function processPayment(payment: Payment) {
  try {
    logInfo('Processing payment', {
      paymentId: payment.id,
      amount: payment.amount,
      method: payment.method
    });

    const result = await paymentProvider.charge(payment);

    logInfo('Payment succeeded', {
      paymentId: payment.id,
      transactionId: result.id
    });

    return result;
  } catch (error) {
    logError(error, {
      paymentId: payment.id,
      amount: payment.amount,
      step: 'charge'
    });

    throw error;
  }
}
```

---

## 4. Log Aggregation

### View Logs Locally

```bash
# Start app with colored output
npm run dev

# View logs in JSON format
npm start | jq
```

### Fly.io Logs

```bash
# View logs
flyctl logs

# Follow logs in real-time
flyctl logs --follow

# Filter logs
flyctl logs | grep error
flyctl logs | grep "type.*audit"

# Tail last 100 lines
flyctl logs -n 100

# Export logs
flyctl logs --format json > logs.json
```

### Query Logs

```bash
# Find all errors
flyctl logs | grep '"level":50'

# Find slow requests (>1000ms)
flyctl logs | grep "duration.*[0-9][0-9][0-9][0-9]"

# Find specific user activity
flyctl logs | grep "user-123"

# Count errors by type
flyctl logs | jq 'select(.level >= 50) | .type' | sort | uniq -c
```

---

## 5. Sentry Integration

### Error Tracking

Sentry automatically captures all logged errors:

```typescript
import { captureException } from '../lib/sentryInitializer';

try {
  await processPayment(payment);
} catch (error) {
  // This error is logged to both console and Sentry
  logError(error, { paymentId: payment.id });
  captureException(error, { paymentId: payment.id });
}
```

### Breadcrumbs

Sentry can track the path to an error:

```typescript
import { addBreadcrumb } from '../lib/sentryInitializer';

async function processInvoice(invoiceId: string) {
  addBreadcrumb('Fetching invoice', 'database');
  const invoice = await getInvoice(invoiceId);

  addBreadcrumb('Processing invoice', 'business_logic');
  const result = await processInvoice(invoice);

  addBreadcrumb('Updating database', 'database');
  await updateInvoice(result);
}
// If any step fails, Sentry will show all breadcrumbs
```

---

## 6. Performance Logging

### Slow Query Alerts

Log database queries that take too long:

```typescript
const startTime = Date.now();

const { data } = await supabase
  .from('invoices')
  .select('*')
  .eq('outlet_id', outletId);

const duration = Date.now() - startTime;

if (duration > 1000) {
  logWarn('Slow database query', {
    table: 'invoices',
    duration,
    rowsReturned: data.length
  });
}
```

### Slow API Endpoint Alerts

```typescript
const startTime = Date.now();

// ... process request ...

const duration = Date.now() - startTime;

if (duration > 5000) {
  logWarn('Slow API response', {
    endpoint: req.path,
    method: req.method,
    duration
  });

  captureMessage('Slow API response detected', 'warning', {
    endpoint: req.path,
    duration
  });
}
```

### Memory Alerts

```typescript
function checkMemory() {
  const usage = process.memoryUsage();
  const heapPercent = (usage.heapUsed / usage.heapTotal) * 100;

  if (heapPercent > 90) {
    logWarn('High memory usage', {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
      percent: heapPercent.toFixed(1)
    });
  }
}

// Check every 60 seconds
setInterval(checkMemory, 60000);
```

---

## 7. Audit Logging

### What to Audit

```typescript
// User authentication
logAudit('LOGIN', 'user', userId, userId);
logAudit('LOGOUT', 'user', userId, userId);
logAudit('MFA_ENABLED', 'user', userId, userId);

// Data modifications
logAudit('CREATE', 'invoice', invoiceId, userId, { amount, vendor });
logAudit('UPDATE', 'invoice', invoiceId, userId, { status: 'paid' });
logAudit('DELETE', 'invoice', invoiceId, userId);

// Access control
logAudit('PERMISSION_CHANGED', 'user', userId, adminId, { newRole: 'admin' });
logAudit('ACCESS_DENIED', 'resource', resourceId, userId);

// Sensitive operations
logAudit('PAYMENT_PROCESSED', 'payment', paymentId, userId, { amount });
logAudit('BACKUP_CREATED', 'backup', backupId, userId);
logAudit('SECRET_ROTATED', 'secret', secretName, adminId);
```

### Query Audit Logs

```bash
# Find all user modifications
flyctl logs | grep 'action.*UPDATE.*invoice'

# Find admin actions
flyctl logs | grep 'type.*audit' | grep admin

# Track specific user
flyctl logs | grep 'user.*123'
```

---

## 8. Debugging with Logs

### Find Root Cause

```bash
# 1. Find error message
flyctl logs | grep error

# 2. Find related logs
flyctl logs | grep "2024-01-20T10:30"

# 3. Look for breadcrumbs
flyctl logs | jq 'select(.breadcrumbs) | .breadcrumbs'

# 4. Check performance
flyctl logs | grep "duration" | tail -20
```

### Trace Request Flow

```bash
# Export logs with request IDs
flyctl logs --format json > logs.json

# Find all logs for a request
jq 'select(.requestId == "req-123")' logs.json

# See chronological order
jq 'select(.requestId == "req-123") | [.time, .type, .message]' logs.json
```

---

## 9. Production Best Practices

### Never Log Secrets

```typescript
// ✗ WRONG: Never log sensitive data
logger.info('Database connected', {
  password: process.env.DB_PASSWORD  // NEVER!
});

// ✓ CORRECT: Only log non-sensitive info
logger.info('Database connected', {
  host: process.env.DB_HOST,
  database: process.env.DB_NAME
});
```

### Use Appropriate Log Levels

```typescript
// Don't over-log (creates too much noise)
logger.info('Function called'); // Too verbose
logger.debug('Processing invoice'); // Better

// Log important business events
logger.info('Invoice created', { invoiceId, amount }); // Good

// Log errors with context
logger.error({ error: err, action: 'payment_processing' });
```

### Sanitize Sensitive Data

```typescript
// Before logging payment info
const sanitized = {
  amount: payment.amount,
  method: payment.method,
  cardLast4: payment.cardNumber.slice(-4),
  // Don't include: full card number, CVV, etc.
};

logger.info('Payment processed', sanitized);
```

---

## 10. Log Retention

### Data Retention Policy

```
Development:
- Keep logs for 7 days
- Lower to reduce storage

Staging:
- Keep logs for 30 days
- Use for debugging before production

Production:
- Keep logs for 90 days (compliance)
- Archive to S3 for long-term (1 year)
- Use for audit trail
```

### Cleanup Old Logs

Fly.io automatically manages log retention based on your plan.

For external log aggregators:

```bash
# Archive old logs to S3
aws s3 sync logs/ s3://lucca-logs-archive/ --delete

# Delete logs older than 90 days
flyctl volumes list  # Check volume retention
```

---

## 11. Monitoring Logs

### Key Metrics

```
- Error rate (errors per minute)
- Log volume (logs per second)
- Average response time
- Slow queries (> 1000ms)
- Failed authentication attempts
```

### Alert Rules

**Error Rate High:**
```
if (error_count > 10 in 5 minutes) then alert
```

**Suspicious Activity:**
```
if (failed_auth > 5 in 10 minutes) then alert
if (DELETE requests > 5 in 1 minute) then alert
```

**Performance Degradation:**
```
if (avg_response_time > 2000ms in 5 minutes) then alert
if (slow_queries > 5 in 10 minutes) then alert
```

---

## 12. Logging Checklist

### On Deployment
- [ ] Verify logs are being written
- [ ] Check log format is valid JSON
- [ ] Ensure no secrets in logs
- [ ] Verify log aggregation is working

### Weekly
- [ ] Review error logs
- [ ] Check for anomalies
- [ ] Verify audit logging is complete
- [ ] Check log storage usage

### Monthly
- [ ] Analyze log trends
- [ ] Review security events
- [ ] Archive old logs
- [ ] Update logging configuration

### Quarterly
- [ ] Review logging retention policy
- [ ] Update alert thresholds
- [ ] Test log recovery procedures
- [ ] Audit who has log access

---

## Resources

- **Pino Documentation:** https://getpino.io
- **Sentry Logging:** https://docs.sentry.io/product/logging/
- **Fly.io Logging:** https://fly.io/docs/monitoring/log-streaming/
- **Structured Logging:** https://www.kartar.net/2015/12/structured-logging/

---

**Last Updated:** January 2024
