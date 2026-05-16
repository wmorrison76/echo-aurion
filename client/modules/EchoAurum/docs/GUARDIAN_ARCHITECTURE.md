# Guardian Architecture Guide

## Overview

The Guardian system is a four-tier AI validation framework that protects every financial transaction in EchoAurum. Each Guardian specializes in a different type of risk, and all four run in parallel for maximum efficiency.

## The Four Guardians

### 1. Argus Guardian (Data Compliance)
**Role:** Ensures GL posting rules are followed and data integrity is maintained  
**Runs on:** Journal entries and AP invoices  
**Performance:** < 50ms per transaction

**8 Validation Checks:**
1. Journal has required line items
2. All GL accounts exist and are active
3. Debits equal credits (double-entry principle)
4. Each line has either debit OR credit (not both)
5. Required cost centers present (per account requirements)
6. Required departments present (per account requirements)
7. No duplicate line items
8. Currency consistency

**Output:**
- `passed`: Boolean (true if all checks pass)
- `errors`: Array of blocking errors (prevent posting)
- `warnings`: Array of warnings (allow posting with caution)
- `checksRun`: Array of check names executed
- `riskScore`: 0-100 (0 = safe, 100 = critical)

### 2. Zelda Guardian (Auto-Healing & Duplicates)
**Role:** Detects and auto-corrects duplicate transactions  
**Runs on:** AP invoices and journal entries  
**Performance:** < 100ms per transaction

**Detection Methods:**
1. **Exact duplicates:** Same vendor + invoice number + amount within 7 days
2. **Transposed numbers:** Amount digits reversed (1234 vs 4321)
3. **Rounding differences:** Amounts differ by < $0.01 (auto-corrected)

**Auto-Healing:**
- Detects and corrects rounding differences automatically
- Identifies duplicate patterns without blocking
- Flags transposed numbers with high confidence (>75%)

**Output:**
- `passed`: Boolean (true if no high-confidence duplicates)
- `duplicatesDetected`: Array of potential duplicates with confidence scores
- `autoHeals`: Array of auto-corrections applied
- `warnings`: Array of warning messages

### 3. Phoenix Guardian (Anomaly & Fraud Detection)
**Role:** Identifies unusual patterns and fraud indicators  
**Runs on:** Journal entries and AP invoices  
**Performance:** < 200ms per transaction

**Anomaly Detection (6 Types):**
1. **Large amounts:** > 2x historical average
2. **Off-hours posting:** Outside 6 AM - 10 PM
3. **Unknown vendors:** Not in master vendor list
4. **High-risk accounts:** Cash, bank transfer accounts
5. **Rapid succession:** Same amount posted multiple times in 1 hour
6. **Round numbers:** Amounts divisible by 1000 (fraud indicator)

**Risk Scoring:**
- 0-100 scale
- Large amount: +15 points
- Off-hours: +10 points
- Unknown vendor: +20 points
- High-risk account: +25 points
- Rapid succession: +30 points
- Round number: +5 points
- Weekend posting: +5 points
- **Threshold:** Risk > 60 blocks posting

**Output:**
- `passed`: Boolean (true if risk < 60)
- `anomalies`: Array of detected anomalies with severity
- `riskScore`: 0-100 (0 = safe, 100 = fraudulent)
- `warnings`: Array of anomaly messages

### 4. Odin Guardian (Immutable Audit Trail)
**Role:** Creates cryptographically-sealed audit trail  
**Runs on:** All transactions (post-validation)  
**Performance:** < 50ms per transaction

**Audit Trail Features:**
- SHA256 hash of every transaction
- Hash chain (each hash references previous)
- Immutable timestamp verification
- User/IP/user-agent logging
- Complete change history
- Point-in-time restoration capability

**Hash Chain Verification:**
```
Entry 1: hash = SHA256(data1)
Entry 2: hash = SHA256(data2 + hash1)  ← Links to previous
Entry 3: hash = SHA256(data3 + hash2)  ← Creates chain
...
If anyone modifies Entry 2, its hash changes,
breaking the link to Entry 3 (tamper detection)
```

**Output:**
- `passed`: Boolean (always true - always creates trail)
- `transactionHash`: SHA256 hex string (64 characters)
- `auditTrailId`: Unique identifier for audit record
- `warnings`: Any integrity issues

## Guardian Orchestration

The **GuardianOrchestrator** runs all 4 Guardians in parallel:

```typescript
// All 4 run simultaneously
const [argus, zelda, phoenix, odin] = await Promise.all([
  argusGuardian.validateJournalEntry(entry),
  zeldaGuardian.detectDuplicates([invoice], recent),
  phoenixGuardian.detectAnomalies([entry], history),
  odinGuardian.logImmutable(action, actor, details)
]);
```

**Result Aggregation:**
- `passedAll`: True only if all Guardians pass
- `blockingErrors`: Critical errors from any Guardian
- `overallStatus`: "PASSED" | "WARNINGS" | "BLOCKED"
- `riskScore`: Average of Argus + Phoenix scores
- `warnings`: Combined warnings from all Guardians

## Execution Flow

```
┌─ Transaction Received ─────────────┐
│                                    │
├─► ARGUS (Data Compliance)         │
│   ├─ Check GL accounts exist      │
│   ├─ Verify double-entry          │
│   └─ Validate required fields     │
│                                    │
├─► ZELDA (Auto-Healing)            │
│   ├─ Detect exact duplicates      │
│   ├─ Find transposed numbers      │
│   └─ Auto-correct rounding        │
│                                    │
├─► PHOENIX (Anomaly Detection)    │
│   ├─ Analyze against history      │
│   ├─ Calculate risk score         │
│   └─ Flag fraud indicators        │
│                                    │
└─► ODIN (Audit Trail)              │
    ├─ Create SHA256 hash            │
    ├─ Link to previous hash         │
    └─ Store immutable record        │
         │
         ▼
     ┌──────────────────┐
     │ ORCHESTRATION    │
     ├──────────────────┤
     │ Aggregate Results │
     │ Set Status       │
     │ Calculate Risk   │
     └──────────────────┘
         │
         ▼
    ┌──────────┐
    │ Decision │
    ├──────────┤
    │ PASSED   │ → Post transaction
    │ WARNINGS │ → Post with warning
    │ BLOCKED  │ → Reject & alert
    └──────────┘
```

## Performance Optimization

### Caching Strategy
- **GL Accounts:** 15-minute cache (rarely change)
- **Transaction History:** 10-minute cache (for Zelda/Phoenix analysis)
- **Vendor Data:** 30-minute cache (stable reference)
- **Cache Hit Rate Target:** > 70% in production

### Parallelization
- All 4 Guardians run simultaneously
- No sequential dependencies
- Combined max latency: max(individual latencies)

### Database Indexes
Guardian queries are optimized with:
- `idx_journal_entries_vendor_date` - Zelda duplicate detection
- `idx_journal_entries_amount_date` - Phoenix anomaly analysis
- `idx_ap_invoices_vendor_number` - Invoice duplicate lookup
- `idx_guardian_audit_entity_date` - Audit trail queries

## Integration Points

### GL Posting Workflow
```
1. User creates journal entry
2. Calls POST /api/aurum/journal-entries
3. GuardianOrchestrator.runGuardianChecks()
4. If blocked: Return 400 with errors
5. If warnings: Post with warning indicators
6. If passed: Post immediately
7. Async: Save audit trail (Odin)
```

### AP Invoice Workflow
```
1. Invoice received/created
2. Calls POST /api/aurum/ap-invoices
3. GuardianOrchestrator.runGuardianChecks()
4. Zelda: Check for duplicates
5. Phoenix: Analyze vendor/amount
6. If issues: Queue for review
7. If safe: Auto-match/approve (if enabled)
```

## Extending the Guardian System

### Adding a New Guardian Check

**Step 1:** Create Guardian class in `server/services/aurumGuardians.ts`
```typescript
export class MyGuardian {
  async myCheck(transaction: JournalEntry): Promise<MyCheckResult> {
    // Implement check logic
    return {
      passed: true/false,
      errors: [],
      warnings: []
    };
  }
}
```

**Step 2:** Add to Orchestrator
```typescript
export class GuardianOrchestrator {
  private myGuardian: MyGuardian;
  
  async runGuardianChecks(...) {
    const [argus, zelda, phoenix, odin, myGuardian] = await Promise.all([
      // existing checks...
      this.myGuardian.myCheck(transaction)
    ]);
  }
}
```

**Step 3:** Update result interfaces
```typescript
export interface GuardianOrchestrationResult {
  // existing fields...
  myGuardian: MyCheckResult;
}
```

**Step 4:** Test and deploy
- Add unit tests for new check
- Add integration tests
- Performance test (should stay < 500ms total)

## Production Considerations

### Monitoring
- Track Guardian latencies per check
- Monitor error rates per Guardian
- Alert if any Guardian exceeds SLA
- Track cache hit rates

### Tuning
- Adjust Phoenix risk thresholds for your business
- Configure Argus required fields per account type
- Set Zelda duplicate detection window (default 7 days)
- Monitor Odin audit trail storage growth

### Compliance
- Odin audit trail enables compliance audits
- Hash chain proves no tampering
- Store audit trail offsite for disaster recovery
- Regular integrity verification checks

## Architecture Diagrams

### Guardian Execution Pipeline
```
Transaction Input
       │
       ├─────┬─────┬─────┐
       ▼     ▼     ▼     ▼
      AGL  ZLD  PHX  ODN    (All Parallel)
       │     │     │     │
       └─────┴─────┴─────┘
              │
         Orchestrate
              │
              ▼
         Decision Engine
              │
       ┌──────┼──────┐
       ▼      ▼      ▼
     PASS  WARN  BLOCK
```

### Cache Architecture
```
┌─ Transaction Arrives ─┐
│                       │
├─ Check GL Cache      │
│  (15 min TTL)        │ ──► Hit: Use cached accounts
│                       │
├─ Check History Cache │
│  (10 min TTL)        │ ──► Hit: Use cached history
│                       │
└─ Check Vendor Cache  │
   (30 min TTL)        │ ──► Hit: Use cached vendors
                       │
                   Miss: Query DB + Update Cache
```

## Security Considerations

1. **Guardian Bypass Prevention:** Guardians cannot be disabled per transaction
2. **Immutable Trail:** Odin hash chain prevents audit trail tampering
3. **Rate Limiting:** Prevent denial-of-service on Guardian endpoints
4. **Input Validation:** Guardian validates all transaction data
5. **Error Handling:** Guardians fail safely (block rather than allow)

## Summary

The Guardian system provides four layers of defense:
- **Argus:** Rules & compliance
- **Zelda:** Duplicate detection & healing
- **Phoenix:** Anomaly & fraud detection
- **Odin:** Immutable audit trail

Together, they create an unbreakable security perimeter for financial transactions.
