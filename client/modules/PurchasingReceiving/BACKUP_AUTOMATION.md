# Automated Backup Configuration Guide

Complete guide to setting up automated database backups, testing restoration, and disaster recovery.

## Overview

A reliable backup strategy includes:
- **Automated Daily Backups:** Hourly backups retained for 7 days
- **S3 Storage:** Off-site storage for disaster recovery
- **Backup Verification:** Regular testing of backup restoration
- **Disaster Recovery Plan:** Documented procedures for recovery
- **Encryption:** Secure backup data with encryption
- **Monitoring:** Alerts when backups fail

---

## 1. Configure Automated Backups

### Option 1: Using GitHub Actions (Recommended)

The deployment pipeline already includes backup automation:

```yaml
# In .github/workflows/deploy.yml
backup-database:
  name: Backup Database
  runs-on: ubuntu-latest
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'

  steps:
    - name: Create backup
      run: npx ts-node scripts/admin/backupManager.ts create
    
    - name: Upload to S3
      run: aws s3 cp backups/ s3://YOUR_BUCKET/lucca/ --recursive
```

**Setup:**
1. Backups run automatically on every deployment to main
2. Backups are uploaded to S3
3. Old backups (>30 days) are automatically cleaned up

### Option 2: Cron-Based Scheduled Backups

Add scheduled backup workflow:

Create `.github/workflows/backup-schedule.yml`:

```yaml
name: Scheduled Database Backup

on:
  schedule:
    # Run every day at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Create daily backup
        run: npx ts-node scripts/admin/backupManager.ts create
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
      
      - name: Upload to S3
        run: |
          aws s3 cp backups/ s3://${{ secrets.AWS_BACKUP_BUCKET }}/lucca/ \
            --recursive \
            --include "*.json.gz"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Alert on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: '❌ Backup failed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 2. S3 Backup Storage

### Create S3 Bucket

```bash
aws s3 mb s3://lucca-backups-prod --region us-east-1
```

### Configure Versioning

```bash
# Enable versioning (keep backup history)
aws s3api put-bucket-versioning \
  --bucket lucca-backups-prod \
  --versioning-configuration Status=Enabled
```

### Configure Lifecycle Policy

Keep backups for:
- Daily backups: 30 days
- Weekly backups (every Sunday): 90 days
- Monthly backups (first of month): 1 year

```bash
cat > lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "Id": "DeleteOldDailyBackups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "lucca/daily/"
      },
      "Expiration": {
        "Days": 30
      }
    },
    {
      "Id": "DeleteOldWeeklyBackups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "lucca/weekly/"
      },
      "Expiration": {
        "Days": 90
      }
    },
    {
      "Id": "DeleteOldMonthlyBackups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "lucca/monthly/"
      },
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket lucca-backups-prod \
  --lifecycle-configuration file://lifecycle.json
```

### Enable Encryption

```bash
aws s3api put-bucket-encryption \
  --bucket lucca-backups-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Block Public Access

```bash
aws s3api put-public-access-block \
  --bucket lucca-backups-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

---

## 3. Backup Retention Policy

### Recommended Retention Schedule

| Frequency | Retention | Purpose |
|-----------|-----------|---------|
| Hourly | 24 hours | Quick recovery from recent issues |
| Daily | 7 days | Weekly historical data |
| Weekly | 90 days | Monthly audits and compliance |
| Monthly | 1 year | Long-term compliance and archival |

### Supabase Built-in Backups

Supabase includes automatic daily backups:

```bash
# List available backups
supabase db backups list --project-id YOUR_PROJECT_ID

# Download backup
supabase db backups download --project-id YOUR_PROJECT_ID --backup-id BACKUP_ID

# Restore from backup (via dashboard)
# Project Settings → Database → Backups → Restore
```

---

## 4. Testing Backup Restoration

### Monthly Restoration Test

Schedule a monthly test to verify backups can be restored:

Create `.github/workflows/backup-test.yml`:

```yaml
name: Monthly Backup Restoration Test

on:
  schedule:
    # First Monday of month at 3 AM UTC
    - cron: '0 3 ? * MON#1'

jobs:
  test-restore:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Download latest backup
        run: |
          aws s3 ls s3://${{ secrets.AWS_BACKUP_BUCKET }}/lucca/ \
            --recursive --human-readable | sort -k6 | tail -1 | \
            awk '{print $NF}' | xargs -I {} \
            aws s3 cp s3://${{ secrets.AWS_BACKUP_BUCKET }}/{} ./
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Test restoration (dry-run)
        run: |
          echo "Testing backup restoration..."
          # Verify backup file
          ls -lh *.json.gz
          
          # Verify backup integrity
          gunzip -t *.json.gz
          echo "✓ Backup integrity verified"
      
      - name: Verify backup contents
        run: |
          gunzip -c *.json.gz | jq keys | head -20
          echo "✓ Backup contains valid JSON"
      
      - name: Send test results
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Monthly Backup Restoration Test: ${{ job.status }}
            Latest backup verified and ready for restoration
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Manual Restoration Test

```bash
# 1. Download backup
aws s3 cp s3://lucca-backups-prod/lucca/backup-latest.json.gz ./

# 2. Decompress
gunzip backup-latest.json.gz

# 3. Verify integrity
cat backup-latest.json | jq . | head -50

# 4. Create test database
# Use Supabase dashboard to create a fork/test environment

# 5. Restore to test database
npx ts-node scripts/admin/backupManager.ts restore backup-latest.json.gz

# 6. Run validation queries
SELECT COUNT(*) FROM invoices;
SELECT COUNT(*) FROM inventory_items;
SELECT COUNT(*) FROM outlets;

# 7. Verify data integrity
# Check record counts match production
```

---

## 5. Disaster Recovery Plan

### Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

```
RTO: 1 hour (time to restore service)
RPO: 1 hour (maximum data loss)
```

### Step-by-Step Recovery Procedure

#### Scenario: Complete Database Loss

```bash
# 1. Assess damage
# - Check Supabase dashboard
# - Verify backups are intact
# - Estimate recovery time

# 2. Prepare environment
# - Spin up new database instance
# - Ensure sufficient storage
# - Configure network access

# 3. Restore from backup
npx ts-node scripts/admin/backupManager.ts restore backup-2024-01-20.json.gz

# 4. Verify restoration
# - Run count queries
# - Spot-check important records
# - Verify indexes are created

# 5. Update DNS/connections
# - Point application to new database
# - Verify connectivity
# - Monitor for errors

# 6. Post-recovery validation
# - Run application smoke tests
# - Check Sentry for errors
# - Verify data integrity
# - Notify stakeholders
```

#### Scenario: Accidental Data Deletion

```bash
# 1. Stop replication (if enabled)
# 2. Identify deletion time
# 3. Restore from backup taken before deletion
# 4. Restore deleted data to temporary table
# 5. Merge restored data with current data
# 6. Resume replication
```

#### Scenario: Ransomware/Corruption

```bash
# 1. Isolate affected systems
# 2. Restore from clean backup
# 3. Scan for malware
# 4. Update security measures
# 5. Gradually bring systems online
# 6. Monitor closely for re-infection
```

---

## 6. Backup Storage Locations

### Primary Backup (Supabase)
- **Location:** Supabase managed backups
- **Retention:** 30 days
- **Access:** Via Supabase dashboard
- **Recovery Time:** ~30 minutes

### Secondary Backup (S3)
- **Location:** AWS S3 bucket
- **Retention:** 1 year
- **Access:** Via AWS CLI
- **Recovery Time:** ~2 hours
- **Cost:** ~$0.02-0.05 per GB per month

### Tertiary Backup (Optional - External Provider)
- **Location:** Backblaze, CrashPlan, or similar
- **Retention:** 1-5 years
- **Access:** Via provider dashboard
- **Recovery Time:** ~24 hours
- **Cost:** ~$50-200/year

### Backup Verification Checklist

- [ ] Backups created on schedule
- [ ] Backups uploaded to S3
- [ ] Old backups deleted automatically
- [ ] Monthly restoration tests passing
- [ ] Backup file integrity verified
- [ ] Encryption enabled
- [ ] Access logs monitored
- [ ] Team trained on recovery

---

## 7. Monitoring Backup Health

### Backup Failure Alerts

Configure to send alerts when:
- Backup job fails
- Backup size changes unexpectedly
- Upload to S3 fails
- Backup verification fails

```typescript
// In your monitoring system
if (backupStatus === 'failed') {
  sendSlackAlert('⚠️ Database backup failed');
  createIncident('CRITICAL', 'Backup failure');
}

if (backupSize > previousSize * 1.5) {
  sendSlackAlert('⚠️ Backup size increased significantly');
}
```

### Backup Metrics to Track

```
- Backup duration (target: < 15 minutes)
- Backup size (track growth)
- Restore duration (test quarterly)
- Backup success rate (target: 100%)
- Data freshness (max age: 1 hour)
```

---

## 8. Cost Optimization

### Reduce S3 Storage Costs

1. **Use S3 Intelligent-Tiering**
   - Automatically moves old backups to cheaper storage
   - ~70% savings after 90 days

2. **Set Expiration Policies**
   - Delete daily backups after 30 days
   - Delete weekly backups after 90 days
   - Delete monthly backups after 1 year

3. **Use S3 Glacier**
   - Very cheap long-term storage
   - ~1 cent per GB per month
   - Retrieval takes 1-5 hours

### Example Costs

```
Daily Backups (30 days): $0.30/month (for 100GB)
Weekly Backups (90 days): $0.90/month (for 100GB)
Monthly Backups (1 year): $1.20/month (for 100GB)
Total: ~$2.40/month
```

---

## 9. Compliance & Auditing

### Required for Compliance

- **GDPR:** Must be able to restore personal data
- **HIPAA:** Must keep encrypted backups for 6 years
- **PCI DSS:** Must test backup restoration annually
- **SOC 2:** Must have disaster recovery plan

### Audit Requirements

- Document backup procedures
- Maintain backup logs
- Record restoration tests
- Update disaster recovery plan
- Train team quarterly

---

## 10. Backup Checklist

### Daily Checks
- [ ] Verify backup job completed
- [ ] Check backup file size is reasonable
- [ ] Monitor backup job duration

### Weekly Checks
- [ ] Verify S3 upload successful
- [ ] Check backup encryption is enabled
- [ ] Review backup logs for errors

### Monthly Checks
- [ ] Run restoration test
- [ ] Verify backup file integrity
- [ ] Update disaster recovery documentation
- [ ] Train team on recovery procedures

### Quarterly Checks
- [ ] Full restoration test (dry-run)
- [ ] Verify all backup locations
- [ ] Review and update recovery procedures
- [ ] Test failover to secondary database

### Annually
- [ ] Full disaster recovery drill
- [ ] Review backup retention policy
- [ ] Update compliance documentation
- [ ] Audit all backup access logs

---

## 11. Recovery Runbook

### Quick Reference

```
Database Down?
├─ Check status: flyctl status
├─ Check logs: flyctl logs | grep error
├─ Restore latest backup: scripts/admin/backupManager.ts restore <file>
├─ Verify data: SELECT COUNT(*) FROM invoices;
└─ Redeploy: flyctl deploy

Data Corrupted?
├─ Identify when corruption started
├─ Find backup before corruption
├─ Restore to temporary database
├─ Merge data with current database
└─ Validate integrity

Need Specific Data?
├─ Download backup from S3
├─ Decompress locally
├─ Query JSON for needed records
├─ Restore to temporary database
└─ Export needed data
```

---

## Next Steps

- [ ] Set up S3 bucket with versioning
- [ ] Configure bucket encryption
- [ ] Create backup GitHub workflow
- [ ] Test backup creation locally
- [ ] Schedule first backup
- [ ] Run monthly restoration test
- [ ] Document recovery procedures
- [ ] Train team on backup/recovery

---

**Last Updated:** January 2024
