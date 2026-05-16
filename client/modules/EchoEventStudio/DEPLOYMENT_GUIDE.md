# EchoEventStudio — Production Deployment Guide

This guide covers deploying EchoEventStudio to production on **Netlify** (frontend) and **Fly.io** (backend) with Supabase for data persistence.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Frontend Deployment (Netlify)](#frontend-deployment-netlify)
4. [Backend Deployment (Fly.io)](#backend-deployment-flyio)
5. [Supabase Configuration](#supabase-configuration)
6. [Python Fusion Service](#python-fusion-service)
7. [Monitoring & Logging](#monitoring--logging)
8. [Rollback & Recovery](#rollback--recovery)

---

## Prerequisites

- **Git** repository with code pushed to remote
- **Netlify** account (for frontend)
- **Fly.io** account (for backend)
- **Supabase** project (database + storage)
- **Environment variables** configured locally

### Required Tools

```bash
# Frontend
npm / pnpm / yarn

# Backend
Node.js 18+

# Python service
Python 3.9+, Docker

# CLI tools
netlify-cli
flyctl
```

---

## Environment Setup

### 1. Create `.env.production` File

```bash
# Frontend (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_URL=https://echo-event-studio.fly.dev

# Backend (Node.js)
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Python Fusion Service
FUSION_SERVICE_URL=https://echo-fusion-service.fly.dev
SUPABASE_CALLBACK_URL=https://echo-event-studio.fly.dev/api/reality/fusion-status
PYTHON_ENV=production

# Third-party services
STRIPE_SECRET_KEY=sk_live_xxx (for billing)
SENTRY_DSN=https://xxx@sentry.io/xxx (for error tracking)
```

### 2. Secure Variables in Netlify & Fly.io

**Never commit `.env.production` to git!**

Instead, set environment variables in the deployment platforms:

#### Netlify
```
Settings > Build & deploy > Environment > Environment variables
```

#### Fly.io
```bash
flyctl secrets set SUPABASE_URL=...
flyctl secrets set SUPABASE_ANON_KEY=...
flyctl secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Frontend Deployment (Netlify)

### Step 1: Connect Git Repository

1. Login to [Netlify Dashboard](https://app.netlify.com)
2. **New Site from Git**
3. Select GitHub/GitLab/Bitbucket
4. Choose your `echo-event-studio` repository
5. Select main/production branch

### Step 2: Configure Build Settings

```
Build command: npm run build
Publish directory: dist
Environment: Node 18
```

### Step 3: Set Environment Variables

In Netlify Dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

### Step 4: Deploy

```bash
# Trigger deploy by pushing to main
git push origin main
```

### Step 5: Verify Deployment

```bash
# Check build logs
netlify status

# Test production build locally
npm run build
npm run preview
```

---

## Backend Deployment (Fly.io)

### Step 1: Install Fly.io CLI

```bash
curl -L https://fly.io/install.sh | sh
flyctl auth login
```

### Step 2: Create Fly App

```bash
# From project root
flyctl launch --name echo-event-studio-api

# This creates fly.toml
```

### Step 3: Update fly.toml

```toml
app = "echo-event-studio-api"
primary_region = "sfo"

[env]
  NODE_ENV = "production"

[build]
  builder = "heroku"

[[services]]
  protocol = "tcp"
  internal_port = 8080
  processes = ["app"]

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### Step 4: Set Secrets

```bash
flyctl secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  NODE_ENV="production" \
  PORT="8080"
```

### Step 5: Deploy

```bash
# Build and deploy
flyctl deploy

# Check logs
flyctl logs
```

### Step 6: Verify Deployment

```bash
# Test endpoint
curl https://echo-event-studio-api.fly.dev/api/ping
# Expected: {"message":"ping"}
```

---

## Supabase Configuration

### Step 1: Create Database Tables

Run SQL migrations:

```bash
# Connect to Supabase SQL editor and execute:
psql -h your-db.supabase.co -U postgres -d postgres << EOF
$(cat db/schemas/reality.sql)
$(cat db/schemas/studio-extensions.sql)
EOF
```

Or copy-paste SQL from:
- `db/schemas/reality.sql`
- `db/schemas/studio-extensions.sql`

### Step 2: Create Storage Buckets

In Supabase Dashboard → Storage:

1. Create bucket: `reality-scans` (public read, authenticated write)
2. Create bucket: `room-shells` (public read, authenticated write)
3. Create bucket: `user-projects` (private, authenticated only)

### Step 3: Enable RLS Policies

All tables should have RLS enabled with proper policies:

```sql
-- Check existing policies
SELECT * FROM information_schema.table_privileges
WHERE table_schema = 'public';
```

### Step 4: Setup Authentication

In Supabase Auth settings:
- Enable Email/Password
- Configure email templates
- Set redirect URLs:
  - Local: `http://localhost:5173`
  - Production: `https://echo-event-studio.fly.dev`

---

## Python Fusion Service

### Step 1: Build Docker Image

```bash
cd python_fusion_service

# Build image
docker build -t echo-fusion-service:latest .

# Test locally
docker run -p 8000:8000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  echo-fusion-service:latest
```

### Step 2: Deploy to Fly.io

```bash
# Create Fly app
flyctl launch --name echo-fusion-service

# Set secrets
flyctl secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=...

# Deploy
flyctl deploy
```

### Step 3: Update Callback URL

In `python_fusion_service/main.py`, update:

```python
CALLBACK_URL = "https://echo-event-studio-api.fly.dev/api/reality/fusion-status"
```

---

## Monitoring & Logging

### Sentry Error Tracking

```bash
# Install Sentry packages
npm install @sentry/react @sentry/node

# Set secret
flyctl secrets set SENTRY_DSN=...
```

**Frontend integration** (`client/main.tsx`):

```tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
});
```

**Backend integration** (`server/index.ts`):

```ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Health Checks

**Frontend**: Netlify auto-checks build success

**Backend**: Fly.io TCP health checks (requests `/api/ping`)

### Logs

```bash
# Netlify
netlify logs

# Fly.io
flyctl logs --follow

# Supabase
# Dashboard > Logs tab
```

---

## Rollback & Recovery

### Rollback Frontend (Netlify)

1. Netlify Dashboard → Deploys
2. Find previous successful deploy
3. Click **Set as Production Deploy**

### Rollback Backend (Fly.io)

```bash
# List releases
flyctl releases list

# Rollback to previous release
flyctl releases rollback [RELEASE_ID]
```

### Database Recovery

If tables are accidentally dropped:

1. Supabase Dashboard → SQL
2. Re-run migration scripts from `db/schemas/`
3. Restore from automated backups (7-day retention)

---

## Production Checklist

- [ ] All environment variables configured
- [ ] Database tables created & RLS enabled
- [ ] Supabase authentication configured
- [ ] Frontend builds & deploys to Netlify
- [ ] Backend builds & deploys to Fly.io
- [ ] Python service deployed & healthy
- [ ] Sentry DSN configured for error tracking
- [ ] S3/Supabase Storage buckets created
- [ ] CORS policies configured
- [ ] SSL certificates auto-renewed
- [ ] Database backups enabled
- [ ] Health checks passing
- [ ] Logs flowing to monitoring service
- [ ] Load testing completed
- [ ] Disaster recovery plan documented

---

## Performance Optimization

### Frontend

```bash
# Enable compression
# In vite.config.ts:
import compression from 'vite-plugin-compression';

plugins: [compression()]

# Analyze bundle
npm run build -- --stats
```

### Backend

```ts
// Enable compression middleware
import compression from 'compression';
app.use(compression());
```

### Database

```sql
-- Create indexes for frequent queries
CREATE INDEX idx_studio_events_session ON studio_events(session);
CREATE INDEX idx_camera_bookmarks_session ON camera_bookmarks(session);
CREATE INDEX idx_annotations_session ON annotations(session);
```

---

## Support & Troubleshooting

| Issue | Solution |
|-------|----------|
| **Build fails** | Check `npm run build` locally; review CI logs |
| **404 errors** | Verify API routes registered in `server/index.ts` |
| **CORS errors** | Update `cors()` options in `server/index.ts` |
| **Database errors** | Check RLS policies; verify Supabase connection |
| **Slow queries** | Add indexes; check query patterns with `EXPLAIN` |
| **Out of memory** | Increase Fly.io VM size: `flyctl scale vm shared-cpu-2x` |

---

## Next Steps

1. **Setup auto-scaling** for high traffic periods
2. **Configure CDN** for static assets (Cloudflare)
3. **Setup rate limiting** to prevent abuse
4. **Implement backup strategy** for user data
5. **Create incident response playbook**
6. **Setup automated tests** in CI/CD pipeline

---

**Happy deploying! 🚀**

For questions, check [Netlify Docs](https://docs.netlify.com), [Fly.io Docs](https://fly.io/docs), or [Supabase Docs](https://supabase.com/docs).
