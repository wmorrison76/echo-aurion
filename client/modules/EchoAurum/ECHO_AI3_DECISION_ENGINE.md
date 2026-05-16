# ECHO AI³ DECISION ENGINE
## Virtual CFO + Automation Controls (Operator-Configurable 0-100%)

**Scope:** Operator picks and chooses which roles AI performs (GL posting, AP approval, bank recon, cash forecasting, profitability recommendations)  
**Control:** Per-feature, per-account, per-time-window  
**Mode:** Dual (manual recommendations + fully autonomous with human approval option)  
**Impact:** One operator has full CFO team behind them

---

# PART 1: AUTOMATION CONTROL PANEL (SETTINGS)

## User Interface: Settings/Control Panel

### Main Controls Page

```
┌─────────────────────────────────────────────────────────────┐
│ ECHO AI³ AUTOMATION SETTINGS                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [Tabs: GL Operations | AP Operations | Reconciliation |     │
│        Month-End Close | Payments | Cash Forecasting |     │
│        CFO Recommendations]                                  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ GL OPERATIONS                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ☐ Enable GL Entry Auto-Creation     [_____%]              │
│   From Toast POS:         ☐ Yes  ☐ No                      │
│   From OPERA PMS:         ☐ Yes  ☐ No                      │
│   From Gusto Payroll:     ☐ Yes  ☐ No                      │
│   Approval Level:         ⦿ Auto-Post  ○ Recommend Only    │
│                                                              │
│ ☐ Enable GL Account Auto-Update     [_____%]              │
│   Affected Accounts:      [GL 4000, GL 4200, GL 6000...]  │
│   Approval Level:         ⦿ Auto-Update  ○ Recommend Only  │
│                                                              │
│ ☐ Enable Guardian Checks            [_____%]              │
│   ├─ Argus (validation):  ☑ Always On                      │
│   ├─ Zelda (duplicates):  ☑ Always On                      │
│   ├─ Phoenix (fraud):     ☑ Always On (block if >70%)      │
│   └─ Odin (audit trail):  ☑ Always On                      │
│                                                              │
│ ⏱️  Time-Based Automation                                   │
│   Auto GL posting only during: [__06:00__] to [__22:00__] │
│   Outside hours: ○ Queue for morning  ○ Recommend only     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ AP OPERATIONS                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ☐ Enable AP Invoice Auto-Matching   [_____%]              │
│   Match threshold (PO/Receipt):      [___85___]% confidence │
│   Vendor duplicate check:            ☑ Enabled             │
│   Rounding difference allowed:       [___0.01__]            │
│   Approval Level:                    ⦿ Auto-Approve        │
│                                                              │
│ ☐ Enable AP Auto-Approval           [_____%]              │
│   If 3-way match > 90%:              ⦿ Auto-Approve        │
│   Guardian Zelda passes:             ☑ Yes                 │
│   Fraud risk < 30%:                  ☑ Yes                 │
│   Approval level for exceptions:     [CFO] [Controller]    │
│                                                              │
│ ☐ Enable AP Auto-Payment Scheduling [_____%]              │
│   Pay by due date:                   ⦿ Pay 3 days early    │
│   Early payment discount:            ○ Offer 2/10 terms    │
│   Cash reserve minimum:              [$______20,000____]   │
│   Approval Level:                    ⦿ Auto-Schedule       │
│                                                              │
│ ⏱️  Time-Based Automation                                   │
│   Auto-schedule payments only:       [__06:00__] to [__18:00__] │
│   (Avoid after-hours wire issues)                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ RECONCILIATION                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ☐ Enable Bank Auto-Matching         [_____%]              │
│   Match confidence threshold:        [___80___]%            │
│   Auto-post matched items:           ⦿ Auto-Post  ○ Review │
│   Unmatched investigation:           [Flagged accounts]    │
│                                                              │
│ ☐ Enable GL Auto-Reconciliation     [_____%]              │
│   Variance tolerance:                [$___0.01__]           │
│   Round to nearest:                  ⦿ $0.01  ○ $1.00     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ MONTH-END CLOSE                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ☐ Enable Auto-Accruals               [_____%]              │
│   Utilities accrual:                 ☑ Enable  [___$___]   │
│   Rent accrual:                      ☑ Enable  [___$___]   │
│   Insurance accrual:                 ☑ Enable  [___$___]   │
│                                                              │
│ ☐ Enable Depreciation Auto-Post      [_____%]              │
│   Calculate automatically:           ☑ Yes                 │
│   Post automatically:                ⦿ Auto-Post ○ Review  │
│                                                              │
│ ☐ Enable Consolidation Auto-Run      [_____%]              │
│   Multi-entity roll-up:              ☑ Automatic           │
│   Intercompany elimination:          ☑ Automatic           │
│                                                              │
│ ☐ Enable Full Close Automation       [_____%]              │
│   Auto-run entire close process:     ⦿ Full Auto  ○ Steps  │
│   Final approval required:           ☑ Human approval      │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ CASH FORECASTING & CFO RECOMMENDATIONS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ☐ Enable Active Cash Flow Monitor    [_____%]              │
│   Forecast days ahead:               [___30___] days        │
│   Minimum cash threshold:            [$____20,000____]     │
│   Alert if cash < minimum:           ☑ Email alert         │
│                                                              │
│ ☐ Enable Profitability Recommendations [_____%]            │
│   ├─ Cost optimization:              ☑ Enable              │
│   ├─ Pricing recommendations:        ☑ Enable              │
│   ├─ Labor cost optimization:        ☑ Enable              │
│   ├─ Vendor negotiation:             ☑ Enable              │
│   └─ Cash management decisions:      ☑ Enable              │
│                                                              │
│ ☐ Enable Food Decision Integration   [_____%]              │
│   (Integrates with EchoRecipePro food module)              │
│   Menu pricing suggestions:          ☑ Enable              │
│   Ingredient cost variance alerts:   ☑ Enable              │
│   Recipe profitability analysis:     ☑ Enable              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ APPROVAL WORKFLOW SETTINGS                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Default Approval Level:                                     │
│   ⦿ Full Autonomy (AI decides, audit trail only)          │
│   ○ Recommended Approval (AI recommends, human approves)   │
│   ○ Manual Only (AI suggests, human decides everything)    │
│                                                              │
│ Exception Handling (when AI can't decide):                  │
│   Escalate to: [CFO] [Controller] [Owner]                 │
│   Notification: [Email] [Dashboard Alert] [SMS]            │
│   Auto-escalate after: [__24__] hours                      │
│                                                              │
│ Audit Trail Settings:                                       │
│   ☑ Log all AI decisions                                   │
│   ☑ Log all recommendations (even not taken)               │
│   ☑ Log operator overrides                                 │
│   ☑ Immutable log (Odin Guardian)                          │
│                                                              │
│ [Save Settings] [Reset to Defaults] [Load Preset Profile]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Per-Account Automation Override

```
ACCOUNT-LEVEL OVERRIDES
┌─────────────────────────────────────────────────────────────┐
│ Override Automation Per GL Account                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ GL 4000 (Room Revenue)                                      │
│   ☐ Enable Auto GL Posting      [100%]   [Override Global] │
│   Echo AI³ posts all revenue:    ☑ Auto-Post               │
│   Approval:                      ⦿ Auto   ○ Recommend       │
│                                                              │
│ GL 4200 (F&B Revenue)                                       │
│   ☐ Enable Auto GL Posting      [100%]   [Override Global] │
│   Echo AI³ posts all revenue:    ☑ Auto-Post               │
│   Approval:                      ⦿ Auto   ○ Recommend       │
│                                                              │
│ GL 6000 (Payroll Expense)                                   │
│   ☐ Enable Auto GL Posting      [50%]    [Override Global] │
│   Echo AI³ posts suggested entries:       ☑ Recommend Only  │
│   Approval:                      ○ Auto   ⦿ Recommend       │
│   Reason: Payroll sensitive, needs review                  │
│                                                              │
│ GL 1010 (Bank Account)                                      │
│   ☐ Enable Auto GL Posting      [0%]     [Override Global] │
│   Echo AI³ never auto-posts:     ☑ Manual Only             │
│   Approval:                      ○ Auto   ○ Recommend       │
│   Reason: Cash is critical, always review                  │
│                                                              │
│ [Add Account Override] [Reset All to Global]               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Time-Based Automation Windows

```
TIME-BASED AUTOMATION SCHEDULE
┌─────────────────────────────────────────────────────────────┐
│ Configure When Automation Runs                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ FEATURE: GL Entry Auto-Posting                              │
│                                                              │
│ Operating Hours:          [Monday - Friday, 6 AM - 10 PM]  │
│ ├─ Weekday Morning:       ☑ 6:00 AM - 12:00 PM (Full)     │
│ ├─ Weekday Afternoon:     ☑ 12:00 PM - 6:00 PM (Full)     │
│ ├─ Weekday Evening:       ☐ 6:00 PM - 10:00 PM (Reduced)  │
│ ├─ Weekend (Sat/Sun):     ☐ Disabled (Queue for Monday)   │
│ └─ After Hours:           ☑ Queue & Post Monday 6 AM      │
│                                                              │
│ Holiday Calendar:         [Select holidays...]             │
│ Special Windows:          [Add custom time window]          │
│                                                              │
│ FEATURE: AP Auto-Approval                                   │
│                                                              │
│ Payment Processing:       [Monday - Friday, 6 AM - 5 PM]   │
│ ├─ Auto-approve invoices: [6 AM - 5 PM only]              │
│ ├─ Schedule payments:     [6 AM - 3 PM only] (before EOD)  │
│ └─ After hours:           ☑ Queue for next business day   │
│                                                              │
│ FEATURE: Bank Reconciliation                                │
│                                                              │
│ Bank statement downloads: [Every day at 11:00 PM]          │
│ ├─ Auto-match:           [11 PM - 6 AM] (overnight)       │
│ ├─ Post results:         [6 AM, ready for review]         │
│ └─ Operator approval:     [6 AM - 5 PM]                    │
│                                                              │
│ FEATURE: Month-End Close                                    │
│                                                              │
│ Auto-run close:          [Last business day, 5 PM]        │
│ ├─ Start process:        [5 PM - 7 PM]                    │
│ ├─ Completion:           [~6:30 PM] (90 min)              │
│ └─ Ready for review:     [Next morning, 6 AM]             │
│                                                              │
│ [Save Schedule] [View Execution History]                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# PART 2: ECHO AI³ DECISION ENGINE

## How Echo AI³ Makes Recommendations

### Decision Framework

```
ECHO AI³ DECISION MAKING PROCESS
═════════════════════════════════════════════════════════════════

INPUT: Transaction / Event
  ├─ GL entry to post?
  ├─ AP invoice to approve?
  ├─ Bank transaction to match?
  ├─ Cash position concerning?
  └─ Profitability issue?

ANALYSIS LAYER
  ├─ Guardian Checks
  │  ├─ Argus: Is this transaction valid? (rules check)
  │  ├─ Zelda: Is this a duplicate? (anomaly check)
  │  ├─ Phoenix: Is this fraud? (risk scoring)
  │  └─ Odin: Log immutably
  │
  ├─ Historical Context
  │  ├─ Similar transactions? (precedent)
  │  ├─ Vendor history? (trusted or risky?)
  │  ├─ GL account patterns? (normal amount?)
  │  └─ Time patterns? (business hours or odd?)
  │
  ├─ Financial Impact
  │  ├─ Effect on cash position?
  │  ├─ Effect on profitability?
  │  ├─ Effect on GL balances?
  │  └─ Multi-entity impact?
  │
  ├─ Business Rules
  │  ├─ Vendor payment terms?
  │  ├─ Approval limits? (> $X needs approval?)
  │  ├─ Account restrictions? (some accounts need review?)
  │  └─ Time restrictions? (off-hours posting?)
  │
  └─ Predictive Models
     ├─ If I approve: What happens next? (cash impact in 7, 14, 30 days)
     ├─ If I delay: What are consequences? (late fees, vendor relationship)
     ├─ Alternative actions? (negotiate, defer, escalate)
     └─ Recommendation confidence? (95%, 70%, 50%?)

RECOMMENDATION OUTPUT
  ├─ Decision: APPROVE / REJECT / ESCALATE / INVESTIGATE
  ├─ Confidence: 0-100%
  ├─ Reasoning: Why this recommendation?
  ├─ Alternative Actions: What else could you do?
  ├─ Financial Impact: What's the cost of this decision?
  ├─ Risk Level: How risky is this transaction?
  └─ Approval Mode:
     ├─ Auto: Execute (if automation enabled)
     └─ Recommend: Show to operator, ask to approve
```

### Real-World Examples

#### Example 1: GL Entry Recommendation

```
EVENT: Toast POS sales $15,000 (Friday 8:47 PM)

ANALYSIS:
  ├─ Guardian: ✅ Passed all checks
  │  ├─ Argus: Valid GL codes ✅
  │  ├─ Zelda: Not a duplicate ✅
  │  ├─ Phoenix: Normal amount for Friday evening (no fraud risk) ✅
  │  └─ Odin: Logged immutably ✅
  │
  ├─ Historical Context: Friday evening sales average $14,200
  │  └─ This $15,000 is +5.6% vs. average (normal variation)
  │
  ├─ Financial Impact:
  │  ├─ Increases GL 4200 (F&B Revenue) $15,000
  │  ├─ Increases GL 1010 (Bank) $15,000
  │  ├─ Improves daily cash position
  │  └─ Improves weekly profit forecast
  │
  └─ Automation Setting: GL Entry Auto-Create = 100%
     └─ Approval Mode: Auto-Post (no human needed)

RECOMMENDATION:
  ✅ APPROVE & POST IMMEDIATELY
  
  Reasoning:
    • Transaction passed all Guardian checks
    • Amount is within normal Friday evening range
    • Revenue posting is non-risky
    • System setting allows 100% automation
  
  Confidence: 99%
  
  Action:
    ⦿ Auto-Post (because automation = 100%)
    ○ Recommend Only (if automation < 100%)
  
  Financial Impact: +$15,000 cash, improves profit margin by +0.8%
  
  Time to Decision: 0.2 seconds (AI)
  Time to Execute: 0.5 seconds (GL posting)
  Human Review: None needed (but audit trail available)
```

#### Example 2: AP Approval with Recommendation

```
EVENT: Invoice from Vendor "Sysco Coastal" - $3,500 (food supplies)

ANALYSIS:
  ├─ Guardian: ✅ Passed (no duplicates, no fraud risk)
  │
  ├─ Historical Context:
  │  ├─ Sysco Coastal: Been vendor for 2 years (trusted)
  │  ├─ Invoice frequency: Every 2 weeks, consistent
  │  ├─ Amount: Normally $3,200-$3,600 range (this is $3,500 ✅)
  │  ├─ Payment history: Always paid on time
  │  └─ Payment terms: Net 30
  │
  ├─ 3-Way Match Status:
  │  ├─ PO matching: ✅ Found PO-2024-0891 ($3,500)
  │  ├─ Receipt matching: ✅ Delivery confirmed 2024-01-15
  │  └─ 3-way match confidence: 98% ✅
  │
  ├─ Financial Impact:
  │  ├─ Increases AP liability $3,500
  │  ├─ GL 5000 (Food COGS) increased by prior entry
  │  ├─ Due date: February 14 (30 days out)
  │  └─ Cash impact: -$3,500 on Feb 14
  │
  ├─ Cash Forecast:
  │  ├─ Current cash: $45,000
  │  ├─ Forecasted cash Feb 14: $38,500 (still above $20K minimum)
  │  ├─ Cash position: Healthy ✅
  │  └─ No liquidity concerns
  │
  └─ Automation Setting: AP Auto-Approval = 85%
     └─ Approval Mode: Recommend (operator reviews final approval)

RECOMMENDATION:
  ✅ APPROVE & APPROVE FOR PAYMENT
  
  Reasoning:
    • 3-way match = 98% (excellent)
    • Vendor is trusted (2-year history, on-time payments)
    • Amount is within normal range
    • Cash position is healthy
    • No Guardian warnings
  
  Confidence: 96%
  
  Alternative Actions:
    1. Approve immediately (RECOMMENDED)
    2. Schedule payment early (save 2% via 2/10 terms = $70)
       → Pay by Feb 3 instead of Feb 14
       → Cash impact: -$3,500 sooner
       → Savings: $70
       → Recommendation: DO THIS if cash permits
  
  Action Needed:
    ○ Auto-Approve (if automation = 100%)
    ⦿ Recommend to Operator (if automation < 100%)
    
  Operator Decision:
    [✅ Approve] [💰 Approve with 2/10 Discount] [❓ Need More Info] [❌ Reject]
```

#### Example 3: Cash Flow Warning

```
EVENT: Daily Cash Position Monitoring

ANALYSIS (Running continuously):
  ├─ Current Cash: $45,000
  ├─ Minimum Threshold: $20,000
  ├─ Days to Review: 30-day forecast
  │
  ├─ Outflows Forecasted:
  │  ├─ AP payments due in 7 days: $25,000
  │  ├─ Payroll due in 5 days: $35,000
  │  ├─ Utilities due in 3 days: $2,500
  │  └─ Total outflows (30 days): $87,500
  │
  ├─ Inflows Forecasted:
  │  ├─ Daily revenue (average): $15,000 × 30 = $450,000 (gross)
  │  ├─ Less: Payments for payroll, supplies = $87,500 net
  │  └─ Net positive: $362,500 (healthy!)
  │
  └─ Forecast Summary:
     Day 3:   $40,000 (after utilities)
     Day 5:   $5,000 ⚠️ LOW (after payroll)
     Day 7:   -$20,000 ❌ CRITICAL (after AP) → Need to adjust!

ALERT TRIGGERED: 🚨 CRITICAL CASH POSITION IN 7 DAYS

Echo AI³ Recommendations:
  
  1. ACCELERATE COLLECTIONS:
     → Review AR aging
     → Can you collect from customers faster?
     → Current AR: $25,000 (normally 5-day collection)
     → If collected in 2 days: +$12,500 cash
  
  2. DELAY PAYMENTS:
     → Can you pay AP vendors on Day 10 instead of Day 7?
     → Delay $25,000 AP payment 3 days: Saves -$25,000 outflow
     → Cost: Potentially lose early payment discounts
     → Recommendation: Negotiate with Sysco (offer to pay by Day 35)
  
  3. GET LINE OF CREDIT:
     → Apply for $50K line of credit (just in case)
     → Cost: ~$500/year
     → Benefit: Safety net if sales dip
  
  4. REDUCE DISCRETIONARY SPENDING:
     → Delay non-essential purchases
     → Example: Postpone equipment maintenance from Day 6 to Day 10
     → Saves: $3,000-5,000 outflow
  
  RECOMMENDED ACTION:
    ✅ 1 + 2: Accelerate collections + negotiate payment terms
       → Combined impact: +$12,500 (collections) + $25,000 (delay) = $37,500
       → Revised Day 7 cash: $40,000 (solves the problem!)
  
  Escalate to: [Owner] [CFO]
  Email Alert: Sent immediately
  Dashboard Alert: Prominently displayed (red banner)
  Auto-Hold: Don't auto-approve AP payments > $5K until resolved
```

#### Example 4: Profitability Recommendation

```
EVENT: End-of-Week Profitability Review

ANALYSIS:
  ├─ This Week Revenue: $105,000 (budget: $100,000) ✅ +5%
  │
  ├─ This Week Expenses:
  │  ├─ Food Cost: $29,750 / $105,000 = 28.3% (budget: 28.0%) ⚠️ +0.3%
  │  ├─ Labor Cost: $35,700 / $105,000 = 34.0% (budget: 32.0%) ❌ +2.0%
  │  ├─ Utilities: $2,100 (budget: $2,000) ⚠️ +$100
  │  └─ Other: $8,200 (on budget)
  │  └─ Total Expenses: $75,750
  │
  ├─ Profit: $29,250 (28% margin) vs. Budget $30,000 (30% margin)
  │  └─ Variance: -$750 (-2.5% below budget)
  │
  └─ Root Cause Analysis:
     ├─ Revenue UP (+5%) → Good!
     ├─ Food Cost: +0.3% variance
     │  └─ EchoRecipePro says: Meat prices up (inflation)
     │  └─ Need to raise menu prices ~2.1% to offset
     │
     └─ Labor Cost: +2.0% variance ❌ BIGGEST ISSUE
        ├─ Extra staff scheduled (Thursday = busy)
        ├─ Overtime hours: 12 hours (unplanned)
        ├─ Impact: +$1,200 in extra labor
        └─ Root cause: Understaffed on Thursday

ECHO AI³ RECOMMENDATIONS:

  1. MENU PRICING ADJUSTMENT:
     Current Menu:
       • Spaghetti Carbonara: $12.50
       • Risotto: $14.00
       • Steak: $22.00
     
     Recommended New Menu:
       • Spaghetti Carbonara: $12.75 (+2.0%) [Food cost up 0.2%]
       • Risotto: $14.25 (+1.8%) [Food cost up 0.1%]
       • Steak: $22.50 (+2.3%) [Meat prices up 2.2%]
     
     Financial Impact:
       → Assumes 5% price elasticity (lose 5% of volume per 1% price increase)
       → Net effect: +$2,100 additional revenue (vs. cost increases of $1,500)
       → New profit margin: +0.4% improvement ✅
     
     Confidence: 87%
     Recommendation: Implement immediately for next week
  
  2. LABOR OPTIMIZATION:
     Problem: Thursday overtime costs $1,200
     Solution: Better scheduling
       → Stagger shift start times (reduce peak overlap)
       → Cross-train staff (more flexibility)
       → Forecast busy days 2 weeks ahead (better planning)
     
     Financial Impact:
       → Reduce Thursday overtime: Save $400
       → Reduce Friday staffing (Thursday was busier): Save $300
       → Total labor savings: $700 (vs. $1,200 extra this week)
     
     Confidence: 76%
     Recommendation: Adjust next week's schedule
     Action: [Generate optimized schedule] [Review with manager]
  
  3. UTILITIES COST:
     Issue: +$100 vs. budget ($2,100 actual vs. $2,000 budgeted)
     Analysis: High AC usage due to warm weather
     Recommendation: Minor issue, no action needed (seasonal variation)
  
  SUMMARY OF RECOMMENDATIONS:
    ✅ Option 1: Menu pricing + labor optimization
       → +$2,100 revenue + $700 labor savings = +$2,800 profit impact
       → New expected profit margin: 30.5% (vs. 28% budgeted)
       → Implementation: Start next week
    
    Escalate to: [Restaurant Manager] [Owner]
    Email: Profitability dashboard with recommendations
    Action Items:
      [1] Update POS menu prices
      [2] Adjust schedule for next week
      [3] Schedule meeting with manager to discuss
```

---

# PART 3: VIRTUAL CFO DASHBOARD

## Real-Time Recommendations & Decision Support

```
┌──────────────────────────────────────────────────────────────┐
│ ECHO AI³ VIRTUAL CFO DASHBOARD                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 FINANCIAL HEALTH (Updated Real-Time)                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 💰 CASH POSITION                                             │
│ ├─ Current Cash: $45,000 (Healthy)                          │
│ ├─ Minimum Required: $20,000                                │
│ ├─ Days of Positive Cash: 47 days ✅ (Target: > 30)        │
│ ├─ 30-Day Forecast: [Graph showing cash trends]            │
│ │  ├─ Day 7: $40,000 ⚠️ (Low point)                         │
│ │  ├─ Day 14: $48,000 ✅ (Recovery)                         │
│ │  └─ Day 30: $52,000 ✅ (Healthy)                          │
│ └─ Echo AI³ Alert: "Monitor Day 7 low point"               │
│                                                              │
│ 📈 PROFITABILITY TRENDS                                      │
│ ├─ YTD Profit Margin: 28.5% (Budget: 30.0%) ⚠️ -1.5%       │
│ │  ├─ Revenue: +5% (exceeding budget ✅)                    │
│ │  ├─ Food Cost: +0.3% (slightly high)                      │
│ │  └─ Labor: +2.0% (main issue ❌)                          │
│ │                                                            │
│ ├─ [View Detailed Variance Analysis]                        │
│ │                                                            │
│ └─ Echo AI³ Recommendation:                                 │
│    "Adjust menu pricing +2% to offset food cost inflation   │
│     and reduce labor cost via better scheduling.            │
│     Projected improvement: +0.4% margin"                    │
│                                                              │
│ 📋 PENDING DECISIONS (Echo AI³ Recommendations)              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ [1] 🔴 URGENT: Cash Position Alert                          │
│     Echo AI³ recommends:                                     │
│     • Accelerate customer collections (AR aging)            │
│     • Negotiate extended payment terms with vendors         │
│     • Confidence: 92%                                        │
│     [View Details] [Accept] [Decline] [Ask Follow-up Q]    │
│                                                              │
│ [2] 🟡 Menu Pricing Adjustment                              │
│     Echo AI³ recommends:                                     │
│     • Increase prices 2% to offset food inflation            │
│     • Expected impact: +$2,100 revenue                       │
│     • Confidence: 87%                                        │
│     [View Details] [Implement] [Schedule] [Ask Follow-up]   │
│                                                              │
│ [3] 🟡 Labor Cost Optimization                              │
│     Echo AI³ recommends:                                     │
│     • Optimize next week's schedule                          │
│     • Reduce Thursday overtime via better planning           │
│     • Expected savings: $700                                 │
│     • Confidence: 76%                                        │
│     [View Details] [Generate Schedule] [Share w/ Manager]   │
│                                                              │
│ [4] ⚪ Vendor Negotiation                                    │
│     Echo AI³ recommends:                                     │
│     • Negotiate 2/10 terms with Sysco (save $70/invoice)    │
│     • Ask for volume discount on staple items                │
│     • Expected savings: $2,000/month                         │
│     • Confidence: 64%                                        │
│     [View Details] [Draft Email] [Schedule Call]            │
│                                                              │
│ [5] 🟢 All Other Transactions                               │
│     Echo AI³ Status: 387 transactions processed today        │
│     • Auto-approved: 285 (73.6%) - All routine              │
│     • Recommended for review: 18 (4.6%) - Worth investigating│
│     • Flagged for investigation: 2 (0.5%) - Follow up      │
│     • Blocked by Guardian: 3 (0.8%) - Fix issues            │
│     [View Exception Report]                                  │
│                                                              │
│ 🎯 OPERATOR ACTIONS TODAY                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Your To-Do List (Echo AI³ Curated):                          │
│                                                              │
│ Priority 1 (Handle Now):                                     │
│   ☐ Review cash alert & decide on action plan               │
│   ⏱️ Time needed: 10 min                                     │
│                                                              │
│ Priority 2 (Handle This Week):                               │
│   ☐ Review menu pricing recommendation & implement           │
│   ⏱️ Time needed: 15 min                                     │
│   ☐ Approve optimized labor schedule for next week          │
│   ⏱️ Time needed: 5 min                                      │
│                                                              │
│ Priority 3 (Nice to Have):                                   │
│   ☐ Reach out to Sysco about volume discount                │
│   ⏱️ Time needed: 20 min                                     │
│                                                              │
│ Total Time Today: ~30 minutes (vs. 4+ hours manual review)  │
│ Echo AI³ Value: Saved ~3.5 hours of analysis work           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ AUDIT TRAIL & TRANSPARENCY                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ All Echo AI³ decisions logged immutably (Odin Guardian):     │
│                                                              │
│ Today's Activity:                                            │
│ ├─ GL Auto-Posts: 42 transactions ($125,400)               │
│ ├─ AP Auto-Approvals: 18 invoices ($18,500)                │
│ ├─ Bank Auto-Matches: 156 transactions (94.5%)             │
│ ├─ Recommendations Made: 5 (awaiting operator decision)     │
│ ├─ Operator Overrides: 2 (logged)                           │
│ └─ Blocked Entries: 3 (need fixing)                         │
│                                                              │
│ [View Full Audit Trail] [Download Report]                   │
│                                                              │
│ ✅ System Status: All systems operational                   │
│ 🔒 Security: Guardian checks passed 100% of transactions    │
│ 📈 Uptime: 99.99% (last 7 days)                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# PART 4: AUTOMATION CONFIGURATION SCHEMA

## Database Structure

```sql
-- Automation settings (per entity)
CREATE TABLE automation_settings (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL,
  
  -- GL Automation
  gl_entry_auto_create_pct INT DEFAULT 75, -- 0-100%
  gl_entry_from_toast BOOLEAN DEFAULT true,
  gl_entry_from_opera BOOLEAN DEFAULT true,
  gl_entry_from_gusto BOOLEAN DEFAULT true,
  gl_entry_approval_mode VARCHAR(20), -- 'auto_post', 'recommend_only'
  
  -- AP Automation
  ap_invoice_auto_match_pct INT DEFAULT 85,
  ap_invoice_match_confidence INT DEFAULT 80, -- % threshold
  ap_invoice_auto_approve_pct INT DEFAULT 75,
  ap_invoice_approval_mode VARCHAR(20),
  ap_payment_auto_schedule_pct INT DEFAULT 50,
  ap_payment_approval_mode VARCHAR(20),
  
  -- Reconciliation Automation
  bank_auto_match_pct INT DEFAULT 80,
  bank_match_confidence INT DEFAULT 80,
  bank_auto_post_pct INT DEFAULT 60,
  gl_auto_recon_pct INT DEFAULT 50,
  
  -- Month-End Automation
  auto_accruals_pct INT DEFAULT 100,
  auto_depreciation_pct INT DEFAULT 100,
  auto_consolidation_pct INT DEFAULT 100,
  full_close_automation_pct INT DEFAULT 80,
  
  -- Cash & CFO Automation
  cash_monitor_enabled BOOLEAN DEFAULT true,
  cash_forecast_days INT DEFAULT 30,
  cash_minimum_threshold DECIMAL(19,5) DEFAULT 20000.00000,
  profitability_recommendations_enabled BOOLEAN DEFAULT true,
  food_decisions_integration_enabled BOOLEAN DEFAULT true,
  
  -- Time-Based
  gl_auto_hours_start TIME DEFAULT '06:00:00',
  gl_auto_hours_end TIME DEFAULT '22:00:00',
  ap_auto_hours_start TIME DEFAULT '06:00:00',
  ap_auto_hours_end TIME DEFAULT '17:00:00',
  auto_during_weekends BOOLEAN DEFAULT false,
  
  -- Approval Settings
  default_approval_mode VARCHAR(20), -- 'full_autonomy', 'recommend', 'manual'
  escalation_to_roles VARCHAR(500), -- 'CFO,Controller,Owner'
  escalation_after_hours INT DEFAULT 24, -- hours
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Per-account automation overrides
CREATE TABLE automation_account_overrides (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL,
  gl_account_id UUID NOT NULL,
  
  -- Override specific feature
  feature_name VARCHAR(50), -- 'gl_auto_post', 'ap_approve', etc.
  override_pct INT, -- 0-100% (null = use global)
  override_mode VARCHAR(20), -- 'auto', 'recommend', 'manual'
  reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entity_id, gl_account_id, feature_name)
);

-- Time-based automation schedule
CREATE TABLE automation_schedules (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL,
  feature_name VARCHAR(50), -- 'gl_posting', 'ap_approval', etc.
  
  -- Time window
  day_of_week INT, -- 1-7 (Mon-Sun)
  start_time TIME,
  end_time TIME,
  automation_pct INT, -- % to run in this window
  
  -- Special handling
  queue_if_outside BOOLEAN DEFAULT true, -- Queue and execute in next window
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Echo AI³ recommendations (audit trail)
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL,
  transaction_id UUID,
  
  -- Recommendation
  recommendation_type VARCHAR(50), -- 'approve', 'investigate', 'escalate'
  feature_name VARCHAR(50), -- 'ap_approval', 'gl_posting', 'cash_forecast'
  recommendation_text TEXT,
  reasoning TEXT,
  
  -- Confidence & Impact
  confidence_pct INT,
  financial_impact DECIMAL(19,5),
  risk_level VARCHAR(20), -- 'low', 'medium', 'high'
  
  -- Alternative actions
  alternatives JSONB,
  
  -- Operator decision
  operator_decision VARCHAR(20), -- 'accepted', 'declined', 'modified'
  operator_decision_reason TEXT,
  decided_by_user_id UUID,
  decided_at TIMESTAMP,
  
  -- Automation execution
  auto_executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_entity_decision (entity_id, operator_decision)
);

-- Automation audit log (full immutable trail)
CREATE TABLE automation_audit_log (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL,
  transaction_id UUID,
  
  -- Action
  action_type VARCHAR(50), -- 'auto_posted', 'auto_approved', 'recommended'
  feature_name VARCHAR(50),
  automation_pct_used INT,
  
  -- What happened
  details JSONB,
  
  -- Who/what
  executed_by VARCHAR(20), -- 'echo_ai3', 'operator'
  executed_by_user_id UUID,
  
  -- Odin Guardian immutable
  hash VARCHAR(256),
  prev_hash VARCHAR(256),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

# PART 5: IMPLEMENTATION ROADMAP (9 WEEKS)

## Week 1-2: Automation Control Panel UI + Decision Engine Foundation

**Deliverables:**
- Automation Settings panel (checkbox + % inputs)
- Per-account overrides
- Time-based scheduling
- Decision Engine API structure

## Week 3-4: Echo AI³ GL Automation

**Deliverables:**
- Auto GL entry creation recommendations
- Per-account automation levels
- Time-based GL posting
- Approval workflow integration

## Week 5-6: Echo AI³ AP Automation

**Deliverables:**
- Auto AP matching recommendations
- Auto-approval logic
- Payment scheduling recommendations
- Dual-mode (auto vs. recommend)

## Week 7-8: Virtual CFO Recommendations

**Deliverables:**
- Cash flow forecasting
- Profitability recommendations
- Menu pricing suggestions
- Cost optimization analysis

## Week 9: Integration + Polish

**Deliverables:**
- Full integration testing
- Food decisions module integration
- Audit trail verification
- Production deployment

---

# CONCLUSION

Echo AI³ becomes the operator's **virtual team**:
- **GL Automation:** Posts transactions (if operator enables 0-100%)
- **AP Automation:** Approves invoices (if operator enables 0-100%)
- **Bank Recon:** Matches transactions (if operator enables 0-100%)
- **CFO:** Makes recommendations on profitability, cash, pricing (always advisory)
- **Decision Support:** Explains reasoning, suggests alternatives, tracks outcome

**One person + Echo AI³ = Entire accounting department**

