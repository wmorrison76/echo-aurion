# Production Deployment Checklist & Operations Runbook

Complete guide to deploying, monitoring, and operating Lucca in production.

## Pre-Deployment Checklist

### 24 Hours Before Deployment

- [ ] Notify stakeholders of planned deployment
- [ ] Create incident channel (#incident-deployment)
- [ ] Prepare rollback plan
- [ ] Verify backup is current
- [ ] Test disaster recovery plan (if possible)
- [ ] Check weather/external events (conferences, holidays, etc.)

### 2 Hours Before Deployment

- [ ] Pull latest code and verify tests pass locally
- [ ] Review all changes being deployed
- [ ] Verify all GitHub secrets are set
- [ ] Verify all Fly.io secrets are set
- [ ] Check application health: `/health`
- [ ] Verify database connectivity
- [ ] Check external service status (Stripe, SendGrid, etc.)
- [ ] Review recent error logs in Sentry
- [ ] Verify backups have completed successfully
- [ ] Notify team in Slack
- [ ] Have rollback procedure ready

### 30 Minutes Before Deployment

- [ ] Ensure monitoring dashboards are open
- [ ] Set up log tailing: `flyctl logs --follow`
- [ ] Verify on-call engineer is available
- [ ] Final health check
- [ ] Send final deployment notification to team

---

## Deployment Procedure

### Automated Deployment (Recommended)

**Trigger:** Push to main branch

```bash
# 1. All checks run automatically
# - Tests pass
# - Build succeeds
# - Security scan passes

# 2. Deployment begins
# - Code deployed to Fly.io
# - Environment variables applied
# - Database migrations run (if any)

# 3. Health check
# - Wait for server to start
# - Smoke tests run
# - Logs monitored

# 4. Notify team
# - Slack message sent
# - Status updated in GitHub
```

### Manual Deployment (Emergency Only)

```bash
# Only use if automated deployment fails

# 1. SSH into Fly.io
flyctl deploy --remote-only

# 2. Monitor deployment
flyctl logs --follow

# 3. Verify health
curl https://YOUR_APP.fly.dev/health

# 4. Notify team
# Send Slack message with deployment status
```

### Deployment Steps

```
┌─────────────────────────────┐
│ 1. Code Push to Main        │
└────���─────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│ 2. CI Pipeline Runs         │
│ - Tests                     │
│ - Build                     │
│ - Security Scan             │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│ 3. Backup Database          │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│ 4. Deploy to Fly.io         │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│ 5. Health Check             │
│ - /health endpoint          │
│ - Database connectivity     │
│ - External services         │
└──────────────┬──────────────┘
               ↓
┌───────────���─────────────────┐
│ 6. Monitor & Verify         │
│ - Error rate                │
│ - Response times            │
│ - Logs checked              │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│ 7. Notify Team              │
│ - Slack message             │
│ - Status page update        │
│ - Release notes             │
└─────────────────────────────┘
```

---

## Post-Deployment Verification

### Immediate (5 minutes after deployment)

```bash
# 1. Check health endpoint
curl https://YOUR_APP.fly.dev/health

# Expected response:
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok" },
    "memory": { "status": "ok" },
    "environment": { "status": "ok" }
  }
}

# 2. Check recent logs
flyctl logs | tail -50

# 3. Verify no errors
flyctl logs | grep error | head -10
```

### Short-term (30 minutes after deployment)

```bash
# 1. Monitor error rate
flyctl logs | grep "level.*50" | wc -l
# Should be: 0 or very low

# 2. Check performance
flyctl logs | grep "duration" | head -10

# 3. Verify database is responding
curl https://YOUR_APP.fly.dev/api/health/detailed

# 4. Check Sentry
# Visit sentry.io → Issues
# Should show no new errors

# 5. Monitor dashboard
# Check: Response times, Error rate, Active users
```

### Extended (2 hours after deployment)

```bash
# 1. Review error trends
# Is error rate normal?

# 2. Check performance metrics
# Are response times acceptable?

# 3. Verify specific features
# Login, payments, reporting, etc.

# 4. Database health
# Any slow queries?

# 5. External services
# All integrations working?

# 6. Monitor logs
# Any warnings or anomalies?
```

---

## Rollback Procedure

### When to Rollback

- [ ] Error rate > 5% for 5+ minutes
- [ ] Health check returns unhealthy
- [ ] Critical feature broken
- [ ] Database errors
- [ ] Performance degradation > 50%

### Automatic Rollback

Fly.io can automatically rollback if health checks fail:

```toml
# In fly.toml
[checks]
  [checks.http_status]
    grace_period = "30s"
    interval = 10000
    method = "GET"
    path = "/health"
    protocol = "https"
    timeout = 5000

  [checks.http_status_code]
    code = 200  # Will rollback if not 200
```

### Manual Rollback

```bash
# 1. View deployment history
flyctl releases list

# 2. Identify previous good deployment
# Release v42 - 2024-01-20 10:00:00

# 3. Rollback
flyctl releases rollback

# 4. Or rollback to specific version
flyctl releases rollback <release-number>

# 5. Verify rollback
flyctl logs --follow
curl https://YOUR_APP.fly.dev/health

# 6. Investigate issue
# Review what went wrong
# Check recent changes
# Fix and redeploy

# 7. Notify team
# Slack message with details
```

---

## Incident Response

### Incident Declared When

- Error rate > 10%
- Response time > 5 seconds (p95)
- Database unreachable
- Critical feature broken
- Data corruption detected

### Incident Response Steps

```
1. ACKNOWLEDGE
   ├─ Create incident channel
   ├─ Declare severity level
   └─ Assign incident commander

2. ASSESS
   ├─ What is broken?
   ├─ How many users affected?
   └─ What is the impact?

3. MITIGATE
   ├─ Short-term fix (rollback, restart)
   ├─ Stop bleeding (rate limit, circuit breaker)
   └─ Communicate status

4. RESOLVE
   ├─ Root cause analysis
   ├─ Permanent fix
   └─ Deploy fix

5. CLOSE
   ├─ Verify all systems working
   ├─ Update status page
   ├─ Notify stakeholders
   └─ Schedule post-mortem
```

### Incident Severity Levels

**CRITICAL (P1)**
- System down (0% availability)
- All users affected
- Data loss/corruption
- Response: Immediate action, all hands on deck

**HIGH (P2)**
- Severe degradation (< 50% availability)
- Many users affected
- Major feature broken
- Response: Drop everything, fix immediately

**MEDIUM (P3)**
- Degradation (50-95% availability)
- Some users affected
- Minor feature broken
- Response: Fix within 4 hours

**LOW (P4)**
- Minor issues
- Few users affected
- Workaround available
- Response: Fix within 24 hours

---

## Daily Operations

### Morning Checklist (9 AM)

```bash
# 1. Check overnight logs
flyctl logs -n 1000 | grep error

# 2. Verify health
curl https://YOUR_APP.fly.dev/health

# 3. Review errors in Sentry
# Any new issues?

# 4. Check performance metrics
# Any anomalies?

# 5. Verify backups completed
# Check backup timestamps

# 6. Review calendar
# Any planned maintenance?
```

### Weekly Checklist (Every Monday)

```bash
# 1. Review error trends
# Are we getting better or worse?

# 2. Check performance metrics
# Response times, error rates

# 3. Review security logs
# Any suspicious activity?

# 4. Test backup restoration
# Verify backups can be restored

# 5. Review recent deployments
# Any issues?

# 6. Update runbook
# Any lessons learned?

# 7. Team meeting
# Discuss metrics, issues, improvements
```

### Monthly Checklist (First Monday)

```bash
# 1. Full health audit
# Database, cache, storage

# 2. Security review
# Access logs, secret rotation

# 3. Performance analysis
# Slow queries, bottlenecks

# 4. Capacity planning
# Do we need more resources?

# 5. Backup testing
# Run full restoration test

# 6. Documentation update
# Runbook, procedures

# 7. Team training
# Review incident response
```

---

## Monitoring Dashboard

### Essential Metrics

Create a Grafana/Datadog dashboard with:

```
┌─────────────────────────────────────┐
│ Lucca Production Dashboard          │
├─────────────────────────────────────┤
│                                     │
│ Status: ● HEALTHY                   │
│ Uptime: 99.95%                      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Requests/sec    │ Error Rate    │ │
│ │ 42.5            │ 0.8%          │ │
│ └───────────────���─────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Response Time   │ P95           │ │
│ │ 145ms           │ 340ms         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Database: ✓  Cache: ✓  Sentry: ✓   │
│                                     │
│ Recent Errors: 0                    │
│ Last Deployment: 2 hours ago        │
│                                     │
└─────────────────────────────────────┘
```

---

## Scaling & Performance

### When to Scale

Scale up when:
- CPU usage > 80% consistently
- Memory usage > 85%
- Response time > 2000ms (p95)
- Error rate increasing
- Database connections maxed out

### Scale Up

```bash
# Fly.io scaling
flyctl scale vm shared-cpu-4x --count=2

# Or in fly.toml
[[vm]]
cpu_kind = "shared"
cpus = 4
memory_mb = 2048
```

### Performance Optimization

```bash
# 1. Find slow queries
flyctl logs | grep "duration" | sort

# 2. Add database indexes
# Check slow query logs in Sentry

# 3. Optimize code
# Profile bottlenecks
# Reduce unnecessary operations

# 4. Cache aggressively
# User sessions
# API responses
# Database queries

# 5. Load test
# Use artillery or k6
# Identify breaking points
```

---

## Disaster Recovery

### Complete System Failure

```bash
# 1. Assess damage
flyctl status    # App status
flyctl releases list   # Recent deployments

# 2. Prepare recovery
# Ensure backup is available
# Verify backup integrity

# 3. Restore database
npx ts-node scripts/admin/backupManager.ts restore backup-latest.json.gz

# 4. Restart application
flyctl deploy --remote-only

# 5. Verify recovery
curl https://YOUR_APP.fly.dev/health

# 6. Notify stakeholders
# Send status update
```

### Data Corruption

```bash
# 1. Stop replication (if applicable)
# 2. Identify last good state
# 3. Restore to backup
# 4. Gradually restore data
# 5. Verify integrity
# 6. Resume normal operations
```

---

## Support Resources

### Emergency Contacts

```
On-Call Engineer: (determined by schedule)
Team Lead: (email/slack)
Emergency Hotline: (if applicable)

Escalation:
1. On-call engineer
2. Team lead
3. Engineering manager
4. VP of Engineering
```

### External Service Status

- **Supabase:** https://status.supabase.com
- **Stripe:** https://status.stripe.com
- **SendGrid:** https://status.sendgrid.com
- **AWS:** https://status.aws.amazon.com

### Useful Commands

```bash
# View app status
flyctl status

# View logs
flyctl logs

# Check health
curl https://YOUR_APP.fly.dev/health

# Run migrations
npx ts-node scripts/admin/migrationHelper.ts runall

# Create backup
npx ts-node scripts/admin/backupManager.ts create

# Restart app
flyctl restart

# View database
flyctl postgres list
```

---

## Deployment Confirmation Checklist

After deployment, verify:

- [ ] Application starts without errors
- [ ] Health check returns 200
- [ ] Database is accessible
- [ ] No errors in logs
- [ ] Performance is normal
- [ ] All features working
- [ ] External services connected
- [ ] Backups completed
- [ ] Monitoring/alerting working
- [ ] Team notified

---

## Post-Deployment Review

After 24 hours, review:

- [ ] Error rate trending down
- [ ] No new issues in Sentry
- [ ] Performance metrics stable
- [ ] User reports reviewed
- [ ] Backups completed successfully
- [ ] All systems healthy

---

## Documentation References

For detailed information, see:

- **Sentry Setup:** SENTRY_SETUP.md
- **CI/CD Pipeline:** CI_CD_SETUP.md
- **Monitoring:** MONITORING_SETUP.md
- **Backups:** BACKUP_AUTOMATION.md
- **Environment & Secrets:** ENVIRONMENT_SECRETS_GUIDE.md
- **Logging:** LOGGING_GUIDE.md
- **API Reference:** API_REFERENCE.md
- **Security:** SECURITY_HARDENING_GUIDE.md

---

## Emergency Contacts & Escalation

**For immediate assistance:**
1. Check this runbook
2. Review logs: `flyctl logs --follow`
3. Check health: `/health` endpoint
4. Review Sentry for errors
5. Contact on-call engineer
6. Escalate if needed

---

**Last Updated:** January 2024  
**Reviewed By:** Engineering Team  
**Next Review:** April 2024

