# CI/CD Pipeline Setup Guide

Complete guide to setting up automated testing, building, and deployment using GitHub Actions.

## Overview

This CI/CD pipeline provides:
- **Continuous Integration (CI):**
  - Automated testing on every push
  - Code linting and formatting checks
  - TypeScript type checking
  - Dependency security audits
  - Build verification

- **Continuous Deployment (CD):**
  - Automatic deployment to Fly.io (or Vercel)
  - Smoke tests after deployment
  - Database backups before deployment
  - Release creation and tagging

## Architecture

```
Push to main
    ↓
[CI] Run tests, lint, build
    ↓
[Build] Create Docker image (if main branch)
    ↓
[Deploy] Deploy to Fly.io/Vercel
    ↓
[Verify] Run smoke tests
    ↓
[Backup] Backup database
    ↓
✅ Deployment complete
```

---

## 1. GitHub Actions Setup

### 1.1 Enable GitHub Actions

1. Go to your GitHub repository
2. Click "Settings" → "Actions"
3. Ensure "Allow all actions and reusable workflows" is selected

### 1.2 Add Workflow Files

The workflow files are already created:
- `.github/workflows/ci.yml` - Continuous Integration
- `.github/workflows/deploy.yml` - Deployment Pipeline

---

## 2. Configure Secrets

### Required Secrets for Deployment

Go to: Settings → Secrets and variables → Actions

Add these secrets:

#### Fly.io Deployment
```
FLY_API_TOKEN          - Your Fly.io API token
FLY_APP_NAME           - Your Fly.io app name (e.g., lucca-app)
```

Get Fly.io token:
```bash
# Login to Fly.io
flyctl auth login

# Create API token
flyctl auth token
```

#### Vercel Deployment (Optional)
```
VERCEL_TOKEN           - Your Vercel API token
VERCEL_ORG_ID          - Your Vercel organization ID
VERCEL_PROJECT_ID      - Your Vercel project ID
```

Get Vercel token:
1. Go to https://vercel.com/account/tokens
2. Create new token
3. Copy and add to secrets

#### Database & Services
```
SUPABASE_URL           - Your Supabase project URL
SUPABASE_SERVICE_KEY   - Your Supabase service role key
```

#### AWS Backup (Optional)
```
AWS_ACCESS_KEY_ID      - AWS access key
AWS_SECRET_ACCESS_KEY  - AWS secret key
AWS_BACKUP_BUCKET      - S3 bucket for backups
```

#### Notifications (Optional)
```
SLACK_WEBHOOK          - Slack webhook URL for notifications
```

Get Slack webhook:
1. Go to your Slack workspace
2. Settings → Manage apps
3. Create new app → Incoming Webhooks
4. Create new webhook
5. Copy webhook URL

#### Code Quality (Optional)
```
SONAR_TOKEN            - SonarCloud token for code analysis
```

---

## 3. Workflow Jobs

### Job 1: Test & Lint

**Triggers on:** Push or Pull Request

**Tasks:**
- Checkout code
- Install dependencies
- Lint code (Prettier)
- Type check (TypeScript)
- Run tests (Vitest)
- Upload coverage to Codecov

**Config location:** `.github/workflows/ci.yml` → test job

### Job 2: Build Application

**Triggers on:** After tests pass

**Tasks:**
- Checkout code
- Install dependencies
- Build client (Vite)
- Build server (Vite)
- Verify build artifacts

**Config location:** `.github/workflows/ci.yml` → build job

### Job 3: Security Scan

**Triggers on:** Every push

**Tasks:**
- Audit npm dependencies
- SonarCloud code analysis
- Security vulnerability scanning

**Config location:** `.github/workflows/ci.yml` → security-scan job

### Job 4: Deploy to Fly.io

**Triggers on:** Push to main branch only

**Tasks:**
- Run tests
- Build application
- Deploy to Fly.io
- Run smoke tests
- Notify Slack

**Config location:** `.github/workflows/deploy.yml` → deploy-to-fly job

### Job 5: Database Backup

**Triggers on:** Push to main branch (daily)

**Tasks:**
- Create database backup
- Upload to S3 (optional)
- Cleanup old backups (>30 days)

**Config location:** `.github/workflows/deploy.yml` → backup-database job

---

## 4. Fly.io Configuration

### 4.1 Create Fly.io App

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Create app
flyctl launch
# Choose your app name
# Choose region
# Add Postgres database (if needed)
```

### 4.2 Configure fly.toml

Ensure your `fly.toml` includes:

```toml
[app]
kill_signal = "SIGINT"
kill_timeout = 5
processes = []

[env]
NODE_ENV = "production"
SENTRY_DSN = "your-sentry-dsn"

[[services]]
internal_port = 3000
processes = ["app"]

[services.concurrency]
type = "connections"
hard_limit = 1000
soft_limit = 850

[[services.ports]]
port = 80
handlers = ["http"]
force_https = true

[[services.ports]]
port = 443
handlers = ["tls", "http"]

[services.tcp_checks]
interval = "15s"
timeout = "5s"
grace_period = "1s"
method = "GET"
path = "/health"
```

### 4.3 Set Environment Variables

```bash
# Set via CLI
flyctl secrets set SUPABASE_URL=xxx
flyctl secrets set SUPABASE_SERVICE_KEY=xxx
flyctl secrets set SENTRY_DSN=xxx

# Or in Fly dashboard:
# App → Secrets
```

---

## 5. Testing Configuration

### 5.1 Verify Tests Run

```bash
# Run tests locally
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- invoices.test.ts
```

### 5.2 Test Structure

Tests should be in:
- `tests/` directory
- Or alongside files as `*.test.ts` or `*.spec.ts`

Example test file:

```typescript
// tests/invoices.test.ts
import { describe, it, expect } from 'vitest';
import { createInvoice } from '../server/services/invoiceService';

describe('Invoice Service', () => {
  it('should create invoice', async () => {
    const invoice = await createInvoice({
      vendor_name: 'Test Vendor',
      amount: 100,
    });

    expect(invoice).toBeDefined();
    expect(invoice.vendor_name).toBe('Test Vendor');
  });
});
```

---

## 6. Build Configuration

### 6.1 Verify Local Build

```bash
# Build client and server
npm run build

# Check artifacts
ls -la dist/spa    # Client build
ls -la dist/server # Server build
```

### 6.2 Docker Build (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts
COPY dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["npm", "start"]

EXPOSE 3000
```

---

## 7. Deployment Workflow

### On Every Push to Main

1. **Tests run** (~5 minutes)
   - Code linting
   - Type checking
   - Unit tests
   - Integration tests

2. **Build runs** (~3 minutes)
   - Client build (Vite)
   - Server build
   - Artifact verification

3. **Deploy runs** (~5 minutes)
   - Deploy to Fly.io
   - Database backup created
   - Old backups cleaned up
   - Smoke tests run

4. **Notify** (~1 minute)
   - Slack notification
   - GitHub status check

**Total time:** ~15 minutes from push to live deployment

---

## 8. Pull Request Workflow

### On Every Pull Request

1. **Tests run** (CI pipeline)
2. **Build verified** (build runs)
3. **Code analyzed** (security scan)
4. **Status check** added to PR

**Result:** Green checkmark on PR if all tests pass

---

## 9. Manual Deployments

### Deploy Without Changes

```bash
# SSH into GitHub Actions
gh run list --workflow=deploy.yml
gh run view <run-id>

# Or redeploy from Fly.io
flyctl deploy
```

### Rollback to Previous Deployment

```bash
# View deployment history
flyctl releases list

# Rollback to specific release
flyctl releases rollback <version-number>

# Or rollback to previous
flyctl releases rollback
```

---

## 10. Monitoring Deployments

### View Logs

```bash
# Fly.io logs
flyctl logs

# Follow logs in real-time
flyctl logs --follow

# GitHub Actions logs
# Go to: Actions tab → select workflow → view logs
```

### Monitor Deployed App

```bash
# Check app status
flyctl status

# Check health endpoint
curl https://your-app.fly.dev/health

# Check metrics
flyctl metrics
```

---

## 11. Troubleshooting

### Issue: Tests Failing in CI but Passing Locally

**Solutions:**
1. Check environment variables in CI
2. Verify test database is set up
3. Check for timezone-related issues
4. Run same Node version locally as in CI

```bash
# Check Node version in CI (ci.yml)
NODE_VERSION: "20"

# Use same version locally
nvm install 20
nvm use 20
```

### Issue: Deployment Failing

**Solutions:**
1. Check Fly.io logs: `flyctl logs`
2. Verify environment variables are set
3. Check health endpoint: `curl https://your-app.fly.dev/health`
4. Manually deploy to debug: `flyctl deploy --remote-only`

### Issue: Build Taking Too Long

**Solutions:**
1. Cache npm dependencies (already configured)
2. Parallel jobs where possible
3. Use `npm ci` instead of `npm install`
4. Check for timeout limits

### Issue: Backups Not Running

**Solutions:**
1. Verify AWS credentials in secrets
2. Check S3 bucket permissions
3. Ensure backupManager.ts is executable
4. Check logs: `flyctl logs -a lucca-backups`

---

## 12. Security Best Practices

### Protect Secrets

- ❌ Never commit `.env` files
- ✅ Use GitHub secrets for sensitive data
- ✅ Rotate API tokens regularly
- ✅ Use separate tokens for dev/staging/prod

### Code Review

- Require pull requests before merge
- Require CI checks to pass
- Require code reviews (2+ reviewers)
- Protect main branch

Configure in: Settings → Branches → Add rule

### Audit Logs

- Monitor GitHub Actions logs
- Set up audit log retention
- Enable audit log export (GitHub Enterprise)

---

## 13. Cost Optimization

### GitHub Actions Free Tier

- **Free for public repos:** Unlimited
- **Free for private repos:** 2,000 minutes/month
- **Cost:** $0.008 per minute after free tier

### Optimize Pipeline

1. Cache dependencies (`npm ci` + cache: "npm")
2. Run tests only on PR/push
3. Run deploy only on main branch
4. Parallel jobs where possible

**Estimated monthly cost:** $0-$50 (depending on usage)

---

## 14. Next Steps

- [ ] Create GitHub secrets
- [ ] Configure Fly.io app
- [ ] Push code to main branch
- [ ] Monitor first deployment
- [ ] Set up Slack notifications
- [ ] Configure pull request rules
- [ ] Set up code reviews

---

## Resources

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Fly.io Docs:** https://fly.io/docs
- **Vitest Documentation:** https://vitest.dev
- **Vercel Deployment:** https://vercel.com/docs

---

**Last Updated:** January 2024
