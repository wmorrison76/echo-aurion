# WEEK-BY-WEEK DETAILED SPRINT TASKS
## 12-Week Iron-Clad Moat Execution (All Detailed Tasks)

**Format:** Each task has Owner, Deliverable, Code Location, Dependencies, Definition of Done

---

# SPRINT 1: GUARDIAN AI (Weeks 1-3)

---

## WEEK 1: Guardian Infrastructure

### WILLIAM's Tasks

#### 1.1.1: Create Guardian Orchestrator Class
**Owner:** William  
**Time:** 4-6 hours  
**Deliverable:** `GuardianOrchestrator` class that runs all 4 guardians on every transaction

**Code Location:** `server/services/aurumGuardians.ts`

**Specific Code to Write:**
```typescript
export class GuardianOrchestrator {
  private argus: ArgusGuardian;
  private zelda: ZeldaGuardian;
  private phoenix: PhoenixGuardian;
  private odin: OdinGuardian;

  constructor() {
    this.argus = new ArgusGuardian();
    this.zelda = new ZeldaGuardian();
    this.phoenix = new PhoenixGuardian();
    this.odin = new OdinGuardian();
  }

  async runGuardianChecks(transaction: JournalEntry): Promise<GuardianResult> {
    // Run all 4 in parallel
    const [argusResult, zeldaResult, phoenixResult, odinResult] = await Promise.all([
      this.argus.validate(transaction),
      this.zelda.detectDuplicates(transaction),
      this.phoenix.detectAnomalies(transaction),
      this.odin.logImmutable(transaction)
    ]);

    return {
      transactionId: transaction.id,
      timestamp: new Date(),
      argus: argusResult,
      zelda: zeldaResult,
      phoenix: phoenixResult,
      odin: odinResult,
      passedAll: argusResult.passed && zeldaResult.passed && phoenixResult.passed && odinResult.passed,
      warnings: [
        ...argusResult.warnings,
        ...zeldaResult.warnings,
        ...phoenixResult.warnings
      ],
      blockingErrors: [
        ...argusResult.errors,
        ...zeldaResult.errors,
        ...phoenixResult.errors
      ],
      riskScore: phoenixResult.riskScore
    };
  }
}
```

**Definition of Done:**
- [ ] `GuardianOrchestrator` class created and compiles
- [ ] All 4 Guardian instances initialize
- [ ] `runGuardianChecks()` returns proper `GuardianResult` type
- [ ] Tests: 5 unit tests (run all, return correct, handle errors)

---

#### 1.1.2: Add Guardian Check Hooks in GL Posting Flow
**Owner:** William  
**Time:** 3-4 hours  
**Deliverable:** Guardian checks run before GL posting (non-blocking, but run async)

**Code Location:** `server/routes/aurumGl.ts` (POST `/journal-entries`)

**Specific Code to Modify:**
```typescript
// In POST /journal-entries endpoint
export async function createJournalEntry(req: Request, res: Response) {
  const entry = req.body as JournalEntry;
  
  // Run Guardian checks (async, doesn't block response)
  const guardianResults = await guardianOrchestrator.runGuardianChecks(entry);
  
  // Save Guardian results for UI
  await db.saveGuardianResults(entry.id, guardianResults);
  
  // If blocking errors, reject
  if (guardianResults.blockingErrors.length > 0) {
    return res.status(400).json({
      error: 'Guardian checks failed',
      details: guardianResults.blockingErrors
    });
  }
  
  // Post to GL
  const result = await aurumDB.postJournalEntry(entry);
  
  // Return with Guardian results
  return res.json({
    success: true,
    transactionId: result.id,
    guardianResults
  });
}
```

**Definition of Done:**
- [ ] Guardian checks run before posting
- [ ] Blocking errors prevent posting
- [ ] Guardian results saved to database
- [ ] Test: Post valid entry → Guardian passes → Entry posted
- [ ] Test: Post invalid entry → Guardian blocks → Entry rejected

---

### ENGINEER's Tasks

#### 1.2.1: Create Argus Guardian - Account Validation
**Owner:** Engineer  
**Time:** 8-10 hours  
**Deliverable:** Complete Argus Guardian with all GL validation rules

**Code Location:** `server/services/aurumGuardians.ts`

**Specific Code to Write:**
```typescript
export class ArgusGuardian {
  private db: AurumDatabaseService;

  constructor(db: AurumDatabaseService) {
    this.db = db;
  }

  async validate(entry: JournalEntry): Promise<ArgusCheckResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Journal has lines
    if (!entry.journalLines || entry.journalLines.length === 0) {
      errors.push('Journal entry must have at least one line');
      return { passed: false, errors, warnings, checksRun: 0 };
    }

    // Check 2: All GL accounts exist
    for (const line of entry.journalLines) {
      const account = await this.db.getGLAccount(line.glAccountId);
      if (!account) {
        errors.push(`GL Account ${line.glAccountId} does not exist`);
      }
      if (account && !account.is_active) {
        errors.push(`GL Account ${account.account_name} is inactive`);
      }
    }

    // Check 3: Debits = Credits exactly
    const totalDebits = entry.journalLines
      .filter(l => l.debit)
      .reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredits = entry.journalLines
      .filter(l => l.credit)
      .reduce((sum, l) => sum + (l.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      errors.push(`Debits (${totalDebits}) must equal Credits (${totalCredits})`);
    }

    // Check 4: Each line has either debit OR credit (not both)
    for (let i = 0; i < entry.journalLines.length; i++) {
      const line = entry.journalLines[i];
      if ((line.debit && line.debit > 0) && (line.credit && line.credit > 0)) {
        errors.push(`Line ${i + 1} cannot have both debit and credit`);
      }
      if (!line.debit && !line.credit) {
        errors.push(`Line ${i + 1} must have either debit or credit amount`);
      }
    }

    // Check 5: Required cost center (if account requires it)
    for (let i = 0; i < entry.journalLines.length; i++) {
      const line = entry.journalLines[i];
      const account = await this.db.getGLAccount(line.glAccountId);
      if (account?.requires_cost_center && !line.costCenter) {
        errors.push(`Line ${i + 1} requires cost center for account ${account.account_name}`);
      }
    }

    // Check 6: Required department
    for (let i = 0; i < entry.journalLines.length; i++) {
      const line = entry.journalLines[i];
      const account = await this.db.getGLAccount(line.glAccountId);
      if (account?.requires_department && !line.department) {
        errors.push(`Line ${i + 1} requires department for account ${account.account_name}`);
      }
    }

    // Check 7: Date within fiscal period
    const period = await this.db.getFiscalPeriod(entry.entityId, entry.postingDate);
    if (!period || !period.is_open) {
      warnings.push(`Posting date ${entry.postingDate} is outside open fiscal period`);
    }

    // Check 8: Amounts are positive (no negative amounts)
    for (let i = 0; i < entry.journalLines.length; i++) {
      const line = entry.journalLines[i];
      if ((line.debit && line.debit < 0) || (line.credit && line.credit < 0)) {
        errors.push(`Line ${i + 1} amounts must be positive`);
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      checksRun: 8
    };
  }
}
```

**Unit Tests to Write:**
```typescript
describe('ArgusGuardian', () => {
  // Test 1: Valid entry passes
  // Test 2: Entry without lines fails
  // Test 3: Invalid GL account fails
  // Test 4: Debits != Credits fails
  // Test 5: Both debit and credit fails
  // Test 6: Missing cost center fails (when required)
  // Test 7: Missing department fails (when required)
  // Test 8: Out of period warns
  // Test 9: Negative amount fails
  // Test 10: Exact debit/credit balance passes
});
```

**Definition of Done:**
- [ ] All 8 validation checks implemented
- [ ] 10+ unit tests, all passing
- [ ] Code compiles, no TypeScript errors
- [ ] Integration test: Valid entry passes Argus

---

#### 1.2.2: Update Shared Types for Guardian Results
**Owner:** Engineer  
**Time:** 2-3 hours  
**Deliverable:** TypeScript types for all Guardian results

**Code Location:** `shared/aurum.ts`

**Specific Types to Add:**
```typescript
// Guardian Results
export interface ArgusCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  checksRun: number;
}

export interface ZeldaCheckResult {
  passed: boolean;
  duplicatesDetected: DuplicateWarning[];
  autoHeals: AutoHeal[];
  warnings: string[];
}

export interface PhoenixCheckResult {
  passed: boolean;
  anomalies: Anomaly[];
  riskScore: number; // 0-100
  warnings: string[];
}

export interface OdinCheckResult {
  passed: boolean;
  transactionHash: string;
  auditTrailId: string;
  warnings: string[];
}

export interface GuardianResult {
  transactionId: string;
  timestamp: Date;
  argus: ArgusCheckResult;
  zelda: ZeldaCheckResult;
  phoenix: PhoenixCheckResult;
  odin: OdinCheckResult;
  passedAll: boolean;
  blockingErrors: string[];
  warnings: string[];
  riskScore: number;
}

export interface DuplicateWarning {
  type: 'EXACT_DUPLICATE' | 'LIKELY_DUPLICATE' | 'TRANSPOSED' | 'ROUNDING';
  message: string;
  matchingTransactionId: string;
  confidence: number; // 0-1
}

export interface AutoHeal {
  type: 'ROUNDING_CORRECTION' | 'DUPLICATE_REMOVAL' | 'AMOUNT_ADJUSTMENT';
  description: string;
  originalAmount: number;
  correctedAmount: number;
}

export interface Anomaly {
  type: 'LARGE_AMOUNT' | 'OFF_HOURS' | 'UNKNOWN_VENDOR' | 'HIGH_RISK_ACCOUNT' | 'RAPID_SUCCESSION' | 'ROUND_NUMBER';
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  recommendation: string;
}
```

**Definition of Done:**
- [ ] All Guardian result types defined
- [ ] Types match implementation in aurumGuardians.ts
- [ ] No TypeScript errors
- [ ] Exports available to both server and client

---

## WEEK 1 SUMMARY

**By Friday Week 1:**
- [ ] GuardianOrchestrator running on all GL postings
- [ ] Argus Guardian validating all transactions
- [ ] Guardian results stored in database
- [ ] All types defined in shared/aurum.ts
- [ ] Tests passing (15+ unit tests)
- [ ] No production issues

**Ready for:** Week 2 (Zelda + Phoenix + Odin)

---

## WEEK 2: Guardian Checks Integration

### ENGINEER's Tasks

#### 2.1.1: Zelda Guardian - Duplicate Detection
**Owner:** Engineer  
**Time:** 8-10 hours  

**Code Location:** `server/services/aurumGuardians.ts` → `ZeldaGuardian`

**Implementation Details:**
```typescript
export class ZeldaGuardian {
  async detectDuplicates(entry: JournalEntry): Promise<ZeldaCheckResult> {
    const duplicates: DuplicateWarning[] = [];
    const autoHeals: AutoHeal[] = [];

    // Get last 30 days of invoices/entries
    const recentEntries = await this.db.getRecentJournalEntries(
      entry.entityId,
      30 // days
    );

    // Check each line in current entry
    for (const line of entry.journalLines) {
      // 1. Exact duplicate (same vendor, amount, date within 7 days)
      const exactMatch = recentEntries.find(
        e => e.vendorId === entry.vendorId &&
             e.amount === line.debit || line.credit &&
             Math.abs(differenceInDays(e.postingDate, entry.postingDate)) <= 7
      );

      if (exactMatch) {
        duplicates.push({
          type: 'EXACT_DUPLICATE',
          message: `Exact duplicate of entry ${exactMatch.id} from ${exactMatch.postingDate}`,
          matchingTransactionId: exactMatch.id,
          confidence: 0.95
        });
      }

      // 2. Transposed number detection (100 vs 010)
      const transposedMatches = this.findTransposedNumbers(
        line.debit || line.credit,
        recentEntries
      );
      if (transposedMatches.length > 0) {
        duplicates.push({
          type: 'TRANSPOSED',
          message: `Possible transposed amount (entered ${line.debit || line.credit}, found similar entries with transposed digits)`,
          matchingTransactionId: transposedMatches[0].id,
          confidence: 0.70
        });
      }

      // 3. Rounding difference (<$0.01)
      const roundingMatches = recentEntries.filter(
        e => Math.abs((e.amount || 0) - (line.debit || line.credit || 0)) < 0.01
      );
      if (roundingMatches.length > 0 && roundingMatches[0]) {
        const difference = (roundingMatches[0].amount || 0) - (line.debit || line.credit || 0);
        if (difference !== 0) {
          autoHeals.push({
            type: 'ROUNDING_CORRECTION',
            description: `Auto-correcting rounding difference of $${difference.toFixed(2)}`,
            originalAmount: line.debit || line.credit || 0,
            correctedAmount: (line.debit || line.credit || 0) + difference
          });
        }
      }
    }

    return {
      passed: duplicates.filter(d => d.confidence > 0.9).length === 0,
      duplicatesDetected: duplicates,
      autoHeals,
      warnings: duplicates.map(d => d.message)
    };
  }

  private findTransposedNumbers(
    amount: number,
    entries: JournalEntry[]
  ): JournalEntry[] {
    const amountStr = amount.toString().replace(/\./g, '');
    const reversed = amountStr.split('').reverse().join('');
    const reversedNum = parseInt(reversed);

    return entries.filter(e => {
      const eStr = ((e.debit || e.credit) || 0).toString().replace(/\./g, '');
      return eStr === reversed;
    });
  }
}
```

**Definition of Done:**
- [ ] Duplicate detection running (exact, transposed, rounding)
- [ ] 12+ unit tests passing
- [ ] Zelda runs in parallel with other Guardians
- [ ] Performance: Zelda check < 100ms

---

#### 2.1.2: Phoenix Guardian - Anomaly Detection
**Owner:** Engineer  
**Time:** 10-12 hours  

**Code Location:** `server/services/aurumGuardians.ts` → `PhoenixGuardian`

**Key Features:**
1. Historical pattern analysis
2. Anomaly scoring (0-100)
3. Machine learning foundation (for future improvements)

```typescript
export class PhoenixGuardian {
  private db: AurumDatabaseService;

  async detectAnomalies(entry: JournalEntry): Promise<PhoenixCheckResult> {
    const anomalies: Anomaly[] = [];
    let riskScore = 0;

    // Load historical data (past 90 days)
    const history = await this.db.getTransactionHistory(entry.entityId, 90);

    // For each line in current entry
    for (let i = 0; i < entry.journalLines.length; i++) {
      const line = entry.journalLines[i];
      const amount = line.debit || line.credit || 0;

      // Anomaly 1: Large transaction (>2x average)
      const avgAmount = this.calculateAverage(history);
      if (amount > avgAmount * 2) {
        anomalies.push({
          type: 'LARGE_AMOUNT',
          severity: 'WARNING',
          message: `Amount $${amount.toFixed(2)} is 2x average ($${avgAmount.toFixed(2)})`,
          recommendation: 'Verify amount is correct'
        });
        riskScore += 15;
      }

      // Anomaly 2: Off-hours posting (outside 6am-10pm)
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        anomalies.push({
          type: 'OFF_HOURS',
          severity: 'WARNING',
          message: `Posting at ${hour}:00 (outside normal 6am-10pm window)`,
          recommendation: 'Off-hours postings are unusual; verify authenticity'
        });
        riskScore += 10;
      }

      // Anomaly 3: Unknown vendor (not in master)
      const vendorExists = await this.db.getVendor(entry.vendorId);
      if (!vendorExists) {
        anomalies.push({
          type: 'UNKNOWN_VENDOR',
          severity: 'WARNING',
          message: `Vendor ${entry.vendorId} not in master vendor list`,
          recommendation: 'Add vendor to master before posting'
        });
        riskScore += 20;
      }

      // Anomaly 4: High-risk GL account (cash, bank transfers)
      const account = await this.db.getGLAccount(line.glAccountId);
      const highRiskAccounts = ['1000', '1010', '1012', '2400']; // Cash accounts
      if (account && highRiskAccounts.includes(account.account_number)) {
        anomalies.push({
          type: 'HIGH_RISK_ACCOUNT',
          severity: 'WARNING',
          message: `High-risk account ${account.account_name}; fraud indicator`,
          recommendation: 'Verify authorization and supporting documentation'
        });
        riskScore += 25;
      }

      // Anomaly 5: Rapid succession (same amount, multiple times within 1 hour)
      const rapidMatches = history.filter(
        h => h.amount === amount &&
             differenceInMinutes(h.postingDate, new Date()) < 60
      );
      if (rapidMatches.length >= 2) {
        anomalies.push({
          type: 'RAPID_SUCCESSION',
          severity: 'WARNING',
          message: `Amount $${amount} posted ${rapidMatches.length} times in last hour`,
          recommendation: 'Could indicate automated fraud; verify manually'
        });
        riskScore += 30;
      }

      // Anomaly 6: Round numbers (potential fraud indicator)
      const isRoundNumber = amount % 100 === 0 && amount >= 1000;
      if (isRoundNumber) {
        anomalies.push({
          type: 'ROUND_NUMBER',
          severity: 'INFO',
          message: `Round amount $${amount.toFixed(2)} (fraud indicator)`,
          recommendation: 'Verify this is intentional, not fraud'
        });
        riskScore += 5;
      }
    }

    // Weekend posting
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      anomalies.push({
        type: 'OFF_HOURS',
        severity: 'INFO',
        message: `Weekend posting (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]})`,
        recommendation: 'Weekend postings are less common; verify authenticity'
      });
      riskScore += 5;
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    return {
      passed: riskScore < 60, // Block if risk > 60
      anomalies,
      riskScore,
      warnings: anomalies.filter(a => a.severity !== 'INFO').map(a => a.message)
    };
  }

  private calculateAverage(entries: JournalEntry[]): number {
    if (entries.length === 0) return 0;
    const total = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
    return total / entries.length;
  }
}
```

**Definition of Done:**
- [ ] 6 anomaly types detected
- [ ] Risk scoring (0-100) working
- [ ] 15+ unit tests
- [ ] Phoenix runs < 200ms
- [ ] Machine learning foundation in place (for future Phoenix improvements)

---

### WILLIAM's Tasks

#### 2.2.1: Odin Guardian - Immutable Audit Trail
**Owner:** William  
**Time:** 8-10 hours  

**Code Locations:**
- `server/services/aurumGuardians.ts` → `OdinGuardian`
- New database table: `guardian_audit_trail`

**Database Migration:**
```sql
-- Create immutable audit trail table
CREATE TABLE guardian_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id),
  
  -- Transaction reference
  transaction_id UUID,
  transaction_type VARCHAR(50), -- 'journal_entry', 'invoice', 'payment'
  
  -- What happened
  action VARCHAR(50) NOT NULL, -- 'created', 'posted', 'reversed', 'approved'
  changed_fields JSONB,
  
  -- Who did it
  user_id UUID,
  user_name VARCHAR(255),
  
  -- When and why
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason TEXT,
  
  -- Immutability chain
  prev_hash VARCHAR(256), -- Hash of previous audit record (creates unbreakable chain)
  this_hash VARCHAR(256) NOT NULL, -- SHA256 hash of this record
  
  -- Metadata
  ip_address INET,
  user_agent VARCHAR(500),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_audit_entity_date ON guardian_audit_trail(entity_id, occurred_at DESC);
CREATE INDEX idx_audit_transaction ON guardian_audit_trail(transaction_id);
CREATE INDEX idx_audit_user ON guardian_audit_trail(user_id);
CREATE UNIQUE INDEX idx_audit_hash ON guardian_audit_trail(this_hash);
```

**Odin Implementation:**
```typescript
export class OdinGuardian {
  private db: AurumDatabaseService;

  async logImmutable(transaction: JournalEntry): Promise<OdinCheckResult> {
    // Get previous hash (creates chain)
    const previousRecord = await this.db.query(
      'SELECT this_hash FROM guardian_audit_trail WHERE entity_id = $1 ORDER BY occurred_at DESC LIMIT 1',
      [transaction.entityId]
    );
    const prevHash = previousRecord?.[0]?.this_hash || '';

    // Create audit record
    const auditRecord = {
      id: uuidv4(),
      entity_id: transaction.entityId,
      transaction_id: transaction.id,
      transaction_type: 'journal_entry',
      action: 'posted',
      changed_fields: {
        accounts: transaction.journalLines.map(l => l.glAccountId),
        totalAmount: sum(transaction.journalLines.map(l => l.debit || l.credit)),
        timestamp: new Date().toISOString()
      },
      user_id: transaction.createdBy,
      user_name: '[TODO: Get from session]',
      occurred_at: new Date(),
      reason: transaction.description,
      prev_hash: prevHash,
      ip_address: '[TODO: Get from request]',
      user_agent: '[TODO: Get from request]'
    };

    // Calculate this_hash (SHA256 of entire record)
    const recordStr = JSON.stringify(auditRecord, Object.keys(auditRecord).sort());
    const thisHash = crypto.createHash('sha256').update(recordStr).digest('hex');
    auditRecord.this_hash = thisHash;

    // Save immutable record
    const result = await this.db.saveAuditRecord(auditRecord);

    return {
      passed: true,
      transactionHash: thisHash,
      auditTrailId: auditRecord.id,
      warnings: []
    };
  }

  async verifyImmutability(transactionId: string): Promise<boolean> {
    // Load entire audit chain for transaction
    const records = await this.db.query(
      `SELECT * FROM guardian_audit_trail 
       WHERE transaction_id = $1 
       ORDER BY occurred_at ASC`,
      [transactionId]
    );

    // Verify each record in chain
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const prevHash = i > 0 ? records[i - 1].this_hash : '';

      // Verify prev_hash matches
      if (record.prev_hash !== prevHash) {
        return false; // Chain broken!
      }

      // Verify this_hash is correct
      const expectedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(record, Object.keys(record).sort()))
        .digest('hex');

      if (record.this_hash !== expectedHash) {
        return false; // Record was tampered with!
      }
    }

    return true; // Entire chain is valid
  }

  async generateAuditReport(entityId: string, startDate: Date, endDate: Date): Promise<AuditReport> {
    // Generate one-click audit report for external auditor
    const records = await this.db.query(
      `SELECT * FROM guardian_audit_trail 
       WHERE entity_id = $1 AND occurred_at BETWEEN $2 AND $3 
       ORDER BY occurred_at ASC`,
      [entityId, startDate, endDate]
    );

    // Verify entire chain
    const chainValid = await this.verifyImmutability(entityId);

    return {
      period: { startDate, endDate },
      totalTransactions: records.length,
      chainIntegrity: chainValid ? 'VERIFIED' : 'BROKEN',
      records: records.map(r => ({
        date: r.occurred_at,
        action: r.action,
        user: r.user_name,
        reason: r.reason,
        hash: r.this_hash
      }))
    };
  }
}
```

**Definition of Done:**
- [ ] `guardian_audit_trail` table created
- [ ] Odin logging every transaction
- [ ] Hash chain working (can't be broken)
- [ ] Immutability verification working
- [ ] Audit report generation working
- [ ] 10+ unit tests
- [ ] Performance: < 50ms per audit log

---

#### 2.2.2: Guardian UI Panel Update
**Owner:** William  
**Time:** 6-8 hours  

**Code Location:** `client/modules/aurum/components/GuardianOversightPanel.tsx`

**UI Update:**
```typescript
export function GuardianOversightPanel() {
  const [guardianResults, setGuardianResults] = useState<GuardianResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runChecks = async (transactionId: string) => {
    setLoading(true);
    const results = await fetch(`/api/guardian/checks/${transactionId}`).then(r => r.json());
    setGuardianResults(results);
    setLoading(false);
  };

  if (!guardianResults) return null;

  return (
    <div className="guardian-panel">
      <h3>Guardian Status</h3>
      
      {/* Argus */}
      <div className="check argus">
        <span className={guardianResults.argus.passed ? '✅' : '❌'}>Argus</span>
        <span className="label">Data Validation</span>
        {!guardianResults.argus.passed && (
          <ul className="errors">
            {guardianResults.argus.errors.map(e => <li key={e}>{e}</li>)}
          </ul>
        )}
      </div>

      {/* Zelda */}
      <div className="check zelda">
        <span className={guardianResults.zelda.passed ? '✅' : '⚠️'}>Zelda</span>
        <span className="label">Duplicate Detection</span>
        {guardianResults.zelda.duplicatesDetected.length > 0 && (
          <div className="duplicates">
            {guardianResults.zelda.duplicatesDetected.map(d => (
              <div key={d.matchingTransactionId}>{d.message}</div>
            ))}
          </div>
        )}
      </div>

      {/* Phoenix */}
      <div className="check phoenix">
        <span className={guardianResults.phoenix.passed ? '✅' : '🚨'}>Phoenix</span>
        <span className="label">Fraud Detection (Risk: {guardianResults.riskScore}%)</span>
        {guardianResults.phoenix.anomalies.length > 0 && (
          <ul className="anomalies">
            {guardianResults.phoenix.anomalies.map((a, i) => (
              <li key={i} className={a.severity.toLowerCase()}>
                {a.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Odin */}
      <div className="check odin">
        <span className="✅">Odin</span>
        <span className="label">Audit Trail Logged</span>
        <code className="hash">{guardianResults.odin.transactionHash?.substring(0, 16)}...</code>
      </div>

      {/* Action buttons */}
      <div className="actions">
        {guardianResults.passedAll ? (
          <button className="btn-primary">Post Entry</button>
        ) : (
          <button className="btn-danger" disabled>
            Fix Issues & Try Again
          </button>
        )}
      </div>
    </div>
  );
}
```

**Definition of Done:**
- [ ] All 4 Guardians displayed in UI
- [ ] Visual indicators (✅ ❌ ⚠️ 🚨)
- [ ] Details expandable (click to see more)
- [ ] Post button only enabled if all pass
- [ ] Mobile responsive

---

## WEEK 2 SUMMARY

**By Friday Week 2:**
- [ ] Zelda Guardian running (duplicate detection)
- [ ] Phoenix Guardian running (anomaly detection + risk scoring)
- [ ] Odin Guardian running (immutable audit trail)
- [ ] Guardian UI updated (shows all 4 checks)
- [ ] Audit trail table created (immutable hash chain)
- [ ] All tests passing (40+ new tests)
- [ ] No production issues

**Ready for:** Week 3 (Hardening + Documentation)

---

## WEEK 3: Guardian Hardening & Documentation

### ENGINEER's Tasks

#### 3.1.1: Guardian Performance Optimization
**Owner:** Engineer  
**Time:** 6-8 hours  

**Specific Optimizations:**
1. Cache historical data (don't query every time)
2. Parallelize checks
3. Database indexes
4. Query optimization

```typescript
// Add caching layer to Guardian
export class GuardianCache {
  private cache = new Map<string, CachedData>();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getTransactionHistory(entityId: string, days: number): Promise<JournalEntry[]> {
    const key = `history_${entityId}_${days}`;
    
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    // Not in cache, query DB
    const data = await this.db.getTransactionHistory(entityId, days);
    
    // Store in cache
    this.cache.set(key, { data, timestamp: Date.now() });
    
    return data;
  }
}
```

**Database Indexes:**
```sql
-- Indexes for Guardian queries
CREATE INDEX idx_journal_entity_vendor ON gl_journal_entries(entity_id, vendor_id);
CREATE INDEX idx_journal_amount_date ON gl_journal_entries(entity_id, amount, posting_date DESC);
CREATE INDEX idx_journal_account ON gl_journal_entries(entity_id, gl_account_id);
```

**Load Testing:**
```
Test Scenario: 1000 transactions/min
- Each transaction runs all 4 Guardians
- Expected: Total < 500ms per transaction
- Target: Argus 50ms, Zelda 100ms, Phoenix 200ms, Odin 50ms

Run test with:
  npm run test:guardian:load
```

**Definition of Done:**
- [ ] Caching implemented (5-min TTL)
- [ ] Parallel execution (all 4 run simultaneously)
- [ ] Database indexes created
- [ ] Load test: 1000 tx/min = 500ms latency (99th percentile)
- [ ] Memory usage < 512MB (check memory leaks)

---

#### 3.1.2: Guardian Integration Tests
**Owner:** Engineer  
**Time:** 6-8 hours  

**Test Scenarios:**
```typescript
describe('Guardian Integration', () => {
  test('1. Valid entry → All Guardians pass → Entry posted', async () => {
    // Create valid journal entry
    // Run orchestrator
    // Verify all pass
    // Post to GL
    // Verify GL updated
  });

  test('2. Duplicate invoice → Zelda detects → Warns user', async () => {
    // Post first invoice
    // Post identical invoice
    // Verify Zelda detects
    // Verify warning shown
  });

  test('3. Large amount → Phoenix flags → User reviews → Posts', async () => {
    // Create entry with 5x average amount
    // Run Phoenix
    // Verify anomaly detected
    // User approves anyway
    // Verify posts
  });

  test('4. Unknown vendor → Phoenix flags → Entry blocked', async () => {
    // Create entry with unknown vendor
    // Phoenix blocks
    // Verify can't post until vendor added
  });

  test('5. Transaction posted → Odin logs immutably → Can\'t alter', async () => {
    // Post transaction
    // Verify Odin logged
    // Try to alter audit trail
    // Verify hash breaks, can't alter
  });

  test('6. 100 properties consolidating → Guardian runs on all → No slowdown', async () => {
    // Simulate 100 child entities
    // Each posts simultaneously
    // Verify all Guardian checks complete
    // Verify performance stays good
  });
});
```

**Definition of Done:**
- [ ] 20+ integration tests
- [ ] All passing
- [ ] Code coverage > 85%
- [ ] Tests document Guardian behavior

---

### WILLIAM's Tasks

#### 3.2.1: Guardian Documentation
**Owner:** William  
**Time:** 8-10 hours  

**Documentation to Create:**

1. **Guardian Architecture Guide** (`docs/GUARDIAN_ARCHITECTURE.md`)
   - How the 4 Guardians work together
   - When each runs
   - What each detects
   - How to extend Guardian

2. **Guardian API Documentation** (`docs/GUARDIAN_API.md`)
   - `/api/guardian/checks/:transactionId` - Get Guardian results
   - `/api/guardian/audit/:transactionId` - Get audit trail
   - `/api/guardian/report/:entityId` - Generate audit report

3. **Fraud Detection Guide** (`docs/PHOENIX_FRAUD_DETECTION.md`)
   - How Phoenix detects fraud
   - Risk scoring algorithm
   - Examples of fraud Phoenix catches
   - False positive rates

4. **Audit Trail Guide** (`docs/ODIN_AUDIT_TRAIL.md`)
   - How immutable trail works
   - Hash chain verification
   - How to prove record wasn't altered
   - External auditor use cases

5. **Admin Guide** (`docs/GUARDIAN_ADMIN.md`)
   - How to configure Guardian per GL account
   - Which accounts to monitor (high-risk vs. low-risk)
   - How to set anomaly thresholds
   - How to review Guardian alerts

**Definition of Done:**
- [ ] 5 documentation files created
- [ ] Examples in each doc
- [ ] Screenshots/diagrams where helpful
- [ ] Code examples that actually run
- [ ] Reviewed for clarity

---

#### 3.2.2: Guardian Admin Dashboard UI
**Owner:** William  
**Time:** 4-6 hours  

**New Component:** `GuardianAdminDashboard.tsx`

**Features:**
- Guardian settings per GL account
- Anomaly threshold configuration
- Monitor high-risk accounts
- Alert configuration
- Guardian status (how many checks run, how many blocked)

**Definition of Done:**
- [ ] UI compiles and shows
- [ ] Admin can configure Guardian settings
- [ ] Changes save to database
- [ ] Settings apply to future checks

---

## WEEK 3 SUMMARY

**By Friday Week 3 (END OF SPRINT 1):**
- ✅ Guardian AI complete and unbeatable
- ✅ All 4 Guardians running on every transaction
- ✅ Guardian checks < 500ms, non-blocking
- ✅ Guardian UI shows real-time checks
- ✅ Audit trail immutable and queryable
- ✅ Documentation complete
- ✅ Tests passing (60+ unit tests + 20 integration tests)
- ✅ Zero production issues
- ✅ Load test: 1000 transactions/min sustained

**SPRINT 1 COMPLETE: GUARDIAN AI IS IRON-CLAD**

---

# SPRINT 2: REAL-TIME GL POSTING (Weeks 4-6)

*(Same format continues for Weeks 4-6: detailed tasks, code locations, deliverables)*

**Due to length, Week 4-6 tasks follow the same structure:**

---

## WEEK 4: Real-Time GL Posting Architecture

### ENGINEER's Tasks: GL Posting Engine Optimization
- [ ] Remove blocking operations from GL posting
- [ ] Batch GL account updates
- [ ] Add database indexes
- [ ] Performance test: < 50ms GL posting
- [ ] Code location: `server/services/aurumDatabase.ts`
- [ ] Tests: 10+ load tests

### WILLIAM's Tasks: Real-Time Consolidation Engine
- [ ] Consolidation trigger (child posts → parent updates)
- [ ] Intercompany elimination
- [ ] Multi-currency handling
- [ ] Consolidation dashboard
- [ ] Code location: `server/services/aurumDatabase.ts`
- [ ] Tests: 5+ consolidation tests

---

## WEEK 5: Real-Time GL Dashboard & Mobile

### WILLIAM's Tasks: GL Real-Time Dashboard
- [ ] Dashboard component showing real-time GL balances
- [ ] Drill-down to transactions
- [ ] Search functionality
- [ ] Export to CSV/Excel/PDF
- [ ] Code location: `client/modules/aurum/pages/GLDashboard.tsx`

### WILLIAM's Tasks: Mobile GL
- [ ] Mobile-responsive GL dashboard
- [ ] Mobile-optimized drill-down
- [ ] Offline caching
- [ ] Code location: Same as above (responsive design)

### ENGINEER's Tasks: WebSocket Real-Time Updates
- [ ] WebSocket connection
- [ ] Push GL updates to all connected clients
- [ ] Live indicators
- [ ] Code location: `server/services/websocketService.ts`

---

## WEEK 6: Real-Time GL Testing & Hardening

### ENGINEER's Tasks: Load Testing
- [ ] 1000 GL postings/min
- [ ] 100 child locations consolidating
- [ ] Performance metrics collection
- [ ] Code location: `tests/loadTests/glPosting.test.ts`

### WILLIAM's Tasks: Integration Testing
- [ ] E2E test: Entry → Dashboard updates
- [ ] E2E test: Bank transaction → GL updates
- [ ] E2E test: Child → Parent GL updates
- [ ] Mobile testing

---

# SPRINT 3: INTEGRATION ECOSYSTEM (Weeks 7-9)

*(Similar format for Weeks 7-9)*

---

## WEEK 7: Toast & OPERA Integrations

### ENGINEER's Tasks: Toast Real-Time Events
- [ ] Toast OAuth connection
- [ ] Event subscription
- [ ] Real-time listener
- [ ] Error handling & retries
- [ ] Code location: `server/connectors/toastConnector.ts`
- [ ] Tests: 10+ scenarios

### WILLIAM's Tasks: OPERA Integration + Framework
- [ ] OPERA connection
- [ ] Integration base class
- [ ] Event routing
- [ ] Code location: `server/connectors/operaConnector.ts`, `server/connectors/IntegrationConnector.ts`

---

## WEEK 8: Gusto & Full Testing

### ENGINEER's Tasks: Gusto Payroll
- [ ] Gusto connection
- [ ] Payroll event listener
- [ ] GL mapping
- [ ] Code location: `server/connectors/gustoConnector.ts`

### WILLIAM's Tasks: Integration Testing
- [ ] E2E tests (Toast + OPERA + Gusto)
- [ ] Integration monitoring dashboard
- [ ] Code location: `client/modules/aurum/pages/IntegrationStatus.tsx`

---

## WEEK 9: Integration Hardening

### ENGINEER's Tasks: Error Handling
- [ ] Retry logic with exponential backoff
- [ ] Dead letter queue
- [ ] Health checks
- [ ] Alerts

### WILLIAM's Tasks: Documentation
- [ ] Integration guides (Toast, OPERA, Gusto)
- [ ] Troubleshooting guide
- [ ] GL account mapping guide

---

# WEEKS 10-12: LUCCCA & PRODUCTION

## WEEK 10: LUCCCA Integration
- [ ] Connect EchoAurum to LUCCCA
- [ ] Data flow: LUCCCA → Toast → EchoAurum → LUCCCA
- [ ] Real-time reporting in LUCCCA

## WEEK 11: Full System Testing
- [ ] Guardian + GL + Integrations = all work together
- [ ] Production readiness checklist
- [ ] Security audit
- [ ] Performance benchmarks

## WEEK 12: Launch
- [ ] Customer launch prep
- [ ] Market launch
- [ ] Documentation complete
- [ ] Case studies ready

---

# END OF DOCUMENT

This Week-by-Week detail is your execution roadmap.

**Each Friday, ship something.**

**By Week 12, you'll be unbeatable.**

