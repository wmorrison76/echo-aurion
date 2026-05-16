# EchoAurum Phase 2: Rule Engine & AI Learning Guide

## Overview

The Rule Engine is EchoAurum's automation powerhouse, allowing controllers and accounting teams to automate repetitive decisions without coding. Combined with AI Learning, the system continuously improves by learning from operator preferences.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Creating Rules](#creating-rules)
3. [Rule Templates](#rule-templates)
4. [AI Learning & Suggestions](#ai-learning)
5. [Forensic Audit Trail](#forensic-audit-trail)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing Rule Management

1. Navigate to **Automation → Rule Engine** in the main menu
2. You'll see three tabs:
   - **Active Rules**: Rules currently monitoring transactions
   - **Templates**: Pre-built rules for common scenarios
   - **AI Suggestions**: Rules Echo AI³ learned from your patterns

### Key Concepts

**Rule**: A set of conditions + actions that automatically trigger when a transaction matches
**Condition**: A requirement that must be met (e.g., "amount > $5,000")
**Action**: What happens when all conditions match (e.g., "auto-post to account")
**Approval Required**: Whether the rule needs manual approval before executing

---

## Creating Rules

### Step 1: Define Rule Basics

1. Click **New Rule** button
2. Enter:
   - **Name**: Clear, descriptive name (e.g., "Auto-Post Toast Sales >$1000")
   - **Description**: What does this rule do and why?
   - **Rule Type**: Choose from:
     - `auto_post` - Automatically post to GL
     - `auto_approve` - Automatically approve invoice
     - `alert` - Send notification
     - `escalate` - Route to higher approval

### Step 2: Add Conditions

Conditions define when the rule triggers. All conditions must match (AND logic).

**Example Conditions:**
```
- amount > 5000
- type = "invoice"
- vendor_name contains "Sysco"
- description matches "^Toast.*"
- 3_way_matched = true
```

**Available Operators:**
- `equals` - Exact match
- `not_equals` - Not equal to value
- `greater_than` - Larger than value
- `less_than` - Smaller than value
- `contains` - String contains value
- `in_list` - Value in list (comma-separated)
- `matches_regex` - Matches regular expression pattern

### Step 3: Define Actions

Actions are what happens when conditions match.

**Auto-Post Action:**
- Select GL account
- Enter amount formula (optional, default uses transaction amount)
- Add description for GL posting

**Auto-Approve Action:**
- Set approval reason
- Optional: Email notification after approval

**Alert Action:**
- Alert message
- Alert recipients
- Severity level (info, warning, critical)

**Escalate Action:**
- Escalate to role: Manager, Director, CFO
- Include original transaction in escalation

### Step 4: Set Approval Requirement

- **Required**: Rule execution requires manual approval
  - Use for high-value transactions
  - Use when first testing a new rule
- **Not Required**: Rule auto-executes
  - Use for low-risk transactions
  - Use for well-tested rules

### Step 5: Activate Rule

1. Review rule summary
2. Click **Create Rule**
3. Rule is **Active** and **Monitoring** immediately
4. See execution stats in Active Rules tab

---

## Rule Templates

EchoAurum includes 8 system templates for common automation scenarios.

### Template 1: Auto-Post Toast Sales >$1000

**When**: POS revenue from Toast exceeds $1,000
**Action**: Auto-posts to revenue GL account
**Risk Level**: Low (vendor verified, amount capped)

### Template 2: Auto-Approve 3-Way Matched Invoices

**When**: Invoice, PO, receipt amounts match within $0.01
**Action**: Auto-approves and schedules payment
**Risk Level**: Very Low (3-way match is strongest control)

### Template 3: Alert on Low Cash Balance

**When**: Bank account falls below threshold
**Action**: Sends alert to CFO and Treasurer
**Risk Level**: N/A (Alert only)

### Template 4: Alert on High Labor Cost

**When**: Labor cost variance exceeds 10% of budget
**Action**: Alerts Operations and Finance Controller
**Risk Level**: N/A (Alert only)

### Template 5: Auto-Post OPERA Room Revenue

**When**: Room revenue from OPERA PMS arrives
**Action**: Auto-posts with room number cross-reference
**Risk Level**: Low (System-generated, high volume)

### Template 6: Auto-Post Gusto Payroll

**When**: Gusto payroll transmission received
**Action**: Auto-posts to payroll expense GL accounts
**Risk Level**: Very Low (Employer-generated, reconciled)

### Template 7: Escalate High-Value Invoices

**When**: Invoice amount exceeds $50,000
**Action**: Routes to Director for approval (not Manager)
**Risk Level**: Medium (High-value decision)

### Template 8: Alert on Expense Variance

**When**: Expense category variance exceeds 15%
**Action**: Alert Controller with variance details
**Risk Level**: N/A (Alert only)

### Using Templates

1. Go to **Templates** tab
2. Find template matching your need
3. Click **Use This Template**
4. Customize conditions/actions for your entity
5. Review and activate

---

## AI Learning & Suggestions

Echo AI³ learns from your decisions and suggests automation rules automatically.

### How AI Learning Works

1. **Operator Override**: You override an Echo AI recommendation
   ```
   Echo says: "Auto-approve invoice from Sysco"
   You say: "No, wait 2 hours first"
   ```

2. **Pattern Detection**: After 3+ similar decisions, AI detects a pattern
   ```
   Decision #1: Override Sysco invoice → Wait 2 hours
   Decision #2: Override Sysco invoice → Wait 2 hours
   Decision #3: Override Sysco invoice → Wait 2 hours
   Pattern detected: 100% consistency
   ```

3. **Rule Suggestion**: AI creates a rule and suggests it
   ```
   Name: "Defer Sysco Posting 2 Hours"
   Confidence: 100%
   Pattern: 3 identical decisions detected
   Action: Defer posting with 2-hour delay
   ```

4. **Your Decision**: Accept, reject, or modify the suggestion
   - **Accept**: Rule becomes active immediately
   - **Reject**: AI removes from suggestions, tracks feedback
   - **Modify**: Edit conditions/actions, then save

### Viewing AI Suggestions

1. Go to **AI Suggestions** tab
2. See suggested rules ranked by:
   - **Confidence Score** (how consistent your pattern was)
   - **Potential Impact** (how many transactions would match)
   - **Recency** (when pattern was detected)

### Interpreting Confidence Scores

- **90-100%**: Very strong pattern, minimal risk
- **80-90%**: Strong pattern, low risk
- **70-80%**: Moderate pattern, review carefully
- **<70%**: Weak pattern, consider rejecting

---

## Forensic Audit Trail

Every action (human and AI) is logged in an immutable, cryptographically signed audit trail.

### What Gets Logged

**Human Actions:**
- User ID, name, role, IP address
- Transaction data (full copy)
- Decision: approve, reject, override, review
- Reason for decision
- Financial impact

**AI Actions:**
- Echo AI: recommendations, postings, alerts
- Guardian: fraud checks, control violations
- Timestamp and confidence score
- Reasoning (what patterns triggered this action)

**System Actions:**
- Rule execution and results
- Hash chain verification
- Audit trail integrity checks

### Accessing Audit Trail

1. Go to **Audit Trail** in main menu
2. Filter by:
   - Date range
   - User ID
   - Transaction type
   - AI component
3. Click transaction to see full history
4. See hash chain and verification status

### Forensic Report Generation

**For Compliance Teams:**

1. Go to **Reports → Forensic Audit**
2. Select reporting period:
   - Monthly
   - Quarterly
   - Annually
   - Custom range
3. Select transaction types:
   - Journal entries
   - Invoices
   - Payments
   - Reconciliations
4. Generate report
5. Export as PDF or Excel

**Report Contents:**
- Summary of actions by user and AI
- Transaction-by-transaction audit trail
- Integrity verification results
- Regulatory categorization
- Ready for auditor review

### Regulatory Compliance

Forensic audit trail satisfies:
- ✅ **SOX 404**: Complete transaction history
- ✅ **AICPA Standards**: Forensic quality audit trail
- ✅ **CFO Act**: Non-repudiation of all decisions
- ✅ **COSO Framework**: Documented controls and monitoring

---

## Rule Execution & Monitoring

### Rule Statistics

Each rule shows:
- **Times Triggered**: How many transactions matched conditions
- **Times Auto-Executed**: How many auto-completed
- **Times Approved**: How many required approval
- **Success Rate**: % that executed successfully
- **Last Executed**: When rule last matched a transaction

### Pausing Rules

Pause a rule when:
- Testing new rule behavior
- Temporarily disabling during maintenance
- Investigating an issue

**To Pause:**
1. Go to **Active Rules**
2. Find rule
3. Click **Pause** button
4. Enter reason (required)
5. Rule stops monitoring immediately

**To Resume:**
1. Find paused rule
2. Click **Resume** button
3. Rule resumes monitoring

### Deleting Rules

Rules are soft-deleted (kept for audit trail):
1. Go to **Active Rules**
2. Find rule
3. Click **Delete** button
4. Confirm deletion
5. Rule stops monitoring, history preserved

---

## Troubleshooting

### Rule Not Triggering

**Check:**
1. Is rule **Active** (not paused or disabled)?
2. Do transactions actually **match conditions**?
3. Is the condition logic correct?
   - All conditions must match (AND logic)
   - Check operators (not `>` when should be `<`)
   - Check case sensitivity for text matching

**Fix:**
1. Review rule conditions
2. Check recent transactions
3. Temporarily lower thresholds to test
4. Check rule execution log

### Rule Triggering Too Often

**Check:**
1. Are conditions too permissive?
2. Is threshold too low?
3. Are there hidden transaction types matching?

**Fix:**
1. Add additional conditions (more restrictive)
2. Raise amount threshold
3. Review rule execution history
4. Consider approval requirement for safety

### AI Suggestion Low Confidence

**Possible Reasons:**
1. Your decisions have been inconsistent
2. Too few decisions to establish pattern (need 3+)
3. Mix of different decision types

**Action:**
1. Review suggestions carefully
2. Modify conditions based on your intent
3. Test rule with approval required
4. Accept if satisfied with logic

### Audit Trail Verification Failed

**Critical Issue:** Contact support immediately
- Indicates potential tampering or corruption
- All production transactions halted until resolved
- Initiate disaster recovery procedure

---

## Best Practices

### Starting Out

1. **Use Templates**: Start with system templates, customize for your needs
2. **Low Risk First**: Auto-post low-value, high-certainty transactions
3. **Enable Approval**: Require approval until you trust rule behavior
4. **Monitor Closely**: Watch execution statistics daily for first week

### Growing Your Automation

1. **Test with Alerts**: Create alert rule first to see what would match
2. **Gradual Confidence**: Increase confidence scores gradually
3. **Document Reason**: Always include reasoning in rule description
4. **Learn from AI**: Pay attention to AI suggestions, accept good ones
5. **Review Monthly**: Monthly rule health review, pause underperformers

### Advanced Usage

1. **Complex Conditions**: Chain multiple conditions for precise targeting
2. **Regex Patterns**: Use regex for vendor names, account codes
3. **Regulatory Rules**: Group rules by SOX vs COSO for reporting
4. **Rule Versioning**: Keep version history for audit trail

---

## Support

**Questions?** Contact EchoAurum Support
- Email: support@echoaurum.io
- Phone: 1-800-ECHO-101
- In-app chat: **Help → Chat with Support**

**Critical Issues?** Page on-call support
- **Emergency Contact**: Click **Alert On-Call** in app
- Response time: <15 minutes for P1 issues

---

## Appendix: Condition Examples

### Amount Conditions
```
amount > 5000              # Greater than $5,000
amount < 1000              # Less than $1,000
amount != 0                # Not zero
amount in_list [100, 500, 1000]  # In list
```

### Text Conditions
```
vendor_name = "Sysco"      # Exact match
vendor_name contains "Sav"  # Contains
description matches "^Toast" # Regex: starts with Toast
```

### Boolean Conditions
```
is_three_way_matched = true
is_high_value = false
approved = true
```

### Date Conditions
```
created_at > 2024-01-01    # After date
created_at < 2024-12-31    # Before date
```

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Status**: PRODUCTION READY
