# Production readiness — D53 status board

This file is the single source of truth for "what's ready, what's
fuse-box-seam, what still needs the human." Updated 2026-05-07.

---

## ✅ Code logic — production-ready

Every module under `backend/echo/`, `backend/routes/echo_*.py`,
`backend/routes/myecho_enrollment.py`, `backend/routes/sous_chef_agent.py`,
`backend/routes/cross_dept_borrow.py`, `backend/routes/qr_library.py`,
`backend/routes/payroll_engine_full.py`, `backend/routes/pms_core.py`,
`backend/routes/reservation_channels.py`, `backend/routes/tip_share_engine.py`,
`backend/routes/vendor_mobile_ordering.py`, `backend/routes/recipe_scan_mobile.py`
ships with:

- Real implementation (no `raise NotImplementedError` / `pass` stubs)
- In-process FakeDb tests in the relevant test file
- Doctrine-aligned audience gates (`x-audience-register`,
  `x-tenant-id`, `x-user-id`)
- D27 tenant isolation
- D53.15 contract test coverage where applicable

D53 hardening (this PR) adds:

- **Database indexes** on every hot-read path (`backend/db_indexes.py`,
  60+ indexes wired at boot)
- **`/healthz` / `/readyz` / `/version`** endpoints
  (`backend/routes/health.py`)
- **Rate limiting** (`backend/middleware/rate_limit.py` —
  in-process sliding window per (ip, endpoint_class))
- **Webhook signature verification** scaffold for OTAs
  (`backend/middleware/webhook_signatures.py`)
- **Mongo transaction helper** for D33 reconcile + D47 payroll
  post (`backend/lib/transactions.py`)
- **Structured JSON logging** (`backend/lib/structured_logging.py`)
- **Data retention cron** for Tenet §7 decay
  (`backend/jobs/data_retention.py`)
- **Tenant isolation contract tests**
  (`backend/tests/test_tenant_isolation_contract.py`)
- **GitHub Actions CI** (`.github/workflows/ci.yml`)
- **5 ADRs** (`docs/adr/0001..0005`)

---

## ⚠️ D17 fuse-box seams — architectural, ready for vendor adapter

These are NOT 80–90% files. Echo owns 100% of its side. The
vendor adapter is a one-file slot in `services/clients.py` (ADR-0003).

| Seam | What Echo does today | Wire when |
|---|---|---|
| `pos_failover.py` reconcile | Persists synthetic external_id to `pos_replay_log`, audit emitted | Toast / Aloha / Micros API contract negotiated |
| `vendor_mobile_ordering.py` submit | Stamps `failover-{nk}` external_po_id | Sysco / US Foods API contract negotiated |
| `payroll_engine_full.py` post | Generates ACH batch in `ach_batches` collection | Bank ACH API negotiated; **NACHA file format adapter required** |
| `pms_core.py` channel I/O | Persists ARI feed payload, audit emitted | Booking.com / Expedia / Marriott CRS connections live |
| `reservation_channels.py` 18 channels | Registry, dedupe, collision detection real | Per-channel SDK plug-in (OpenTable / Resy / Tock / SevenRooms / Yelp / TheFork / MindBody / Vagaro / Acuity / Viator / GetYourGuide / Klook) |
| `recipe_scan_mobile.py` server-side OCR | On-device path real; server fallback uses `services.clients.get_ocr_client()` | Tesseract / Google Vision / Apple Vision contract |
| `sous_chef_agent.py` intent classifier | Regex heuristic real; works for the documented commands | Upstream LLM via D17 fuse-box for fuzzy / multi-step intents |

---

## 🟡 Honest placeholders — flagged in code

| Where | What | Replacement path |
|---|---|---|
| `payroll_engine_full.py:102` | `FICA_OASDI_WAGE_BASE_2026 = 168600.00 # placeholder` + simplified federal brackets + 5% flat state default | Load `tax_tables` collection per (year, jurisdiction); seed from IRS Pub 15-T + state DOR publications |
| `echo_activity_drawer.py` `TEACH_PRIMERS` | Built-in primers for "P&L" / "Monte Carlo" / "prime cost" | LLM seam via D17 for arbitrary educational queries |

---

## 🔴 Still need the human — infrastructure decisions

I cannot make these without your call. **Each is a
yes/no in your hands; once decided, implementation is < 1 day
each.**

### 1. CI runner choice
The `.github/workflows/ci.yml` shipped this PR assumes GitHub
Actions. If you use GitLab CI / Buildkite / CircleCI, port it.

**Action:** confirm GitHub Actions OR tell me to port.

### 2. Secrets manager
Currently: `.env` files. Need: Vault / AWS Secrets Manager /
Fly secrets / Doppler.

**Action:** pick one. I wire the boot-time secret loader
matching your choice.

### 3. MongoDB backup strategy
- Mongo Atlas backups (built-in, paid tier)?
- `mongodump` cron to S3 / GCS bucket?
- Replica set with snapshots?

**Action:** pick one. I wire the backup script + the
restore-test runbook.

### 4. Authentication provider
D34 MyEcho session tokens stand alone. Need to integrate with
existing LUCCCA auth.

**Action:** show me the existing auth surface (or confirm
"there's nothing yet, build OAuth"). I'll wire token rotation +
compromise-revocation flow.

### 5. Background job queue
Long-running ops (W2 batch, payroll post, channel ARI sync)
currently run synchronously inside HTTP handlers.

**Action:** Celery + Redis? RQ? Arq? **My recommendation:
Arq (lightweight, async-native, matches FastAPI's async story).**

### 6. Staging / production environment matrix
Where does code go after merging to main?

**Action:** confirm Fly.io (the `fly.toml` files suggest this)
or tell me the actual hosting.

### 7. On-call rotation / pager
Who gets woken up at 3am when `/readyz` returns 503?

**Action:** tell me the pager target (PagerDuty / OpsGenie /
phone) and the on-call schedule.

### 8. Webhook signing keys per channel
D53.6 webhook signature verification is scaffolded but won't
accept inbound from any channel until you provision a signing
key per partner.

**Action:** for each OpenTable / Resy / Booking.com etc.
account you create, copy the partner's signing key into your
secrets manager (key name pattern:
`ECHO_WEBHOOK_KEY_<CHANNEL_UPPER>`).

### 9. Tax table seed
Per the placeholder in payroll: load `tax_tables` collection
with current year's IRS Pub 15-T + per-state DOR tables.

**Action:** purchase / license a tax-table data feed (Symmetry
Software / Vertex / Avalara) OR have a CPA author the seed
JSON. Then run the seed script (I'll write the loader once
the data shape is decided).

---

## How to flip the "fuse-box seam" gates to real adapters

Each entry in §⚠️ has a one-file replacement path. Example for
Toast POS in D33:

1. Sign Toast partner agreement; get API credentials
2. Add to `services/clients.py`:
   ```python
   def get_pos_client(vendor: str = "toast"):
       if vendor == "toast":
           from toast_sdk import ToastClient
           return ToastClient(api_key=settings.TOAST_API_KEY)
       # ...other vendors
   ```
3. Update `routes/pos_connector.py:submit_failover_order` to
   call `get_pos_client().submit_order(payload)` instead of
   writing the synthetic id
4. Run the existing D33 tests + the D53.15 contract tests
5. Ship

Total: ~half a day per vendor once the partner agreement is in
hand.

---

## Status header (kept current — update on every PR that touches
this list)

```
Last updated:        2026-05-07 (D53 hardening pass)
Modules production-ready:   18 (D31-D52 + D10-D11)
Fuse-box seams open:        7 (Toast, Sysco, Bank ACH, OTAs,
                                Spa, OCR, LLM)
Honest placeholders:        2 (tax tables, teach primers)
Infrastructure decisions:   9 (see §🔴)
CI workflow:                wired (GitHub Actions)
DB indexes:                 wired (60+)
Health checks:              wired (/healthz, /readyz, /version)
Rate limit:                 wired (in-process; Redis upgrade
                                queued)
Webhook signatures:         scaffolded (keys pending per partner)
Tenant isolation tests:     6 contracts, more added per module
ADRs:                       5 (Mongo, FastAPI, fuse-box, tenant,
                                doctrine-as-contract)
```
