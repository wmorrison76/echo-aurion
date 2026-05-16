# Environment & Secrets Management Guide

Complete guide to managing environment variables, secrets, and configuration in production.

## Overview

Proper secrets management includes:
- **Never commit secrets** to version control
- **Use environment variables** for configuration
- **Rotate secrets regularly** (quarterly minimum)
- **Audit access** to secrets
- **Encrypt secrets at rest** and in transit
- **Separate dev/staging/prod** configurations

---

## 1. Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=production
APP_VERSION=1.0.0
LOG_LEVEL=info

# Database
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (never share!)

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=24h

# Monitoring
SENTRY_DSN=https://[key]@sentry.io/[id]
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Payment Processing (optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Backup
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BACKUP_BUCKET=lucca-backups-prod

# Web Hooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### Environment Files

**Do NOT commit:**
```
❌ .env (production secrets)
❌ .env.local (local overrides)
❌ .env.*.local (environment-specific secrets)
❌ config/secrets.json
```

**DO commit:**
```
✅ .env.example (template with placeholder values)
✅ .env.test (test-specific values)
✅ config/defaults.json (public configuration)
```

### .env.example Template

```bash
# Copy this file to .env and fill in your values
# NEVER commit .env to version control!

# Application
NODE_ENV=production
APP_VERSION=1.0.0
LOG_LEVEL=info
PORT=3000

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_KEY_HERE

# Authentication
JWT_SECRET=YOUR_JWT_SECRET_HERE
JWT_EXPIRY=24h

# Monitoring
SENTRY_DSN=https://your-key@sentry.io/your-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Payment Processing (optional)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_KEY
PAYPAL_CLIENT_ID=YOUR_PAYPAL_ID
PAYPAL_CLIENT_SECRET=YOUR_PAYPAL_SECRET

# AWS Backup
AWS_ACCESS_KEY_ID=YOUR_AWS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET
AWS_BACKUP_BUCKET=lucca-backups-prod

# Webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## 2. Fly.io Secrets

### Set Secrets via CLI

```bash
# Set single secret
flyctl secrets set SUPABASE_URL=https://...
flyctl secrets set SUPABASE_SERVICE_KEY=eyJhbGc...

# Set multiple secrets
flyctl secrets set \
  SUPABASE_URL=https://... \
  SUPABASE_SERVICE_KEY=eyJhbGc... \
  SENTRY_DSN=https://...
```

### Set Secrets via Dashboard

1. Go to Fly.io Dashboard
2. Click App → Secrets
3. Click "Add Secret"
4. Enter Key and Value
5. Click "Save"

### View Secrets

```bash
# List all secrets (values hidden)
flyctl secrets list

# View specific secret (NOT RECOMMENDED)
# Only use for debugging, never share output
flyctl secrets unset SECRET_NAME
flyctl config show -c
```

### Rotate Secrets

```bash
# 1. Create new secret
flyctl secrets set NEW_SECRET_NAME=new_value

# 2. Deploy to use new secret
flyctl deploy

# 3. Verify new secret is working
flyctl logs

# 4. Remove old secret
flyctl secrets unset OLD_SECRET_NAME
```

---

## 3. GitHub Secrets

### Add GitHub Secrets

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret:

```
Name: SENTRY_DSN
Value: https://your-key@sentry.io/your-id

Name: SUPABASE_URL
Value: https://your-project.supabase.co

Name: SUPABASE_SERVICE_KEY
Value: eyJhbGc...

Name: FLY_API_TOKEN
Value: (Get from: flyctl auth token)

Name: AWS_ACCESS_KEY_ID
Value: AKIA...

Name: AWS_SECRET_ACCESS_KEY
Value: ...

Name: SLACK_WEBHOOK
Value: https://hooks.slack.com/...
```

### Use in Workflows

```yaml
# In .github/workflows/deploy.yml
- name: Deploy
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
  run: npm run deploy
```

---

## 4. Secret Types & Management

### API Keys
```bash
# Format
PREFIX_API_KEY=sk_live_xxxxx

# Rotation: Quarterly
# Storage: GitHub + Fly.io
# Access: Only backend needs this
```

### Database Credentials
```bash
# Format
DATABASE_PASSWORD=XyZ1_2_aB

# Rotation: Every 6 months
# Storage: Fly.io only (not GitHub)
# Access: Backend application only
```

### JWT Secrets
```bash
# Generate new JWT secret
openssl rand -base64 32

# Format
JWT_SECRET=abc123def456ghi789jkl012

# Rotation: Annually
# Storage: Fly.io + local .env
# Impact: Invalidates all tokens on change
```

### Third-Party Tokens
```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx

# Sentry
SENTRY_DSN=https://[key]@sentry.io/[id]

# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Rotation: Annually or if compromised
# Storage: Fly.io + GitHub (for CI/CD)
# Access: Application or CI/CD only
```

---

## 5. Accessing Secrets Securely

### In Application Code

```typescript
// ✅ CORRECT: Use environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// ✗ WRONG: Never hardcode secrets
const supabaseUrl = 'https://abc.supabase.co';
const supabaseKey = 'eyJhbGc...'; // NEVER!

// ✗ WRONG: Don't log secrets
console.log('Connecting to:', process.env.SUPABASE_SERVICE_KEY); // NEVER!
```

### In CI/CD Pipelines

```yaml
# ✅ CORRECT: Use secrets
- name: Deploy
  env:
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: deploy.sh

# ✗ WRONG: Never log secrets
- name: Debug
  run: echo "Password: $DB_PASSWORD"  # NEVER!
```

### In Configuration Files

```typescript
// ✅ CORRECT: Load from environment
const config = {
  database: {
    url: process.env.DATABASE_URL,
    password: process.env.DATABASE_PASSWORD,
  },
  api: {
    key: process.env.API_KEY,
  }
};

// ✗ WRONG: Never hardcode
const config = {
  database: {
    url: 'postgres://...',
    password: 'secret123', // NEVER!
  }
};
```

---

## 6. Secret Rotation Schedule

### Weekly
- [ ] Review access logs
- [ ] Check for leaked secrets (via GitHub notifications)

### Monthly
- [ ] Rotate API keys used in integrations
- [ ] Review who has access to secrets
- [ ] Audit GitHub Actions usage

### Quarterly
- [ ] Rotate third-party API keys
- [ ] Rotate database backup encryption keys
- [ ] Update security audit log

### Annually
- [ ] Rotate JWT secrets (plan for 24h token re-auth)
- [ ] Rotate database admin password
- [ ] Full security audit
- [ ] Update documentation

---

## 7. Detecting Leaked Secrets

### Automated Detection

```bash
# Use git-secrets to prevent accidental commits
brew install git-secrets

git secrets --install
git secrets --register-aws

# Now git will block commits with secrets
git commit -am "Add payment processing"  # Will scan for secrets
```

### GitHub Secret Scanning

GitHub automatically scans for leaked secrets:

1. Go to Security → Secret scanning
2. Enable for the repository
3. GitHub will alert on detected secrets
4. Secrets are never shown in diffs

### Responding to Leaked Secrets

**If a secret is exposed:**

1. **Immediately rotate** the compromised secret
2. **Revoke** old credentials
3. **Audit** who accessed the secret and when
4. **Review** for unauthorized access
5. **Document** the incident
6. **Update** security procedures

```bash
# 1. Create new secret
flyctl secrets set NEW_SECRET=new_value

# 2. Deploy to use new secret
flyctl deploy --remote-only

# 3. Verify deployment
flyctl logs

# 4. Remove old secret
flyctl secrets unset OLD_SECRET

# 5. Log the incident
echo "2024-01-20: Rotated STRIPE_SECRET_KEY due to exposure" >> SECURITY_LOG.md
```

---

## 8. Security Best Practices

### Principle of Least Privilege

```bash
# ✅ CORRECT: Minimal permissions
# Only services that need the secret have it
STRIPE_API_KEY → Only payment processing service

# ✗ WRONG: Over-sharing
# All services have all secrets
STRIPE_API_KEY → Frontend + Backend + Workers
```

### Secrets in Logs

```typescript
// ✅ CORRECT: Mask secrets in logs
logger.info({
  action: 'payment_processed',
  amount: 100,
  stripeId: 'ch_xxx...', // Truncated
  // Never include STRIPE_SECRET_KEY
});

// ✗ WRONG: Logging secrets
logger.info('Payment processed with key:', process.env.STRIPE_SECRET_KEY); // NEVER!
```

### Environment Separation

```bash
# Development
# - Use test API keys
# - Can be less strict with access
# - Regularly clean up
STRIPE_SECRET_KEY=sk_test_...

# Staging
# - Use production API keys
# - Restricted access
# - Monitor for actual transactions
STRIPE_SECRET_KEY=sk_live_... (read-only if possible)

# Production
# - Use production API keys
# - Strict access control
# - Audit all access
# - Rotate regularly
STRIPE_SECRET_KEY=sk_live_...
```

---

## 9. Audit & Compliance

### Access Logs

Keep audit logs of:
- Who accessed secrets
- When secrets were accessed
- Which secrets were accessed
- What action was performed

```bash
# Example audit entry
2024-01-20 10:30:00 - User: john@company.com
  Action: Updated STRIPE_SECRET_KEY
  Reason: Quarterly rotation
  Reviewed by: security-team

2024-01-20 14:45:00 - User: deployment-bot
  Action: Read SUPABASE_SERVICE_KEY
  Reason: Automated deployment
  Status: Success
```

### Compliance Requirements

**GDPR:**
- Restrict access to customer data keys
- Document who has access
- Implement automatic rotation

**HIPAA:**
- Encrypt all secrets at rest and in transit
- Maintain audit logs for 6 years
- Implement multi-factor authentication

**PCI DSS:**
- Change default credentials on installation
- Use strong encryption for transmission
- Implement network segmentation

---

## 10. Emergency Procedures

### If Secret is Compromised

```bash
# 1. Immediately assess impact
# What service uses this secret?
# What could an attacker do?
# How long was it exposed?

# 2. Rotate the secret
flyctl secrets set NEW_SECRET=new_value
flyctl deploy --remote-only

# 3. Audit usage
# Check logs for suspicious activity
flyctl logs | grep error

# 4. Check for unauthorized access
# Review payment processor logs
# Check database for unusual queries

# 5. Notify stakeholders
# Alert security team
# Notify affected users if necessary

# 6. Document the incident
# Create post-mortem
# Update security procedures
```

### If Database is Compromised

```bash
# 1. Take database offline
# Redirect to maintenance page

# 2. Restore from backup
npx ts-node scripts/admin/backupManager.ts restore clean-backup.json.gz

# 3. Review backup for tampering
# Spot check important records

# 4. Restart application
flyctl deploy --remote-only

# 5. Monitor for attacks
flyctl logs --follow

# 6. Investigate root cause
# Check for SQL injection vulnerabilities
# Review access logs
```

---

## 11. Checklist

### Initial Setup
- [ ] Create .env.example with all variables
- [ ] Document each variable's purpose
- [ ] Set all secrets in Fly.io
- [ ] Set all secrets in GitHub
- [ ] Verify application starts
- [ ] Test all integrations

### Weekly
- [ ] Review access logs
- [ ] Check GitHub secret scanning alerts
- [ ] Verify no secrets in git history

### Monthly
- [ ] Document secret usage
- [ ] Review who has access
- [ ] Update rotation schedule

### Quarterly
- [ ] Rotate API keys
- [ ] Audit secret access patterns
- [ ] Update security documentation

### Annually
- [ ] Full security audit
- [ ] Review all secrets in use
- [ ] Update compliance documentation
- [ ] Train team on secret management

---

## Resources

- **Fly.io Secrets:** https://fly.io/docs/reference/secrets/
- **GitHub Secrets:** https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
- **OWASP Secret Management:** https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- **git-secrets:** https://github.com/awslabs/git-secrets

---

**Last Updated:** January 2024
