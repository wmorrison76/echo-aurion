# Integrations Notes

## ERP Targets
- **Restaurant365** — OAuth2; export invoices as Vendor Bill.
- **Oracle Simphony** — Hospitality APIs; may use XML or JSON.
- **NetSuite** — SuiteTalk REST; export as vendorBill.

Each adapter should implement:

```ts
exportInvoice(invoiceId: string, orgId: string): Promise<{ status: string; erp_id?: string; message?: string }>;
```

## Payment Gateways
- **Stripe** — Payment Intents + Webhooks
- **Square** — Payments API
- **Adyen** — Payments API

### Payment Flow
1. Invoice exported.
2. Call `/invoices/{id}/pay`.
3. Update status via webhook.
