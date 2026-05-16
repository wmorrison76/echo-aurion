# Event Cost Bridge Integration Guide

## Overview

The Event Cost Bridge enables the P&R module to track and sync costs at the event level with EchoAurum for accurate event-based COGS calculations. This allows:

- **Event-level cost tracking** during receiving and invoice processing
- **Automatic cost allocation** to EchoAurum's event GL accounts
- **Real-time event dashboards** showing actual costs vs. budgets
- **Compliance & audit trails** for catering, banquets, and managed events

## Architecture

```
Purchasing & Receiving → Event Cost Bridge → EchoAurum
                      ↓
              Supabase (local audit)
                      ↓
              EchoEvents (optional notifications)
```

## Types & Interfaces

### EventReference
Links a receiving/invoice transaction to an event:
```typescript
interface EventReference {
  eventId: string;      // EchoEventStudio UUID
  beoId: string;        // BEO/REO identifier
  outletId: string;     // Which outlet/property
  propertyCode: string; // For Aurum ledger routing
  label?: string;       // "Smith Wedding – Ballroom A"
}
```

### EventCostAllocation
Persists a line-item cost allocation:
```typescript
interface EventCostAllocation {
  id: string;
  organization_id: string;
  outlet_id: string;
  event_id: string;
  beo_id: string;
  invoice_id: string;
  invoice_line_id: string;
  product_code: string;
  description: string;
  quantity_base: number;
  unit_cost_base: number;
  total_cost: number;
  gl_account: string;
  created_at: string;
}
```

### EventCostSyncPayload
Payload sent to EchoAurum:
```typescript
interface EventCostSyncPayload {
  sourceSystem: 'PurchasingReceiving';
  organizationId: string;
  propertyCode: string;
  outletId: string;
  eventId: string;
  beoId: string;
  invoiceId: string;
  allocations: {
    invoiceLineId: string;
    productCode: string;
    description: string;
    qtyBase: number;
    unitCostBase: number;
    totalCost: number;
    glAccount: string;
  }[];
  createdAt: string;
}
```

## API Endpoints

### POST /api/bridge/event-costs/from-invoice
Sync event costs after invoice finalization (called from 3-way matching workflow).

**Request:**
```json
{
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "propertyCode": "PHX-01",
  "outletId": "550e8400-e29b-41d4-a716-446655440001",
  "eventId": "EVT-202412-001",
  "beoId": "BEO-2024-12-15-001",
  "invoiceId": "550e8400-e29b-41d4-a716-446655440002",
  "allocations": [
    {
      "invoiceLineId": "550e8400-e29b-41d4-a716-446655440003",
      "productCode": "BEEF-RIBEYE-12OZ",
      "description": "Ribeye Steak 12oz",
      "qtyBase": 50,
      "unitCostBase": 28.50,
      "totalCost": 1425.00,
      "glAccount": "5110-COGS-BEEF"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "allocationsCount": 1,
  "totalCost": 1425.00,
  "eventId": "EVT-202412-001",
  "createdAt": "2024-12-15T10:30:00Z"
}
```

### GET /api/bridge/event-costs/allocations
Retrieve allocations for audit and reporting.

**Query Parameters:**
- `organizationId` (required): UUID
- `eventId` (optional): Filter by event
- `invoiceId` (optional): Filter by invoice
- `limit` (default: 100): Max results
- `offset` (default: 0): Pagination

### DELETE /api/bridge/event-costs/allocations/:allocationId
Remove an allocation (audit correction).

## UI Integration - Hooks

### useEventLinking()
Manage event references in your component:

```typescript
import { useEventLinking } from 'src/modules/PurchRec/hooks';

export function ReceivingPanel() {
  const {
    eventRef,
    setEvent,
    clearEvent,
    linkToEvent,
    linkError,
  } = useEventLinking();

  const handleSelectEvent = (event: EventReference) => {
    linkToEvent(event);
  };

  return (
    <div>
      {eventRef && (
        <div className="bg-blue-50 p-3 rounded">
          <span>Linked to: {eventRef.label}</span>
          <button onClick={clearEvent}>Unlink</button>
        </div>
      )}
      {linkError && <p className="text-red-600">{linkError}</p>}
      <EventSelector onSelect={handleSelectEvent} />
    </div>
  );
}
```

### useEventCostSync(organizationId)
Sync costs to EchoAurum after invoice finalization:

```typescript
import { useEventCostSync } from 'src/modules/PurchRec/hooks';

export function InvoiceReviewPanel({ invoice }) {
  const { syncEventCosts, syncError, isSyncing } = useEventCostSync(
    organizationId
  );

  const handleApproveAndSync = async () => {
    try {
      const result = await syncEventCosts({
        propertyCode: 'PHX-01',
        outletId: outlet.id,
        eventId: invoice.eventRef.eventId,
        beoId: invoice.eventRef.beoId,
        invoiceId: invoice.id,
        allocations: invoice.lines.map(line => ({
          invoiceLineId: line.id,
          productCode: line.product.code,
          description: line.product.name,
          qtyBase: line.quantity,
          unitCostBase: line.unit_cost,
          totalCost: line.total,
          glAccount: line.gl_code,
        })),
      });

      console.log(`Synced ${result.allocationsCount} allocations`);
      // Close modal, refresh list, etc.
    } catch (err) {
      console.error('Sync failed:', syncError);
    }
  };

  return (
    <button
      onClick={handleApproveAndSync}
      disabled={isSyncing}
    >
      {isSyncing ? 'Syncing...' : 'Approve & Sync to Events'}
    </button>
  );
}
```

## UI Integration - Components

### Example 1: Event Selector in Receiving Panel

```typescript
// In ReceivingPanel or similar
import { useEventLinking } from 'src/modules/PurchRec/hooks';

function ReceivingEventLink() {
  const { eventRef, setEvent } = useEventLinking();
  const [events, setEvents] = useState<EventReference[]>([]);

  useEffect(() => {
    // Fetch events from EchoEvents API
    fetch('/api/events?status=active')
      .then(r => r.json())
      .then(data => setEvents(data.events));
  }, []);

  return (
    <div className="space-y-3">
      {eventRef ? (
        <div className="bg-green-50 border border-green-200 p-3 rounded">
          <p className="font-semibold">Linked Event</p>
          <p className="text-sm">{eventRef.label}</p>
          <button
            onClick={() => setEvent(null)}
            className="text-sm text-red-600 hover:underline"
          >
            Unlink
          </button>
        </div>
      ) : (
        <select
          onChange={(e) => {
            const event = events.find(ev => ev.eventId === e.target.value);
            if (event) setEvent(event);
          }}
          className="w-full p-2 border rounded"
        >
          <option value="">Select an event...</option>
          {events.map(event => (
            <option key={event.eventId} value={event.eventId}>
              {event.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

### Example 2: Event Cost Summary Dashboard

```typescript
// New component for EventCostDashboard
import { useEventCostSync } from 'src/modules/PurchRec/hooks';

export function EventCostDashboard({ eventId }: { eventId: string }) {
  const { fetchAllocations, isSyncing } = useEventCostSync(organizationId);
  const [allocations, setAllocations] = useState<EventCostAllocation[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    fetchAllocations({ eventId }).then(result => {
      setAllocations(result.data);
      setTotalCost(
        result.data.reduce((sum, a) => sum + a.total_cost, 0)
      );
    });
  }, [eventId]);

  return (
    <div className="space-y-4">
      <div className="text-3xl font-bold">${totalCost.toFixed(2)}</div>
      <p className="text-slate-600">{allocations.length} items allocated</p>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left">Product</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Unit Cost</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map(a => (
            <tr key={a.id} className="border-b">
              <td>{a.description}</td>
              <td className="text-right">{a.quantity_base}</td>
              <td className="text-right">${a.unit_cost_base.toFixed(2)}</td>
              <td className="text-right">${a.total_cost.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Workflow Integration Points

### 1. Receiving Workflow
When a receiving session is created, optionally link it to an event:

```typescript
// In ReceivingWorkflow component
const { eventRef } = useEventLinking();

const handleCreateReceiving = async () => {
  const receiving = await api.createReceiving({
    po_id,
    items,
    // Include event reference if set
    ...(eventRef && {
      event_id: eventRef.eventId,
      beo_id: eventRef.beoId,
    }),
  });
};
```

### 2. Invoice Processing (3-Way Match)
After successful 3-way match and invoice approval:

```typescript
// In InvoiceReviewPanel or ApprovalModal
const { syncEventCosts } = useEventCostSync(organizationId);

const handleApproveInvoice = async (invoice) => {
  // 1. Mark as approved in P&R
  await api.approveInvoice(invoice.id);

  // 2. If event is linked, sync costs to EchoAurum
  if (invoice.event_id && invoice.beo_id) {
    await syncEventCosts({
      propertyCode: outlet.property_code,
      outletId: outlet.id,
      eventId: invoice.event_id,
      beoId: invoice.beo_id,
      invoiceId: invoice.id,
      allocations: invoice.lines.map(mapToAllocation),
    });
  }
};
```

### 3. GL Posting
When posting GL entries, include event dimension:

```typescript
// In GL posting logic
const createGLEntry = (allocation: EventCostAllocation) => {
  return {
    gl_code: allocation.gl_account,
    debit_amount: allocation.total_cost,
    credit_amount: 0,
    reference_id: allocation.invoice_id,
    reference_type: 'event_cost',
    // Optional: include event context
    metadata: {
      event_id: allocation.event_id,
      beo_id: allocation.beo_id,
    },
  };
};
```

## Environment Configuration

Required environment variables for the bridge to work:

```env
# EchoAurum Integration
AURUM_BASE_URL=https://aurum.example.com
AURUM_API_KEY=your-api-key

# Optional: EchoEvents Integration
ECHO_EVENTS_BASE_URL=https://events.example.com
ECHO_EVENTS_API_KEY=your-api-key
```

## Testing

### Test Event Cost Sync Locally

```bash
# 1. Create an invoice with lines
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "550e8400-e29b-41d4-a716-446655440000",
    "vendor_id": "SYSCO",
    "number": "INV-2024-001",
    "total": 1425.00
  }'

# 2. Sync event costs
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
      "description": "Ribeye Steak",
      "qtyBase": 50,
      "unitCostBase": 28.50,
      "totalCost": 1425.00,
      "glAccount": "5110-COGS-BEEF"
    }]
  }'

# 3. Verify allocations
curl http://localhost:3000/api/bridge/event-costs/allocations?organizationId=echo-ai-framework&eventId=EVT-202412-001
```

## Dashboard Views

Two SQL views are available for dashboards:

### event_cost_summary
Event-level cost aggregation:
```sql
SELECT * FROM event_cost_summary
WHERE organization_id = $1
ORDER BY last_allocation_at DESC;
```

### invoice_event_allocations
Invoice-to-event allocation tracking:
```sql
SELECT * FROM invoice_event_allocations
WHERE organization_id = $1;
```

## Monitoring & Audit

All allocations are logged with:
- Source system (always 'PurchasingReceiving')
- Timestamp of creation
- User who triggered sync
- Full allocation details for audit

Check Supabase logs for sync errors:
```sql
SELECT * FROM event_cost_allocations
WHERE organization_id = $1
ORDER BY created_at DESC
LIMIT 100;
```

## Troubleshooting

**Sync fails with "Missing Aurum config"**
- Verify `AURUM_BASE_URL` and `AURUM_API_KEY` environment variables

**Event not found in EchoEvents**
- Verify `eventId` matches exactly (case-sensitive)
- Check event status is active in EchoEvents

**Allocations not appearing in EchoAurum**
- Check Aurum logs for 400/500 errors
- Verify GL account codes exist in Aurum
- Confirm organization/property mapping

**Duplicate allocations**
- Call DELETE endpoint to remove duplicates
- Use event timestamp + invoice line as natural key

## Next Steps

1. **Connect Supabase**: Ensure migration is applied
2. **Set environment variables**: AURUM_BASE_URL, AURUM_API_KEY
3. **Test API endpoints**: Use curl examples above
4. **Integrate hooks**: Add `useEventLinking` to receiving/invoice panels
5. **Deploy**: Push code and run migrations in production
