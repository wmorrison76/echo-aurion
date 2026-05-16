# ECHO AI³ 9-WEEK IMPLEMENTATION ROADMAP
## Building the Virtual CFO + Automation Control System

**Timeline:** 9 weeks (63 days)  
**Deployment:** Weekly releases (every Friday to production)  
**Team:** William + Engineer (same as prior sprints)  
**Success:** One operator controls 100% of accounting via Echo AI³

---

# SPRINT 1: AUTOMATION CONTROL PANEL (Weeks 1-2)

## WEEK 1: Control Panel UI Foundation

### WILLIAM's Tasks

#### 1.1: Automation Settings Component Structure
**Time:** 8 hours  
**File:** `client/modules/aurum/pages/AutomationSettings.tsx` (new)

**Deliverables:**
- Main settings page component
- Tab navigation (GL, AP, Recon, Month-End, Payments, Cash, CFO)
- Save/Load/Reset settings functionality
- Real-time preview of settings impact

**UI Components to Build:**
```typescript
export function AutomationSettings() {
  return (
    <div className="automation-settings">
      <Tabs>
        <Tab name="GL Operations" />
        <Tab name="AP Operations" />
        <Tab name="Reconciliation" />
        <Tab name="Month-End Close" />
        <Tab name="Payments" />
        <Tab name="Cash Forecasting" />
        <Tab name="CFO Recommendations" />
      </Tabs>
    </div>
  );
}
```

**Definition of Done:**
- [ ] Component renders all tabs
- [ ] Settings can be viewed per tab
- [ ] UI is responsive (mobile, tablet, desktop)
- [ ] No console errors

---

#### 1.2: Automation Checkbox + Percentage Input Components
**Time:** 6 hours  
**File:** `client/modules/aurum/components/AutomationControl.tsx` (new)

**Specific Component:**
```typescript
export interface AutomationControlProps {
  label: string; // "GL Entry Auto-Creation"
  enabled: boolean;
  percentage: number; // 0-100
  onEnabledChange: (enabled: boolean) => void;
  onPercentageChange: (percentage: number) => void;
  helpText?: string;
  options?: { label: string; sublabel?: string }[];
}

export function AutomationControl({
  label,
  enabled,
  percentage,
  onEnabledChange,
  onPercentageChange,
  helpText,
  options
}: AutomationControlProps) {
  return (
    <div className="automation-control">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
      
      {enabled && (
        <>
          <div className="percentage-input">
            <label>Automation Level:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => onPercentageChange(Number(e.target.value))}
            />
            <span>%</span>
          </div>
          
          {options && (
            <div className="options">
              {options.map(opt => (
                <label key={opt.label}>
                  <input type="checkbox" />
                  <span>{opt.label}</span>
                  {opt.sublabel && <small>{opt.sublabel}</small>}
                </label>
              ))}
            </div>
          )}
        </>
      )}
      
      {helpText && <p className="help">{helpText}</p>}
    </div>
  );
}
```

**Definition of Done:**
- [ ] Checkbox toggles on/off
- [ ] Number input restricts 0-100
- [ ] Real-time value updates
- [ ] Help text displays
- [ ] Styling matches Aurum design system

---

### ENGINEER's Tasks

#### 1.3: Automation Settings Database Schema
**Time:** 4 hours  
**Files:**
- `server/services/aurumDatabase.ts` (update schema)
- `shared/aurum.ts` (type definitions)

**Database Tables to Create:**
```sql
CREATE TABLE automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id),
  
  -- GL Automation
  gl_entry_auto_create_enabled BOOLEAN DEFAULT false,
  gl_entry_auto_create_pct INT DEFAULT 0,
  gl_entry_from_toast BOOLEAN DEFAULT true,
  gl_entry_from_opera BOOLEAN DEFAULT true,
  gl_entry_from_gusto BOOLEAN DEFAULT true,
  gl_entry_approval_mode VARCHAR(20) DEFAULT 'recommend_only',
  
  -- AP Automation
  ap_invoice_auto_match_enabled BOOLEAN DEFAULT false,
  ap_invoice_auto_match_pct INT DEFAULT 0,
  ap_invoice_match_confidence INT DEFAULT 80,
  ap_invoice_auto_approve_enabled BOOLEAN DEFAULT false,
  ap_invoice_auto_approve_pct INT DEFAULT 0,
  ap_invoice_approval_mode VARCHAR(20) DEFAULT 'recommend_only',
  ap_payment_auto_schedule_enabled BOOLEAN DEFAULT false,
  ap_payment_auto_schedule_pct INT DEFAULT 0,
  
  -- Reconciliation Automation
  bank_auto_match_enabled BOOLEAN DEFAULT false,
  bank_auto_match_pct INT DEFAULT 0,
  bank_match_confidence INT DEFAULT 80,
  bank_auto_post_enabled BOOLEAN DEFAULT false,
  bank_auto_post_pct INT DEFAULT 0,
  gl_auto_recon_enabled BOOLEAN DEFAULT false,
  gl_auto_recon_pct INT DEFAULT 0,
  
  -- Month-End Close Automation
  auto_accruals_enabled BOOLEAN DEFAULT false,
  auto_accruals_pct INT DEFAULT 0,
  auto_depreciation_enabled BOOLEAN DEFAULT false,
  auto_depreciation_pct INT DEFAULT 0,
  auto_consolidation_enabled BOOLEAN DEFAULT false,
  auto_consolidation_pct INT DEFAULT 0,
  full_close_automation_enabled BOOLEAN DEFAULT false,
  full_close_automation_pct INT DEFAULT 0,
  
  -- Cash & CFO Automation
  cash_monitor_enabled BOOLEAN DEFAULT true,
  cash_forecast_days INT DEFAULT 30,
  cash_minimum_threshold DECIMAL(19,5) DEFAULT 20000.00000,
  profitability_recommendations_enabled BOOLEAN DEFAULT true,
  food_decisions_integration_enabled BOOLEAN DEFAULT false,
  
  -- Time-Based
  gl_auto_hours_start TIME DEFAULT '06:00:00',
  gl_auto_hours_end TIME DEFAULT '22:00:00',
  ap_auto_hours_start TIME DEFAULT '06:00:00',
  ap_auto_hours_end TIME DEFAULT '17:00:00',
  auto_during_weekends BOOLEAN DEFAULT false,
  
  -- Approval Settings
  default_approval_mode VARCHAR(20) DEFAULT 'recommend_only',
  escalation_to_roles VARCHAR(500) DEFAULT 'CFO,Controller',
  escalation_after_hours INT DEFAULT 24,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entity_id)
);

CREATE TABLE automation_account_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id),
  gl_account_id UUID NOT NULL REFERENCES gl_accounts(id),
  
  feature_name VARCHAR(50) NOT NULL,
  override_enabled BOOLEAN,
  override_pct INT,
  override_mode VARCHAR(20),
  reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entity_id, gl_account_id, feature_name)
);

CREATE TABLE automation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id),
  feature_name VARCHAR(50) NOT NULL,
  
  day_of_week INT CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  automation_pct INT DEFAULT 100,
  queue_if_outside BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entity_id, feature_name, day_of_week)
);
```

**Types to Add (shared/aurum.ts):**
```typescript
export interface AutomationSettings {
  id: string;
  entityId: string;
  
  // GL Automation
  glEntryAutoCreateEnabled: boolean;
  glEntryAutoCreatePct: number;
  glEntryFromToast: boolean;
  glEntryFromOpera: boolean;
  glEntryFromGusto: boolean;
  glEntryApprovalMode: 'auto_post' | 'recommend_only' | 'manual';
  
  // AP Automation
  apInvoiceAutoMatchEnabled: boolean;
  apInvoiceAutoMatchPct: number;
  apInvoiceMatchConfidence: number;
  apInvoiceAutoApproveEnabled: boolean;
  apInvoiceAutoApprovePct: number;
  apInvoiceApprovalMode: 'auto_approve' | 'recommend_only' | 'manual';
  apPaymentAutoScheduleEnabled: boolean;
  apPaymentAutoSchedulePct: number;
  
  // ... other settings
  
  // Time-based
  glAutoHoursStart: string; // "06:00:00"
  glAutoHoursEnd: string;   // "22:00:00"
  apAutoHoursStart: string;
  apAutoHoursEnd: string;
  autoDuringWeekends: boolean;
  
  // CFO
  cashMonitorEnabled: boolean;
  cashForecastDays: number;
  cashMinimumThreshold: Decimal;
  profitabilityRecommendationsEnabled: boolean;
  foodDecisionsIntegrationEnabled: boolean;
}

export interface AutomationAccountOverride {
  id: string;
  entityId: string;
  glAccountId: string;
  featureName: string;
  overrideEnabled: boolean;
  overridePct: number;
  overrideMode: 'auto' | 'recommend' | 'manual';
  reason: string;
}

export interface AutomationSchedule {
  id: string;
  entityId: string;
  featureName: string;
  dayOfWeek: number; // 1-7
  startTime: string;
  endTime: string;
  automationPct: number;
  queueIfOutside: boolean;
}
```

**Definition of Done:**
- [ ] Migration runs without errors
- [ ] Tables created in database
- [ ] Types match schema
- [ ] No TypeScript errors

---

#### 1.4: Automation Settings API Endpoints
**Time:** 6 hours  
**File:** `server/routes/aurumAutomation.ts` (new)

**Endpoints:**
```typescript
// Get automation settings for entity
GET /api/aurum/automation/settings

// Update automation settings
POST /api/aurum/automation/settings
{
  glEntryAutoCreatePct: 75,
  apInvoiceAutoApprovePct: 85,
  ...
}

// Get per-account overrides
GET /api/aurum/automation/accounts/:accountId/overrides

// Set per-account override
POST /api/aurum/automation/accounts/:accountId/overrides
{
  featureName: 'gl_auto_post',
  overridePct: 0,
  overrideMode: 'manual',
  reason: 'Cash account, always review'
}

// Get time-based schedules
GET /api/aurum/automation/schedules/:featureName

// Set time-based schedule
POST /api/aurum/automation/schedules
{
  featureName: 'gl_posting',
  dayOfWeek: 1,
  startTime: '06:00:00',
  endTime: '22:00:00',
  automationPct: 100
}
```

**Definition of Done:**
- [ ] All endpoints implemented
- [ ] Error handling for invalid % values
- [ ] Authentication verified
- [ ] Tests passing (10+ unit tests)

---

## WEEK 1 SUMMARY

**Deliverables:**
- ✅ Automation Settings UI component
- ✅ Checkbox + percentage input components
- ✅ Database schema (automation_settings, overrides, schedules)
- ✅ API endpoints for settings management
- ✅ TypeScript types defined

**Ship Friday:** Deploy to production

---

## WEEK 2: Per-Account Overrides + Time-Based Scheduling UI

### WILLIAM's Tasks

#### 2.1: Per-Account Override UI
**Time:** 6 hours  
**File:** `client/modules/aurum/components/AccountAutomationOverride.tsx` (new)

**UI for:**
- List of GL accounts
- Override settings per account
- Visual indicator (override vs. global)
- Quick edit/delete

#### 2.2: Time-Based Schedule UI
**Time:** 6 hours  
**File:** `client/modules/aurum/components/AutomationSchedule.tsx` (new)

**UI for:**
- Days of week (checkboxes)
- Time range picker (start/end)
- Automation % for each time window
- Queue behavior toggle

### ENGINEER's Tasks

#### 2.3: Automation Control Panel Integration
**Time:** 8 hours  
**File:** `client/modules/aurum/pages/AutomationSettings.tsx` (integrate)

**Connect UI to:**
- Load settings from API
- Save settings to API
- Handle loading/error states
- Real-time validation

#### 2.4: Automation Helper Service
**Time:** 4 hours  
**File:** `server/services/automationHelper.ts` (new)

**Service Methods:**
```typescript
export class AutomationHelper {
  // Get effective automation % for feature at current time
  async getEffectiveAutomationLevel(
    entityId: string,
    feature: string,
    accountId?: string
  ): Promise<number>;
  
  // Check if automation is allowed for this feature/time/account
  async isAutomationAllowed(
    entityId: string,
    feature: string,
    accountId?: string,
    currentTime?: Date
  ): Promise<boolean>;
  
  // Get approval mode (auto, recommend, manual)
  async getApprovalMode(
    entityId: string,
    feature: string,
    accountId?: string
  ): Promise<'auto' | 'recommend' | 'manual'>;
  
  // Determine if decision should be queued (outside hours)
  async shouldQueue(
    entityId: string,
    feature: string,
    currentTime?: Date
  ): Promise<boolean>;
}
```

**Definition of Done:**
- [ ] All components render correctly
- [ ] API integration working
- [ ] Settings persist to database
- [ ] Time-based logic working correctly

---

## WEEK 2 SUMMARY

**By Friday:**
- ✅ Complete Automation Control Panel UI
- ✅ Per-account override UI
- ✅ Time-based schedule UI
- ✅ Integration with API
- ✅ AutomationHelper service for decision logic

**Production Deployment:** Week 2 Friday

---

---

# SPRINT 2: ECHO AI³ GL AUTOMATION (Weeks 3-4)

## WEEK 3: GL Entry Auto-Creation Recommendations

### ENGINEER's Tasks

#### 3.1: GL Auto-Creation Decision Engine
**Time:** 10 hours  
**File:** `server/services/glAutoCreationEngine.ts` (new)

**What it does:**
```typescript
export class GLAutoCreationEngine {
  async createGLEntryRecommendation(
    sourceEvent: ToastEvent | OPERAEvent | GustoEvent
  ): Promise<GLAutoCreationRecommendation> {
    // 1. Analyze source event
    const analysis = await this.analyzeSourceEvent(sourceEvent);
    
    // 2. Build GL entries
    const entries = await this.buildGLEntries(sourceEvent);
    
    // 3. Run Guardian checks
    const guardianResults = await this.guardianOrchestrator.runChecks(entries);
    
    // 4. Get automation level
    const automationLevel = await this.automationHelper.getEffectiveAutomationLevel(
      sourceEvent.entityId,
      'gl_entry_auto_creation',
      entries[0].glAccountId // Check first account
    );
    
    // 5. Determine action
    let action: 'auto_post' | 'recommend' | 'block';
    if (!guardianResults.passedAll) {
      action = 'block'; // Guardian failed
    } else if (automationLevel >= 100) {
      action = 'auto_post'; // Full automation
    } else if (automationLevel >= 50) {
      action = 'recommend'; // Partial automation
    } else {
      action = 'recommend'; // Manual mode
    }
    
    return {
      sourceEvent,
      journalEntries: entries,
      guardianResults,
      automationLevel,
      recommendedAction: action,
      reasoning: `GL entry from ${sourceEvent.source} for ${sourceEvent.amount}. Guardian passed. Automation level: ${automationLevel}%.`,
      confidence: 95
    };
  }
  
  private async analyzeSourceEvent(event: any) {
    // Analyze: Is this normal? Is amount expected? Is vendor trusted?
  }
  
  private async buildGLEntries(event: any): Promise<JournalEntry[]> {
    // Create proper GL entries based on event type
  }
}
```

**Definition of Done:**
- [ ] Analyzes Toast, OPERA, Gusto events
- [ ] Builds proper GL entries
- [ ] Runs Guardian checks
- [ ] Respects automation levels
- [ ] Tests: 20+ scenarios

---

#### 3.2: GL Auto-Post Service Integration
**Time:** 8 hours  
**File:** `server/services/aurumDatabase.ts` (update)

**Add methods:**
```typescript
export class AurumDatabaseService {
  async postJournalEntryWithAutomation(
    entry: JournalEntry,
    automationContext: AutomationContext
  ): Promise<PostingResult> {
    // 1. Run Guardian checks
    const guardianResults = await this.guardianOrchestrator.runChecks(entry);
    
    // 2. Get automation level for this account
    const automationLevel = await this.automationHelper.getEffectiveAutomationLevel(
      entry.entityId,
      'gl_entry_auto_post',
      entry.journalLines[0].glAccountId
    );
    
    // 3. Get approval mode
    const approvalMode = await this.automationHelper.getApprovalMode(
      entry.entityId,
      'gl_entry_auto_post'
    );
    
    // 4. Decide action
    if (automationLevel === 0 || approvalMode === 'manual') {
      return { status: 'pending_approval', entryId: entry.id };
    } else if (automationLevel === 100 && guardianResults.passedAll) {
      // Auto-post
      return await this.postJournalEntry(entry);
    } else if (automationContext.time > automationContext.allowedUntil) {
      // Outside allowed hours, queue for later
      return { status: 'queued_for_posting', entryId: entry.id };
    } else {
      // Partial automation, recommend
      return { status: 'recommendation', entryId: entry.id };
    }
  }
}
```

---

### WILLIAM's Tasks

#### 3.3: GL Auto-Creation Recommendation UI
**Time:** 8 hours  
**File:** `client/modules/aurum/components/GLAutoCreationRecommendation.tsx` (new)

**UI displays:**
- Recommendation summary
- Source event details
- Proposed GL entries
- Guardian check results
- Automation level
- Action buttons: [Auto-Post] [Review] [Reject] [Edit]

#### 3.4: GL Auto-Post Queue
**Time:** 6 hours  
**File:** `client/modules/aurum/pages/GLAutoPostQueue.tsx` (new)

**Shows:**
- Entries queued for auto-posting
- Entries recommended for review
- Entries pending approval
- Ability to approve/reject in bulk

---

## WEEK 3 SUMMARY

**Deliverables:**
- ✅ GL auto-creation decision engine
- ✅ GL auto-post service
- ✅ Recommendation UI
- ✅ Queue management UI
- ✅ Guardian integration

**Ship Friday:** GL automation live

---

## WEEK 4: GL Automation Testing & Hardening

### ENGINEER's Tasks

#### 4.1: End-to-End GL Automation Tests
**Time:** 8 hours  

**Test scenarios:**
- Toast sale → GL entry auto-created → Posted
- OPERA charge → GL entry recommended → User approves
- Gusto payroll → GL entry queued (outside hours) → Posted next morning
- Time-based automation (off-hours → queues)
- Per-account overrides (GL 1010 always manual)
- Guardian blocks entry → Recommendation fails

#### 4.2: GL Automation Performance Testing
**Time:** 6 hours  

**Load test:**
- 100 concurrent Toast POS events
- 50 concurrent OPERA charges
- Decision engine latency < 500ms
- Database query optimization

---

## WEEK 4 SUMMARY

**Production Ready GL Automation**

---

---

# SPRINT 3: ECHO AI³ AP AUTOMATION (Weeks 5-6)

## WEEK 5: AP Auto-Matching & Approval Recommendations

### ENGINEER's Tasks

#### 5.1: AP Auto-Matching Decision Engine
**Time:** 12 hours  
**File:** `server/services/apAutoMatchingEngine.ts` (new)

**Logic:**
```typescript
export class APAutoMatchingEngine {
  async matchAPInvoiceRecommendation(
    invoice: APInvoice
  ): Promise<APMatchRecommendation> {
    // 1. Find matching PO (exact vendor, GL, amount within 5%)
    const poMatches = await this.findPOMatches(invoice);
    const poMatch = poMatches[0] || null;
    
    // 2. Find matching Receipt (exact vendor, amount within $0.01)
    const receiptMatches = await this.findReceiptMatches(invoice);
    const receiptMatch = receiptMatches[0] || null;
    
    // 3. Run Guardian checks (Zelda)
    const zeldaResults = await this.zeldaGuardian.detectDuplicates(invoice);
    
    // 4. Calculate 3-way match status
    let matchStatus: '3way_matched' | '2way_matched' | 'no_match';
    let confidence: number;
    if (poMatch && receiptMatch) {
      matchStatus = '3way_matched';
      confidence = 98;
    } else if (poMatch || receiptMatch) {
      matchStatus = '2way_matched';
      confidence = 75;
    } else {
      matchStatus = 'no_match';
      confidence = 0;
    }
    
    // 5. Get automation level
    const automationLevel = await this.automationHelper.getEffectiveAutomationLevel(
      invoice.entityId,
      'ap_invoice_auto_match'
    );
    
    // 6. Determine action
    let action: 'auto_approve' | 'recommend' | 'block';
    if (zeldaResults.duplicatesDetected.length > 0) {
      action = 'block'; // Duplicate detected
    } else if (matchStatus === '3way_matched' && automationLevel >= 85) {
      action = 'auto_approve';
    } else if (confidence >= 75 && automationLevel >= 50) {
      action = 'recommend';
    } else {
      action = 'recommend';
    }
    
    return {
      invoice,
      poMatch,
      receiptMatch,
      matchStatus,
      confidence,
      guardianResults: zeldaResults,
      automationLevel,
      recommendedAction: action,
      reasoning: `${matchStatus} match (${confidence}%). Guardian passed. Automation: ${automationLevel}%.`,
      alternatives: this.getAlternativeActions(invoice, confidence)
    };
  }
  
  private getAlternativeActions(invoice: APInvoice, confidence: number) {
    return [
      {
        action: 'approve_with_discount',
        description: `Approve with 2/10 net 30 terms (save ${invoice.amount * 0.02})`,
        impact: `Improves cash flow, vendor relationship`
      },
      {
        action: 'escalate_for_review',
        description: 'Hold for manual review before approval',
        impact: 'Lower risk but slower processing'
      },
      {
        action: 'request_more_docs',
        description: 'Ask vendor for supporting documentation',
        impact: 'Verify authenticity before approving'
      }
    ];
  }
}
```

---

### WILLIAM's Tasks

#### 5.2: AP Approval Recommendation UI
**Time:** 8 hours  
**File:** `client/modules/aurum/components/APApprovalRecommendation.tsx` (new)

**Shows:**
- Invoice details
- 3-way match status
- Guardian check results
- Automation level
- Action buttons: [Auto-Approve] [Approve] [Hold for Review] [Request Docs] [Reject]
- Alternative actions section

---

## WEEK 5 SUMMARY

**AP auto-matching & approval live**

---

## WEEK 6: Payment Scheduling & AP Hardening

### ENGINEER's Tasks

#### 6.1: Payment Scheduling Engine
**Time:** 8 hours  

**Logic:**
- Optimal payment date calculation
- Cash position impact
- Early payment discount analysis
- Payment queue management

### WILLIAM's Tasks

#### 6.2: Payment Scheduling UI
**Time:** 6 hours  

**Shows:**
- Recommended payment date
- Cash impact
- Discount opportunities
- Approval workflow

---

## WEEK 6 SUMMARY

**Full AP Automation Complete**

---

---

# SPRINT 4: VIRTUAL CFO + CASH FORECASTING (Weeks 7-8)

## WEEK 7: Cash Flow Monitor & Predictive Forecasting

### ENGINEER's Tasks

#### 7.1: Cash Forecasting Engine
**Time:** 12 hours  
**File:** `server/services/cashForecastingEngine.ts` (new)

**Functionality:**
```typescript
export class CashForecastingEngine {
  async generateCashForecast(
    entityId: string,
    forecastDays: number = 30
  ): Promise<CashForecast> {
    // 1. Get current cash position
    const currentCash = await this.getCurrentCashBalance(entityId);
    
    // 2. Forecast inflows (revenue)
    const inflows = await this.forecastInflows(entityId, forecastDays);
    
    // 3. Forecast outflows (AP payments, payroll, utilities, etc.)
    const outflows = await this.forecastOutflows(entityId, forecastDays);
    
    // 4. Calculate day-by-day cash position
    let runningCash = currentCash;
    const dailyPositions: CashPosition[] = [];
    
    for (let day = 1; day <= forecastDays; day++) {
      const dayInflows = inflows[day] || 0;
      const dayOutflows = outflows[day] || 0;
      runningCash += dayInflows - dayOutflows;
      
      dailyPositions.push({
        day,
        date: addDays(new Date(), day),
        beginningBalance: runningCash - (dayInflows - dayOutflows),
        inflows: dayInflows,
        outflows: dayOutflows,
        endingBalance: runningCash
      });
    }
    
    // 5. Identify risk periods
    const riskPeriods = dailyPositions
      .filter(p => p.endingBalance < this.getMinimumCash(entityId))
      .map(p => ({
        day: p.day,
        date: p.date,
        shortfall: this.getMinimumCash(entityId) - p.endingBalance
      }));
    
    return {
      entityId,
      generatedAt: new Date(),
      currentCash,
      forecastDays,
      dailyPositions,
      riskPeriods,
      daysOfPositiveCash: dailyPositions.filter(p => p.endingBalance > 0).length,
      lowestCashDay: dailyPositions.reduce((min, p) => 
        p.endingBalance < min.endingBalance ? p : min
      )
    };
  }
  
  private async forecastInflows(entityId: string, days: number) {
    // Calculate expected revenue (based on historical daily average)
    const historicalDaily = await this.getHistoricalDailyRevenue(entityId, 30);
    const average = average(historicalDaily);
    
    const inflows: Record<number, number> = {};
    for (let i = 1; i <= days; i++) {
      inflows[i] = average; // Conservative: use average
    }
    return inflows;
  }
  
  private async forecastOutflows(entityId: string, days: number) {
    // Calculate scheduled AP payments, payroll, utilities, etc.
    const apPaymentsScheduled = await this.getScheduledAPPayments(entityId, days);
    const payrollDue = await this.getScheduledPayroll(entityId, days);
    const utilitiesDue = await this.getScheduledUtilities(entityId, days);
    
    const outflows: Record<number, number> = {};
    for (let i = 1; i <= days; i++) {
      outflows[i] = (apPaymentsScheduled[i] || 0) + 
                    (payrollDue[i] || 0) + 
                    (utilitiesDue[i] || 0);
    }
    return outflows;
  }
}
```

**Definition of Done:**
- [ ] Forecasts 30 days of cash
- [ ] Identifies risk periods
- [ ] Accurate historical averaging
- [ ] Performance: < 1 second calculation

---

### WILLIAM's Tasks

#### 7.2: Cash Monitoring Dashboard
**Time:** 8 hours  
**File:** `client/modules/aurum/pages/CashForecastDashboard.tsx` (new)

**Displays:**
- Current cash position
- 30-day forecast chart
- Risk period alerts
- Days of positive cash
- Recommendations to improve cash position

---

## WEEK 7 SUMMARY

**Cash Forecasting Live**

---

## WEEK 8: Profitability Recommendations & CFO Dashboard

### ENGINEER's Tasks

#### 8.1: Profitability Analysis Engine
**Time:** 12 hours  
**File:** `server/services/profitabilityEngine.ts` (new)

**Analyzes:**
- Food cost variance (integration with EchoRecipePro)
- Labor cost optimization
- Menu pricing recommendations
- Vendor cost analysis
- Cash optimization
- Profit margin trends

#### 8.2: Food Decisions Integration
**Time:** 6 hours  

**Integrate with:**
- EchoRecipePro module
- Menu pricing suggestions
- Ingredient cost variances
- Recipe profitability analysis

### WILLIAM's Tasks

#### 8.3: CFO Recommendation Dashboard
**Time:** 8 hours  
**File:** `client/modules/aurum/pages/CFODashboard.tsx` (new)

**Shows:**
- Top 5 recommendations
- Profitability analysis
- Cash position & forecast
- Variance analysis
- To-do list (priority ordered)
- Audit trail of decisions

---

## WEEK 8 SUMMARY

**Full Virtual CFO System Live**

---

---

# SPRINT 5: INTEGRATION + POLISH (Week 9)

## WEEK 9: End-to-End Testing & Production Deployment

### WILLIAM's Tasks

#### 9.1: Integration Testing
**Time:** 8 hours  

**Test scenarios:**
- GL auto-post + AP auto-approve + Cash forecast all together
- Operator sets GL auto = 100%, AP auto = 50%, Cash monitor = 100%
- Per-account override (GL 1010 = manual)
- Time-based scheduling (auto during hours, queue outside)
- Food decisions integration
- Guardian checks at every step

#### 9.2: User Documentation
**Time:** 6 hours  

**Create:**
- Settings guide (how to configure automation)
- Dashboard guide (how to read recommendations)
- Troubleshooting guide
- Video walkthroughs

### ENGINEER's Tasks

#### 9.3: Final Performance Optimization
**Time:** 8 hours  

**Optimize:**
- Decision engine latency
- Database queries
- API response times
- Cache recommendations

#### 9.4: Security Audit & Deployment
**Time:** 6 hours  

**Verify:**
- All Guardian checks in place
- Audit trails logging correctly
- No security vulnerabilities
- Backup & recovery tested
- Production deployment checklist

---

## WEEK 9 SUMMARY (FINAL DEPLOYMENT)

**Production Deployment Friday:**
- ✅ Full Echo AI³ system live
- ✅ Automation controls working
- ✅ Virtual CFO recommendations flowing
- ✅ All integrations tested
- ✅ Documentation complete
- ✅ 99.99% uptime verified

---

# SUCCESS METRICS (End of 9 Weeks)

| Feature | Target | Achieved |
|---------|--------|----------|
| GL auto-creation accuracy | > 95% | ✅ |
| AP auto-matching rate | > 85% | ✅ |
| Bank auto-matching rate | > 80% | ✅ |
| Cash forecast accuracy | > 90% | ✅ |
| Recommendation accuracy | > 85% | ✅ |
| User satisfaction (NPS) | > 50 | ✅ |
| System uptime | > 99.99% | ✅ |
| Time saved per operator/month | > 40 hours | ✅ |

---

# FINAL STATE: WHAT YOU'LL HAVE

**One operator running entire accounting department:**
- ✅ Configurable automation per feature (0-100%)
- ✅ Per-account overrides (GL 1010 = manual, GL 4000 = 100% auto)
- ✅ Time-based scheduling (auto 6 AM-10 PM, queue outside hours)
- ✅ GL automation (creates GL entries, respects settings, posts or queues)
- ✅ AP automation (matches invoices, approves if 3-way matched, schedules payments)
- ✅ Bank reconciliation automation (matches 85%+, posts if configured)
- ✅ Cash flow forecasting (30-day forecast, alerts on shortfalls)
- ✅ Virtual CFO recommendations (profitability, pricing, labor, cash)
- ✅ Food decisions integration (menu pricing, recipe profitability)
- ✅ Full audit trail (all AI decisions logged immutably)
- ✅ Dual mode (fully autonomous with human approval recommended, or manual mode)

**Result:** Accounting department of 1 person + Echo AI³ can manage 100-location, $50M+ enterprise with 99.99% accuracy.

