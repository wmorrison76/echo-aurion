# Production Deployment Guide

## Overview

This guide covers deploying the Echo Ops application to production via Netlify with Supabase backend integration.

## Prerequisites

- Netlify account with access to your project
- Supabase project (already connected)
- Environment variables configured in Builder.io settings
- All tests passing locally

## Environment Variables Required

Set these in Builder.io Environment Settings before deployment:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Optional: Integrations
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/...
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ENVIRONMENT=production

# App Configuration
NODE_ENV=production
VITE_API_BASE=/api
```

## Build Process

The deployment uses:

- **Build Command**: `npm run build:client`
- **Functions Directory**: `netlify/functions`
- **Publish Directory**: `dist/spa`

### Local Build Verification

```bash
npm run build
npm run build:client
```

Verify the output exists in `dist/spa/`.

## Database Migrations

Before first deployment, run migrations in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Execute migrations in order:
   - `migrations/001_init_invoices.sql`
   - `migrations/002_inventory_core.sql`
   - `migrations/003_invoice_intelligence.sql`
   - `migrations/004_credit_memos.sql`
   - `migrations/005_performance_indexes.sql`

## API Endpoints

The following endpoints are available:

### Invoices

- `POST /api/invoices/upload` - Upload invoice file
- `GET /api/invoices/review-queue` - Get pending reviews
- `POST /api/invoices/review-tasks/:taskId/resolve` - Resolve review task

### Devices & Hardware

- `GET /api/devices/discover` - Discover connected devices
- `POST /api/devices/connect` - Connect WiFi device
- `GET /api/devices` - List connected devices
- `POST /api/devices/:id/test` - Test device connection

### Printing

- `POST /api/print/print` - Send document to printer
- `POST /api/print/preview` - Preview print document
- `GET /api/print/devices` - Get available printers

### Integrations

- `POST /api/integrations-ext/zapier/*` - Zapier webhooks
- `POST /api/integrations-ext/sentry/*` - Sentry logging
- `GET /api/integrations-ext/status` - Integration status
- `POST /api/integrations-ext/test/*` - Test integrations

### Purchasing & Inventory

- `GET /api/orders` - List purchase orders
- `GET /api/inventory` - Get inventory items
- `GET /api/recipes` - Recipe catalog

## Deployment Steps

### 1. Prepare Code

```bash
git add .
git commit -m "Production deployment: scanner, printing, analytics, integrations"
git push origin main
```

### 2. Verify Build Locally

```bash
npm install
npm run build
npm run build:client
```

### 3. Deploy via Netlify UI

**Option A: Via Builder.io**

1. Open the Builder.io project settings
2. Click "Deploy" or "Push" button
3. Select Netlify as the deployment target
4. Review and confirm deployment

**Option B: Via Git (Automatic)**

- Push to your main branch
- Netlify will automatically build and deploy based on `netlify.toml`

### 4. Verify Production

After deployment:

1. **Check Build Logs**
   - Netlify Dashboard → Deployments → View logs
   - Verify no build errors

2. **Test API Endpoints**

   ```bash
   curl https://your-domain.netlify.app/api/ping
   ```

3. **Test Database Connection**
   - Navigate to an invoice upload page
   - Verify Supabase queries work

4. **Test Integrations**
   ```bash
   curl -X POST https://your-domain.netlify.app/api/integrations-ext/test/zapier
   curl -X POST https://your-domain.netlify.app/api/integrations-ext/test/sentry
   ```

## Performance Optimization

### Database

- Indexes created in `migrations/005_performance_indexes.sql`
- Materialized views for analytics
- Cache layer configured (`server/lib/cache.ts`)

### Frontend

- Code splitting with React.lazy
- Bundle optimizations via Vite
- Service worker for offline support

### Caching

- 5-minute TTL on invoice queries
- Pattern-based cache invalidation
- Memory usage monitoring

## Monitoring

### Sentry Integration

- Set `SENTRY_DSN` environment variable
- Automatic error tracking
- Performance monitoring with breadcrumbs

### Logging

- Server logs available in Netlify Functions
- Application logs to console
- Integration webhook logs

## Rollback

If deployment has issues:

1. **Via Netlify Dashboard**
   - Deployments → Select previous version
   - Click "Publish" to rollback

2. **Verify Rollback**
   - Check that API endpoints respond correctly
   - Verify database is accessible

## Security Checklist

- [ ] Environment variables set in Builder.io (not in code)
- [ ] Supabase service role key only used server-side
- [ ] CORS configured for your domain
- [ ] Rate limiting enabled (if available)
- [ ] Audit trail enabled in Supabase
- [ ] Regular backups configured in Supabase

## Scaling Considerations

For 20+ outlets and 1000+ companies:

1. **Database**
   - Monitor index usage in Supabase
   - Enable read replicas if needed
   - Implement connection pooling

2. **File Storage**
   - Use Supabase Storage or S3
   - Configure CDN for image delivery
   - Implement cleanup for old files

3. **API Performance**
   - Monitor function execution time
   - Implement request caching
   - Consider API rate limiting

## Maintenance

### Weekly

- Review Sentry error logs
- Monitor database query performance
- Check storage usage

### Monthly

- Analyze analytics dashboards
- Review vendor performance metrics
- Audit invoice variance trends
- Update dependencies (npm update)

### Quarterly

- Full backup verification
- Security audit
- Performance optimization review
- Database statistics update

## Troubleshooting

### Build Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Endpoints Return 500

- Check Netlify function logs
- Verify Supabase connection string
- Confirm service role key is valid

### Scanner/Printer Not Working

- Verify hardware manager initialized
- Check WebUSB browser support
- Confirm device is connected
- Test WiFi connectivity

### Database Queries Slow

- Verify indexes created (migration 005)
- Check query patterns in logs
- Monitor cache hit rate
- Consider materialized view refresh

## Support

- **Documentation**: See `README.txt`
- **Supabase Issues**: https://supabase.io/docs
- **Netlify Support**: https://netlify.com/support
- **Builder.io Help**: https://www.builder.io/c/docs

## Next Steps After Deployment

1. **Monitor Performance**
   - Set up Sentry alerts
   - Track error rates
   - Monitor function execution times

2. **User Feedback**
   - Collect feedback on scanning performance
   - Monitor recipe costing accuracy
   - Track printing reliability

3. **Optimization**
   - Tune cache TTLs based on usage
   - Adjust index strategy if needed
   - Optimize OCR confidence thresholds

4. **Scaling**
   - Plan for multi-region deployment
   - Consider API gateway for rate limiting
   - Evaluate database replication strategy
