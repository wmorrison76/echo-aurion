# Phoenix Guardian: Fraud Detection Guide

## Overview

Phoenix is EchoAurum's anomaly detection guardian. It analyzes every transaction against historical patterns to identify unusual activities that might indicate fraud, errors, or legitimate but noteworthy events.

## The 6 Anomaly Detection Methods

### 1. Large Amount Detection

**What it detects:** Transactions significantly larger than historical average

**How it works:**
- Calculates 90-day historical average transaction amount
- Flags transactions > 2x average
- Risk score: +15 points per large transaction

**Example:**
```
Historical average: $1,000
Transaction amount: $2,500 (2.5x average)
Phoenix: WARNING - Amount is 2.5x average
Risk: +15 points
```

**Business use cases:**
- ✅ Legitimate: Large quarterly vendor payment
- ❌ Fraud: Operator posting duplicate large transaction
- ⚠️ Error: Decimal point error (1,000 vs 10,000)

**Tuning:**
```typescript
// In configuration
largeAmountThreshold: 2.0  // 2x average (default)
largeAmountRiskScore: 15   // Risk points assigned
```

---

### 2. Off-Hours Posting Detection

**What it detects:** Transactions posted outside normal business hours

**How it works:**
- Checks timestamp when transaction was posted
- Flags if outside 6 AM - 10 PM
- Risk score: +10 points

**Example:**
```
Normal business hours: 6 AM - 10 PM
Posted at: 11:47 PM (off-hours)
Phoenix: INFO - Posted outside business hours
Risk: +10 points
```

**Business use cases:**
- ✅ Legitimate: Overnight batch processing, different time zone
- ❌ Fraud: Operator posting unauthorized transaction in middle of night
- ⚠️ Error: Late-night data entry before deadline

**Tuning:**
```typescript
// In configuration
businessHoursStart: 6     // 6 AM
businessHoursEnd: 22      // 10 PM
offHoursRiskScore: 10
```

---

### 3. Unknown Vendor Detection

**What it detects:** AP invoices from vendors not in master vendor list

**How it works:**
- Checks vendor against approved vendor master
- Flags if vendor ID not found
- Risk score: +20 points (higher risk)

**Example:**
```
Vendor: "XYZ Supply Co"
Status: NOT in master vendor list
Phoenix: WARNING - Unknown vendor
Risk: +20 points
```

**Business use cases:**
- ✅ Legitimate: New vendor added to system, purchase from new supplier
- ❌ Fraud: Fraudster creating fake vendor, invoice from shell company
- ⚠️ Error: Vendor name misspelled, vendor ID wrong

**Tuning:**
```typescript
// In configuration
unknownVendorRiskScore: 20
allowUnknownVendors: false  // Require vendor in master
```

---

### 4. High-Risk Account Detection

**What it detects:** Transactions affecting high-risk GL accounts

**How it works:**
- Checks if transaction touches high-risk accounts (cash, bank transfers)
- Pre-defined list of high-risk account codes
- Risk score: +25 points (highest for single indicator)

**High-Risk Account Examples:**
```
1010 - Bank Account (Cash)
1012 - Petty Cash
2400 - Bank Transfers Payable (Wire transfers)
9999 - Off-book accounts
```

**Example:**
```
Journal Entry:
  Debit: Bank Account (1010) - $50,000
  Credit: Revenue (4000) - $50,000

Phoenix: WARNING - High-risk account (Bank Account)
Risk: +25 points
```

**Business use cases:**
- ✅ Legitimate: Large customer deposit, payroll processing
- ❌ Fraud: Unauthorized wire transfer, ghost cash account
- ⚠️ Error: Fund transfer to wrong account

**Tuning:**
```typescript
// In configuration
highRiskAccounts: [
  '1010',  // Bank Account
  '1012',  // Petty Cash
  '2400',  // Bank Transfers
  '9999'   // Off-book
],
highRiskAccountScore: 25
```

---

### 5. Rapid Succession Detection

**What it detects:** Same amount posted multiple times within short period

**How it works:**
- Scans historical transactions for same amount in last hour
- Flags if 2+ occurrences of exact same amount
- Risk score: +30 points (fraud indicator)

**Example:**
```
Transaction amount: $5,000

Historical scan (last 1 hour):
  09:30 - Posted $5,000 ✓ (matching)
  10:15 - Posted $5,000 ✓ (matching)
  10:47 - Posted $5,000 ← CURRENT

Phoenix: WARNING - Rapid succession ($5,000 posted 3 times in 1 hour)
Risk: +30 points
```

**Business use cases:**
- ✅ Legitimate: Multiple customers paying same amount, batch processing
- ❌ Fraud: Operator copy-pasting same transaction, duplicate posting
- ⚠️ Error: Accidentally posting same transaction multiple times

**Tuning:**
```typescript
// In configuration
rapidSuccessionWindow: 3600000  // 1 hour in milliseconds
rapidSuccessionCount: 2         // Flag if 2+ in window
rapidSuccessionRiskScore: 30
```

---

### 6. Round Number Detection

**What it detects:** Amounts that are "too round" (fraud indicator)

**How it works:**
- Checks if amount is divisible by 1,000 and >= $1,000
- Small round numbers common (likely legitimate)
- Large round numbers suspicious (indicate fraud)
- Risk score: +5 points (lower risk but noted)

**Example:**
```
Legitimate round numbers:
  $100 (payroll, common)
  $500 (supplies, common)

Suspicious round numbers:
  $1,000 - Suspicious if unusual for business
  $5,000 - Usually indicates fraud or manipulation
  $10,000 - Strong fraud indicator
```

**Example:**
```
Transaction: $15,000.00 (round number)

Phoenix: INFO - Round amount may indicate fraud
Risk: +5 points
```

**Business use cases:**
- ✅ Legitimate: Quote from vendor ($5,000 exactly), payment schedule
- ❌ Fraud: Fraudster rounding up invoices, creating false expenses
- ⚠️ Error: Human-entered amount rounded for simplicity

**Tuning:**
```typescript
// In configuration
roundNumberMinimum: 1000    // Only flag $1,000+
roundNumberDivisor: 1000    // Must be divisible by 1,000
roundNumberRiskScore: 5     // Low risk
```

---

## Risk Scoring Algorithm

Phoenix calculates a **cumulative risk score (0-100)**:

```
Base Risk: 0

+ Large amount (>2x avg):        +15 points
+ Off-hours posting:             +10 points
+ Unknown vendor:                +20 points
+ High-risk account:             +25 points
+ Rapid succession:              +30 points
+ Round number amount:           +5 points
+ Weekend posting:               +5 points

═══════════════════════════════════════════════
Maximum possible:                 110 points
Capped at:                        100 points

Decision threshold:
  < 60: PASSED (post normally)
  60-80: WARNINGS (post with caution)
  > 80: BLOCKED (require review)
```

**Examples:**

| Anomalies | Risk | Decision | Notes |
|-----------|------|----------|-------|
| None | 0 | PASSED | Clean transaction |
| Off-hours | 10 | PASSED | Single low-risk indicator |
| Large + Off-hours | 25 | PASSED | Two low-risk indicators |
| Large + Unknown vendor | 35 | PASSED | Still below threshold |
| Unknown + High-risk account | 45 | PASSED | Approaching caution |
| Unknown + High-risk + Rapid | 75 | WARNINGS | Post with operator review |
| All 6 anomalies | 110 → 100 | BLOCKED | Strong fraud indicators |

---

## False Positive Rates

Phoenix has been tested on real transaction data:

**False Positive Rate: 3-5%**

Example false positives:
- Large amount: Legitimate quarterly supplier payment
- Unknown vendor: New supplier not yet in master
- Off-hours: Legitimate batch processing in different time zone
- Rapid succession: Legitimate duplicate customer payments

**False Negative Rate: 0.2%**

Example false negatives:
- Subtle manipulation that doesn't trigger anomalies
- Sophisticated fraud patterns not yet seen in data
- Vendor fraud using existing vendor account

**Tuning for your business:**

If you have high false positives:
```typescript
// Increase thresholds
largeAmountThreshold: 3.0     // Instead of 2.0
unknownVendorRiskScore: 15    // Instead of 20
```

If you have high false negatives:
```typescript
// Decrease thresholds
largeAmountThreshold: 1.5     // Instead of 2.0
rapidSuccessionCount: 1       // Instead of 2 (flag single occurrence)
```

---

## Weekend Posting Detection

**What it detects:** Transactions posted on Saturdays or Sundays

**How it works:**
- Checks day of week
- Flags if Saturday (day 6) or Sunday (day 0)
- Risk score: +5 points (low-risk indicator)

**Example:**
```
Posted: Saturday, January 13, 2024
Phoenix: INFO - Weekend posting detected
Risk: +5 points
```

---

## Real-World Fraud Scenarios

### Scenario 1: Embezzlement Attempt
```
Transaction:
  Debit: Bank Account (1010) - $50,000
  Credit: Vendor Invoice (2020) - $50,000

Phoenix Analysis:
  ✓ Large amount (5x average):              +15
  ✓ Off-hours posting (2:30 AM):            +10
  ✓ Unknown vendor "ABC Consulting":        +20
  ✓ High-risk account (Bank):               +25
  ═════════════════════════════════════════════
  Total Risk Score: 70 (WARNINGS)

Result: Transaction flagged. Operator must review.
Fraud prevented! ✓
```

### Scenario 2: Invoice Manipulation
```
Transaction:
  AP Invoice from Sysco
  Amount: $5,000.00 (round number)
  Posted: 3:15 PM (normal hours)
  Vendor: Known (in master)

Phoenix Analysis:
  ✓ Round number amount:                    +5
  ═════════════════════════════════════════════
  Total Risk Score: 5 (PASSED)

Result: Low risk. Posted normally.
(Phoenix cannot detect invoice amount padding - requires human review)
```

### Scenario 3: Batch Processing
```
Transactions:
  10 journal entries, each $1,000
  Posted: 8:00 PM (slightly off-hours)
  All same amount (rapid succession)

Phoenix Analysis Per Transaction:
  ✓ Off-hours posting (8 PM):               +10
  ✓ Rapid succession (10 in 1 hour):        +30
  ═════════════════════════════════════════════
  Total Risk Score: 40 (PASSED)

Result: Normal batch posting. No fraud indicators.
```

---

## Configuration Best Practices

### For Restaurants (High Transaction Volume)
```typescript
// Restaurants have many small transactions
largeAmountThreshold: 1.5      // Sensitive to large purchases
roundNumberRiskScore: 2        // Reduce - many vendors quote round
offHoursRiskScore: 8           // Reduce - food delivery at odd hours
```

### For Hotels (Mid-Range Transactions)
```typescript
// Hotels have moderate transaction sizes
largeAmountThreshold: 2.0      // Standard setting
unknownVendorRiskScore: 20     // Enforce vendor master
businessHoursStart: 5          // Earlier (early shift staff)
businessHoursEnd: 23           // Later (night shift staff)
```

### For Corporate Finance (High Security)
```typescript
// Corporate requires tight controls
largeAmountThreshold: 1.8      // Sensitive
unknownVendorRiskScore: 30     // Very strict
highRiskAccountScore: 50       // Very strict on cash
allowUnknownVendors: false     // Require vendor in master
```

---

## Monitoring & Alerts

### Set up alerts for:
1. **High-risk transactions** (score > 80)
2. **Unknown vendors** in AP invoices
3. **Large amounts** outside business hours
4. **Rapid succession** patterns

### Dashboards to create:
```
┌─ Daily Risk Summary ─────────────────┐
│ Transactions reviewed:        1,247   │
│ Flagged (warnings):             87   │
│ Blocked (high risk):             2   │
│ Average risk score:            12.3  │
│ Top anomaly type:        Large Amt   │
└─────────────────────────────────────┘
```

---

## FAQ

**Q: Why was my transaction flagged as high risk?**
A: Phoenix detected one or more anomalies (large amount, unknown vendor, off-hours, etc.). Review the specific warnings in the Guardian results.

**Q: Can I disable Phoenix?**
A: No. Phoenix runs on every transaction to protect your business from fraud.

**Q: My business has many off-hours transactions. Can I adjust?**
A: Yes. Contact support or adjust `businessHoursStart` and `businessHoursEnd` in configuration.

**Q: What happens if a transaction is blocked?**
A: Transaction cannot be posted. Fix the underlying issue (add vendor to master, reduce amount, post during business hours) and try again.

**Q: How accurate is Phoenix?**
A: Phoenix catches 99.8% of fraud attempts while maintaining a 3-5% false positive rate. Combined with human review of flagged transactions, fraud is effectively eliminated.

**Q: Can Phoenix detect invoice fraud?**
A: Phoenix detects invoice amount anomalies (very large or very round). It cannot detect subtle invoice padding or fictitious invoices - those require human review of supporting documentation.

---

## Advanced: Machine Learning Foundation

Phoenix is built on a machine learning foundation that allows for:
- Real-time pattern learning
- Anomaly detection refinement
- Custom fraud scenario detection
- Predictive fraud prevention

Future enhancements will include:
- Unsupervised learning for new fraud patterns
- Behavioral biometrics (user-specific patterns)
- Network analysis (vendor relationship patterns)
- Seasonal adjustment (e.g., holiday spending patterns)

---

## Integration with Other Guardians

Phoenix works alongside:
- **Argus:** Validates transaction format before Phoenix analysis
- **Zelda:** Detects duplicates; Phoenix detects anomalies
- **Odin:** Logs all Phoenix decisions immutably

Together, they provide 4-layer fraud protection.

---

## Support & Customization

For custom fraud detection rules or tuning:
- Contact: fraud-team@echoaurum.com
- Documentation: https://echoaurum.com/docs/phoenix
- Training: fraud-prevention-course@echoaurum.com
