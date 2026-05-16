# Production Deployment Guide

## Overview

This guide covers deploying the Echo Recipe Pro application to production using either Netlify or Vercel. Both platforms support automatic deployments from Git with serverless functions for the backend.

## Prerequisites

- GitHub repository connected
- Environment variables configured in the MCP
- Supabase project set up with proper RLS policies
- API keys for third-party services (USDA, Sentry, etc.)

## Option 1: Netlify Deployment

### 1. Connect Netlify MCP

1. Open [MCP Servers](#open-mcp-popover)
2. Connect to Netlify
3. Authorize with your Netlify account
4. Select or create a new site

### 2. Environment Variables

Set the following environment variables in Netlify:

```
# Authentication & Database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# External APIs
VITE_USDA_API_KEY=your-usda-api-key

# Error Monitoring
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true

# Server-side
NODE_ENV=production
```

### 3. Build Configuration

Netlify automatically detects your build configuration from:
- `vite.config.ts` (client build)
- `netlify.toml` (deployment config)

The `netlify.toml` file is pre-configured with:
- Build command: `npm run build`
- Publish directory: `dist/spa`
- Functions directory: `netlify/functions`

### 4. Deploy

Push to your main branch:
```bash
git push origin main
```

Netlify will automatically:
1. Build your project
2. Run tests
3. Deploy to production
4. Update DNS (if connected)

### 5. Monitor Deployment

Check the Netlify dashboard for:
- Build logs
- Deployment status
- Performance metrics
- Error tracking (via Sentry)

## Option 2: Vercel Deployment

### 1. Connect Vercel MCP

1. Open [MCP Servers](#open-mcp-popover)
2. Connect to Vercel
3. Authorize with your Vercel account
4. Select or import your GitHub repository
5. Choose a project name and root directory

### 2. Environment Variables

Set the following environment variables in Vercel Project Settings:

```
# Production Environment
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_USDA_API_KEY=your-usda-api-key
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_ENABLE_ANALYTICS=true
NODE_ENV=production
```

### 3. Build Settings

Vercel auto-detects settings from `vercel.json`:
- Build command: `npm run build`
- Output directory: `dist/spa`
- Serverless functions: `api/**` (if needed)

### 4. Deploy

Push to main branch - Vercel automatically triggers deployment:

```bash
git push origin main
```

Monitor at: `https://vercel.com/dashboard`

### 5. Custom Domain

1. Go to Project Settings > Domains
2. Add your custom domain
3. Update DNS records as shown in Vercel
4. Enable auto-renewal if using Vercel Domains

## Database & Security Setup

### 1. Supabase RLS (Row Level Security)

Enable RLS on all tables:

```sql
-- Enable RLS on all tables
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies for organization-based access
CREATE POLICY "Users can access their organization recipes"
  ON recipes FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert recipes in their organization"
  ON recipes FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE user_id = auth.uid()
  ));
```

### 2. Enable JWT & Email Verification

In Supabase Auth > Providers:
- Enable Email with email verification
- Set email redirect URL: `https://your-domain.com/auth/callback`
- Configure email templates

### 3. Backup & Recovery

Set up automated backups:
1. Go to Supabase Database > Backups
2. Enable automatic backups (daily)
3. Retain for 30 days
4. Test restore process quarterly

## Monitoring & Error Tracking

### 1. Sentry Setup

1. Create Sentry project at sentry.io
2. Get your DSN
3. Add to environment variables
4. Configure in your app:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

### 2. Performance Monitoring

Monitor these metrics:
- **Time to First Byte (TTFB)**: < 100ms
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

Check via:
- Netlify/Vercel Analytics
- Sentry Performance
- Google Search Console (Core Web Vitals)

### 3. Uptime Monitoring

Use a service like:
- Pingdom
- Uptime Robot
- Healthchecks.io

Configure to ping your health endpoint:
```
GET /api/health
```

## SSL/TLS & Security

### 1. SSL Certificate

Both Netlify and Vercel provide free SSL certificates via Let's Encrypt:
- Automatically renewed
- Covers your domain and subdomains
- HSTS headers automatically set

### 2. Security Headers

Add to `netlify.toml` or Vercel config:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

### 3. CORS Configuration

Set appropriate CORS headers for your API:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## Database Migrations

### Pre-Production Checklist

```sql
-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Verify indexes
SELECT * FROM pg_stat_user_indexes;

-- Check replication status
SELECT * FROM pg_stat_replication;

-- Monitor slow queries
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;
```

## Performance Optimization

### 1. Image Optimization

- Use WebP format with fallbacks
- Lazy load images with `loading="lazy"`
- Optimize image sizes before upload
- Use CDN for static assets (Netlify/Vercel provides this)

### 2. Code Splitting

Already configured in `vite.config.ts`:
- Routes are automatically split
- Dependencies split by size
- Lazy load non-critical components

### 3. Caching Strategy

Configure Netlify/Vercel cache:

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[cache]]
  for = "/assets/*"
  max_age = 31536000  # 1 year

[[cache]]
  for = "/index.html"
  max_age = 0
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] SSL certificate active
- [ ] DNS records updated
- [ ] Email verification working
- [ ] Sentry integrated
- [ ] Error boundaries implemented
- [ ] 404 page configured
- [ ] Analytics enabled
- [ ] Backup strategy tested
- [ ] Monitoring alerts configured
- [ ] Load testing completed
- [ ] Security audit done
- [ ] Documentation updated

## Rollback Procedure

### Netlify

1. Go to Deploy page
2. Select previous successful deployment
3. Click "Publish deploy"

### Vercel

1. Go to Deployments
2. Select previous successful deployment
3. Click "Redeploy"

## Maintenance & Updates

### Weekly Tasks

- Check error logs in Sentry
- Review performance metrics
- Monitor database size
- Verify backups completed

### Monthly Tasks

- Update dependencies
- Review security advisories
- Analyze user analytics
- Plan feature releases

### Quarterly Tasks

- Security audit
- Performance optimization review
- Cost analysis
- Disaster recovery test

## Support & Troubleshooting

### Common Issues

**Issue**: Deployment fails
- Check build logs
- Verify environment variables
- Ensure all dependencies installed

**Issue**: Database connection errors
- Verify Supabase URL and key
- Check RLS policies
- Review database logs

**Issue**: Slow performance
- Check Sentry for errors
- Review database queries
- Analyze bundle size

### Resources

- [Netlify Docs](https://docs.netlify.com)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Sentry Docs](https://docs.sentry.io)

## Next Steps

1. **Immediate**: Connect deployment platform MCP
2. **Short-term**: Configure environment variables and deploy
3. **Medium-term**: Set up monitoring and error tracking
4. **Long-term**: Implement auto-scaling and advanced caching strategies
