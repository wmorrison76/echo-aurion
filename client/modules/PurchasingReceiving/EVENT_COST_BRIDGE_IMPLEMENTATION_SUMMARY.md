# Event Cost Bridge Implementation Summary

## Overview
Complete implementation of the EchoEvents ↔ EchoAurum event-level COGS tracking bridge for the Purchasing & Receiving module.

## Files Created & Modified

### 1. **Type Definitions** ✅
**File:** `shared/types/purchasing.ts`

Added interfaces:
- `EventReference` - Links transactions to events
- `EventCostAllocation` - Persists cost allocations
- `ReceivingSessionEventLink` - Optional session-level linking
- `PurchaseOrderLineWithEvent` - PO line event metadata
- `InventoryLotWithEvent` - Inventory lot event metadata
- `InvoiceLineEventMeta` - Invoice line event metadata
- `EventCostSyncPayload` - Payload for EchoAurum sync

### 2. **API Route** ✅
**File:** `server/routes/event-cost-bridge.ts`

Endpoints implemented:
- `POST /bridge/event-costs/from-invoice` - Sync event costs after invoice finalization
  - Validates payload with Zod
  - Persists allocations to local DB
  - Forwards to EchoAurum via webhook
  - Notifies EchoEvents (optional)
  - Returns confirmation with allocation count and total cost

- `GET /bridge/event-costs/allocations` - Query allocations for audit
  - Supports filtering by eventId, invoiceId
  - Pagination support (limit/offset)
  - Counts total records

- `DELETE /bridge/event-costs/allocations/:allocationId` - Remove allocation (audit correction)

### 3. **UI Hooks** ✅
**File:** `src/modules/PurchRec/hooks/useEventLinking.ts`

Hooks exported:
- `useEventLinking(initialEvent?)` - Manage event references
  - State: eventRef, isLinking, linkError
  - Methods: setEvent, clearEvent, linkToEvent, unlinkEvent

- `useEventCostSync(organizationId)` - Sync costs to EchoAurum
  - syncEventCosts() - Post allocations to bridge API
  - fetchAllocations() - Query existing allocations
  - State: isSyncing, syncError

### 4. **Hook Exports** ✅
**File:** `src/modules/PurchRec/hooks/index.ts`

Added exports for new hooks

### 5. **Server Route Registration** ✅
**File:** `server/index.ts`

- Imported `eventCostBridgeRouter`
- Registered at `/api` path
- Positioned after procurement routes

### 6. **Database Migrations** ✅
**File:** `migrations/051_event_cost_allocation.sql`

Tables created:
- `event_cost_allocations` - Tracks line-item costs
  - Columns: id, organization_id, outlet_id, event_id, beo_id, invoice_id, invoice_line_id, product_code, description, quantity_base, unit_cost_base, total_cost, gl_account, created_at
  - Constraints: positive cost, positive qty
  - Indexes: org, event, invoice, outlet+event, created_at

- `receiving_session_event_links` - Optional session-level linking
  - Columns: id, session_id, event_id, beo_id, outlet_id, property_code, created_by, created_at
  - Indexes: session, event, outlet

Views created:
- `event_cost_summary` - Event-level aggregation for dashboards
  - Groups by: org, outlet, event, BEO
  - Aggregates: line count, total qty, total cost, min/max timestamps

- `invoice_event_allocations` - Invoice-to-event allocation tracking
  - Shows allocation count and percentage per invoice/event

RLS Policies:
- Allocations: SELECT/INSERT/DELETE by organization
- Session links: SELECT/INSERT by organization

## Integration Points

### Workflow: Receiving
1. Create receiving transaction
2. Optionally link to event via `useEventLinking()`
3. Store event reference for later matching

### Workflow: 3-Way Match & Invoice Approval
1. Invoice passed through matching
2. Upon approval, call `useEventCostSync().syncEventCosts()`
3. Bridge endpoint persists allocations
4. EchoAurum receives webhook with COGS data
5. EchoEvents notified (optional)

### GL Posting
1. After sync, GL entries created with event context
2. COGS accounts show event-level detail

## Key Features

✅ **Decoupled Architecture**
- P&R module doesn't require EchoEvents/EchoAurum to function
- Graceful degradation if external systems unavailable
- Local audit trail in event_cost_allocations table

✅ **Validation**
- Zod schemas for all POST/GET parameters
- Constraint checking at DB level (positive amounts)
- Error logging with sanitized messages

✅ **Security**
- RLS policies enforce organization boundaries
- Service role used for internal API calls
- API key authentication for EchoAurum

✅ **Observability**
- Structured logging with context
- Audit trail via created_at timestamps
- Dashboard views for cost tracking

✅ **Scalability**
- Indexed queries for common filters
- Pagination support for large datasets
- Async notifications (don't block on external APIs)

## Environment Variables Required

```env
# EchoAurum Bridge
AURUM_BASE_URL=https://aurum.example.com
AURUM_API_KEY=your-api-key

# Optional: EchoEvents Notifications
ECHO_EVENTS_BASE_URL=https://events.example.com
```

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] `POST /bridge/event-costs/from-invoice` endpoint works
- [ ] `GET /bridge/event-costs/allocations` returns data
- [ ] `DELETE /bridge/event-costs/allocations/:id` removes records
- [ ] Allocations visible in `event_cost_allocations` table
- [ ] EchoAurum webhook receives correct payload
- [ ] EchoEvents notification sent (if enabled)
- [ ] RLS policies prevent unauthorized access
- [ ] React hooks compile without errors
- [ ] Integration with receiving/invoice panels works

## API Contract Examples

### Sync Event Costs
```bash
curl -X POST http://localhost:3000/api/bridge/event-costs/from-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "550e8400-e29b-41d4-a716-446655440000",
    "propertyCode": "PHX-01",
    "outletId": "550e8400-e29b-41d4-a716-446655440001",
    "eventId": "EVT-202412-001",
    "beoId": "BEO-2024-12-15-001",
    "invoiceId": "550e8400-e29b-41d4-a716-446655440002",
    "allocations": [{
      "invoiceLineId": "550e8400-e29b-41d4-a716-446655440003",
      "productCode": "BEEF-RIBEYE",
      "description": "Ribeye Steak 12oz",
      "qtyBase": 50,
      "unitCostBase": 28.50,
      "totalCost": 1425.00,
      "glAccount": "5110-COGS-BEEF"
    }]
  }'
```

### Query Allocations
```bash
curl "http://localhost:3000/api/bridge/event-costs/allocations?organizationId=echo-ai-framework&eventId=EVT-202412-001&limit=50&offset=0"
```

### Delete Allocation
```bash
curl -X DELETE http://localhost:3000/api/bridge/event-costs/allocations/550e8400-e29b-41d4-a716-446655440003
```

## SQL Queries for Monitoring

### Check allocations for an event
```sql
SELECT * FROM event_cost_allocations
WHERE organization_id = 'ORG_UUID' AND event_id = 'EVT-ID'
ORDER BY created_at DESC;
```

### Event cost summary dashboard
```sql
SELECT * FROM event_cost_summary
WHERE organization_id = 'ORG_UUID'
ORDER BY last_allocation_at DESC
LIMIT 20;
```

### Find incomplete invoice allocations
```sql
SELECT i.id, i.number, i.total,
       COALESCE(SUM(eca.total_cost), 0) as allocated,
       i.total - COALESCE(SUM(eca.total_cost), 0) as unallocated
FROM invoices i
LEFT JOIN event_cost_allocations eca ON i.id = eca.invoice_id
WHERE i.organization_id = 'ORG_UUID'
GROUP BY i.id
HAVING i.total > COALESCE(SUM(eca.total_cost), 0);
```

## Documentation

Comprehensive integration guide available in:
📄 `EVENT_COST_BRIDGE_INTEGRATION.md`

Includes:
- Architecture diagrams
- Type definitions & interfaces
- Complete API documentation
- UI hook examples
- Workflow integration points
- Component examples
- Environment setup
- Testing procedures
- Troubleshooting guide

## Next Steps

1. **Apply Migration**
   ```bash
   npx supabase migration up
   ```

2. **Configure Environment**
   ```bash
   export AURUM_BASE_URL=https://aurum.example.com
   export AURUM_API_KEY=your-key
   ```

3. **Test API Endpoints**
   - Use curl examples above to verify endpoints

4. **Integrate UI Components**
   - Add `useEventLinking` to ReceivingPanel
   - Add `useEventCostSync` to InvoiceReviewPanel
   - Follow examples in EVENT_COST_BRIDGE_INTEGRATION.md

5. **Deploy**
   - Push code to main branch
   - Run migrations in production
   - Monitor logs for sync errors

## Performance Notes

- All queries indexed for common filters
- Pagination prevents loading large datasets
- Async external API calls don't block response
- View queries aggregate efficiently
- RLS policies applied at row level (no N+1)

## Security Notes

- All endpoints validate input with Zod
- RLS ensures cross-organization data isolation
- Service role used only for internal DB operations
- EchoAurum integration requires API key
- Error messages sanitized before logging
