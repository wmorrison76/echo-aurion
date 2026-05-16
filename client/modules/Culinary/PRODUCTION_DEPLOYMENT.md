# Production Deployment Guide

## Overview

This guide provides complete instructions for deploying EchoMenuStudio to production. The application consists of:

1. Frontend (React SPA with TypeScript)
2. Backend (Express server for API routes)
3. Supabase (Database, Auth, Realtime)
4. Netlify/Vercel (Hosting & Functions)

## Pre-Deployment Checklist

### Application Testing

- [ ] Run full test suite: `npm run test`
- [ ] Run TypeScript check: `npm run typecheck`
- [ ] Run linter: `npm run lint` (if configured)
- [ ] Test all authentication flows (signup, signin, password reset)
- [ ] Test all RBAC permissions
- [ ] Test approval workflow
- [ ] Test inventory integration
- [ ] Test multi-outlet operations
- [ ] Performance test with realistic data
- [ ] Test on mobile devices
- [ ] Test with slow network (DevTools throttling)

### Environment Setup

- [ ] Create production Supabase project
- [ ] Configure database schema
- [ ] Enable email authentication
- [ ] Set up email templates
- [ ] Create database backups
- [ ] Set up monitoring and logging
- [ ] Configure SSL/HTTPS
- [ ] Set up CDN if needed

### Security Review

- [ ] Audit all API endpoints
- [ ] Verify RBAC is enforced on backend
- [ ] Review database security policies
- [ ] Check for exposed secrets in code
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Enable database backups
- [ ] Review error messages (no sensitive info)

### Documentation

- [ ] Updated API documentation
- [ ] Deployment runbook
- [ ] Rollback procedures
- [ ] Incident response plan
- [ ] User documentation
- [ ] Admin handbook

## Deployment Platforms

### Option 1: Netlify (Recommended)

#### 1. Create Netlify Project

1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Connect your Git repository
4. Select main/production branch

#### 2. Configure Build Settings

In Netlify UI:

1. Site Settings > Build & Deploy > Build Settings
2. Set build command: `npm run build`
3. Set publish directory: `dist`

#### 3. Set Environment Variables

1. Site Settings > Build & Deploy > Environment
2. Add all variables from `.env.production.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
VITE_USDA_API_KEY=your-key
VITE_SENTRY_DSN=your-dsn
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 4. Deploy

1. Commit to main branch
2. Netlify automatically builds and deploys
3. Monitor deployment in Netlify dashboard

#### 5. Setup Custom Domain

1. Site Settings > Domain Management
2. Add custom domain
3. Update DNS settings with Netlify nameservers
4. SSL certificate auto-provisioned

### Option 2: Vercel

#### 1. Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import Git repository
4. Select main branch

#### 2. Configure Environment Variables

1. Project Settings > Environment Variables
2. Add all production variables
3. Mark sensitive variables appropriately

#### 3. Deploy

1. Commit to main branch
2. Vercel automatically builds and deploys
3. Check deployment status

### Option 3: Self-Hosted (Docker)

#### 1. Prepare Docker Image

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN npm run build

# Start production server
EXPOSE 8080
CMD ["npm", "start"]
```

#### 2. Build and Push

```bash
# Build image
docker build -t echomenu-studio:latest .

# Push to registry (Docker Hub, ECR, GCR, etc.)
docker push your-registry/echomenu-studio:latest
```

#### 3. Deploy to Hosting

For Kubernetes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echomenu-studio
spec:
  replicas: 3
  selector:
    matchLabels:
      app: echomenu-studio
  template:
    metadata:
      labels:
        app: echomenu-studio
    spec:
      containers:
        - name: app
          image: your-registry/echomenu-studio:latest
          ports:
            - containerPort: 8080
          env:
            - name: VITE_SUPABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: supabase-url
          # ... other env vars
```

## Database Setup

### 1. Supabase Project Creation

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region closest to users
4. Note Project URL and anon key

### 2. Run Migrations

1. Go to Supabase SQL Editor
2. Execute SQL from AUTH_INTEGRATION.md
3. Execute SQL for RBAC tables
4. Execute SQL for inventory tables

### 3. Enable Authentication

1. Authentication > Providers
2. Enable Email
3. Configure email templates:
   - Password reset
   - Email confirmation
   - Custom email subject lines

### 4. Setup Row-Level Security (RLS)

Enable RLS policies for data isolation:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outlets ENABLE ROW LEVEL SECURITY;

-- Create policies for organizations
CREATE POLICY "Users can view their organization"
  ON organizations
  FOR SELECT
  USING (id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Create policies for users table
CREATE POLICY "Users can view organization members"
  ON users
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));
```

### 5. Setup Backups

1. Project Settings > Backups
2. Enable daily backups
3. Configure backup retention (30+ days)
4. Test backup restore process

## Performance Optimization

### 1. Build Optimization

```bash
# Generate build report
npm run build -- --report

# Analyze bundle size
npm install -g source-map-explorer
source-map-explorer 'dist/**/*.js'
```

### 2. Image Optimization

- Compress images before upload
- Use WebP format where possible
- Implement lazy loading
- Use CDN for image delivery

### 3. Code Splitting

Already configured in Vite:

```typescript
// Routes are lazy loaded
const Index = lazy(() => import("./pages/Index"));
const RecipeEditor = lazy(() => import("./pages/RecipeEditor"));
```

### 4. Database Query Optimization

- Add indexes on frequently queried columns
- Implement pagination for large result sets
- Use database views for complex queries
- Monitor slow queries with Supabase logs

## Monitoring & Logging

### 1. Error Monitoring (Sentry)

1. Create [Sentry](https://sentry.io) account
2. Create new project
3. Get DSN
4. Add to environment variables:

```
VITE_SENTRY_DSN=your-dsn
```

### 2. Application Logs

View logs in Netlify/Vercel dashboard:

- Build logs
- Function logs
- Runtime errors

### 3. Database Logs

In Supabase:

1. Click Project Settings > Logs
2. View API requests
3. View PostgreSQL logs
4. Set up alerts

### 4. Uptime Monitoring

1. Use [UptimeRobot](https://uptimerobot.com) or similar
2. Monitor critical endpoints:
   - `https://your-domain.com/`
   - `https://your-domain.com/api/health`
3. Set up alerts for downtime

## Security Configuration

### 1. CORS Setup

In Supabase Project Settings:

```json
{
  "allowed_origins": ["https://your-domain.com", "https://www.your-domain.com"]
}
```

### 2. API Rate Limiting

Configure in Supabase:

1. Project Settings > Rate Limiting
2. Set limits per IP
3. Set limits per user

### 3. HTTPS/SSL

- Netlify/Vercel: Auto-provisioned
- Self-hosted: Use Let's Encrypt

### 4. CSRF Protection

Already configured in Express middleware:

```typescript
const csrf = require("csurf");
app.use(csrf());
```

### 5. Content Security Policy

Add to server headers:

```typescript
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  );
  next();
});
```

## Email Configuration

### 1. Configure Email Provider

For production emails, set up custom SMTP:

1. Supabase Project Settings > Email
2. Enable custom SMTP
3. Add provider credentials (SendGrid, AWS SES, etc.)

### 2. Email Templates

Customize in Supabase:

1. Authentication > Email Templates
2. Update password reset template
3. Update email verification template
4. Add organization branding

Example template:

```html
<h1>Reset Your Password</h1>
<p>Click the link below to reset your password:</p>
<a href="{{ .ConfirmationURL }}">Reset Password</a>
<p>Or copy this link: {{ .ConfirmationURL }}</p>
```

## Deployment Process

### 1. Pre-Deployment

```bash
# Update dependencies
npm update

# Run tests
npm run test

# Build for production
npm run build

# Check TypeScript
npm run typecheck
```

### 2. Create Release

```bash
# Create git tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push to remote
git push origin main
git push origin --tags
```

### 3. Monitor Deployment

1. Watch Netlify/Vercel dashboard
2. Check build logs for errors
3. Verify environment variables loaded
4. Test deployed site

### 4. Post-Deployment

1. Run smoke tests on production
2. Monitor error logs
3. Check database performance
4. Verify email notifications working
5. Test auth flows
6. Monitor user feedback

## Rollback Procedure

### If Deployment Fails

1. Check deployment logs for error
2. Revert to previous commit: `git revert HEAD`
3. Push revert: `git push origin main`
4. Netlify/Vercel redeploys automatically

### If Issues Detected Post-Deploy

1. Identify issue in logs
2. Create hotfix branch: `git checkout -b hotfix/issue-name`
3. Fix issue
4. Test locally
5. Create PR and merge to main
6. Redeploy

## Health Checks

### 1. Create Health Check Endpoint

```typescript
// server/routes/health.ts
export const healthCheck: RequestHandler = (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.VITE_APP_VERSION,
  });
};

app.get("/api/health", healthCheck);
```

### 2. Monitor Health Endpoint

Set up monitoring to ping `/api/health` every 60 seconds:

```bash
curl https://your-domain.com/api/health
```

## Database Maintenance

### 1. Regular Backups

- Daily automatic backups via Supabase
- Weekly manual backups
- Monthly archive to cold storage
- Test restore process monthly

### 2. Performance Monitoring

```sql
-- Check slow queries
SELECT query, mean_time, stddev_time, calls
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM recipes WHERE outlet_id = 'outlet-1';
```

### 3. Vacuum and Analyze

```sql
-- Run weekly
VACUUM ANALYZE;

-- For specific table
VACUUM ANALYZE recipes;
```

## Disaster Recovery

### 1. Backup Strategy

- Daily incremental backups
- Weekly full backups
- Monthly archive to separate region
- Test restore every month

### 2. Recovery Point Objective (RPO)

- Target: 1 hour
- Supabase: Daily automated backups

### 3. Recovery Time Objective (RTO)

- Target: 4 hours
- Supabase restore: 1-2 hours
- DNS propagation: 1-2 hours

### 4. Disaster Recovery Plan

1. **Data Loss**: Restore from latest backup
2. **Service Outage**: Wait for Supabase recovery or redeploy
3. **Security Breach**: Rotate keys, review logs, notify users

## Post-Deployment Tasks

### Week 1

- Monitor error logs daily
- Check performance metrics
- Gather user feedback
- Monitor database performance

### Month 1

- Review security logs
- Optimize slow queries
- Validate backup/restore
- User adoption tracking

### Ongoing

- Monthly security reviews
- Quarterly performance audits
- Semi-annual disaster recovery drills
- Continuous monitoring

## Support & Troubleshooting

### Common Issues

**Build Fails**

- Check Node version: `node --version`
- Clear cache: `npm ci`
- Check env variables
- Review build logs

**Database Connection Error**

- Verify SUPABASE_URL
- Check SUPABASE_ANON_KEY
- Test connection with psql
- Check firewall rules

**Email Not Sending**

- Verify SMTP settings in Supabase
- Check email logs
- Test with test email
- Check rate limits

**Performance Issues**

- Check database queries
- Review slow query logs
- Optimize indexes
- Implement caching

## Additional Resources

- [Netlify Docs](https://docs.netlify.com/)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [React Performance](https://react.dev/reference/react/useMemo)

## Deployment Contacts

- **Supabase Support**: support@supabase.io
- **Netlify Support**: support@netlify.com
- **Vercel Support**: support@vercel.com
- **Your Team**: [Add contact info]

## Version History

| Version | Date       | Changes         |
| ------- | ---------- | --------------- |
| 1.0.0   | 2024-01-XX | Initial release |
| 1.0.1   | -          | Pending         |

---

**Last Updated**: [Current Date]
**Deployment Owner**: [Your Name/Team]
**Status**: Production Ready ✅
