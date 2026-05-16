# Guardian Admin Configuration Guide

## Overview

This guide helps administrators configure, monitor, and manage the Guardian system for your EchoAurum instance.

## Table of Contents
1. Guardian Settings Overview
2. Per-GL Account Configuration
3. Risk Threshold Configuration
4. High-Risk Account Monitoring
5. Alert Configuration
6. Guardian Status Dashboard
7. Troubleshooting
8. Best Practices

---

## Guardian Settings Overview

The Guardian system has three configuration levels:

### Level 1: Global Settings
Applied to **entire entity** - all transactions

```typescript
{
  entityId: "ent-001",
  
  // Guardian enablement
  argusEnabled: true,        // Data compliance
  zeldaEnabled: true,        // Duplicate detection
  phoenixEnabled: true,      // Anomaly detection
  odinEnabled: true,         // Audit trail
  
  // Guardian behavior
  blockingErrorsStop: true,  // Stop posting on critical errors
  warningsAllow: true,       // Allow posting with warnings
  asyncAuditLog: true,       // Log audit trail asynchronously
  
  // Performance
  cacheEnabled: true,
  cacheTTL: 300,            // 5 minutes
  
  // Compliance
  requiresApproval: false,   // Require approval for all posts
  auditRetention: 2555      // 7 years in days
}
```

### Level 2: Per-GL Account Settings
Applied to specific GL account - affects all transactions touching that account

```typescript
{
  glAccountCode: "1010",     // Bank Account
  
  // Argus settings
  requiresCostCenter: false,
  requiresDepartment: false,
  
  // Phoenix risk thresholds
  largeAmountThreshold: 2.0,    // 2x average
  maxDailyAmount: 100000,       // Hard limit
  maxMonthlyAmount: 500000,     // Hard limit
  
  // Monitoring
  highRiskAccount: true,        // Treat as high-risk
  sendAlertsTo: ["controller@hotel.com"],
  blockingDisabledUntil: null
}
```

### Level 3: User-Specific Settings
Applied to **specific user** - affects their postings

```typescript
{
  userId: "user-sarah",
  
  // Approval requirements
  requiresApprovalAbove: 50000,  // > $50K needs approval
  maxDailyLimit: 100000,         // Can't post > $100K/day
  
  // Monitoring
  monitorUser: true,
  sendAlertsTo: ["supervisor@hotel.com"]
}
```

---

## Per-GL Account Configuration

### How to Configure an Account

**Step 1: Access Guardian Settings**
```
Navigate to: Admin Panel > Accounting > GL Accounts > [Select Account] > Guardian Settings
```

**Step 2: Set Account Characteristics**

```
Account Code: 1010
Account Name: Bank Account
Account Type: Asset

GUARDIAN CONFIGURATION:
┌─────────────────────────────────────────────┐
│ Risk Level: HIGH-RISK                        │
│ □ This is a high-risk account (cash/bank)   │
│                                             │
│ Maximum Daily Amount: $100,000              │
│ □ Enforce daily posting limit               │
│                                             │
│ Maximum Monthly Amount: $500,000            │
│ □ Enforce monthly posting limit             │
│                                             │
│ Require Cost Center: □                      │
│ Require Department: □                       │
│                                             │
│ Alert on Risk Score > 30                    │
│ Send Alerts To: _______________             │
│                                             │
│ [Save Configuration]                        │
└─────────────────────────────────────────────┘
```

### Common Account Configurations

#### Bank Account (1010)
```
Account: Bank Account
Risk Level: HIGH
Alerting: Enabled (send to controller)
Daily Limit: $500,000
Monthly Limit: $2,000,000
Cost Center Required: No
Department Required: No

Reasoning: Cash account needs tight control
```

#### Revenue Account (4000)
```
Account: Room Revenue
Risk Level: NORMAL
Alerting: Disabled
Daily Limit: No limit
Monthly Limit: No limit
Cost Center Required: No
Department Required: No

Reasoning: Revenue is posted daily, no limit needed
```

#### Payroll Expense (6000)
```
Account: Payroll Expense
Risk Level: NORMAL
Alerting: Disabled
Daily Limit: No limit
Monthly Limit: No limit
Cost Center Required: Yes
Department Required: Yes

Reasoning: Cost center/dept needed for analysis
```

#### Suspicious Account (9999)
```
Account: Off-Book Account
Risk Level: BLOCK
Alerting: Critical (send to CFO + Audit)
Daily Limit: $0 (BLOCKED)
Monthly Limit: N/A
Cost Center Required: Yes
Department Required: Yes

Reasoning: No off-book accounts allowed
```

---

## Risk Threshold Configuration

### Understanding Risk Scores

Phoenix assigns risk 0-100 based on anomalies:
- **0-30:** Low risk, post normally
- **31-60:** Medium risk, post with caution
- **61-80:** High risk, requires review
- **81-100:** Critical risk, blocked automatically

### Setting Thresholds

**Global Settings (for all accounts):**

```
Admin Panel > Settings > Guardian > Phoenix Risk Settings

Large Amount Threshold: 2.0        [Default]
├─ Meaning: Flag if amount > 2x average
├─ Options: 1.5 (sensitive) to 3.0 (loose)
└─ Impact: Lower = more warnings

Large Amount Risk Score: 15        [Default]
└─ Severity weight: 5 (low) to 30 (high)

Off-Hours Risk Score: 10           [Default]
└─ Severity weight: 5 to 20

Unknown Vendor Risk Score: 20      [Default]
└─ Severity weight: 10 to 40

High-Risk Account Score: 25        [Default]
└─ Severity weight: 15 to 50

Rapid Succession Score: 30         [Default]
└─ Severity weight: 20 to 50

Round Number Score: 5              [Default]
└─ Severity weight: 1 to 15

═══════════════════════════════════════════════
Global Risk Threshold: 60          [Default]
├─ Below: Post normally
├─ 60-80: Post with warning
└─ Above: Block & require review

[Save Configuration]
```

### Tuning Risk Thresholds

**If you have too many false positives (warnings):**

Increase thresholds:
```
Large Amount Threshold: 2.0 → 2.5
Unknown Vendor Score: 20 → 15
Round Number Score: 5 → 2
Global Risk Threshold: 60 → 70
```

**If you have too many false negatives (fraud leaks through):**

Decrease thresholds:
```
Large Amount Threshold: 2.0 → 1.5
Unknown Vendor Score: 20 → 30
Global Risk Threshold: 60 → 50
Rapid Succession Score: 30 → 50
```

---

## High-Risk Account Monitoring

### Identifying High-Risk Accounts

**Automatic Detection:**
The system flags these as high-risk:
- Bank account (1010)
- Petty cash (1012)
- Bank transfers payable (2400)
- Off-book accounts (999x)
- Intercompany accounts

**Manual Configuration:**
You can flag any account as high-risk:

```
Admin Panel > GL Accounts > [Account] > Guardian Settings
☑ Mark as High-Risk Account
```

### Monitoring Dashboard

**View: Admin > Guardian > High-Risk Accounts**

```
┌─ HIGH-RISK ACCOUNT MONITORING ──────────────────┐
│                                                 │
│ Account: 1010 (Bank Account)                    │
│ Risk Level: HIGH                                │
│ Status: ✓ MONITORED                            │
│ Last 7 Days: 12 transactions                    │
│ Blocked Transactions: 0                         │
│ Warning Transactions: 1                         │
│ Risk Score (avg): 8/100                         │
│ Last Activity: 2 hours ago                      │
│                                                 │
├─ RECENT TRANSACTIONS ──────────────────────────┤
│ JE-234  $50,000  Bank  Risk: 12  2h ago  POST ✓│
│ JE-233  $10,000  Bank  Risk: 5   4h ago  POST ✓│
│ JE-232   $5,000  Bank  Risk: 8   6h ago  POST ✓│
│ JE-231   $3,000  Bank  Risk: 3   8h ago  POST ✓│
│                                                 │
├─ TREND ANALYSIS ───────────────────────────────┤
│ Daily average: $21,428                          │
│ Weekly average: $15,000                         │
│ Monthly average: $12,500                        │
│ Largest transaction (30d): $50,000             │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Alerts for High-Risk Accounts

**What triggers alerts:**
1. Transaction risk score > configured threshold
2. Amount exceeds daily/monthly limit
3. Unknown vendor (for AP invoices)
4. Off-hours posting
5. Multiple transactions in rapid succession

**Who gets notified:**
Configured in account settings (default: controller, CFO)

**How they're notified:**
- Email (immediate)
- Dashboard notification (real-time)
- Daily digest (optional)

---

## Alert Configuration

### Setting Up Alerts

**Step 1: Define Alert Policies**

```
Admin Panel > Guardian > Alert Policies

Policy Name: High-Risk Alerts
├─ Trigger: Risk Score > 60
├─ Applies To: Accounts marked as high-risk
├─ Frequency: Immediate
└─ Recipients: controller@hotel.com, cfo@hotel.com

Policy Name: Large Transactions
├─ Trigger: Amount > $100,000
├─ Applies To: All accounts
├─ Frequency: Immediate
└─ Recipients: controller@hotel.com

Policy Name: After-Hours Activity
├─ Trigger: Posted between 10 PM - 6 AM
├─ Applies To: High-risk accounts
├─ Frequency: Batch (nightly digest)
└─ Recipients: controller@hotel.com

[Save Policies]
```

**Step 2: Configure Notification Channels**

```
Admin Panel > Settings > Notifications

Channel: Email
├─ Server: smtp.gmail.com
├─ Port: 587
├─ Username: alerts@hotel.com
├─ Password: [configured]
└─ Test Connection: ✓ Success

Channel: Slack
├─ Webhook URL: https://hooks.slack.com/...
├─ Channel: #accounting-alerts
└─ Test: ✓ Success

Channel: In-App Dashboard
├─ Enabled: ✓ Yes
└─ Display Duration: 7 days
```

**Step 3: Test Alerts**

```
Admin Panel > Guardian > Test Alert

Alert Policy: High-Risk Alerts
Simulated Amount: $100,000
Simulated Account: 1010 (Bank)
Simulated Risk Score: 75

[Send Test Alert]

✓ Email sent to controller@hotel.com
✓ Slack notification sent
✓ Dashboard alert created
```

### Alert Example Email

```
Subject: [ALERT] High-Risk Transaction Posted

Guardian Alert Notification
Time: 2024-01-15 10:30 AM
Account: 1010 (Bank Account)
Type: HIGH RISK

Transaction Details:
  Entry: JE-001
  Amount: $50,000
  Risk Score: 72/100
  
Detected Anomalies:
  ✓ Large amount (2.5x average): +15 points
  ✓ Off-hours posting (10:30 PM): +10 points
  ✓ High-risk account (Bank): +25 points
  ✓ Rapid succession (3rd in 1 hour): +30 points
  ═════════════════════════════════════════════════
  Total Risk: 72 points

Posted By: sarah.johnson@hotel.com
Posted From: 192.168.1.100

Action Required: Review the transaction
Review Link: https://echoaurum.com/journal-entries/je-001

Questions? Contact: support@echoaurum.com
```

---

## Guardian Status Dashboard

### Main Status View

```
Admin Panel > Guardian > Status

┌─ SYSTEM STATUS ─────────────────────────────────┐
│ Status: HEALTHY                                 │
│ Uptime: 45 days 23 hours                        │
│ Last Check: 1 minute ago                        │
│ All Guardians: OPERATIONAL                      │
└─────────────────────────────────────────────────┘

┌─ GUARDIAN PERFORMANCE ──────────────────────────┐
│ Argus        [████████████] 42ms avg            │
│ Zelda        [████████████] 56ms avg            │
│ Phoenix      [████████████] 87ms avg            │
│ Odin         [████████████] 28ms avg            │
│ Total        [████████████] 213ms avg           │
│                                                 │
│ Throughput: 3.2 transactions/sec                │
│ Peak: 12.5 transactions/sec (today)             │
└─────────────────────────────────────────────────┘

┌─ TRANSACTION STATISTICS (24h) ──────────────────┐
│ Total Posted: 1,247                            │
│ Passed (No Issues): 1,158 (92.9%)              │
│ Warnings: 87 (7.0%)                            │
│ Blocked: 2 (0.1%)                              │
│                                                 │
│ Risk Score Distribution:                        │
│  0-30 (Low):      1,158 (92.9%)                │
│  31-60 (Medium):   87 (7.0%)                   │
│  61-80 (High):     2 (0.1%)                    │
│  81-100 (Critical): 0 (0%)                     │
└─────────────────────────────────────────────────┘

┌─ CACHE PERFORMANCE ─────────────────────────────┐
│ Cache Entries: 287                              │
│ Cache Hits: 14,562 (78.4%)                     │
│ Cache Misses: 4,021 (21.6%)                    │
│ Hit Rate Trend: ↑ Improving                    │
│ Memory Usage: 87 MB / 512 MB allocated          │
└─────────────────────────────────────────────────┘

┌─ ALERTS (Last 24h) ─────────────────────────────┐
│ High-Risk Transactions: 2                       │
│ Large Amounts Detected: 4                       │
│ Off-Hours Postings: 12                          │
│ Duplicate Attempts: 0                           │
│ Total Alerts Sent: 18                           │
└─────────────────────────────────────────────────┘

┌─ AUDIT TRAIL ───────────────────────────────────┐
│ Records Created (24h): 1,247                    │
│ Chain Integrity: ✓ VERIFIED                     │
│ Broken Links: 0                                 │
│ Tampered Records: 0                             │
│ Last Verification: 2 hours ago                  │
└─────────────────────────────────────────────────┘
```

### Real-Time Monitoring

```
Admin Panel > Guardian > Real-Time Monitor

[Refresh: Off ▼] [1s] [5s] [10s] [30s] [1m]

Live Feed:
10:30:15 ✓ JE-001  $50,000  Bank      Risk: 72  POSTED (warned)
10:29:48 ✓ JE-002   $3,000  Revenue   Risk: 5   POSTED
10:29:33 ✓ INV-001  $5,000  Vendor    Risk: 12  MATCHED
10:29:12 ✓ JE-003   $8,000  Expense   Risk: 18  POSTED
10:28:45 ✗ JE-004  $10,000  Unknown   Risk: 85  BLOCKED
10:28:20 ✓ JE-005   $2,500  Revenue   Risk: 3   POSTED

[Pause] [Export CSV] [Clear]
```

---

## Troubleshooting

### Issue: Transactions Being Blocked Incorrectly

**Symptom:** Legitimate transactions are blocked

**Diagnosis:**
```
Admin Panel > Guardian > Troubleshooting > Blocked Transactions

Recent Blocks:
  JE-001: Risk 72 (Large Amount + High-Risk Account)
  JE-002: Risk 88 (Unknown Vendor + Rapid Succession)
  INV-001: Risk 82 (Unknown Vendor + Off-Hours)
```

**Solution Options:**

Option 1: Add to exception list
```
Admin Panel > GL Accounts > [Account] > Exceptions
Add vendor to approved list
Add account to "low-alert" list
```

Option 2: Adjust Phoenix thresholds
```
Admin Panel > Settings > Guardian > Phoenix
Large Amount Threshold: 2.0 → 2.5
Unknown Vendor Score: 20 → 15
Global Risk: 60 → 70
```

Option 3: Disable Guardian for specific account
```
Admin Panel > GL Accounts > [Account] > Guardian Settings
☐ Enable Argus checks
☐ Enable Phoenix checks
(Keep Zelda & Odin enabled for safety)
```

### Issue: Too Many False Positive Warnings

**Symptom:** Legitimate transactions trigger warnings

**Diagnosis:**
```
Admin Panel > Guardian > Diagnostics > False Positives

Top False Positive Triggers:
  1. Large amounts (50% of warnings)
  2. Unknown vendors (30% of warnings)
  3. Off-hours posting (15% of warnings)
  4. Round numbers (5% of warnings)
```

**Solution:**

Tune thresholds based on your business:
```
For restaurants (high transaction volume):
  Large Amount Threshold: 2.0 → 3.0
  Unknown Vendor Score: 20 → 10
  Off-Hours Score: 10 → 5

For hotels (moderate transactions):
  Keep default settings
  
For corporate (tight controls):
  Large Amount Threshold: 2.0 → 1.5
  Unknown Vendor Score: 20 → 30
  Global Risk Threshold: 60 → 50
```

### Issue: Guardian Performance Slow

**Symptom:** Transactions take > 500ms to check

**Diagnosis:**
```
Admin Panel > Guardian > Performance > Latency Analysis

Argus Latency: 45ms (normal)
Zelda Latency: 52ms (normal)
Phoenix Latency: 450ms (HIGH!)
Odin Latency: 28ms (normal)
Total: 575ms (above 500ms SLA)

Phoenix Slow Queries:
  - getTransactionHistory() taking 400ms
  - Reason: No indexes on journal_entries
```

**Solution:**

Option 1: Run performance indexes migration
```bash
$ psql -U postgres -d echoaurum -f \
  server/migrations/add_guardian_performance_indexes.sql

Indexes created:
  ✓ idx_journal_entries_amount_date
  ✓ idx_ap_invoices_amount_date
  ✓ idx_guardian_audit_entity_date
```

Option 2: Adjust caching TTL
```
Admin Panel > Settings > Guardian > Caching
Cache TTL: 5 minutes → 15 minutes
(Reduces database queries)
```

Option 3: Disable historical analysis
```
Admin Panel > Guardian > Phoenix Settings
Analyze 90 days history → Analyze 30 days history
(Smaller dataset = faster queries)
```

---

## Best Practices

### 1. Regular Review of Guardian Alerts

**Weekly:**
- Review high-risk account activity
- Check for anomaly patterns
- Verify alerts are reaching correct people

**Monthly:**
- Generate audit report
- Verify chain integrity
- Review and update risk thresholds

**Quarterly:**
- Audit Guardian configuration
- Review false positive/negative rates
- Tune thresholds based on patterns

### 2. Guardian Account Stratification

**HIGH-RISK Accounts:**
```
1010 - Bank Account         (Monitor: Daily)
1012 - Petty Cash           (Monitor: Daily)
2400 - Bank Transfers       (Monitor: Daily)
9999 - Off-Book Accounts    (Monitor: Block all)
```

**MEDIUM-RISK Accounts:**
```
6000 - Payroll Expense      (Monitor: Weekly)
5000 - Cost of Sales        (Monitor: Weekly)
```

**LOW-RISK Accounts:**
```
4000 - Room Revenue         (Monitor: Monthly)
4010 - Ancillary Revenue    (Monitor: Monthly)
```

### 3. Periodic Guardian Testing

**Monthly Test Plan:**
```
Test 1: False Negative (Fraud Detection)
  ├─ Create fake large transaction
  ├─ Verify Guardian blocks it
  ├─ Delete test data
  └─ Document result

Test 2: Hash Chain Verification
  ├─ Run chain integrity check
  ├─ Verify no broken links
  ├─ Document verification
  └─ Alert if any issues

Test 3: Alert System
  ├─ Trigger test alert
  ├─ Verify email delivery
  ├─ Verify Slack notification
  └─ Document delivery time
```

### 4. Compliance Best Practices

**Audit Trail:**
- [ ] Export monthly audit reports
- [ ] Store in compliant location
- [ ] Verify hash chain annually
- [ ] Keep 7-year retention

**Documentation:**
- [ ] Document all Guardian configuration changes
- [ ] Keep change log with dates/reasons
- [ ] Document tuning decisions
- [ ] Train staff on Guardian operation

**Monitoring:**
- [ ] Daily status check
- [ ] Weekly high-risk account review
- [ ] Monthly performance analysis
- [ ] Quarterly audit with external auditor

---

## Advanced Configuration

### Custom Fraud Detection Rules

For specific fraud scenarios, create custom rules:

```
Admin Panel > Guardian > Custom Rules

Rule Name: "High-Value Weekend Posting"
Condition: Amount > $50,000 AND Day = Saturday/Sunday
Action: BLOCK (require supervisor approval)
Alert Recipients: CFO@hotel.com

Rule Name: "Unknown Vendor High Amount"
Condition: Vendor NOT in master AND Amount > $10,000
Action: WARN (allow posting with warning)
Alert Recipients: controller@hotel.com
```

### Scheduled Audits

Set up automated weekly audits:

```
Admin Panel > Guardian > Scheduled Audits

Audit 1: Daily Risk Report
  ├─ Schedule: 9 AM every weekday
  ├─ Report: Risk summary for previous day
  ├─ Send To: controller@hotel.com
  └─ Retention: 2 years

Audit 2: Weekly Chain Verification
  ├─ Schedule: Sunday 2 AM
  ├─ Verification: Full hash chain check
  ├─ Send To: audit-team@hotel.com
  └─ Retention: 7 years

Audit 3: Monthly Compliance Report
  ├─ Schedule: 1st of each month
  ├─ Report: Full audit for regulatory compliance
  ├─ Send To: external-auditor@firm.com
  └─ Retention: 10 years
```

---

## Support & Training

- **Documentation:** https://echoaurum.com/docs/guardian
- **Training:** guardian-admin-course@echoaurum.com
- **Support:** guardian-support@echoaurum.com
- **Status:** https://status.echoaurum.com
