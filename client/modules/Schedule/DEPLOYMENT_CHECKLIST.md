# Production Deployment Checklist

## Pre-Deployment Verification

### Code Quality ✅
- [ ] All tests passing (`npm run test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] ESLint clean (`npm run lint`)
- [ ] Build successful (`npm run build`)
- [ ] Bundle size acceptable (<5MB)
- [ ] No console errors in dev tools

### Security ✅
- [ ] No hardcoded secrets/credentials
- [ ] All environment variables set
- [ ] Security headers configured
- [ ] RLS policies enabled on all tables
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] HTTPS/TLS enforced
- [ ] API keys rotated
- [ ] No debug logging in production

### Performance ✅
- [ ] Database indexes created
- [ ] Query performance optimized
- [ ] Caching configured
- [ ] CDN enabled for static assets
- [ ] Gzip compression enabled
- [ ] P99 latency < 5 seconds
- [ ] Error rate < 1%

### Database ✅
- [ ] Migrations applied
- [ ] Backup verified
- [ ] RLS policies tested
- [ ] Data seeded (test data)
- [ ] Connection pooling configured
- [ ] Encryption at rest enabled

### Monitoring & Logging ✅
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring enabled
- [ ] Audit logging active
- [ ] Log retention policies set
- [ ] Alerts configured
- [ ] Dashboard created

### Infrastructure ✅
- [ ] Hosting platform ready (Netlify/Vercel)
- [ ] Domain DNS configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Auto-scaling configured
- [ ] Backup/disaster recovery ready

### Configuration ✅
- [ ] Environment variables documented
- [ ] Configuration management system ready
- [ ] Feature flags configured
- [ ] Third-party API keys configured
- [ ] Email service ready
- [ ] Notifications configured

---

## Deployment Steps

### 1. Pre-Deployment Testing (30 mins)
```bash
# Run smoke tests
npm run smoke-tests

# Run full test suite
npm run test

# Run type checking
npm run typecheck

# Build verification
npm run build
```

### 2. Database Migration
```bash
# Apply pending migrations
npm run migrate

# Verify RLS policies
npm run verify-rls

# Run data validation
npm run validate-data
```

### 3. Environment Setup
```bash
# Verify all env vars are set
npm run check-env

# Test database connection
npm run test-db-connection

# Test API key validity
npm run test-api-keys
```

### 4. Staging Deployment
```bash
# Deploy to staging
npm run deploy:staging

# Run staging tests
npm run test:staging

# Performance baseline
npm run perf-test:staging
```

### 5. Production Deployment
```bash
# Deploy to production
npm run deploy:production

# Verify deployment
npm run verify-deployment

# Run smoke tests against production
npm run smoke-tests:production

# Monitor for errors (next 30 mins)
npm run monitor:production
```

### 6. Post-Deployment (1 hour)
- [ ] Monitor error rates (< 1%)
- [ ] Check response times
- [ ] Verify all endpoints responding
- [ ] Monitor resource usage
- [ ] Check logs for anomalies
- [ ] Verify user access working
- [ ] Test critical features end-to-end
- [ ] Check analytics/monitoring dashboard

---

## Rollback Plan

If critical issues detected:

```bash
# Immediate rollback
npm run rollback:production

# Verify rollback
npm run smoke-tests:production

# Assess issue
npm run debug-issue

# Fix and redeploy when ready
```

---

## Post-Deployment Monitoring (24 hours)

### Metrics to Watch
- **Error Rate**: Should be < 1%
- **Response Time**: P95 < 2s, P99 < 5s
- **Uptime**: Should be 99.9%+
- **CPU/Memory**: Should be < 80%
- **Database Connections**: Healthy
- **API Rate Limits**: Not exceeded

### Daily Reports
- [ ] Error summary report
- [ ] Performance report
- [ ] User activity report
- [ ] System health report
- [ ] Security audit log

---

## Ongoing Production Operations

### Daily (Automated)
- Run health checks
- Monitor key metrics
- Review error logs
- Backup databases
- Update security patches

### Weekly
- Performance review
- Security audit
- User feedback review
- Capacity planning
- Cost analysis

### Monthly
- Full system audit
- Security penetration test
- Database maintenance
- Disaster recovery drill
- Compliance check

### Quarterly
- Load testing
- Architecture review
- Dependency updates
- Security assessment
- User satisfaction survey

---

## Deployment Rollback Scenarios

### Scenario 1: High Error Rate (>5%)
1. Immediate rollback to previous version
2. Investigate error logs
3. Fix and retest locally
4. Redeploy when ready

### Scenario 2: Performance Degradation
1. Check database queries
2. Review new code changes
3. Clear cache if applicable
4. Optimize bottleneck
5. Redeploy

### Scenario 3: Security Issue Detected
1. Immediately patch code
2. Rotate compromised secrets
3. Review audit logs for unauthorized access
4. Redeploy with fix
5. Notify security team

### Scenario 4: Database Issues
1. Verify connectivity
2. Check RLS policies
3. Run integrity checks
4. Restore from backup if needed
5. Verify data consistency

---

## Success Criteria

Deployment is successful when:
- ✅ All smoke tests pass
- ✅ Error rate < 1%
- ✅ Response time P95 < 2s
- ✅ All features functional
- ✅ No security warnings
- ✅ Monitoring alerts configured
- ✅ Team notified of changes
- ✅ Documentation updated

---

## Support & Escalation

### On-Call Contact
- Primary: [Name] - [Phone]
- Secondary: [Name] - [Phone]
- Escalation: engineering@example.com

### Communication Plan
1. Update status page
2. Notify leadership
3. Prepare customer communications
4. Document issue for postmortem

### Postmortem Template
- What happened?
- Why did it happen?
- What did we do?
- How do we prevent it?
- Owner: [Name]
- Date: [Date]

---

## Quick Links

- [Sentry Error Tracking](https://sentry.io)
- [Performance Monitoring](https://datadog.com)
- [Status Page](https://status.example.com)
- [Incident Channel](https://slack.com/incidents)
- [Runbook](https://wiki.example.com/runbook)
