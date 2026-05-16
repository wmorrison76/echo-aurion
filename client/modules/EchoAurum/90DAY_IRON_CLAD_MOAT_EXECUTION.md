# 90-DAY HYPER-SPEED EXECUTION PLAN
## Iron-Clad Moat: Guardian AI + Real-Time GL Posting + Integration Ecosystem

**Team:** William (speed demon, multi-module parallel) + 1 engineer  
**Timeline:** 12 weeks / 90 days / 3 sprints  
**Cadence:** Weekly deploys (every Friday production release)  
**Success Criteria:** Guardian = unbeatable, GL posting = industry fastest, Integrations = native & real-time

---

# FOUNDATION: WEEKLY SPRINT STRUCTURE

## Every Sprint (3 weeks)

### Week 1: Build
- **Monday:** Kickoff (align priorities, unblock previous week)
- **Tuesday-Thursday:** Deep implementation (code, integrate, test)
- **Friday:** Ship to production

### Week 2: Integrate & Harden
- **Monday:** Integration testing (Guardian + GL + Integrations together)
- **Tuesday-Thursday:** Bug fixes, edge cases, performance optimization
- **Friday:** Production release (cumulative)

### Week 3: Document & Prepare Next
- **Monday:** Write documentation (API docs, architecture decisions)
- **Tuesday-Thursday:** Handle production issues, user feedback, optimization
- **Friday:** Plan next sprint, technical design docs

---

# SPRINT 1: GUARDIAN AI FOUNDATION (Weeks 1-3)

## Goal
Make Guardian AI unbeatable: Argus + Zelda running on every transaction, Phoenix learning fraud patterns, Odin audit trail immutable.

---

## WEEK 1: Guardian Infrastructure

### Task 1.1: Guardian Orchestration Engine (William)
**Objective:** Build the "nerve center" that runs all Guardian checks on every transaction

**Deliverables:**
- [ ] Create `GuardianOrchestrator` class in `server/services/aurumGuardians.ts`
- [ ] Implement transaction hook (every journal entry post → runs all 4 guardians)
- [ ] Build async check queue (doesn't block posting, but runs in real-time)
- [ ] Add Guardian check result storage (which checks passed/failed/warned)

**Code Location:** `server/services/aurumGuardians.ts`

**Implementation:**
```typescript
// GuardianOrchestrator runs on every transaction
export class GuardianOrchestrator {
  async runGuardianChecks(transaction: JournalEntry): Promise<GuardianResult> {
    return {
      argus: await argusGuardian.validate(transaction),
      zelda: await zeldaGuardian.detectDuplicates(transaction),
      phoenix: await phoenixGuardian.detectAnomalies(transaction),
      odin: await odinGuardian.logImmutable(transaction),
      passedsAll: [all checks passed],
      warnings: [warnings only],
      blockingErrors: [errors that prevent posting]
    }
  }
}
```

**Blocking Issues:**
- Need Guardian results schema (shared/aurum.ts)
- Need transaction hook in database.ts (before posting)

**Dependency:** None (can start immediately)

---

### Task 1.2: Argus Guardian - Data Validation (Engineer)
**Objective:** Make Argus bulletproof - validates EVERY rule before posting

**Deliverables:**
- [ ] GL account existence check (is this account in chart of accounts?)
- [ ] Double-entry validation (debits = credits exactly)
- [ ] Account type validation (can't debit revenue, must credit)
- [ ] Cost center requirement check (if account requires cost center, enforce)
- [ ] Department requirement check (same)
- [ ] Outlet requirement check (multi-location validation)
- [ ] Date validation (within fiscal period)
- [ ] Amount validation (positive only, no negative invoices)
- [ ] Unit testing: 50+ test cases

**Code Location:** `server/services/aurumGuardians.ts` → `ArgusGuardian` class

**Implementation:**
```typescript
export class ArgusGuardian {
  async validate(entry: JournalEntry): Promise<ArgusCheckResult> {
    const errors = [];
    
    // Check 1: All GL accounts exist
    for (let line of entry.journalLines) {
      if (!await this.accountExists(line.glAccountId)) {
        errors.push(`GL Account ${line.glAccountId} does not exist`);
      }
    }
    
    // Check 2: Debits = Credits
    const totalDebits = sumDebits(entry.journalLines);
    const totalCredits = sumCredits(entry.journalLines);
    if (totalDebits !== totalCredits) {
      errors.push(`Debits (${totalDebits}) must equal Credits (${totalCredits})`);
    }
    
    // [More checks...]
    
    return {
      passed: errors.length === 0,
      errors,
      warnings: [],
      checksRun: 8
    };
  }
}
```

**Testing:** Unit tests in `server/services/aurumGuardians.spec.ts`

**Blocking Issues:** None

**Dependency:** Task 1.1 (needs orchestrator ready)

---

### Task 1.3: Zelda Guardian - Duplicate & Auto-Healing (William)
**Objective:** Detect duplicates, fix simple errors automatically

**Deliverables:**
- [ ] Duplicate invoice detection (same vendor, same amount, within 7 days)
- [ ] Transposed number detection (100 vs 010)
- [ ] Rounding difference detection (< $0.01 variance)
- [ ] Auto-reconciliation suggestions (for bank matching)
- [ ] Pre-fill common data (vendor names, GL accounts)
- [ ] Suggest matching transactions
- [ ] Unit tests: 40+ cases

**Code Location:** `server/services/aurumGuardians.ts` → `ZeldaGuardian` class

**Blocking Issues:** Need AP invoice history (all invoices from past 30 days)

---

## WEEK 2: Guardian Checks Integration + Real-Time Update

### Task 2.1: Phoenix Guardian - Anomaly Detection (Engineer)
**Objective:** Make Phoenix SMARTER with each transaction - learn fraud patterns

**Deliverables:**
- [ ] Large transaction detection (>2x historical average)
- [ ] Off-hours posting detection (outside 6am-10pm)
- [ ] Unknown vendor detection (not in master)
- [ ] High-risk GL account detection (cash, bank transfers)
- [ ] Rapid succession detection (same amount, multiple times in hour)
- [ ] Round number detection (fraud indicator)
- [ ] Machine learning: Historical patterns (what's "normal" for this company?)
- [ ] Unit tests: 50+ cases

**Code Location:** `server/services/aurumGuardians.ts` → `PhoenixGuardian` class

**Implementation:** Uses historical transaction data to build "normal" pattern, flags deviation

```typescript
export class PhoenixGuardian {
  async detectAnomalies(transaction: JournalEntry): Promise<PhoenixCheckResult> {
    const anomalies = [];
    
    // Load historical data for this entity
    const history = await this.getTransactionHistory(transaction.entityId, 90); // Past 90 days
    
    // Check: Large transaction?
    const avgAmount = average(history.map(t => t.amount));
    if (transaction.amount > avgAmount * 2) {
      anomalies.push({
        type: 'LARGE_TRANSACTION',
        severity: 'WARNING',
        message: `Amount $${transaction.amount} is 2x average (${avgAmount})`
      });
    }
    
    // Check: Off-hours?
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      anomalies.push({
        type: 'OFF_HOURS',
        severity: 'WARNING',
        message: `Posted at ${hour}:00 (outside 6am-10pm)`
      });
    }
    
    // [More checks...]
    
    return {
      passed: anomalies.filter(a => a.severity === 'ERROR').length === 0,
      anomalies,
      riskScore: calculateRisk(anomalies)
    };
  }
}
```

**Risk Scoring:** 0-100 scale
- 0-20: Safe
- 21-40: Review
- 41-60: Warning (requires approval)
- 61-100: Critical (blocks posting)

---

### Task 2.2: Odin Guardian - Immutable Audit Trail (William)
**Objective:** Make Odin the most complete audit trail - can't be altered

**Deliverables:**
- [ ] Immutable transaction logging (hash-based verification)
- [ ] WHO changed WHAT (user, timestamp, exact change)
- [ ] WHY changed (reason/comment field)
- [ ] Full transaction lineage (original → approved → posted → reversed)
- [ ] Crypto verification (can't alter without breaking hash)
- [ ] Audit report generation (one-click, external auditor ready)
- [ ] Filtering: by user, by date, by account
- [ ] Unit tests: 30+ cases

**Code Location:** 
- `server/services/aurumGuardians.ts` → `OdinGuardian` class
- New table: `guardian_audit_trail` (immutable log)

**Schema:**
```sql
CREATE TABLE guardian_audit_trail (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL,
  transaction_id UUID,
  transaction_type VARCHAR(50), -- 'journal_entry', 'invoice', 'payment'
  
  -- What happened
  action VARCHAR(50), -- 'created', 'updated', 'posted', 'reversed', 'approved'
  changed_fields JSONB, -- {account_number: '5000' → '6000', amount: '100' → '200'}
  
  -- Who did it
  user_id UUID,
  user_name VARCHAR(255),
  
  -- When & why
  timestamp TIMESTAMP DEFAULT NOW(),
  reason TEXT, -- "Q1 accrual", "Correction to invoice INV-001"
  
  -- Immutability
  prev_hash VARCHAR(256), -- Hash of previous row (chain)
  this_hash VARCHAR(256), -- Hash of this row
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_entity_date ON guardian_audit_trail(entity_id, timestamp);
CREATE INDEX idx_audit_transaction ON guardian_audit_trail(transaction_id);
```

**Blocking Issues:** Need hash function library (crypto/SHA256)

---

### Task 2.3: Guardian UI Panel (William)
**Objective:** Make Guardian checks VISIBLE in the UI

**Deliverables:**
- [ ] Real-time Guardian check display (shows which checks passed/failed)
- [ ] Visual indicators (🟢 passed, 🟡 warning, 🔴 failed)
- [ ] Drill-down details (click to see what failed and why)
- [ ] Guardian dashboard (see all checks for entity, real-time stream)
- [ ] Update `GuardianOversightPanel.tsx` component

**Code Location:** `client/modules/aurum/components/GuardianOversightPanel.tsx`

**UI Layout:**
```
GUARDIAN CHECKS: IN PROGRESS (2 seconds)
┌─────────────────────────────────────┐
│ ✅ Argus: All accounts valid        │
│ ⏳ Zelda: Checking for duplicates   │
│ 🔄 Phoenix: Analyzing patterns      │
│ 🔐 Odin: Logging to audit trail     │
└─────────────────────────────────────┘

[🔓 Unlock & Post] [❌ Cancel]
```

---

## WEEK 3: Guardian Hardening & Documentation

### Task 3.1: Guardian Performance Optimization (Engineer)
**Objective:** Guardian checks must be FAST (< 500ms per transaction)

**Deliverables:**
- [ ] Cache historical data (don't query full history each time)
- [ ] Parallelize checks (Argus + Zelda + Phoenix run simultaneously)
- [ ] Database query optimization (add indexes for Guardian lookups)
- [ ] Load testing: 1000 transactions/min must complete in <500ms

**Optimization Strategy:**
```typescript
// All checks run in parallel
const [argusResult, zeldaResult, phoenixResult, odinResult] = await Promise.all([
  argusGuardian.validate(transaction),
  zeldaGuardian.detectDuplicates(transaction),
  phoenixGuardian.detectAnomalies(transaction),
  odinGuardian.logImmutable(transaction)
]);
```

**Target Performance:**
- Argus validation: 50ms (just rule checks)
- Zelda duplication: 100ms (quick DB lookup)
- Phoenix anomaly: 200ms (more complex pattern matching)
- Odin logging: 50ms (just write to audit table)
- Total: < 500ms

---

### Task 3.2: Guardian Integration Tests (William)
**Objective:** Test Guardian checks together with GL posting

**Deliverables:**
- [ ] End-to-end test: Create entry → Run all Guardians → Post GL → Check audit trail
- [ ] Fraud scenario test: Try posting suspicious entry → Phoenix blocks it
- [ ] Duplicate test: Post duplicate invoice → Zelda detects and alerts
- [ ] Integration tests in Jest
- [ ] Test coverage: > 85%

---

### Task 3.3: Guardian Documentation & API Docs (William)
**Objective:** Customers understand what Guardian is doing

**Deliverables:**
- [ ] Guardian API documentation (`/api/guardian/checks`)
- [ ] Guardian results schema (what does each check return?)
- [ ] Fraud detection guide (how does Phoenix work?)
- [ ] Audit trail guide (how to access & export)
- [ ] Admin guide (how to configure Guardian settings per GL account)

**Documentation Location:** `docs/GUARDIAN_API.md`

---

## Sprint 1 Success Criteria

**Ship Friday Week 3:**
- ✅ All 4 Guardians running on every transaction (no exceptions)
- ✅ Guardian checks < 500ms latency
- ✅ Guardian UI shows real-time checks
- ✅ Audit trail immutable and queryable
- ✅ Zero production issues (tests pass)
- ✅ Documentation complete

---

---

# SPRINT 2: REAL-TIME GL POSTING (Weeks 4-6)

## Goal
Make GL posting instant, visible, accurate. Real-time consolidation. No delays.

---

## WEEK 4: Real-Time GL Posting Architecture

### Task 4.1: GL Posting Engine Optimization (Engineer)
**Objective:** Post to GL in < 100ms (vs. current ~500ms)

**Current Flow:**
```
Journal Entry Created
  → Validate (Argus) [50ms]
  → Check Duplicates (Zelda) [100ms]
  → Check Anomalies (Phoenix) [200ms]
  → Log (Odin) [50ms]
  → POST TO GL [current: 500ms - THIS IS SLOW]
  → Update GL Accounts [current: 300ms]
  → Update Consolidation [current: slow]
```

**New Flow:**
```
Journal Entry Created
  → Run All Guardians in parallel [< 500ms, doesn't block]
  → POST TO GL IMMEDIATELY [target: < 50ms]
  → Update GL Accounts [optimized: < 50ms]
  → Queue consolidation [async, doesn't block UI]
  → Return response [total < 600ms]
```

**Deliverables:**
- [ ] Remove blocking operations from GL posting
- [ ] Move consolidation to async queue
- [ ] Batch GL account updates (don't update each time)
- [ ] Use database connection pooling (Neon)
- [ ] Add indexes to GL posting tables
- [ ] Performance test: Post 1000 entries, measure time distribution

**Database Optimization:**
```sql
-- Index GL posting tables
CREATE INDEX idx_gl_journal_entity_date ON gl_journal_entries(entity_id, posting_date DESC);
CREATE INDEX idx_gl_account_entity ON gl_accounts(entity_id, is_active);
CREATE INDEX idx_gl_posting_rules_account ON gl_posting_rules(gl_account_id);

-- Batch updates instead of individual
UPDATE gl_accounts 
SET debit_balance = debit_balance + $1, updated_at = NOW()
WHERE id = ANY($2::uuid[])
```

---

### Task 4.2: Real-Time Consolidation Engine (William)
**Objective:** Multi-location GL rolls up to parent automatically

**Current:** Manual consolidation at month-end
**New:** Real-time (parent GL always current)

**Deliverables:**
- [ ] Consolidation trigger (when child posts, parent updates)
- [ ] Intercompany elimination (auto-detect & eliminate)
- [ ] Multi-currency handling (if tracking by currency)
- [ ] Consolidation status dashboard (see real-time roll-up)
- [ ] Configuration: Which accounts consolidate vs. which don't

**Implementation:**
```typescript
// When child entity posts entry
async function postJournalEntry(entry: JournalEntry) {
  // Post to child GL
  await postToGL(entry);
  
  // If child has parent, trigger consolidation
  if (entry.entity.parentEntityId) {
    // Add to consolidation queue (async)
    await queueConsolidation({
      childEntityId: entry.entityId,
      parentEntityId: entry.entity.parentEntityId,
      timestamp: NOW()
    });
  }
}

// Consolidation job (runs every 5 minutes)
async function runConsolidation() {
  for (let item of consolidationQueue) {
    // Get child GL balances
    const childBalances = await getGLBalances(item.childEntityId);
    
    // Create consolidation entry in parent
    const consolEntry = await createConsolidationEntry({
      parentEntityId: item.parentEntityId,
      childEntityId: item.childEntityId,
      balances: childBalances,
      description: `Consolidation: ${childEntity.name}`
    });
    
    // Post to parent GL
    await postToGL(consolEntry);
  }
}
```

---

### Task 4.3: Bank Feed Real-Time Posting (Engineer)
**Objective:** Bank transactions post to GL instantly

**Deliverables:**
- [ ] Bank feed listener (Stripe, Square, ACH, check processing)
- [ ] Auto-mapping (transaction → GL account)
- [ ] Real-time reconciliation (bank feed updates → GL updates)
- [ ] Reconciliation status (% of bank transactions matched)

---

## WEEK 5: Real-Time GL Dashboard & Mobile

### Task 5.1: GL Real-Time Dashboard (William)
**Objective:** See GL balances update in real-time (like Slack)

**Deliverables:**
- [ ] Dashboard showing real-time GL balances
- [ ] Drill-down to transactions (click account → see all transactions)
- [ ] Search: Find transaction by description, date, amount
- [ ] Filters: By period, by account type, by department/outlet
- [ ] Export: Download GL detail (CSV, Excel, PDF)

**Components to Build:**
- `GLRealtimeDashboard.tsx` (main dashboard)
- `GLAccountDrill.tsx` (drill-down view)
- `GLTransactionSearch.tsx` (search component)

---

### Task 5.2: Real-Time GL Mobile (William)
**Objective:** Controller can check GL from phone

**Deliverables:**
- [ ] Mobile-responsive GL dashboard
- [ ] Search transactions on mobile
- [ ] Mobile GL detail view
- [ ] Offline: Cache last GL balances (show stale if offline)

---

### Task 5.3: GL Posting WebSocket Updates (Engineer)
**Objective:** When GL posts, everyone's dashboard updates instantly

**Deliverables:**
- [ ] WebSocket connection (stay connected to GL updates)
- [ ] Push updates (new posting → all connected clients update)
- [ ] Live indicators (see postings happen in real-time)

**Implementation:**
```typescript
// Server: Publish GL posting events
emitter.emit('glPosted', {
  accountNumber: '5000',
  debitAmount: 100,
  creditAmount: 0,
  timestamp: NOW()
});

// Client: Subscribe to GL updates
useEffect(() => {
  const unsubscribe = subscribeToGLUpdates((update) => {
    setGLBalances(prev => ({
      ...prev,
      [update.accountNumber]: update.newBalance
    }));
  });
  return unsubscribe;
}, []);
```

---

## WEEK 6: Real-Time GL Testing & Hardening

### Task 6.1: GL Posting Load Testing (Engineer)
**Objective:** Ensure GL posting stays fast under load

**Deliverables:**
- [ ] Load test: 1000 GL postings/min
- [ ] Consolidation performance: 100 child locations updating parent
- [ ] Database performance: Query GL balances while posting
- [ ] Stress test: What breaks at 10,000 postings/min?

**Load Test Scenarios:**
```
Scenario 1: High-volume single location
  - 1000 postings/min
  - Measure: GL response time distribution
  - Target: 95th percentile < 500ms

Scenario 2: Multi-location consolidation
  - 100 child locations posting simultaneously
  - Parent consolidation every 5 min
  - Target: Parent GL updated < 30 seconds after child

Scenario 3: Month-end closing
  - 10,000 postings in 1 hour (peak load)
  - Consolidation running
  - Bank feeds coming in
  - Target: System stays responsive
```

---

### Task 6.2: GL Real-Time Testing (William)
**Objective:** Integration tests for real-time GL

**Deliverables:**
- [ ] Post entry → Dashboard updates (within 2 sec)
- [ ] Bank transaction arrives → GL updates
- [ ] Child posts → Parent GL updates within 30 sec
- [ ] Consolidation runs → GL balance correct
- [ ] End-to-end test: Transaction → Guardian → Post → Dashboard → Mobile

---

### Task 6.3: Real-Time GL Documentation (William)
**Objective:** Document how real-time GL works

**Deliverables:**
- [ ] Architecture guide (how real-time GL works)
- [ ] API documentation (`/api/gl/accounts`, `/api/gl/post`)
- [ ] Dashboard user guide
- [ ] Consolidation guide

---

## Sprint 2 Success Criteria

**Ship Friday Week 6:**
- ✅ GL posting < 100ms (99th percentile)
- ✅ Consolidation real-time (parent updates within 30 sec)
- ✅ Real-time dashboard shows live GL balances
- ✅ Mobile GL access working
- ✅ Load test: 1000 postings/min sustained
- ✅ Zero production issues

---

---

# SPRINT 3: INTEGRATION ECOSYSTEM (Weeks 7-9)

## Goal
Make Toast, OPERA, Gusto integrations so native, so fast, so reliable that competitors can't copy for 12+ months.

---

## WEEK 7: Toast POS Integration (MVP)

### Task 7.1: Toast Real-Time Event Stream (Engineer)
**Objective:** Get real-time sales data from Toast POS

**Deliverables:**
- [ ] Toast OAuth connection (authenticate to Toast)
- [ ] Event subscription (subscribe to sales, refund, payment events)
- [ ] Real-time listener (listen for events, don't poll)
- [ ] Error handling (Toast API down? Queue and retry)
- [ ] Testing: Simulate Toast events, verify GL posting

**Toast Events to Capture:**
```
sales.created        → Post revenue to GL account 4000 (rooms) or 4200 (F&B)
refund.created       → Post reversal
payment.processed    → Update bank account, cash
tax.calculated       → Post to tax payable
tip.recorded         → Post to tips payable
discount.applied     → Adjust revenue
void.recorded        → Reverse transaction
```

**Implementation:**
```typescript
// Toast Real-Time Event Handler
export class ToastEventListener {
  private socket: WebSocket;

  async connect(restaurantId: string, accessToken: string) {
    // Subscribe to Toast real-time events
    this.socket = new WebSocket(`wss://toast.example.com/events`);
    
    this.socket.on('message', async (event) => {
      if (event.type === 'sales.created') {
        await this.handleSaleEvent(event);
      } else if (event.type === 'refund.created') {
        await this.handleRefundEvent(event);
      }
      // [More event handlers]
    });
  }

  private async handleSaleEvent(event: ToastSaleEvent) {
    // Create GL journal entry
    const entry = {
      entityId: event.restaurantId,
      description: `Toast Sale: ${event.itemName}`,
      journalLines: [
        { glAccount: '1010', debit: event.amount }, // Bank
        { glAccount: '4200', credit: event.amount } // Revenue
      ]
    };
    
    // Post to GL (with Guardian checks)
    await postJournalEntry(entry);
  }
}
```

**Blocking Issues:** Need Toast API documentation, authentication credentials

---

### Task 7.2: OPERA PMS Integration (MVP) (William)
**Objective:** Get real-time room charges from OPERA PMS

**Deliverables:**
- [ ] OPERA connection (authenticate)
- [ ] Room charge event listener (when guest charged for room, bar, etc.)
- [ ] Real-time post to GL
- [ ] Folio reconciliation (guest balance = AR balance)
- [ ] Testing: Simulate room charges

**OPERA Events:**
```
folio.created        → New guest checked in
folio.charge.added   → Room charge, food charge, etc.
folio.payment        → Guest payment
folio.closed         → Guest checked out
```

---

### Task 7.3: Integration Architecture (William)
**Objective:** Build reusable integration framework (Toast, OPERA, Gusto all use it)

**Deliverables:**
- [ ] `IntegrationConnector` base class (all integrations extend this)
- [ ] Event router (incoming event → correct GL mapping)
- [ ] Retry logic (failed posting → queue & retry)
- [ ] Status monitoring (is Toast connected? Is data flowing?)
- [ ] Configuration UI (users configure GL account mapping)

**Architecture:**
```typescript
// Base class for all integrations
export abstract class IntegrationConnector {
  abstract connect(credentials: Record<string, any>): Promise<void>;
  abstract listen(): Observable<IntegrationEvent>;
  abstract mapEventToGLEntry(event: IntegrationEvent): JournalEntry;
  abstract handleError(error: Error): Promise<void>;
  
  async onEvent(event: IntegrationEvent) {
    const entry = this.mapEventToGLEntry(event);
    try {
      await postJournalEntry(entry);
      this.logSuccess(event);
    } catch (error) {
      await this.handleError(error);
      await this.requeue(event); // Retry later
    }
  }
}

// Toast implementation
export class ToastConnector extends IntegrationConnector {
  // Toast-specific implementation
}

// OPERA implementation
export class OPERAConnector extends IntegrationConnector {
  // OPERA-specific implementation
}
```

---

## WEEK 8: Gusto Payroll Integration + Full Testing

### Task 8.1: Gusto Payroll Integration (Engineer)
**Objective:** Payroll posts to GL automatically

**Deliverables:**
- [ ] Gusto connection (OAuth)
- [ ] Payroll event listener (when payroll runs)
- [ ] GL mapping (Gusto payroll → GL accounts)
- [ ] Auto-posting: Salary, taxes, benefits all post automatically
- [ ] Testing: Simulate payroll

**Payroll to GL Mapping:**
```
Gusto Salary         → GL 6000 (Payroll Expense)
Gusto Taxes          → GL 2100 (Accrued Taxes)
Gusto Benefits       → GL 6404 (Payroll Benefits)
Gusto Direct Deposit → GL 1010 (Bank Account)
```

---

### Task 8.2: Integration Testing (William)
**Objective:** All integrations work together seamlessly

**Deliverables:**
- [ ] E2E test: Toast sale → GL posts → Dashboard updates
- [ ] E2E test: OPERA room charge → GL posts → AR updated
- [ ] E2E test: Gusto payroll → GL posts → Accruals created
- [ ] Integration test: Multiple events from multiple sources simultaneously
- [ ] Performance: 100 events/sec from Toast, OPERA, Gusto = system stays responsive

**E2E Test Scenario:**
```
1. Guest checks in (OPERA) → Room revenue posts to GL 4000
2. Guest orders food (Toast) → Food revenue posts to GL 4200
3. Guest pays (Toast) → Cash posts to GL 1010
4. Month ends → Gusto payroll runs
   - Salary posts to GL 6000
   - Taxes post to GL 2100
   - Cash posts to GL 1010
5. Dashboard shows updated GL, consolidated across properties
6. Guardian checked every posting (Phoenix verified no fraud)
7. Audit trail logged (Odin captured every change)

Total flow: < 5 seconds from event to GL to dashboard
```

---

### Task 8.3: Integration Monitoring Dashboard (William)
**Objective:** Real-time status of all integrations

**Deliverables:**
- [ ] Connection status (Toast: 🟢 Connected, OPERA: 🟢 Connected, Gusto: 🔴 Disconnected)
- [ ] Event count (Toast: 1,234 events today, OPERA: 456, Gusto: 89)
- [ ] Error count (Failed postings: 3)
- [ ] Data freshness (Toast: Updated 2 min ago, OPERA: 5 sec ago)
- [ ] Reconnect UI (if disconnected, easy reconnect button)

---

## WEEK 9: Integration Hardening & Documentation

### Task 9.1: Integration Error Handling & Resilience (Engineer)
**Objective:** Integrations work even if services are flaky

**Deliverables:**
- [ ] Retry logic (fail once → queue → retry after 5 min → exponential backoff)
- [ ] Dead letter queue (if 5 retries fail, alert admin)
- [ ] Graceful degradation (if Toast down, still post locally, sync later)
- [ ] Health checks (ping Toast, OPERA, Gusto API health every 5 min)
- [ ] Alerting (integration down → email admin)

**Resilience Patterns:**
```typescript
// Retry with exponential backoff
async function postWithRetry(entry: JournalEntry, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await postJournalEntry(entry);
    } catch (error) {
      if (attempt === maxRetries) {
        // Final failure → dead letter queue
        await deadLetterQueue.add(entry);
        await alertAdmin(`Failed to post after 5 retries: ${entry.id}`);
        throw error;
      }
      // Wait before retry: 30s, 60s, 120s, 240s, 480s
      const backoffMs = Math.pow(2, attempt) * 15000;
      await sleep(backoffMs);
    }
  }
}

// Health check every 5 min
setInterval(async () => {
  const status = {
    toast: await toastConnector.healthCheck(),
    opera: await operaConnector.healthCheck(),
    gusto: await gustoConnector.healthCheck()
  };
  if (!status.toast.healthy) {
    await alertAdmin('Toast integration unhealthy');
  }
}, 5 * 60 * 1000);
```

---

### Task 9.2: Integration Documentation (William)
**Objective:** Users can self-serve integration setup

**Deliverables:**
- [ ] Toast integration guide (how to connect, what data flows)
- [ ] OPERA integration guide
- [ ] Gusto integration guide
- [ ] Troubleshooting guide (integration not connecting? See this)
- [ ] GL account mapping guide (how to customize which account receives revenue)

**Documentation Location:** `docs/INTEGRATIONS/`

---

### Task 9.3: Integration Performance Optimization (Engineer)
**Objective:** Integrations don't slow down GL posting

**Deliverables:**
- [ ] Integration events processed async (don't block GL response)
- [ ] Batch posting (queue events, post in batches every 10 sec)
- [ ] Caching (don't query GL account mapping every time)
- [ ] Database query optimization (integration lookups are fast)

**Performance Targets:**
- Toast event received → Posted to GL: < 10 seconds
- OPERA charge → GL posting: < 10 seconds
- Gusto payroll → GL entries: < 30 seconds
- Dashboard updated with integration data: < 1 minute

---

## Sprint 3 Success Criteria

**Ship Friday Week 9:**
- ✅ Toast integration live (real sales → GL posting)
- ✅ OPERA integration live (room charges → GL posting)
- ✅ Gusto integration live (payroll → GL posting)
- ✅ All integrations resilient (handle API downtime)
- ✅ Integration monitoring dashboard live
- ✅ Load test: 1000 integration events/min sustained
- ✅ E2E test passing (event → GL → dashboard)

---

---

# WEEKS 10-12: LUCCCA ECOSYSTEM INTEGRATION + PRODUCTION HARDENING

## WEEK 10: LUCCCA Ecosystem Wiring

### Task 10.1: LUCCCA Data Flow (William + Engineer)
**Objective:** EchoAurum becomes the GL nervous system for LUCCCA

**Deliverables:**
- [ ] Connect EchoAurum to LUCCCA property management system
- [ ] LUCCCA data (guests, bookings, charges) → Toast (POS)
- [ ] Toast sales → EchoAurum (GL posting)
- [ ] EchoAurum GL → LUCCCA reporting
- [ ] Real-time financial view in LUCCCA

**LUCCCA Integration Flow:**
```
LUCCCA Property System
  ↓ (room data, guest info)
Toast POS
  ↓ (sales, refunds)
EchoAurum GL
  ↓ (revenue, COGS, expenses)
LUCCCA Reporting Dashboard
  ↓ (daily P&L, cash position)
Back to LUCCCA
```

---

### Task 10.2: LUCCCA Real-Time Reporting (Engineer)
**Objective:** LUCCCA users see real-time financial data

**Deliverables:**
- [ ] Revenue dashboard (today's room sales, F&B sales)
- [ ] Expense dashboard (payroll, supplies, utilities)
- [ ] Profit dashboard (real-time P&L, not month-end)
- [ ] Cash position (cash on hand, AR, AP)

---

## WEEK 11: Guardian AI + GL + Integrations = Unbreakable

### Task 11.1: Full Moat Integration Testing (William + Engineer)
**Objective:** Entire system (Guardian + GL + Integrations) works as one

**Deliverables:**
- [ ] Toast sale → Guardian checks → GL posts → LUCCCA updates: all in < 10 seconds
- [ ] Multi-location: 10 properties posting simultaneously → All consolidated in parent in < 30 seconds
- [ ] Fraud test: Try posting fraudulent entry → Phoenix blocks it → Admin alerted
- [ ] Compliance test: Every transaction logged immutably → Can generate audit report in 1 click
- [ ] Stress test: 10,000 transactions across all systems in 1 hour → System stays responsive

---

### Task 11.2: Production Readiness (Engineer)
**Objective:** Code is production-ready, resilient, performant

**Deliverables:**
- [ ] Code coverage: > 90% (especially Guardian & GL posting)
- [ ] Performance benchmarks: GL posting < 100ms, Guardian checks < 500ms
- [ ] Load test: 1000 transactions/min sustained
- [ ] Security audit: No SQL injection, no data leaks
- [ ] Logging: Every important event logged (debugging easier)
- [ ] Monitoring: Alerts for errors, slowness, failures
- [ ] Backup: Automatic nightly backups, tested recovery

---

## WEEK 12: Documentation, Launch, & Celebrate

### Task 12.1: Complete Documentation (William)
**Objective:** Users understand the system they're using

**Deliverables:**
- [ ] Architecture guide (how Guardian + GL + Integrations work together)
- [ ] Admin guide (how to configure, manage, troubleshoot)
- [ ] User guide (how to post entries, view GL, use dashboard)
- [ ] API documentation (all endpoints, examples, error codes)
- [ ] Troubleshooting guide (common issues and solutions)
- [ ] Video walkthroughs (Guardian demo, GL posting demo, integration setup)

---

### Task 12.2: Customer Launch Prep (William)
**Objective:** Beta customers are ready to use the system

**Deliverables:**
- [ ] 5 beta customers onboarded
- [ ] Training complete (they understand Guardian, GL posting, integrations)
- [ ] Data migrated (historical GL data imported)
- [ ] Integrations configured (Toast, OPERA, Gusto connected)
- [ ] Support plan (how to reach help, SLA response time)

---

### Task 12.3: Market Launch (William)
**Objective:** Announce to market that EchoAurum is unbeatable

**Deliverables:**
- [ ] Press release: "Guardian AI + Real-Time GL = Industry First"
- [ ] Case study: Beta customer testimonial (ROI proof)
- [ ] Blog post: "How Guardian AI Prevents Fraud 80% Better Than Competitors"
- [ ] Video: "See EchoAurum Guardian AI in Action"
- [ ] Twitter/LinkedIn: Launch announcements

---

# END OF 90 DAYS: WHAT YOU'LL HAVE BUILT

## By Friday Week 12:

### Guardian AI (Iron-Clad Moat #1)
- ✅ Argus: Validates every rule (double-entry, GL accounts, cost centers)
- ✅ Zelda: Detects duplicates, auto-heals simple errors
- ✅ Phoenix: Detects anomalies & fraud (learns from every transaction)
- ✅ Odin: Immutable audit trail (can't be altered)
- ✅ Real-time: All checks < 500ms, doesn't block posting
- ✅ UI: Guardian dashboard shows live checks, drill-down details
- ✅ Unbeatable: Competitors need 18-24 months to copy (requires machine learning, architecture redesign)

### Real-Time GL Posting (Speed Advantage)
- ✅ GL posting < 100ms (industry fastest)
- ✅ Real-time consolidation (parent GL always current)
- ✅ Real-time dashboard (see GL balances update live)
- ✅ Mobile GL (check GL from anywhere)
- ✅ Bank feeds (automatic GL posting)
- ✅ Unbeatable: Competitors are batch-based (slow)

### Integration Ecosystem (Lock-In Moat)
- ✅ Toast POS: Real-time sales → GL posting
- ✅ OPERA PMS: Real-time room charges → GL posting
- ✅ Gusto Payroll: Payroll → GL posting
- ✅ Resilient: Handles API downtime, queues & retries
- ✅ Monitoring: Integration status dashboard
- ✅ Unbeatable: Deep native integrations (competitors require middleware)

### LUCCCA Ecosystem Ready
- ✅ EchoAurum is GL nerve system for LUCCCA
- ✅ Real-time financial visibility
- ✅ Cross-system data flow (LUCCCA → Toast → EchoAurum → LUCCCA)

---

# THE IRON-CLAD MOAT YOU'LL HAVE

### Defensibility Level: 🔒🔒🔒🔒🔒 (Maximum)

**Why competitors can't catch up:**

1. **Guardian AI = 18-24 month development**
   - Requires ML architecture (you already have it)
   - Requires hospitality domain expertise (rare, hard to hire)
   - Requires 12+ months of transaction data (you'll have it)
   - Switching cost: One fraud catch = pays for 2-5 years of subscription

2. **Real-Time GL = 6-month development + complex optimization**
   - Requires rearchitecting batch systems (NetSuite, SAP built on batch)
   - Competitors' databases not optimized for real-time
   - Your serverless architecture is 3x faster

3. **Integrations = 12-18 months per integration**
   - Toast, OPERA APIs are complex and change frequently
   - You'll have production-tested integration code
   - Each integration = time to migrate customers is cheaper with you

4. **Hospitality Expertise = You have it, they don't**
   - USALI GL structure
   - Multi-outlet consolidation
   - Recipe costing
   - Gaming GL
   - Nobody else knows hospitality GL like you will

---

# SUCCESS METRICS (Weekly Tracking)

## Every Friday, measure:

| Metric | Week 3 Target | Week 6 Target | Week 9 Target | Week 12 Target |
|--------|---------------|---------------|---------------|----------------|
| Guardian Checks Passing | 95%+ | 99%+ | 99.9%+ | 99.99%+ |
| GL Posting Latency (99th %ile) | < 500ms | < 100ms | < 100ms | < 100ms |
| Integration Events Processed | 1000/day | 50K/day | 500K/day | 1M+/day |
| Real-Time Consolidation Time | 5 min | 30 sec | 30 sec | < 30 sec |
| Code Test Coverage | 70% | 85% | 90% | 95%+ |
| Production Errors | < 5/day | < 1/day | 0/day | 0/day |
| Customer Satisfaction (Beta) | N/A | N/A | 4.5/5 | 4.8/5 |

---

# RESOURCE ALLOCATION

## William (Parallel)
- **Weeks 1-3:** Guardian AI orchestration, UI, documentation
- **Weeks 4-6:** GL dashboard, mobile, real-time updates, documentation
- **Weeks 7-9:** Integration architecture, configuration UI, monitoring, documentation
- **Weeks 10-12:** LUCCCA integration, customer launch, market launch

## Engineer
- **Weeks 1-3:** Argus, Zelda, Odin Guardians, integration tests
- **Weeks 4-6:** GL posting optimization, consolidation, load testing
- **Weeks 7-9:** Toast, Gusto integrations, error handling, performance
- **Weeks 10-12:** Full system testing, production hardening, monitoring

---

# FAILURE MODES & MITIGATION

## Risk 1: Guardian checks slow down GL posting
**Mitigation:** Run checks in parallel, not sequential. Target: 500ms parallel vs. 1000ms sequential

## Risk 2: Real-time consolidation can't keep up with high volume
**Mitigation:** Use async queue, run consolidation every 5 min instead of immediately

## Risk 3: Integrations break when Toast/OPERA/Gusto changes their API
**Mitigation:** Use resilient retry logic, monitor API health, test regularly against staging environments

## Risk 4: Performance degrades with 100+ properties consolidating
**Mitigation:** Load test early (Week 6), optimize database queries, use caching

## Risk 5: Data integrity issues during Guardian → GL → Integration flow
**Mitigation:** Extensive end-to-end testing, audit trail verification, reconciliation reports

---

# GO-LIVE CHECKLIST (Week 12)

- [ ] All Guardian checks passing on 100% of transactions
- [ ] GL posting < 100ms consistently
- [ ] Consolidation working across 10+ test properties
- [ ] Toast integration processing 1000+ events/day
- [ ] OPERA integration processing 500+ events/day
- [ ] Gusto integration processing 100+ events/day
- [ ] Guardian dashboard live and intuitive
- [ ] GL real-time dashboard live
- [ ] Mobile GL working
- [ ] Audit trail immutable and queryable
- [ ] Documentation complete and user-tested
- [ ] 5 beta customers onboarded successfully
- [ ] Zero critical production issues
- [ ] Load test: 1000 transactions/min sustained
- [ ] Security audit: No vulnerabilities
- [ ] Monitoring & alerting live
- [ ] Customer support plan in place

---

# YOUR COMPETITIVE POSITION (After 90 Days)

**vs. Xero:**
- You have Guardian AI, they don't → You win on fraud detection
- You have real-time GL, they're batch → You win on speed
- You have native Toast integration, they require middleware → You win on simplicity

**vs. QuickBooks:**
- You have real-time GL, they're batch → You win on reporting freshness
- You have Guardian AI, they don't → You win on compliance
- You're 30-40% cheaper for multi-location → You win on price

**vs. Restaurant365:**
- You have Guardian AI, they don't → You win on fraud/error detection
- You have real-time GL, they're batch → You win on reporting speed
- You have hotel support, they don't → You win on vertical breadth
- You're 40-50% cheaper → You win on price

**vs. NetSuite:**
- You're 30x cheaper ($100/location vs. $1000+) → You win on price
- You implement in 2 weeks, they take 6 months → You win on speed
- You're hospitality-native, they're generic → You win on fit

---

**YOU WILL BE UNBEATABLE.**

In 90 days, with 2 people moving at full sprint, you will have built something that takes competitors 12-24 months to copy.

That is your iron-clad moat.

