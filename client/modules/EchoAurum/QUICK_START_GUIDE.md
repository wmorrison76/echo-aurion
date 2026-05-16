# Phase 2 & 3 Quick Start Guide

---

## 🚀 What's New (This Session)

### Phase 2: USALI Reports
**10 hospitality-specific financial reports + gallery + drill-down + export**

### Phase 3: Approval Workflows  
**Rule-based routing + escalation + delegation + comments**

---

## 📦 COMPONENTS TO USE

### Phase 2 - Import Examples

```typescript
// Gallery View (shows all 10 reports)
import { USALIReportGallery } from '@/modules/aurum/components';
<USALIReportGallery entityId="hotel-1" periodDate="2024-01" />

// Individual Reports
import { RoomRevenueReport } from '@/modules/aurum/components';
<RoomRevenueReport entityId="hotel-1" periodDate="2024-01" />

// Drill-Down
import { USALIReportDrillDown } from '@/modules/aurum/components';
<USALIReportDrillDown 
  entityId="hotel-1" 
  periodDate="2024-01" 
  reportType="room-revenue"
/>

// Export
import { USALIReportExport } from '@/modules/aurum/components';
<USALIReportExport 
  entityId="hotel-1"
  periodDate="2024-01"
  reportType="room-revenue"
  reportName="Room Revenue by Type"
/>
```

### Phase 3 - Import Examples

```typescript
// Approval Escalation Panel
import { ApprovalEscalationPanel } from '@/modules/aurum/components';
<ApprovalEscalationPanel entityId="hotel-1" />

// Comments Thread
import { ApprovalCommentsThread } from '@/modules/aurum/components';
<ApprovalCommentsThread 
  approvalId="app-123"
  entityId="hotel-1"
  currentUser="john.smith"
/>

// Delegation Panel
import { ApprovalDelegationPanel } from '@/modules/aurum/components';
<ApprovalDelegationPanel
  approvalId="app-123"
  currentApprover="John Smith"
  currentApproverRole="controller"
  entityId="hotel-1"
/>

// Rules Configuration
import { ApprovalRulesConfiguration } from '@/modules/aurum/components';
<ApprovalRulesConfiguration entityId="hotel-1" />
```

---

## 🪝 HOOKS TO USE

### Phase 2 Hook
```typescript
import { useUSALIReports } from '@/modules/aurum/hooks';

const MyComponent = () => {
  const { data, loading, error, refresh } = useUSALIReports(
    'room-revenue',
    'hotel-1',
    '2024-01'
  );

  return (
    <>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {data && <div>{JSON.stringify(data)}</div>}
    </>
  );
};
```

### Phase 3 Hook
```typescript
import { useApprovalWorkflowV2 } from '@/modules/aurum/hooks';

const MyComponent = () => {
  const {
    workflows,
    currentApproval,
    loading,
    approve,
    reject,
    escalate,
    delegate
  } = useApprovalWorkflowV2({
    entityId: 'hotel-1',
    approvalId: 'app-123'
  });

  return (
    <>
      <button onClick={() => approve('Looks good!')}>Approve</button>
      <button onClick={() => reject('Need more info')}>Reject</button>
      <button onClick={() => escalate()}>Escalate</button>
    </>
  );
};
```

---

## 📊 USALI REPORTS AVAILABLE

| Report | GL Accounts | Key Metrics |
|--------|------------|-------------|
| Room Revenue | 4100-4303 | ADR, RevPAR, Occupancy |
| F&B Revenue | 4410-4441 | Avg Check, Cost % |
| Labor Analysis | 5000-5201 | Labor %, FTE |
| Dept P&L | 4100-7102 | Op Income, Margin |
| Operating Expenses | 7000-7302 | Op Expense Ratio |
| Cost of Sales | 6010-6012 | COGS %, Variance |
| Guest Summary | 4100-4423 | KPIs, Metrics |
| Dept Profit | 4100-7102 | Margin %, Payback |
| Banquet | 4412-5013 | Profit %, Per Cover |
| Cash Position | 1000-2200 | WC, Current Ratio |

---

## 📋 APPROVAL RULES (Default 7)

```
Rule ID                  | Condition           | Action
Auto-Approve Small      | Amount < $1K        | Auto-approve
L1 Approval             | $1K-$10K            | Require L1
L2 Approval             | $10K-$50K           | Require L2
CFO Approval            | Amount > $50K       | Require CFO
Two Approvers           | Acct 5900/5901      | Require 2
Guardian Check          | JE > $25K           | Guardian validate
Consolidation Review    | Type = Consolidation| Review required
```

---

## 🔌 API ENDPOINTS

### USALI Reports
```
GET /api/aurum/reports/usali/{type}?entityId={id}&periodDate={date}
GET /api/aurum/reports/usali/drill-down?entityId={id}&periodDate={date}&reportType={type}
GET /api/aurum/reports/usali/{type}/export?entityId={id}&periodDate={date}&format={pdf|excel|csv}
```

### Approvals
```
GET /api/aurum/approvals?entityId={id}
GET /api/aurum/approvals/{id}
POST /api/aurum/approvals/{id}/approve
POST /api/aurum/approvals/{id}/reject
POST /api/aurum/approvals/{id}/escalate
POST /api/aurum/approvals/{id}/delegate
GET /api/aurum/approvals/{id}/comments
POST /api/aurum/approvals/{id}/comments
GET /api/aurum/approval-rules
PATCH /api/aurum/approval-rules/{id}
```

---

## 🧪 TESTING CHECKLIST

### Phase 2 Testing
- [ ] Load USALI Report Gallery
- [ ] Click on each report type
- [ ] View chart and metrics
- [ ] Drill-down to GL accounts
- [ ] Export as CSV/PDF/Excel
- [ ] Verify caching (5 min TTL)
- [ ] Test error states
- [ ] Test mobile responsive design

### Phase 3 Testing
- [ ] Load Escalation Panel
- [ ] Approve an entry
- [ ] Reject with reason
- [ ] Escalate to next level
- [ ] Add comments with @mentions
- [ ] Delegate to another approver
- [ ] Configure rules
- [ ] Toggle rules on/off

---

## 🛠️ INTEGRATION CHECKLIST

### With Dashboard
- [ ] Add USALIReportGallery to Reports page
- [ ] Link Consolidation drill-down to reports
- [ ] Add ApprovalEscalationPanel to Dashboard

### With Approval Queue
- [ ] Add ApprovalCommentsThread to approval detail
- [ ] Add ApprovalDelegationPanel to approval detail
- [ ] Add ApprovalEscalationPanel to queue dashboard

### With Settings
- [ ] Add ApprovalRulesConfiguration to settings
- [ ] Add entity-level rule customization

---

## 📊 DATA FLOW

### Phase 2
```
Component → Hook (useUSALIReports) 
  ↓
Fetch Data from API (/api/aurum/reports/usali/{type})
  ↓
Check Cache (5-min TTL)
  ↓
Database Query (GL accounts filtered by period)
  ↓
Response to Component
  ↓
Render Chart + Metrics
```

### Phase 3
```
Approval Entry Created
  ↓
ApprovalRulesEngine Evaluates Rules
  ↓
Determines Required Action (L1/L2/CFO/Guardian)
  ↓
Create Approval Workflow
  ↓
ApprovalEscalationManager Monitors
  ↓
24h → Auto-escalate (or manual)
  ↓
ApprovalDelegationManager Reassigns
  ↓
Guardian Validates
  ↓
AutoPostFeatureManager Posts to GL
```

---

## 🎨 CUSTOMIZATION

### Add Custom USALI Report
1. Create component in `usali-reports/` folder
2. Use `useUSALIReports` hook for data
3. Add to `USALIReportGallery` reports array
4. Add template to `usaliReportTemplates.ts`

### Add Custom Approval Rule
```typescript
const rulesEngine = new ApprovalRulesEngine();
rulesEngine.addRule({
  id: "custom-rule",
  condition: (entry) => entry.accountCode === "8000",
  action: "require_cfo_approval",
  priority: 2
});
```

### Customize Escalation Timeline
```typescript
// In approvalRulesEngine.ts
// Modify getApprovalMetadata() for different escalation hours
```

---

## 🚨 COMMON ISSUES

### Issue: Reports not loading
**Solution:** Check JWT token, verify entityId parameter

### Issue: Drill-down showing no accounts
**Solution:** Verify GL data exists for period, check journal_entries table

### Issue: Comments not appearing
**Solution:** Verify API endpoint, check user permissions

### Issue: Escalation not triggering
**Solution:** Check current time vs creation time (24h threshold)

---

## 📚 DOCUMENTATION

| Document | Content |
|----------|---------|
| PHASE_2_USALI_COMPLETION_SUMMARY.md | Detailed Phase 2 features & architecture |
| PHASE_3_APPROVAL_WORKFLOWS_COMPLETION_SUMMARY.md | Detailed Phase 3 features & rules |
| PHASE_2_3_COMPLETION_EXECUTIVE_SUMMARY.md | Executive overview & business value |
| SESSION_COMPLETION_REPORT.md | Full session summary & deliverables |
| QUICK_START_GUIDE.md | This file |

---

## ✅ DEPLOYMENT STEPS

1. **Deploy Components**
   ```bash
   npm run build
   # Verify all components compile
   ```

2. **Setup Database** (if needed)
   ```sql
   -- Create tables for approval_comments, approval_delegations
   -- Run migrations from server/migrations/
   ```

3. **Test Endpoints**
   ```bash
   # Test each API endpoint with JWT token
   curl -H "Authorization: Bearer {token}" \
     "http://localhost:3000/api/aurum/reports/usali/room-revenue"
   ```

4. **Deploy to Production**
   ```bash
   npm run build && npm run deploy
   ```

---

## 🎓 NEXT STEPS

**Phase 4 Available Tasks:**
1. Mobile responsive enhancements
2. Inventory integration (MarginEdge)
3. Labor scheduling (Toast integration)
4. Revenue metrics & KPIs
5. Bank feed & reconciliation
6. Custom report builder

**Estimated Timeline:** 2-3 weeks

---

## 💬 SUPPORT

All components include:
- ✅ TypeScript types
- ✅ Error handling
- ✅ Loading states
- ✅ JSDoc comments
- ✅ Example usage

**Quick Reference:** See component files for detailed prop types and documentation.

---

**Ready to deploy!** 🚀
