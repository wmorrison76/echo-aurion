# ADR-0003 · D17 fuse-box pattern for vendor adapters

## Status
Accepted · 2026-04 (D17 series)

## Context
LUCCCA integrates with dozens of third-party vendors: Toast /
Aloha / Micros (POS), Booking.com / Expedia (hotel OTA),
OpenTable / Resy (restaurant reservations), MindBody / Vagaro
(spa), Sysco / US Foods (procurement), Stripe (payments), banks
(ACH), OpenAI / Anthropic (LLM), QR-server / Tesseract (OCR).

The naïve approach: import each vendor's SDK directly into the
route that needs it. The result: import-cycle hell, untestable
routes, and a reckless dependency graph where a Sysco SDK
breaking change blocks payroll deploys.

## Decision
**The "fuse box" pattern**: every vendor integration lives in
exactly one file under `services/clients.py` (or a sub-module).
The route module imports a factory function, not the vendor SDK
directly. The factory:

  · reads config from env / secrets manager
  · returns a vendor-specific client implementing a uniform
    interface
  · is lazy (instantiated on first use, cached thereafter)

Routes look like:

```python
def reconcile():
    from services.clients import get_pos_client
    pos = get_pos_client(vendor="toast")
    pos.submit_order(...)
```

Not like:

```python
import toast_sdk  # ← direct vendor coupling
```

## Consequences
**Pros**
- Tests stub the factory, not the SDK — no network mocks needed
- Vendor swap (Toast → Aloha) is a one-file change
- Per-tenant vendor selection is trivial (factory reads tenant
  config, returns the right client)
- A vendor outage / rate-limit hit can be circuit-broken in
  one place

**Cons / risks**
- Adds an indirection layer; new engineers must learn the
  pattern before they can wire a vendor
- Factory must be diligent about not leaking vendor-specific
  types upward (e.g., Toast's order schema ≠ our `OrderCreateBody`)
- Secret rotation requires factory cache invalidation

**Alternatives considered**
- **Direct SDK imports**: rejected — couples test setup,
  deploy timing, and vendor versioning
- **Service mesh / API gateway**: overkill for solo-operator
  stage; revisit when we have multi-property production load

## Migration trigger
Re-evaluate when:
- More than 30 vendor adapters exist (pattern starts to creak)
- Need for per-request vendor failover (e.g., primary OCR vendor
  is down → fail over to secondary mid-request) suggests we
  should adopt a circuit breaker library on top
