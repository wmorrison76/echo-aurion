# Production Deployment & Setup Guide

## Quick Start (5 minutes)

### 1. Environment Setup

```bash
# Create .env.local in project root
cp .env.example .env.local

# Edit .env.local with your values:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:5174

# For backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Database Setup (One-time)

```bash
# Login to Supabase Dashboard
# https://app.supabase.com/

# Navigate to SQL Editor
# Run these scripts in order:

# 1. Execute db/schemas/studio-extensions.sql
# 2. Execute db/schemas/reality.sql

# Verify tables exist:
# - studio_events
# - camera_bookmarks
# - annotations
# - reality_scans
# - reality_corrections
# - reality_shells
# - reality_fusion_jobs
# - reality_training_state
```

### 3. Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Visit http://localhost:8080
# Press 't' or 'd' to toggle light/dark theme (if theme toggle implemented)
```

### 4. Build & Test

```bash
# Run type checking
pnpm typecheck

# Run tests
pnpm test

# Build for production
pnpm build

# Build server
pnpm build:server

# Start production server
pnpm start
```

---

## Detailed Setup Steps

### Step 1: Supabase Project Creation

1. Go to https://supabase.com
2. Create a new project
3. Wait for initialization (2-3 minutes)
4. Copy your API credentials from Settings > API

**Credentials Needed**:
- Project URL (SUPABASE_URL)
- Anon Public Key (SUPABASE_ANON_KEY)
- Service Role Key (for backend operations)

### Step 2: Database Schema Setup

**Method A: Via Supabase Dashboard**

1. Open your Supabase project
2. Navigate to SQL Editor
3. Create a new query
4. Copy entire contents of `db/schemas/studio-extensions.sql`
5. Execute query
6. Repeat with `db/schemas/reality.sql`

**Method B: Via psql CLI**

```bash
# Install psql (PostgreSQL client)
brew install postgresql  # macOS
# or apt-get install postgresql-client  # Linux

# Get connection string from Supabase Settings
psql "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"

# Run migrations
\i db/schemas/studio-extensions.sql
\i db/schemas/reality.sql
```

### Step 3: Row-Level Security (RLS) Configuration

All tables have RLS enabled with policies. Current policies:

**studio_events**
- Users can read/write their own events (or NULL user_id)
- Adjust in Supabase RLS tab if needed

**camera_bookmarks**
- Users can read/write their own bookmarks
- Modify SQL policy if changing auth model

**annotations**
- Users can read/write their own annotations

⚠️ **Current Note**: Policies allow `user_id IS NULL` for compatibility. Tighten this before production:

```sql
-- Instead of:
USING (auth.uid() = user_id OR user_id IS NULL)

-- Use:
USING (auth.uid() = user_id)
```

### Step 4: Environment Variables

Create `.env.local` at project root:

```env
# Frontend (Vite - these are exposed)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=http://localhost:5174
VITE_APP_NAME=EchoEventStudio
VITE_ENABLE_ANALYTICS=true
VITE_LOG_LEVEL=info

# Backend (Node.js - private)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NODE_ENV=development
PORT=5174

# Optional: Error Tracking
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Step 5: Test Authentication

1. Start dev server: `pnpm dev`
2. Navigate to http://localhost:8080
3. Go to `/auth` page
4. Try signing up with email/password
5. Verify user appears in Supabase Auth tab
6. Try logging in
7. Navigate to `/settings` to test modal

---

## Deployment to Production

### Option 1: Netlify (Recommended for Frontend)

**Prerequisites**:
- GitHub account with repo pushed
- Netlify account connected to GitHub

**Steps**:

1. Connect your GitHub repo to Netlify
2. Configure build settings:
   - Build command: `pnpm build:client`
   - Publish directory: `dist/spa`

3. Set environment variables in Netlify dashboard:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   VITE_API_URL=https://your-api-domain.com
   ```

4. Deploy

**API Routing**: Use Netlify Functions for `/api/*` routes:

```toml
# netlify.toml (already configured)
[functions]
  external_node_modules = ["express"]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
```

### Option 2: Fly.io (Recommended for Full-Stack)

**Prerequisites**:
- `flyctl` CLI installed
- Fly.io account

**Steps**:

```bash
# Login to Fly
flyctl auth login

# Launch new app
flyctl launch --name echo-event-studio-api

# Set secrets
flyctl secrets set SUPABASE_URL=https://xxx.supabase.co
flyctl secrets set SUPABASE_ANON_KEY=eyJhbGc...
flyctl secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Deploy
flyctl deploy
```

### Option 3: Vercel (For Full-Stack)

**Prerequisites**:
- Vercel account
- GitHub repo

**Steps**:

1. Import project in Vercel dashboard
2. Select Node.js runtime
3. Set environment variables
4. Configure build: `pnpm build`
5. Deploy

---

## Production Checklist

### Pre-Deployment
- [ ] All `.env` variables set
- [ ] Database migrations executed
- [ ] RLS policies reviewed and tightened
- [ ] Tests passing: `pnpm test`
- [ ] TypeScript validation: `pnpm typecheck`
- [ ] Build succeeds: `pnpm build`
- [ ] No console errors in browser dev tools
- [ ] Settings modal opens correctly
- [ ] Events can be created/saved
- [ ] Camera bookmarks can be saved/loaded

### Post-Deployment
- [ ] Test signup/login on production
- [ ] Create test event and verify in Supabase
- [ ] Test settings modal and profile update
- [ ] Monitor error logs (Sentry if configured)
- [ ] Check performance metrics
- [ ] Verify HTTPS is enabled
- [ ] Test on mobile devices
- [ ] Set up automated backups

---

## Troubleshooting

### "Supabase credentials not configured"
```
Error: Supabase credentials are not configured.
Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.
```

**Fix**:
```bash
# Check .env.local exists
ls -la .env.local

# Verify values are set (not empty)
cat .env.local | grep SUPABASE

# Restart dev server
pkill -f "pnpm dev"
pnpm dev
```

### Events not saving
```
Check:
1. Is studio_events table created? (Supabase SQL Editor)
2. Are RLS policies enabled?
3. Is SUPABASE_URL correct?
4. Check browser console for errors
5. Check server logs: pnpm dev
```

### Camera bookmarks returning 404
```
Check:
1. Is camera_bookmarks table created?
2. Are you using correct session/slot params?
3. Try: GET /api/camera/list?session=test
4. Verify RLS allows reads
```

### Dark mode not applying
```
1. Add class="dark" to <html> element
2. Or use system preference: prefers-color-scheme
3. Check global.css is imported in App.tsx
4. Verify tailwind.config.ts has 'class' strategy
```

### TypeScript errors
```
# Run type check
pnpm typecheck

# Strict mode errors expected, fix gradually:
# - Enable strict: true in tsconfig.json
# - Address any type issues
```

---

## Performance Optimization

### Bundle Size
```bash
# Analyze bundle
pnpm build
# Check dist/spa size < 500KB (before gzip)

# Optimize:
1. Remove unused imports
2. Lazy-load heavy routes
3. Code split vendor packages
```

### Database
```sql
-- Add indexes for common queries
CREATE INDEX idx_studio_events_user ON studio_events(user_id);
CREATE INDEX idx_camera_bookmarks_user ON camera_bookmarks(user_id);
CREATE INDEX idx_annotations_user ON annotations(user_id);
```

### Caching
```typescript
// Add cache headers in Express
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-cache');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  next();
});
```

---

## Monitoring & Logging

### Enable Sentry (Error Tracking)

```bash
# Set in .env
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

```typescript
// In client/main.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

### Server Logging

```typescript
// In server/index.ts
import pino from 'pino';

const logger = pino();

app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    timestamp: new Date(),
  });
  next();
});
```

---

## Database Backups

### Supabase Automatic Backups
- Free tier: Daily backups (7 days retention)
- Pro tier: Hourly backups (30 days retention)

Enable in Supabase > Settings > Backups

### Manual Backup

```bash
# Export data
pg_dump "postgresql://user:pass@project.supabase.co:5432/postgres" > backup.sql

# Import data
psql "postgresql://user:pass@project.supabase.co:5432/postgres" < backup.sql
```

---

## Scaling Considerations

### When to Upgrade Supabase Plan
- > 100K API calls/month
- > 100GB storage
- Multiple concurrent users (>50 simultaneous)

### When to Add Caching Layer
- Frequent requests to same data
- Complex KPI calculations
- Real-time event streams

### When to Separate Backend
- Custom ML/AI pipelines
- Heavy image processing
- Multiple service providers

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Deployment Guide**: https://www.builder.io/c/docs/projects
- **Vite Docs**: https://vitejs.dev
- **Express Docs**: https://expressjs.com
- **React Docs**: https://react.dev

---

## Quick Reference Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm typecheck          # Type checking
pnpm test               # Run tests
pnpm format:fix         # Auto-format code

# Building
pnpm build              # Build frontend + server
pnpm build:client       # Build frontend only
pnpm build:server       # Build server only

# Production
pnpm start              # Start production server

# Database
# (Use Supabase dashboard for SQL operations)
```

---

**Last Updated**: 2024-10-18
**Version**: 1.0.0
