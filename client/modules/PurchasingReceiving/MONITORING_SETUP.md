# Monitoring & Alerting Setup Guide

Complete guide to monitoring application health, performance, and setting up alerts.

## Overview

Monitoring includes:
- **Health Checks:** Database, memory, environment, services
- **Performance Metrics:** Response times, error rates, requests/second
- **Log Aggregation:** Centralized error and event logging
- **Alerting:** Notifications when issues occur
- **Status Page:** Public status dashboard

## Health Check Endpoints

The following endpoints are available for monitoring:

### `/health` (Load Balancer Health Check)
**Purpose:** For load balancers and orchestration systems

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "ok",
      "message": "Database connected",
      "duration": 45
    },
    "memory": {
      "status": "ok",
      "message": "Memory usage: 45.2%",
      "duration": 0
    },
    "environment": {
      "status": "ok",
      "message": "All required environment variables set",
      "duration": 0
    },
    "services": {
      "status": "ok",
      "message": "External services OK: sentry",
      "duration": 0
    }
  },
  "version": "1.0.0"
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Degraded
- `500` - Unhealthy

**Usage:**

Fly.io:
```toml
# In fly.toml
[services.tcp_checks]
interval = "15s"
timeout = "5s"
grace_period = "5s"
method = "GET"
path = "/health"
```

Kubernetes:
```yaml
livenessProbe:
  httpGet:
    path: /alive
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### `/health/detailed` (Monitoring Systems)
**Purpose:** For detailed monitoring and dashboards

Returns health status + metrics + system info

### `/metrics` (Prometheus)
**Purpose:** For Prometheus/Grafana monitoring

Returns metrics in Prometheus format:
```
app_requests_per_second 42.5
app_error_rate_percent 0.8
app_response_time_ms 125.4
process_resident_memory_bytes 524288000
```

### `/ready` (Kubernetes Readiness)
**Purpose:** Kubernetes readiness probe

### `/alive` (Kubernetes Liveness)
**Purpose:** Kubernetes liveness probe

---

## 1. Configure Health Checks

### Update Server

Add health check routes to your server:

```typescript
// server/index.ts
import healthRoutes from './routes/health';

app.use(healthRoutes);
```

### Test Locally

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test detailed health
curl http://localhost:3000/health/detailed

# Test metrics
curl http://localhost:3000/metrics
```

---

## 2. Fly.io Monitoring

### Check Status

```bash
# Check app status
flyctl status

# View metrics
flyctl metrics

# View logs
flyctl logs

# Check recent deployments
flyctl releases list
```

### Configure Alerts

1. Go to Fly.io Dashboard
2. Click App > Monitoring
3. Set up notifications:
   - High memory usage
   - Crash count > 1 in 5 minutes
   - Restart loop detected

### Auto Scaling

Configure `fly.toml`:

```toml
[processes]
app = "npm start"

[[services]]
protocol = "tcp"
internal_port = 3000

[services.concurrency]
type = "connections"
hard_limit = 1000
soft_limit = 850

[http_service]
auto_stop_machines = "stop"
auto_start_machines = true

[[vm]]
cpu_kind = "shared"
cpus = 1
memory_mb = 512

[[vm]]
cpu_kind = "shared"
cpus = 2
memory_mb = 1024
processes = ["app"]
```

---

## 3. Prometheus & Grafana

### Setup Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'lucca-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Setup Grafana

1. Visit http://localhost:3000 (if running locally)
2. Login with admin/admin
3. Add Prometheus data source: http://prometheus:9090
4. Create dashboard with panels:
   - Error Rate (%)
   - Requests Per Second
   - Response Time (ms)
   - Memory Usage (%)

### Dashboard Queries

```promql
# Error rate
app_error_rate_percent

# Requests per second
app_requests_per_second

# Response time
app_response_time_ms

# Memory usage (percentage)
(process_heap_used_bytes / 1073741824) * 100

# CPU usage
rate(process_cpu_seconds_total[5m])
```

---

## 4. Datadog Integration

### Setup

1. Create Datadog account (free tier available)
2. Go to Integrations > Node.js
3. Install Datadog agent

```bash
npm install dd-trace
```

### Initialize

Add to server startup:

```typescript
import tracer from 'dd-trace';

tracer.init({
  service: 'lucca-app',
  env: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION,
  enabled: process.env.NODE_ENV === 'production',
});
```

### Metrics to Monitor

- **Resource Metrics:**
  - CPU usage
  - Memory usage
  - Disk I/O
  - Network I/O

- **Application Metrics:**
  - Request rate
  - Error rate
  - Response time (p50, p95, p99)
  - Request count by endpoint

- **Database Metrics:**
  - Query count
  - Query duration
  - Slow queries (>1s)
  - Connection pool usage

---

## 5. Alerting Rules

### Alert on High Error Rate

**Condition:** Error rate > 5% for 5 minutes

```
if (error_rate > 5 AND duration >= 5m) then:
  - Send Slack notification
  - Create incident in PagerDuty
  - Page on-call engineer
```

### Alert on High Response Time

**Condition:** P95 response time > 2000ms for 10 minutes

```
if (response_time_p95 > 2000 AND duration >= 10m) then:
  - Send Slack notification
  - Check database performance
```

### Alert on Memory Leak

**Condition:** Memory usage increases 10% every hour

```
if (memory_usage_trend > 10% per hour) then:
  - Send Slack notification
  - Prepare for restart
```

### Alert on Deployment Failure

**Condition:** Health check fails after deployment

```
if (deployment && health_status != "healthy" AND duration >= 5m) then:
  - Rollback to previous version
  - Send alert
  - Create incident
```

---

## 6. Slack Integration

### Configure Alerts to Slack

1. Go to your Slack workspace
2. Create #alerts channel
3. Create webhook:
   - Settings > Manage apps
   - Create new app
   - Incoming Webhooks > Create New Webhook
   - Select #alerts channel

4. Copy webhook URL and add to monitoring system

### Example Slack Messages

```json
{
  "text": "⚠️ Error Rate High",
  "attachments": [
    {
      "color": "#ff0000",
      "fields": [
        {
          "title": "Error Rate",
          "value": "7.5%",
          "short": true
        },
        {
          "title": "Duration",
          "value": "5 minutes",
          "short": true
        }
      ]
    }
  ]
}
```

---

## 7. Status Page

### Create Public Status Page

Use **Statuspage.io** or **Incident.io**:

1. Create account
2. Add your service components
3. Set up monitoring integrations
4. Share public URL with customers

**What to monitor:**
- API availability
- Database availability
- Payment processing
- Backup system
- Email delivery

---

## 8. Log Aggregation

### CloudWatch Logs

For Fly.io, logs are automatically sent to:

```bash
# View logs
flyctl logs

# Filter logs
flyctl logs --json | grep error
```

### Structured Logging

Add structured logging to your app:

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

logger.info({ userId: 123, action: 'login' }, 'User logged in');
logger.error({ error: err }, 'Error processing payment');
```

### Query Logs

Example queries:

```bash
# All errors
flyctl logs | grep ERROR

# Specific user
flyctl logs | grep user_id=123

# Performance logs
flyctl logs | grep duration_ms
```

---

## 9. Incident Response

### During Incident

1. **Acknowledge:** Accept alert in Slack/PagerDuty
2. **Investigate:** Check logs, metrics, health status
3. **Communicate:** Post in #incidents channel
4. **Fix:** Deploy fix or rollback
5. **Verify:** Confirm health check passes

### Post-Mortem

1. Document what happened
2. Identify root cause
3. Plan preventive measures
4. Update runbooks

Example template:

```markdown
# Incident Post-Mortem

**Date:** 2024-01-20  
**Duration:** 15 minutes  
**Impact:** 50 users affected

## What Happened
Payment processing was unavailable due to Stripe API timeout

## Root Cause
No retry logic for slow Stripe API responses

## Resolution
Added exponential backoff retry logic

## Prevention
- Better monitoring of Stripe API latency
- More aggressive timeout settings
- Load testing before production
```

---

## 10. Monitoring Dashboard

### Key Metrics to Track

Create a dashboard with:

```
┌─────────────────────────────────────────────┐
│ Application Health                          │
├─────────────────────────────────────────────┤
│                                             │
│  Status: ● HEALTHY                          │
│  Uptime: 99.95%                             │
│  Version: 1.0.0                             │
│                                             │
│  Requests/sec: 42.5  Errors: 0.8%           │
│  Response Time: 125ms  Memory: 512MB        │
│                                             │
│  Database: ✓  Cache: ✓  Services: ✓         │
│                                             │
└─────────────────────────────────────────────┘
```

### Real-time Alerting

Send alerts to multiple channels:
- Slack (#alerts channel)
- Email (ops@company.com)
- PagerDuty (for critical)
- SMS (for critical)

---

## 11. Testing Monitoring

### Simulate Error

```bash
# Trigger an error
curl http://localhost:3000/api/test-error

# Check alert was sent
# Look in Slack #alerts channel
```

### Load Testing

```bash
# Using artillery
npm install -g artillery

artillery quick -c 10 -d 60 http://localhost:3000/api/invoices
```

### Check Metrics

```bash
# View real-time metrics
watch -n 1 'curl -s http://localhost:3000/metrics | grep app_'
```

---

## 12. Costs

| Service | Cost | Alternative |
|---------|------|-------------|
| Sentry | $0-$100/month | Self-hosted (Glitchtip) |
| Datadog | $15-$100/month | Prometheus + Grafana (free) |
| StatusPage | $0-$500/month | Custom page |
| Slack | Free-$100/month | Discord (free) |
| PagerDuty | $0-$200/month | Slack + custom integration |

**Recommended budget:** $0-50/month (using free tiers)

---

## Next Steps

- [ ] Configure health checks
- [ ] Test local health endpoints
- [ ] Set up Prometheus (optional)
- [ ] Create Grafana dashboard (optional)
- [ ] Configure Slack alerts
- [ ] Test alert notifications
- [ ] Document incident response
- [ ] Create status page

---

**Last Updated:** January 2024
