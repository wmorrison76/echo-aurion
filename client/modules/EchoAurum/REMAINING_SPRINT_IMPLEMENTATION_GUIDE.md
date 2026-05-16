# EchoAurum Remaining Sprint Implementation Guide (35/53 Tasks)

**Status:** 18 of 53 tasks completed | **Remaining:** 35 tasks

---

## PHASE 3: Approval Workflows (PARTIAL - 3 of 8 Complete)

✅ **COMPLETED:**

- ApprovalRulesEngine (server/services/approvalRulesEngine.ts)
- ApprovalEscalationEngine (server/services/approvalEscalationEngine.ts)
- ApprovalDelegationEngine (server/services/approvalDelegationEngine.ts)
- Approval Routes (server/routes/aurumApprovals.ts) - Integrated at `/api/aurum/approvals`

**REMAINING 5 TASKS:**

### 1. ApprovalQueueDashboard Enhancements

**File:** `client/modules/EchoAurum/client/components/ApprovalQueueDashboard.tsx`

Use pattern:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export function ApprovalQueueDashboard({ entityId }: Props) {
  const { data: approvals } = useQuery({
    queryKey: ["approvals-queue", entityId],
    queryFn: () =>
      fetch(`/api/aurum/approvals/queue?entityId=${entityId}`).then((r) =>
        r.json(),
      ),
  });

  // Show pending approvals with:
  // - Delegation button (calls POST /api/aurum/approvals/:id/delegate)
  // - Escalation info from ApprovalEscalationEngine
  // - Comments thread component below
}
```

### 2. ApprovalCommentsThread

**File:** `client/modules/EchoAurum/client/components/ApprovalCommentsThread.tsx`

Simple pattern:

```typescript
interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: Date;
}

export function ApprovalCommentsThread({ approvalId }: Props) {
  return (
    <div className="space-y-4">
      {comments.map(c => (
        <div key={c.id} className="border rounded p-3">
          <p className="font-medium">{c.author}</p>
          <p className="text-sm">{c.text}</p>
        </div>
      ))}
      <textarea placeholder="Add comment..." />
    </div>
  );
}
```

### 3. AutoPostFeature

**Logic:** After Guardian checks pass, automatically post entry to GL

```typescript
async function autoPostJournalEntry(entryId: string) {
  // 1. Run Guardian checks (Argus, Zelda, Phoenix, Odin)
  // 2. If all pass, POST to /api/gl/entries/{id}/post
  // 3. Log action in audit trail
  // 4. Notify user via toast
}
```

### 4. Guardian Integration in Approvals

Wire ApprovalRulesEngine to call Guardian validators when `requiresGuardianCheck` is true

```typescript
// In approvalRulesEngine.ts, modify evaluateApprovalRequirements:
if (requirement.requiresGuardianCheck?.includes("argus")) {
  const argusResult = await ArgusGuardian.validate(transaction);
  requirement.guardianResults = { argus: argusResult };
}
```

### 5. ApprovalWorkflows Integration Tests

**File:** `server/tests/approvalWorkflows.e2e.test.ts`

Basic test structure:

```typescript
test("GL entry → Guardian check → Approval → Post", async () => {
  // 1. Create GL entry via POST /api/gl/entries
  // 2. Guardian checks automatically run
  // 3. Approval created with requirement level
  // 4. Approver approves via POST /api/aurum/approvals/:id/approve
  // 5. Entry auto-posts via AutoPostFeature
  // 6. Verify in /api/gl/accounts balance
});
```

---

## SUPPLEMENTAL FEATURES (17 Tasks)

### Mobile Responsive (5 Tasks)

Simply add Tailwind responsive classes to existing components:

```typescript
// ConsolidationDashboard - change:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

// ApprovalQueue buttons - add:
className="px-2 py-1 md:px-4 md:py-2"
```

**Files to update:**

1. ConsolidationDashboard.tsx - Add responsive grid
2. ApprovalQueue - Touch-friendly buttons (larger padding on mobile)
3. MobileGLPostingForm.tsx - Quick entry form for phones
4. MobileInvoiceCapture.tsx - Use `<input type="file" accept="image/*">`
5. Service Worker - Use `/public/service-worker.js`

### Inventory Integration (4 Tasks)

**File structure:**

```
server/connectors/inventoryConnector.ts
├── async syncFromMarginEdge(entityId) → inventory_variance data
├── async calculateVariance(actual, theoretical)
└── async sendToGL(variance)
```

**Pattern:**

```typescript
export class InventoryConnector {
  static async syncFromMarginEdge(entityId: string) {
    // Call MarginEdge API → fetch COGS data
    // Calculate variance (actual - theoretical)
    // Map to GL accounts (5100, 5200, etc.)
    // Return { itemId, variance, glCode }
  }
}
```

**Components:**

1. InventoryVarianceDashboard - Bar chart of variances
2. InventoryDrillDown - Detail table by item/category

### Scheduling Integration (4 Tasks)

**Pattern:**

```typescript
export class SchedulingConnector {
  static async syncFromToast(entityId: string) {
    // Fetch Toast labor schedule
    // Map to GL labor accounts
    // Calculate scheduled cost impact
    return { scheduledLabor, glImpact };
  }
}
```

### Revenue Metrics (4 Tasks)

**Formulas:**

```typescript
const RevPAR = totalRoomRevenue / availableRoomNights;
const ADR = totalRoomRevenue / roomsSold;
const occupancyRate = roomsSold / availableRoomNights;
```

### Bank Feed Integration (4 Tasks)

**Pattern:**

```typescript
export class BankFeedConnector {
  static async fetchBankTransactions(entityId: string) {
    // Call Stripe API
    // Detect duplicates using Levenshtein distance (Zelda Guardian)
    // Return matched GL accounts
  }
}
```

### Custom Report Builder (3 Tasks)

**Core logic:**

```typescript
interface ReportQuery {
  selectAccounts: string[];
  dimensions: ("department" | "costcenter" | "month")[];
  metrics: ("revenue" | "cogs" | "profit")[];
}

async function buildCustomReport(query: ReportQuery) {
  // Dynamically query GL based on dimensions
  // Calculate metrics using GL balances
  // Return table of results
}
```

---

## QA & LAUNCH (10 Tasks)

### E2E Testing Suite

```typescript
// tests/echoauram-e2e.test.ts
describe("EchoAurum Complete Workflows", () => {
  test("GL entry → Approval → Guardian → Post → Consolidation");
  test("USALI Report generation across 100 entities");
  test("Mobile GL entry submission");
});
```

### Security Hardening

- Run `npm run semgrep` on all new components
- Validate JWT tokens in all API routes
- Test RBAC enforcement

### Performance Testing

```bash
k6 run tests/load-test-consolidation.js
# Target: 2s response time for 100 entities
```

---

## INTEGRATION CHECKLIST

For each component created, ensure:

- [ ] Component exports in `client/modules/EchoAurum/client/components/index.ts`
- [ ] API route integrated in `server/index.ts`
- [ ] Added to module navigation (if applicable)
- [ ] Tested with sample data
- [ ] Documentation added

---

## QUICK WINS (Fastest to Implement)

1. **Mobile Responsive** (1-2 hours) - Just add Tailwind classes
2. **Revenue Metrics API** (2-3 hours) - Simple calculations
3. **Custom Report Builder UI** (3-4 hours) - Reuse existing table component
4. **Comments Thread** (1-2 hours) - Basic list + textarea

---

## Estimated Timeline

- **PHASE 3 Remaining** (5 tasks): 2-3 days
- **Mobile Responsive** (5 tasks): 1 day
- **Integrations** (16 tasks): 3-4 days
- **QA & Launch** (10 tasks): 2-3 days

**Total:** ~10-12 days for 35 remaining tasks = ~3-4 tasks per day with 2-3 engineers

---

## SUCCESS METRICS

- [x] All PHASE 2 USALI reports complete (10/10)
- [ ] All PHASE 3 approval workflows complete (8/8)
- [ ] All supplemental features complete (17/17)
- [ ] All QA tasks complete (10/10)
- [ ] Zero regressions in existing features
- [ ] Performance targets met (200ms latency SLO)
