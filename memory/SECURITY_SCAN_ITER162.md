# Security Scan Report — Iter162 (Feb 2026)

## ✅ Tools Run
| Tool | Scope | Result |
|------|-------|--------|
| **Bandit** (Python SAST) | Full `/app/backend` production code | 0 Medium/High in NEW code · 1 High (MD5 in echo_stratus.py) **FIXED** with `usedforsecurity=False` |
| **Semgrep** `p/security-audit` + `p/owasp-top-ten` | New routes + standalone modules + admin-auth helper | 0 findings |
| **pip-audit** (Python CVE) | `requirements.txt` | Started at 8 CVEs in 5 packages · **reduced to 3** (litellm issues don't affect us — see below) |
| **yarn audit** (frontend CVE) | Full `package.json` | 31 advisories · critical jspdf bumped (attempted; pinned by Node 20 engine restriction) |
| **Manual secrets scan** | All new files | Clean — no hardcoded API keys, tokens, passwords |

## 🔴 Production Blocker — FIXED
**Unauthenticated admin dashboards** exposed customer PII + revenue + control actions.

Before: `GET /api/pastry/admin/subscribers` would return every bakery's email, MRR, and lifetime paid to anyone.

After:
- New `backend/auth_admin.py` enforces `X-Admin-Token` header via `hmac.compare_digest`
- Fails CLOSED with 503 if `ADMIN_API_TOKEN` not configured
- Applied to every admin + billing + escalation-trigger endpoint
- Frontend `client/lib/admin-auth.ts` persists token in localStorage, adds header automatically
- Admin dashboards now prompt for token on first load and clear on 401

## 🔒 Gated Endpoints (401 without valid X-Admin-Token)
- `GET  /api/pastry/admin/subscribers`
- `POST /api/pastry/billing/run-monthly`
- `GET  /api/pastry/billing/runs`
- `GET  /api/pastry/approvals`
- `GET  /api/beo-standalone/admin/subscribers`
- `GET  /api/eng-ops/dismissal-audit`
- `POST /api/eng-ops/stratus/plans/run-escalation`

## 🌐 Still Public (intentional)
- Marketing landing pages: `/api/pastry/packages`, `/api/beo-standalone/packages`
- Stripe checkout creation (self-service): `/api/pastry/checkout/session`, `/api/beo-standalone/checkout/session`
- Public gallery browse: `/api/pastry/gallery`
- Client share views: `/api/pastry/look/{share_token}`
- Referral tracking: `/api/pastry/referrals/*`
- Client approval submission: `/api/pastry/look/approve`
- Stripe webhook: `/api/webhook/stripe` (signature-verified by Stripe SDK)

## 📦 Dependency Upgrades Applied
| Package | Old | New | CVE Fixed |
|---------|-----|-----|-----------|
| starlette | 0.46.2 | 0.47.2+ | CVE-2025-54121 (upload DoS) |
| fastapi | 0.115.12 | 0.117+ | compat bump for starlette |
| cryptography | 46.0.6 | 46.0.7+ | CVE-2026-39892 (buffer overflow) |
| python-multipart | 0.0.24 | 0.0.26+ | CVE-2026-40347 (multipart DoS) |
| aiohttp | 3.13.3 | 3.13.4+ | 6 CVEs (34518/19/20/25, 22815, 34514) |
| pytest | 9.0.2 | 9.0.3+ | CVE-2025-71176 (tmpdir privilege) |

## 🟡 Accepted Risk (documented, not exploited)
**litellm 1.80.0** — 3 CVEs (CVE-2026-35029, 35030, GHSA-69x8). We can't upgrade to 1.83 because `emergentintegrations` pins `openai==1.99.9` but litellm 1.83 requires `openai==2.24`. **Not exploitable in our app** because:
- CVE-2026-35029: `/config/update` endpoint — we don't expose litellm's HTTP proxy
- CVE-2026-35030: OIDC JWT auth cache — we have `enable_jwt_auth: false`
- GHSA-69x8: SHA-256 password hashing — we don't use litellm's user auth

**Mitigation:** monitor for `emergentintegrations` openai 2.x release to unblock the upgrade. Add to backlog.

## 🟡 Frontend Deferred
**jspdf critical (LFI + HTML injection)** — latest version requires Node ≥22, current env is Node 20. Mitigated by the fact that we don't generate PDFs from untrusted user input. Add to backlog: upgrade Node 22 then bump jspdf.

## 📝 Recommended Next Steps
1. **Sentry / error monitoring** — not yet wired. When you're ready, we can:
   - Backend: `sentry-sdk[fastapi]` with the Emergent DSN
   - Frontend: `@sentry/react` with sourcemap upload
2. **Rate limiting** — currently none. Add `slowapi` for login attempts, checkout session creation, and AI render endpoints (fal.ai costs).
3. **CORS audit** — review allowed origins in `server.py` (currently may be `*` for dev).
4. **Stripe webhook signature verification** — already performed by `emergentintegrations.payments.stripe.checkout.handle_webhook` ✓
5. **Secrets rotation** — `ADMIN_API_TOKEN` is in `/app/backend/.env`. For production, move to a secret manager (AWS Secrets Manager / GCP Secret Manager) and rotate monthly.
6. **Dependabot / Renovate** on the git repo to auto-PR security patches.

## 🔑 Rotate-Me-Before-Production Secrets
- `ADMIN_API_TOKEN` (currently `kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc` — dev seed; MUST rotate)
- `FAL_KEY` (user-provided, rotate if leaked)
- `STRIPE_API_KEY` (currently `sk_test_emergent` — switch to live key before launch)

## 🧪 Verification Run (Iter162)
All endpoints re-tested after fix:
- ✅ Admin endpoints return 401 without token, 200 with token
- ✅ Public endpoints unchanged (200)
- ✅ Scheduler job (APScheduler) calls `run_monthly_billing` as Python function — bypasses HTTP Depends correctly
- ✅ 0 regressions on existing routes
