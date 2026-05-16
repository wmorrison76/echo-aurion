# LUCCCA Production-Readiness Snapshot · iter174

Generated after Phases 1-4 shipment + naming audit rollout + Semgrep hygiene.

## Static analysis

### Semgrep (`--config auto`) · full backend
- **Total findings**: 3 ERROR → **0 open** after iter174
- Fixed/acknowledged:
  1. `routes/recipe_import.py:32` — SSRF → added `_ssrf_guard()` rejecting private/loopback/link-local/metadata URLs
  2. `routes/recipe_import.py:167` — same SSRF site, same guard
  3. `server.py:417` — WebSocket URL in status-endpoint string → marked `nosemgrep` (doc-only; actual WS behind TLS ingress)
  4. `dashboard_widgets.py:200` — Mock JWT in dev-only auth endpoint → `nosemgrep` with rationale

### SSRF guard coverage
`_ssrf_guard()` in `recipe_import.py`:
- Rejects schemes other than http/https
- Rejects `localhost`, `metadata.google.internal`, `169.254.169.254`
- DNS-resolves hostname and blocks **private, loopback, link-local, multicast, reserved** IP ranges
- Applied to every outbound `requests.get` in that module

## Observability

### Sentry
- ✅ SDK installed (`sentry-sdk[fastapi]>=2.0`)
- ✅ `observability/sentry_init.py` wired **before app creation** so startup errors captured
- ✅ PII scrubber removes request bodies + `Authorization`/`Cookie`/`X-Admin-Token` headers
- ✅ No-op when `SENTRY_DSN` unset — fails open, doesn't block local dev
- **Action**: set `SENTRY_DSN` in `backend/.env` when ready to enable

### Admin token gate
- `ADMIN_API_TOKEN` in `backend/.env` (currently the dev seed — **ROTATE BEFORE PROD**)
- All write endpoints in `people` / `hours_of_operation` / `leadership_coverage` / `lifestyle_dashboard` / `pastry/admin` / `beo-standalone/admin` / `eng-ops/dismissal-audit` gate with `X-Admin-Token` header

### Privacy / PII
- Employee `display_name` = first name + last initial (never exposes full last name)
- `celebrations_today` uses `display_name` only — no DOB year, no email, no phone

## Module health

### New endpoints (iter173-174) · all 200 OK
- `/api/people/*` (list · upsert · celebrations · promotion · deactivate)
- `/api/hours/*` (list · upsert · today · deactivate)
- `/api/leadership/*` (upsert · by-date · range · delete)
- `/api/lifestyle/*` (calendar · revenue-engagement · attendance-forecast · weather-alerts · cross-dept-plan · activations/upsert · today · delete)
- `/api/relay/*` (ticket/create · ticket/{id} PATCH · tickets · dashboard) [renamed from alice]
- `/api/showrooms/*` (designate · request-approval · approve · reject · release · list · today-for-standup)

### Frontend panel registry
- **94 panels registered** (removed 1 duplicate `echo-concierge`)
- All new panels render non-empty: `people-admin`, `lifestyle-dashboard`, `relay`
- All renamed labels propagate through: sidebar, command palette, panel header

### Standup autofill sources
- 7 live sources feed the Sailing Yacht: VIPs · Hours · Activities (+Lifestyle) · Glitches · People Services (birthdays + anniversaries + promotions) · Leadership Coverage · Showrooms
- 1 bridge source: Claude PDF ingest → propose → accept loop

## Test coverage

### Automated tests in this session
- `/app/test_reports/iteration_171.json` (standup phase 1)
- `/app/test_reports/iteration_172.json` (PDF merge, 21/21 + 100% FE)
- `/app/test_reports/iteration_173.json` (phases 1-4, 41/42 + 100% FE — 1 skipped harness test, not a real failure)
- `/app/test_reports/iteration_174.json` (rename + promotion + SSRF + panel render, 26/26 + 100% FE)

### Pytest regression files (live in `/app/backend/tests/`)
- `test_iter172_standup_pdf_merge.py`
- `test_iter173_people_lifestyle_alice.py` (note: file name references old 'alice' — content still runs against /api/relay)

## Known work to harden before prod launch

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Rotate `ADMIN_API_TOKEN` and set `SENTRY_DSN` | 5 min |
| P0 | Change `DEBUG`/CORS `allow_origins=['*']` to explicit allowlist | 15 min |
| P1 | Add rate limiting on public write endpoints (Relay ticket create, Concierge requests) | ~1 hr |
| P1 | Snapshot-test the branded Sailing Yacht email (golden HTML diff) | ~1 hr |
| P1 | CI pipeline — run Semgrep + pytest + mypy on PR | ~2 hr |
| P2 | Emergent Google OAuth for staff login (Phase 6) | ~4 hr |
| P2 | Magic-link department delegation for Standup | ~3 hr |

---

**Bottom line**: core surfaces are production-shape after iter174. The prod-launch punch list above is all operational/hardening — no feature work blocks it.
