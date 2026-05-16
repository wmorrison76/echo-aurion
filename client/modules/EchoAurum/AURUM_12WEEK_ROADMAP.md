# EchoAurum: 12-Week Implementation Roadmap
## From Foundation to Market-Ready (Small Chains → Mid-Market)

**Timeline:** Weeks 1-12 | **Budget:** $150-200K in dev resources | **Goal:** Ship and sell to first 30 customers

---

## PHASE 1: MVP COMPLETION (Weeks 1-8)
### Goal: Achieve feature parity with QuickBooks/Xero for small chains

---

## WEEK 1-2: GL Journal Entry Posting Interface
**Milestone:** Users can create and post GL entries from UI

### Features to Build
```
1. Journal Entry Form Component (JournalEntryForm.tsx)
   ├── Entry header (date, description, reference)
   ├── Line item table
   │   ├── Account selector (searchable GL chart)
   │   ├── Debit/credit inputs
   │   ├── Cost center/department (conditional)
   │   └── Memo field
   ├── Double-entry validation (client-side)
   ├── GL posting rules preview
   └── Submit button with Guardian check indicator

2. GL Account Selector Component (GLAccountSelector.tsx)
   ├── Searchable dropdown (code + name)
   ├── Account type display
   ├── Balance display
   └── Recently used accounts

3. Journal Entry Post Dialog
   ├── Approve/Reject with reason
   ├── Guardian check results display
   └── Estimated GL impact preview

4. API Endpoints (Fill missing in aurumGl.ts)
   ├── GET /api/aurum/gl-accounts (filtered by type)
   ├── GET /api/aurum/posting-rules (for account)
   ├── POST /api/aurum/journal-entries/{id}/approve
   └── POST /api/aurum/journal-entries/{id}/draft-preview
```

### Components to Create
- `client/modules/aurum/components/JournalEntryForm.tsx`
- `client/modules/aurum/components/GLAccountSelector.tsx`
- `client/modules/aurum/components/JournalEntryApprovalDialog.tsx`
- Update `server/routes/aurumGl.ts` with missing endpoints

### Acceptance Criteria
- [ ] Can create journal entry with 2+ lines
- [ ] Debits/credits auto-validate (client-side alert)
- [ ] Cannot submit unbalanced entry
- [ ] Guardian Argus checks run on submit
- [ ] Entry shows in APInvoiceManager as linked transaction

**Estimated Time:** 40 hours | **Story Points:** 13

---

## WEEK 2-4: Financial Reports (Trial Balance, GL Detail, Balance Sheet)
**Milestone:** Can generate and view core financial reports

### Phase 2a: Trial Balance Report (Week 2-3)
```
1. Trial Balance Report Component (TrialBalanceReport.tsx)
   ├── Period selector (month/quarter/year)
   ├── Entity selector
   ├── Account type filter
   ├── Table display:
   │   ├── Account code | Name | Debit | Credit | Balance
   │   ├── Subtotals by account type
   │   ├── Grand totals row
   │   └── Summary: Total Debits = Total Credits validation
   ├── Export to PDF/Excel
   └── Drill-down to GL detail

2. Backend: getTrialBalance API
   └── Already exists in AurumDatabaseService
   ├── Ensure proper filtering by period
   ├── Add cost center drill-down
   └── Cache results for performance
```

### Phase 2b: General Ledger Detail Report (Week 3)
```
1. GL Detail Report Component (GeneralLedgerReport.tsx)
   ├── Date range picker
   ├── GL Account selector
   ├── Entity selector
   ├── Cost center/department filters
   ├── Table display:
   │   ├── Date | Entry# | Source | Description | Debit | Credit | Balance
   │   ├── Running balance column
   │   └── Filterable by source type
   ├── Link to original journal entry
   ├── Export to PDF/Excel
   └── Print-friendly layout

2. Backend: getGeneralLedger API
   └── Already exists in AurumDatabaseService
   ├── Add running balance calculation
   ├── Optimize for large GL accounts
   └── Add date filtering
```

### Phase 2c: Balance Sheet Report (Week 4)
```
1. Balance Sheet Report Component (BalanceSheetReport.tsx)
   ├── Period selector
   ├── Entity selector
   ├── Prior period comparison (optional)
   ├── Structure:
   │   ├── Assets section
   │   │   ├── Current Assets (grouped)
   │   │   └── Non-Current Assets
   │   ├── Liabilities section
   │   │   ├── Current Liabilities
   │   │   └── Long-term Liabilities
   │   └── Equity section
   ├── Automatic calculations
   │   ├── Total Assets
   │   ├── Total Liabilities + Equity
   │   └── Balance check (should equal)
   ├── Export to PDF/Excel
   └── Drill-down to GL accounts

2. Backend: getBalanceSheet API
   ├── Calculate account balances as of date
   ├── Organize by GL hierarchy
   ├── Aggregate parent accounts
   └── Add prior period comparison
```

### Components to Create
- `client/modules/aurum/components/TrialBalanceReport.tsx`
- `client/modules/aurum/components/GeneralLedgerReport.tsx`
- `client/modules/aurum/components/BalanceSheetReport.tsx`
- `client/modules/aurum/components/ReportExport.tsx` (shared PDF/Excel exporter)
- Update `server/routes/aurumGl.ts` with new report APIs

### Backend Libraries to Add
```json
{
  "pdfkit": "^0.13.0",
  "xlsx": "^0.18.5"
}
```

### Acceptance Criteria
- [ ] Trial Balance totals match (debits = credits)
- [ ] GL Detail shows running balance
- [ ] Balance Sheet equation balances
- [ ] Can export all 3 reports to PDF
- [ ] Reports show in new Report Dashboard

**Estimated Time:** 60 hours | **Story Points:** 20

---

## WEEK 4-6: Approval Workflow Engine
**Milestone:** Multi-step approval process with notifications

### Features to Build
```
1. Approval Queue Dashboard (ApprovalQueuePanel.tsx)
   ├── Pending approvals list (journal entries + invoices)
   ├── Filters: Type (JE/Invoice), Priority, Status
   ├── Sort: Oldest first, Amount (high to low)
   ├── Quick actions: Approve, Reject, Reassign
   ├── Summary: # Pending, $$ at risk, oldest item age
   └── Real-time refresh every 60 seconds

2. Journal Entry Approval Dialog
   ├── Full entry display (read-only)
   ├── Line-by-line breakdown
   ├── Guardian check results (MUST see these)
   ├── Approval reason (required text field)
   ├── Approve/Reject buttons
   └── Send for further approval button (if multi-level)

3. Invoice Approval Dialog (Similar)
   ├── Invoice details (read-only)
   ├── PO matching status
   ├── Receipt status
   ├── Amount and vendor
   ├── Approval reason
   └── Hold for further review option

4. Approval Workflow Rules (Admin UI)
   ├── Define approval matrices:
   │   ├── By transaction type (JE, Invoice, AP Check)
   │   ├── By amount threshold
   │   ├── By GL account
   │   └── By requester role
   ├── Assign approvers
   ├── Multi-level approval (chain)
   ├── Escalation rules (auto-escalate if pending >2 days)
   └── Notification preferences

5. Backend Approval Service
   ├── Track approval status per transaction
   ├── Store approval history with timestamps
   ├── Handle multi-level chains
   ├── Detect approval loops
   └── Generate audit trail for each approval
```

### Database Changes
```sql
ALTER TABLE journal_entries ADD COLUMN approvalChain JSONB;
ALTER TABLE journal_entries ADD COLUMN approvalStatus TEXT;
ALTER TABLE ap_invoices ADD COLUMN approvalChain JSONB;
ALTER TABLE ap_invoices ADD COLUMN approvalStatus TEXT;

CREATE TABLE approval_workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'journal_entry' | 'invoice' | 'payment'
  entityId TEXT NOT NULL,
  triggerType TEXT, -- 'amount' | 'account' | 'role' | 'default'
  triggerValue TEXT,
  approverSequence JSONB, -- Array of [userId, role] tuples
  escalationDays INTEGER DEFAULT 2,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE approval_history (
  id TEXT PRIMARY KEY,
  transactionId TEXT NOT NULL,
  transactionType TEXT NOT NULL, -- 'journal_entry' | 'invoice'
  approver TEXT NOT NULL,
  approverRole TEXT,
  status TEXT NOT NULL, -- 'approved' | 'rejected' | 'pending'
  reason TEXT,
  approvedAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Components to Create
- `client/modules/aurum/components/ApprovalQueuePanel.tsx`
- `client/modules/aurum/components/JournalEntryApprovalDialog.tsx` (updated)
- `client/modules/aurum/components/InvoiceApprovalDialog.tsx`
- `client/modules/aurum/components/ApprovalWorkflowConfig.tsx` (admin)
- Update `server/routes/aurumGl.ts` and `server/routes/aurumAP.ts`

### Backend Services
- `server/services/approvalEngine.ts` (new)

### Acceptance Criteria
- [ ] Can set approval rules by amount
- [ ] Can approve/reject items
- [ ] Approval history is immutable
- [ ] Multi-level approval chain works
- [ ] Escalation alerts on day 2
- [ ] Journal entries won't post without approval

**Estimated Time:** 50 hours | **Story Points:** 17

---

## WEEK 6-8: Bank Reconciliation Interface
**Milestone:** Can reconcile bank accounts with GL

### Features to Build
```
1. Reconciliation Dashboard (BankReconciliationPanel.tsx)
   ├── Account selector (current & historical)
   ├── Period selector (month picker)
   ├── Reconciliation status display
   │   ├── System balance
   │   ├── Bank balance
   │   ├── Variance amount
   │   └── Status (Pending/In Progress/Matched/Unresolved)
   ├── Quick actions: Start reconciliation, Edit, Resolve
   └── Historical reconciliation list

2. Reconciliation Matching Interface
   ├── Two-column layout:
   │   ├── Left: System transactions (GL journal entries)
   │   ├── Right: Bank transactions (from file or manual)
   ├── Matching mechanics:
   │   ├── Drag-and-drop matching
   │   ├── Click-to-match
   │   ├── Amount-based auto-matching
   │   └── Bulk match by date range
   ├── Unmatched items view
   │   ├── System-only items (pending posting)
   │   ├── Bank-only items (outstanding)
   │   └── Variance items (amounts don't match)
   ├── Exclude/filter options (NSF, pending deposits)
   └── Save & Close button

3. Bank Statement Upload
   ├── File picker (CSV, OFX, MT940)
   ├── Auto-parse bank format
   ├── Column mapping (Date, Amount, Description)
   ├── Validation: Detect duplicates, invalid amounts
   └── Import button

4. Variance Investigation
   ├── Drill-down on variance amounts
   ├── Show matched vs. unmatched breakdown
   ├── Add manual notes/adjustments
   ├── Record timing differences
   └── Create adjustment journal entries

5. Reconciliation Report
   ├── Summary (system balance, bank balance, variance)
   ├── List of matched items
   ├── List of unmatched items (with aging)
   ├── List of adjustments made
   └── Sign-off section (date, person, reason)
```

### Database Changes
```sql
-- Already exists, but enhance:
ALTER TABLE reconciliations ADD COLUMN bankFileId TEXT;
ALTER TABLE reconciliations ADD COLUMN signedOffAt TIMESTAMP WITH TIME ZONE;
ALTER TABLE reconciliations ADD COLUMN signedOffBy TEXT;
ALTER TABLE reconciliations ADD COLUMN reconciliationType TEXT; -- 'automatic' | 'manual'

CREATE TABLE bank_transactions (
  id TEXT PRIMARY KEY,
  reconciliationId TEXT NOT NULL,
  bankDate DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,
  bankReference TEXT UNIQUE,
  transactionType TEXT, -- 'debit' | 'credit'
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE reconciliation_matches (
  id TEXT PRIMARY KEY,
  reconciliationId TEXT NOT NULL,
  journalLineId TEXT NOT NULL,
  bankTransactionId TEXT NOT NULL,
  matchedAmount NUMERIC(15, 2) NOT NULL,
  matchedAt TIMESTAMP WITH TIME ZONE NOT NULL,
  matchedBy TEXT NOT NULL
);
```

### Components to Create
- `client/modules/aurum/components/BankReconciliationPanel.tsx`
- `client/modules/aurum/components/ReconciliationMatcher.tsx`
- `client/modules/aurum/components/BankStatementUploader.tsx`
- `client/modules/aurum/components/ReconciliationReport.tsx`

### Backend Services
- `server/services/bankStatementParser.ts` (CSV, OFX support)
- Update `server/routes/aurumReconciliation.ts` (if exists)

### Acceptance Criteria
- [ ] Can upload bank statement (CSV)
- [ ] Can manually match transactions
- [ ] Variance calculated correctly
- [ ] Can create adjustment entry from reconciliation
- [ ] Reconciliation report shows matched/unmatched
- [ ] Cannot post to matched period without reversal

**Estimated Time:** 45 hours | **Story Points:** 15

---

## WEEK 8+: Advanced Features (Foundation for Mid-Market)

### Week 8: Income Statement (P&L) Report
```
1. Income Statement Component (IncomeStatementReport.tsx)
   ├── Period selector
   ├── Prior period comparison
   ├── Structure:
   │   ├── Revenue section
   │   ├── Cost of Goods Sold
   │   ├── Gross Profit
   │   ├── Operating Expenses
   │   ├── Operating Income
   │   ├── Other Income/Expense
   │   └── Net Income
   ├── % of Revenue column
   ├── Variance from budget (if budget exists)
   └── Export to PDF

2. Backend: getIncomeStatement API
   ├── Calculate period revenue
   ├── Calculate COGS and operating expenses
   ├── Net income calculation
   ├── Compare to prior period
   └── Show variance percentage
```

---

## WEEK 9-12: RBAC Foundation & Mobile Readiness

### Week 9-10: Role-Based Access Control (RBAC)
```
1. Role Management UI
   ├── Predefined roles:
   │   ├── Accountant (full GL/AP access)
   │   ├── Approver (approval queue only)
   │   ├── Viewer (reports only, read-only)
   │   ├── Admin (all access + user management)
   │   └── Finance Manager (GL + Reports)
   ├── Role assignment to users
   ├── Permission matrix per role
   └── Audit log of role changes

2. Database Schema
   ├── users table (with role)
   ├── permissions table
   └── role_permissions junction

3. Enforce RBAC on all APIs
   ├── Check permissions on each endpoint
   ├── Filter data by entity access
   ├── Audit log all access
   └── Reject unauthorized requests

4. UI: Conditionally hide features
   ├── Only show GL posting to Accountants
   ├── Only show approval queue to Approvers
   ├── Only show admin panel to Admins
```

### Week 11-12: Mobile Approval Workflow (MVP)
```
1. Mobile-Optimized Approval Dashboard
   ├── Card-based layout (mobile-friendly)
   ├── Swipe to approve/reject
   ├── One-page view of key transaction details
   ├── Push notification on new item
   └── Works offline with sync

2. React Native / PWA (Choose based on user base)
   ├── Option A: React Native (iOS + Android)
   ├── Option B: PWA (web-based, works on any phone)
   └── Recommendation: Start with PWA (faster to ship)
```

---

## IMPLEMENTATION GUIDE: How to Build Each Week

### Week 1-2 Example: GL Journal Entry Form

**Step 1: Create Component File**
```typescript
// client/modules/aurum/components/JournalEntryForm.tsx
import { useState } from 'react';
import { useGLOperations } from '../hooks/useGLOperations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function JournalEntryForm() {
  const { createJournalEntry, posting } = useGLOperations();
  const [lines, setLines] = useState([{ account: '', debit: 0, credit: 0 }]);
  
  const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const handleSubmit = async () => {
    if (!isBalanced) {
      alert('Debits must equal credits');
      return;
    }
    await createJournalEntry({ lines, /* ... */ });
  };

  return (
    <div>
      {/* Form JSX */}
      <Button onClick={handleSubmit} disabled={!isBalanced}>
        Submit for Approval
      </Button>
    </div>
  );
}
```

**Step 2: Add Hook Support**
```typescript
// Update client/modules/aurum/hooks/useGLOperations.ts
export function useGLOperations() {
  const createJournalEntry = async (entry) => {
    const res = await fetch('/api/aurum/journal-entries', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
    return res.json();
  };
  
  return { createJournalEntry };
}
```

**Step 3: Wire in Console**
```typescript
// Update client/pages/Console.tsx
import { JournalEntryForm } from '@/modules/aurum/components';

export default function Console() {
  return (
    <div>
      {/* Existing panels */}
      <JournalEntryForm />
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// Test that debits = credits
describe('JournalEntryForm', () => {
  it('should prevent unbalanced entries', () => {
    const { getByText } = render(<JournalEntryForm />);
    const button = getByText('Submit');
    expect(button).toBeDisabled(); // Until balanced
  });
});
```

### API Integration Tests
```typescript
// Test that API validates balance
describe('POST /api/aurum/journal-entries', () => {
  it('should reject unbalanced entry', async () => {
    const res = await fetch('/api/aurum/journal-entries', {
      method: 'POST',
      body: JSON.stringify({
        lines: [
          { account: '1000', debit: 100, credit: 0 },
          { account: '2000', debit: 0, credit: 50 } // Unbalanced
        ]
      })
    });
    expect(res.status).toBe(400);
  });
});
```

---

## Deployment Strategy

### Week 1-4: Deploy to Staging
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Week 4-8: Beta Program with 5 Test Customers
- Share staging URL
- Collect feedback via Typeform
- Fix critical bugs same-day
- Weekly updates to test customers

### Week 8-12: Ready for Public Beta
- Launch landing page
- Generate case studies
- Reach out to first 20 leads
- Prepare G2/Capterra listings

---

## Success Metrics (Per Week)

| Week | Metric | Target |
|------|--------|--------|
| 2 | JournalEntryForm component complete | 100% |
| 4 | Trial Balance + GL Detail reports | 100% |
| 6 | Approval workflow engine | 100% |
| 8 | Bank reconciliation working | 100% |
| 10 | RBAC enforced on all APIs | 100% |
| 12 | Mobile approval prototype | Working |

---

## Resource Allocation

### Team Composition (Recommended)
- **1 Backend Engineer** (40 hrs/week) - API, database, business logic
- **1 Frontend Engineer** (40 hrs/week) - Components, UX, integrations
- **1 Designer** (20 hrs/week) - Report layouts, approval UX, mobile mockups
- **QA** (10 hrs/week) - Testing, beta program management

### Total Dev Capacity: ~110 hours/week

---

## Go-Live Checklist (Week 12)

- [ ] All 8 feature weeks completed
- [ ] 95%+ test coverage on core features
- [ ] Staging environment stable
- [ ] Documentation written
- [ ] 5 beta customers onboarded
- [ ] First case study prepared
- [ ] Pricing model finalized
- [ ] SLA documented
- [ ] Support playbook ready
- [ ] Marketing materials (landing page, demo video)

---

## Post-Week 12: Continuous Improvement

### Month 2-3 (Weeks 13-16): Bug Fixes & Optimization
- Fix issues from beta program
- Optimize report generation (large datasets)
- Improve approval workflow UX
- Add missing GL account types

### Month 3-4 (Weeks 17-20): Enterprise Foundation
- OPERA/Toast integration POC
- Multi-entity consolidation
- Advanced Guardian features
- Performance testing (1000+ entities)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Database performance issues | Medium | High | Load test early, optimize queries now |
| Approval workflow complexity | High | Medium | Start simple, iterate based on feedback |
| Guardian checks slow down posting | Medium | Medium | Cache results, async Guardian checks |
| Missing GL accounts in ChartOfAccounts | High | Medium | Create default chart for hospitality industry |
| RBAC causes permission bugs | Medium | Medium | Write comprehensive permission tests |
| Mobile development takes longer | High | Medium | Use PWA instead of native (faster) |

---

## Budget Breakdown

| Item | Cost | Notes |
|------|------|-------|
| Backend Engineer (12 weeks × $150/hr) | $72,000 | Salary equivalent |
| Frontend Engineer (12 weeks × $150/hr) | $72,000 | Salary equivalent |
| Designer (6 weeks × $100/hr) | $24,000 | Part-time |
| QA/Testing (12 weeks × $60/hr) | $28,800 | Part-time |
| Infrastructure (AWS/Neon) | $3,000 | Per month |
| External libraries/tools | $2,000 | PDF, Excel, etc. |
| Beta program incentives | $10,000 | Free access for test customers |
| **Total** | **$211,800** | 12-week sprint |

---

## How to Measure Success

After 12 weeks, EchoAurum will be "market-ready for small chains" if:

1. ✅ Can post GL entries → Post → Print trial balance
2. ✅ Can create AP invoices → Match → Approve → Record
3. ✅ Can reconcile bank account
4. ✅ Can generate income statement
5. ✅ Approval workflow blocks unreviewed items
6. ✅ Guardian AI catches 90%+ of data errors
7. ✅ 5+ beta customers testing actively
8. ✅ <1% data loss or corruption
9. ✅ <2 hour onboarding per customer
10. ✅ NPS > 40 from beta customers

If all ✅ are met, ready to:
- Launch public beta
- Sell to first 30 customers
- Move to Phase 2 (Mid-market features)

