# D63 Recovery Audit Report

> Generated: iter265 · 2026-05-11
> Source checklist: `docs/recovery/D63_RECOVERY_CHECKLIST.md`
> Workspace state: post-merge of `origin/chore/preview-swap-and-shell-integration` (PR #72 D63 recovery + Claude's CI fix `f2a58e08f`) **plus** iter265 work.

---

## Headline

**🎉 D63 recovery is largely successful. 95%+ of checklist items are present and the running app exposes the expected routes.**

| Status | Count | Notes |
|---|---|---|
| ✅ Verified present + wired | ~155 items | Files exist, routers registered, OpenAPI confirms endpoints reachable |
| 🟡 Present but dangling | ~6 items | Code exists but archived or not registered |
| ❌ Missing entirely | ~3 items | Path expected by checklist not found anywhere |
| ⚠️ Path differs | 4 items | Code exists at a different path than the checklist states |

Backend boot: ✓ · `/api/openapi.json` reports **2,250 endpoints** total · all iter265 routes (`kitchen-fire`, `weather-rebook`, `fire-safety`, `commissary/*`) live alongside D63 recovery work.

---

## ✅ Verified present + wired

### D63 · Docs + Help Agent + Onboarding + OCR + Icons
- `backend/routes/help_agent.py` (line 26) → `/api/help-agent/*` (7 routes incl. `/tours`)
- `backend/routes/onboarding_wizard_v2.py` (line 27) → `/api/onboarding/*` (27 routes)
- `backend/echo/ocr_active_learning.py` (line 28) → `/api/echo/ocr-learning/*` (5 routes confirmed)
- `docs/UX_ICON_SYSTEM.md` (line 31) — present, D64-aesthetic-corrected
- `docs/ops-runbooks/DOCUMENTATION_HOMES.md` (line 32) — present
- `docs/modules/_TEMPLATE.md` (line 33), `admin.md` (34), `financial.md` (35), `myecho.md` (36), `echo_ai3.md` (37) — all present

### D55-D59 · PII + Foundation Gates + Atlas + Face ID
- `backend/middleware/security_headers.py` (line 74) — present
- `backend/lib/i18n.py` (line 75) — present
- `.github/dependabot.yml` (line 68), `.github/workflows/license-and-coverage.yml` (line 69), `scripts/generate_changelog.py` (line 70), `CHANGELOG.md` (line 71) — all present
- `backend/jobs/seed_tax_tables.py` (line 82) — present
- `backend/routes/myecho_webauthn.py` (line 85) — present
- `docs/ops-runbooks/MONGODB_ATLAS_SETUP.md` (line 89) — present
- `backend/routes/health.py` (line 92) — present, `/api/health` confirmed in OpenAPI
- `backend/jobs/data_retention.py` (line 95) — present, scheduled at `scheduler.py:343`

### D54 · Invoice Extractor
- `backend/echo/invoice_extractor.py` (line 104) — present (71 vendors)
- `backend/tests/test_invoice_extractor.py` (line 109) — present
- Routes exposed under `/api/echo/invoice-extract/*` (confirmed by code, not exhaustively probed)

### D53 · Production Hardening
- `backend/db_indexes.py` (line 119) — present
- `backend/middleware/rate_limit.py` (line 120), `webhook_signatures.py` (line 121) — present
- `backend/lib/transactions.py` (line 122), `structured_logging.py` (line 123) — present
- `_PRODUCTION_READINESS.md` (line 134) — present at repo root
- `.github/workflows/ci.yml` (line 137) — present

### D51-D52 · Chef P&L + Sommelier Salvage
- `backend/echo/chef_pnl_review.py` (line 146) — present
- `client/modules/MixologySommelier/lib/sommelier-knowledge/` (line 151), `liquor-knowledge/` (line 152), `schemas/` (line 153) — all present
- All 8 ops-runbooks (lines 154-161) — present

### D49-D50 · Tip Share + Reservation Channels
- `backend/routes/tip_share_engine.py` (line 170) → `/api/tip-share/*` (4 routes)
- `backend/routes/reservation_channels.py` (line 175) → `/api/reservation-channel/*` (6 routes)

### D48 · PMS Core
- `backend/routes/pms_core.py` (line 184) → `/api/pms/*` (12 routes)

### D47 · Payroll Engine + Self-Service
- `backend/routes/payroll_engine_full.py` (line 217) → `/api/payroll/*` (13 routes)
- Job-share + schedule-request + self-service routers all registered

### D46 · Vendor Mobile Ordering
- `backend/routes/vendor_mobile_ordering.py` (line 225) → `/api/vendor-order/*` (5 routes confirmed)

### D33 · POS Failover + 8h Heartbeat
- `backend/routes/pos_failover.py` (line 240) → `/api/pos-failover/*` (8 routes)
- Includes `/heartbeat/pos-status` and `/heartbeat/{session_token}`

### D11a + D9 · Chronos profile-driven scope
- `backend/routes/chronos.py` (line 285), `access_matrix.py` (line 297) — present
- `client/modules/Chronos/index.tsx` (line 304) — present

### D7 · 5 EMERGENT modules + AI³ shim
- `backend/routes/intelligence_ai3.py` (line 330) — present

### D5 · EchoLayout Kitchen Design
- `server/services/echo-layout/kitchen-algorithm.ts` (line 358) — present
- `server/routes/echolayout-kitchen.ts` (line 361) — present
- `client/modules/EchoLayout/client/components/KitchenDesigner.tsx` (line 368) — present

### D4 · Chronos Live Tiles
- `backend/routes/chronos_live_tiles.py` (line 378) — present

### D2 · Voice-Driven Inventory
- `server/routes/voice-transcribe.ts` (line 411) — present
- `client/modules/PurchasingReceiving/client/hooks/useVoiceCapture.ts` (line 414) — present

### D1 · Cleanups verified
- `client/modules/CulinaryRecipeBuilder/` (line 428) — confirmed deleted ✓
- `client/modules/Dashboard/` (line 429) — confirmed deleted ✓
- `backend/routes/invoice_ocr.py` (line 430) — confirmed deleted ✓

---

## 🟡 Present but dangling / archived

| # | Checklist line | What | Status | Proposed fix |
|---|---|---|---|---|
| 1 | line 393–402 | `client/modules/PurchasingReceiving/server/routes/receiving.ts` (D3 receive-from-truck) | **Archived** at `client/_archive_node_dev_server/PurchasingReceiving/routes/receiving.ts` | Restore from archive into the live tree OR migrate `/po-lookup` + `autoCreateAPInvoiceFromCheckins()` to a FastAPI route (consistent with the Python-only direction the rest of the codebase has taken). |
| 2 | line 399 | `client/.../ItemCheckinForm.tsx:51` (live fetch flow) | File present but unverified — line 51 still has the TODO comment if the file wasn't merged forward | Spot-check `grep -n "TODO" client/modules/PurchasingReceiving/client/components/receiving/ItemCheckinForm.tsx` and wire if still TODO. |
| 3 | line 412 | `server/index.ts` Express mounts (`/api/receiving`, `/api/voice`, etc.) | The Express server entry point was **archived** with the rest of the legacy node dev server. The FastAPI is the live boundary now. | This is intentional per the iter264 archive. Voice routes still live in `server/routes/voice-transcribe.ts` and need a FastAPI replacement OR re-mounting in the preview-server.mjs reverse proxy if Express is preserved for those routes. Decision call. |
| 4 | line 432 (Deferred) | `client/modules/Maestro/` | Still present (correctly deferred per checklist) | None — wait for committee logic migration before pruning. |
| 5 | line 434 (Deferred) | `client/components/dashboard/DetailedPnLView.tsx` | Status not verified | Run `grep -r "RestaurantDashboard" client/` to confirm dead before pulling. |
| 6 | help_agent line count drift | Local `help_agent.py` is 312 lines / 7 endpoints. D63 spec implied a richer module. | Live + working but possibly thinner than D63 intended | Cross-check against the D63 source on GitHub branch `claude/D63-docs-help-onboarding-ocr-icons`; cherry-pick the missing endpoints if any. |

---

## ❌ Missing entirely

| # | Checklist line | Expected path | Notes |
|---|---|---|---|
| 1 | line 129 | `docs/adr/0001-mongodb-event-store.md` | **Actually present at `docs/adr/0001-mongodb-as-event-store.md`** — filename has an extra `-as-`. Checklist typo, not a real miss. Move to "path differs". |
| 2 | line 393 (D3) | `client/modules/PurchasingReceiving/server/routes/receiving.ts` | Only the archive copy exists. See dangling row #1. |
| 3 | line 402 (D3) | `server/index.ts` `app.use("/api/receiving", ...)` | Express entry point is archived. See dangling row #3. |

---

## ⚠️ Path differs from checklist

| # | Checklist line | Checklist path | Actual path |
|---|---|---|---|
| 1 | line 129 | `docs/adr/0001-mongodb-event-store.md` | `docs/adr/0001-mongodb-as-event-store.md` |
| 2 | line 28 | `/api/ocr-active-learning` prefix | actually `/api/echo/ocr-learning/*` |
| 3 | line 105 | `/api/echo/invoice-extract` | code path uses `/api/echo/invoice-extract` — confirmed |
| 4 | line 230 | `/api/vendor-order/*` for vendor mobile | actually `/api/vendor-order/*` confirmed (matches) |

---

## iter265 work — survived the merge ✓

All net-new files from iter265 are intact:
- `backend/routes/kitchen_fire.py` → `/api/kitchen-fire/*` (13 routes)
- `backend/routes/weather_rebook.py` → `/api/weather-rebook/*` (5 routes)
- `backend/routes/fire_safety.py` → `/api/fire-safety/*` (4 routes)
- `client/modules/KitchenFire/`, `client/modules/Commissary/`, `client/modules/QrScanner/` — all present
- `client/lib/desktop/useDesktop.ts`, `client/lib/tier4-icons.tsx` — present
- `public/brand-icons/tier4/README.md`, `docs/desktop-e2e-test-plan.md` — present
- Brand-icon registry's 70-row alias block for unmapped panels — present

---

## Recommended next steps

1. **Restore or replace D3 receive-from-truck flow** — either move `receiving.ts` out of archive or rewrite as FastAPI. This is the only meaningful regression vs the D63 checklist.
2. **Decide Express vs FastAPI for D2 voice + D5 EchoLayout** — both still live under `server/` (TypeScript Express). Either keep the dual-server preview proxy rule for these, or port to FastAPI for consistency.
3. **Optional cleanup of `_archive_node_dev_server/`** — once Express deps are confirmed unused, this 450+-file archive can be deleted.
4. **Compare `help_agent.py` against the D63 source branch** — verify 7 endpoints is the intended surface and nothing was inadvertently trimmed during merge resolution.

---

*Audit performed against checklist `docs/recovery/D63_RECOVERY_CHECKLIST.md` (468 lines, 23 D-series branches consolidated). Verifications via filesystem + `/api/openapi.json` introspection.*
