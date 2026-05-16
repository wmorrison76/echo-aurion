# BLOCKER C — Auth Reconnaissance

> Recon-only report. No code changes. AUDIT_002 PM shift, Plate 2.
> Branch: `feature/blocker-c-auth-recon`
> Generated 2026-05-05.

---

## Executive summary

**The "4 multi-candidate auth files" framing from TICKET_001 HANDOFF_OVERNIGHT was wrong.** The 4 files are not competing options — they're **architectural layers + a Phase 0→Phase 1 transition** living side-by-side. All 4 are actively consumed by live routes. There is no "dead candidate" to delete.

**Recommendation:**
- **Echo Resonance routes (Phase 1.4) should use `jwtAuthMiddleware` from `server/middleware/auth-jwt.ts`** — exactly the pattern existing echo-ai3 routes use in `server/index.ts:548-551`.
- **Supporting library:** `server/lib/auth.ts` (`JWTService` for token gen/verify, `PasswordService`, `RateLimitService`).
- **Auth routes module:** `server/routes/auth.ts` (`/api/auth/signup`, `/login`, `/me`, etc.) is already wired, no changes needed for Echo Resonance.
- **Phase 0 legacy (`server/middleware/auth.ts`)** stays in place — 70 active routes still use it. Migration to all-JWT is a separate ticket, not a Blocker C precondition.

---

## File-by-file analysis

### 1. `server/middleware/auth.ts` — Phase 0 header-based auth (legacy + transitional)

**Size:** 4.7 KB / 178 lines
**Last meaningful edit:** 2026-03-28 (commit `51a528010`)

**Exports:**
- `basicAuthMiddleware(req, res, next)` — requires `X-Org-ID` header; sets `req.user = { org_id, id: 'test-user', role: 'admin' }`
- `optionalAuthMiddleware(req, _res, next)` — same as basic but doesn't fail on missing header
- `requireAuth(req, res, next)` — **compatibility shim**: if JWT middleware already hydrated `req.user`, accepts; otherwise falls back to `basicAuthMiddleware`
- `requireRole(...allowedRoles)` — RBAC factory; checks `req.user.role`

**Dependencies:**
- `../lib/errorHandler` (AppError, UnauthorizedError)
- `../lib/logger`

**Header banner says it explicitly:** *"PHASE 0: ENTERPRISE FOUNDATION ... In Phase 1, this will use JWT tokens with organization context"* and *"In Phase 0, set up a minimal user context. In Phase 1, this will be decoded from JWT and include user_id, role, etc."*

**Importer count: 70 active routes** — sample:
```
server/routes/forecast-calendar.ts        requireAuth
server/routes/banquet-menus.ts            requireAuth
server/routes/phase-9-hr-payroll.ts       requireRole
server/routes/supply-chain.ts             basicAuthMiddleware
server/routes/echo-ai3-actions.ts         requireAuth
server/routes/security-audit.ts           requireAuth
server/routes/staff-optimization.ts       basicAuthMiddleware
server/routes/voice-commands.ts           basicAuthMiddleware
server/routes/labor-compliance.ts         basicAuthMiddleware
server/routes/phase-7-analytics.ts        requireRole
... (60+ more)
```

**Verdict:** **Active, transitional.** Not a deletion candidate. Most routes use `requireAuth` (the JWT-aware compatibility shim) or `basicAuthMiddleware` (header-only). Migration of all 70 routes to direct JWT use is its own multi-ticket initiative.

### 2. `server/middleware/auth-jwt.ts` — Phase 1 JWT middleware (canonical for Echo Resonance)

**Size:** 6.4 KB / 259 lines
**Last meaningful edit:** 2026-03-27 (commit `8925239d5`)

**Exports:**
- `jwtAuthMiddleware(req, res, next)` — extracts JWT from `Authorization: Bearer ...`, cookie `auth_token`, or `x-auth-token` header; verifies via `JWTService.verifyToken`; attaches `req.user = { id, org_id, email, role, exp }`; sets `req.headers["x-org-id"]`. Falls back to EchoAurum session lookup in dev (non-production).
- `optionalJwtAuthMiddleware(req, res, next)` — same but doesn't fail on missing/invalid token
- `requireRole(allowedRoles[])` — RBAC factory checking `req.user.role`
- `validateOrgAccess(req, res, next)` — tenant validation; rejects if requested org_id ≠ user's org_id

**Dependencies:**
- `../lib/auth` (`JWTService`)
- `../lib/logger`
- `../../client/modules/EchoAurum/server/middleware/session` (dev fallback)
- `../../client/modules/EchoAurum/server/services/session` (dev fallback)

**Importer count: 33 routes** — sample:
```
server/index.ts                           jwtAuthMiddleware, optionalJwtAuthMiddleware
server/routes/menu-scanner.ts             jwtAuthMiddleware
server/routes/trace-proof.ts              jwtAuthMiddleware, requireRole
server/routes/dashboard-financial.ts      jwtAuthMiddleware, validateOrgAccess
server/routes/agent-supervisor.ts         jwtAuthMiddleware, requireRole
server/routes/echo-financial.ts           jwtAuthMiddleware
server/routes/aurumIntegrations.ts        jwtAuthMiddleware
... (25+ more)
```

**Wired in `server/index.ts`:**
```ts
// line 34
import { jwtAuthMiddleware, optionalJwtAuthMiddleware } from "./middleware/auth-jwt";
// line 545
app.use(optionalJwtAuthMiddleware);
// lines 548-551 (echo-ai3 routes — the pattern Echo Resonance should match)
app.post("/api/echo-ai3/chat", jwtAuthMiddleware, handleEchoAi3Chat);
app.use("/api/echo-ai3/forecast", jwtAuthMiddleware, createForecastRouter());
app.get("/api/echo-ai3/digest", jwtAuthMiddleware, generateDailyDigest);
```

**Verdict:** **THE canonical Phase 1 auth middleware for protected routes.** Echo Resonance routes should use this exactly as echo-ai3 does.

### 3. `server/lib/auth.ts` — Auth library (JWT primitives + password + rate-limit)

**Size:** 9.1 KB / 357 lines
**Last meaningful edit:** 2026-03-27 (commit `8925239d5`)

**Exports:**
- `PasswordService` — bcryptjs-based password hashing (`hashPassword`, `verifyPassword`, `validatePasswordComplexity`)
- `JWTService` — JWT generation (`generateToken(userId, orgId, email, expiresInDays?, role?)`), verification (`verifyToken`), expiration helpers. Uses HMAC-SHA256, base64url encoding. Reads `JWT_SECRET` env var (dev fallback if missing).
- `JWTPayload` interface (`sub`, `org_id`, `email`, `role?`, `iat`, `exp`, `aud`, `iss`)
- `TokenStorageService` — `hashToken` / `getTokenHash` for DB lookup
- `RateLimitService` — in-memory rate limiter with auto-cleanup interval (1 hour)

**Dependencies:**
- node `crypto` (createHash, createHmac, timingSafeEqual)
- `./logger`
- Optional: `bcryptjs` (dynamically required; throws clear error if missing)

**Importer count: 5** (server-side):
```
server/middleware/auth-jwt.ts             JWTService
server/routes/auth.ts                     PasswordService, JWTService, RateLimitService
... + 2 client-side files importing the unrelated client/lib/auth (different file)
```

**Verdict:** **Foundation library.** Don't touch unless extending the auth model (e.g., refresh tokens). Echo Resonance should not need to touch this — it'll receive `req.user` populated by `jwtAuthMiddleware` and just use the values.

### 4. `server/routes/auth.ts` — Auth route module (signup/login/OAuth/me)

**Size:** 15.7 KB / 619 lines
**Last meaningful edit:** 2025-12-24 (commit `5b591847e`) — oldest of the 4

**Exports:** default router (Express) with these routes:
```
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/authorize/azure       (Azure AD OAuth init)
GET  /api/auth/callback/azure        (Azure AD OAuth callback — TODO stubs in body)
POST /api/auth/logout
GET  /api/auth/me                    (requires auth)
POST /api/auth/dev/login             (dev-only mock JWT generator)
```

**Dependencies:**
- `../lib/auth` (PasswordService, JWTService, RateLimitService)
- `../integrations/azure-auth` (azureAuthClient)
- `../lib/logger`
- `../lib/supabase` (DB client for users + organizations + auth_audit_log tables)

**Importer count: 2:**
```
server/index.ts:30                            (canonical mount: app.use("/api", authRouter))
client/modules/EchoAurum/server/index.ts:78   (separate EchoAurum sub-server import)
```

**Notes:**
- Auth model is **email/password + JWT** (no refresh tokens visible). 30-day token expiration.
- Auto-creates an organization on signup (orgSlug = email-prefix + random hex).
- Azure AD OAuth scaffolded but not finished (TODOs in callback handler at lines 395-398).
- Has a dev-mode `/api/auth/dev/login` that generates JWTs for `admin-user` / `manager-user` / `staff-user` test accounts. **This is useful for TICKET_003 testing** — staff JWTs can be obtained via this endpoint in dev mode.

**Verdict:** **Active, mounted at `/api`, complete enough for Echo Resonance.** No changes needed for Echo Resonance to work. The dev-mode endpoint is a useful tool for TICKET_003 integration tests once Blocker A (test DB) is resolved.

---

## How these 4 files relate to each other

```
                    server/index.ts
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
   middleware/      routes/auth.ts   middleware/
   auth-jwt.ts     (mounted at /api)  auth.ts
   (JWT validate)   - signup/login    (Phase 0)
       │            - me/logout         │
       │            - OAuth             │
       └──────────► lib/auth.ts ◄───────┘
                   (JWTService,
                    PasswordService,
                    RateLimitService)
```

- `lib/auth.ts` is the foundation. Both middleware files and the routes file consume its primitives.
- `routes/auth.ts` issues JWTs (via `JWTService.generateToken`) on signup/login.
- `middleware/auth-jwt.ts` validates JWTs on every protected request.
- `middleware/auth.ts` is the older Phase 0 header-based path; its `requireAuth` shim works alongside JWT middleware as a compatibility layer.

---

## Does the existing LUCCCA auth pattern match what Echo Resonance needs (Phase 1)?

**TICKET_003's mise en place** specifies Phase 1 services use staff JWTs for protected operations (e.g., creating signals, viewing trajectory floor view, recording intervention proposals). The existing pattern delivers exactly this:

- ✅ JWT-validated staff identity (`req.user.id`, `req.user.org_id`, `req.user.role`)
- ✅ RBAC (`requireRole(['admin', 'manager', 'staff'])`)
- ✅ Org-tenant validation (`validateOrgAccess` rejects cross-org access)
- ✅ Dev-mode JWT generator (`POST /api/auth/dev/login`) for integration tests
- ✅ Server-entry wiring already in place — `optionalJwtAuthMiddleware` runs globally, individual protected routes add `jwtAuthMiddleware` decorator

**What's NOT in the existing pattern** (potential gaps for Phase 1+):

- ⚠️ **Guest JWTs** — TICKET_003 doesn't yet require guest tokens, but Phase 1.5 frontend (whisper widget) and Phase 3 (Aurion voice) will eventually need a guest auth flow. The current model is staff-only via the `users` table. **Out of TICKET_003 scope.** Future ticket needed when guest auth surfaces.
- ⚠️ **Refresh tokens** — 30-day JWT with no refresh path. If Echo Resonance sessions are long-lived (a multi-day visit), tokens may expire mid-flow. **Out of TICKET_003 scope.** Future ticket if needed.
- ⚠️ **Azure AD OAuth callback is a TODO stub** — if any Echo Resonance flow needs Azure SSO, this must be finished. TICKET_003 doesn't appear to need it.

---

## Recommendation to the pass

**Pick `server/middleware/auth-jwt.ts` as canonical** for Echo Resonance routes (Phase 1.4 — `server/routes/resonance.ts`, `server/routes/signals.ts`). Use the exact pattern from `server/index.ts:548`:

```ts
app.post("/api/echo-resonance/readings", jwtAuthMiddleware, handleCreateReading);
app.use("/api/echo-resonance/floor", jwtAuthMiddleware, floorViewRouter);
```

**No deletions in this ticket.** All 4 files are active. The "multi-candidate" framing from prior shifts overstated the situation — these aren't competing implementations, they're a layered architecture.

**Future-ticket flags (NOT blocking TICKET_003):**

1. **Phase 0 → Phase 1 migration ticket** — eventually move the 70 routes using `basicAuthMiddleware` / `requireAuth` over to `jwtAuthMiddleware`. Large surface; not urgent; requires careful auth-compatibility testing.
2. **Guest auth ticket** — when Phase 1.5 frontend or Phase 3 Aurion need guest tokens, design a guest-JWT flow.
3. **Azure AD OAuth completion** — if/when Azure SSO is needed.
4. **Refresh tokens** — if 30-day JWT expiration causes UX issues.

---

## Blocker C status: RESOLVED for TICKET_003 purposes

The auth situation isn't a blocker — it's a non-issue once you stop treating the 4 files as competing candidates. Echo Resonance can fire forward using the existing `jwtAuthMiddleware` pattern. **TICKET_003 unblocked from auth perspective.** Remaining blockers (A: test DB, B: rollback strategy, D2: rewrite-required files) are separate.

---

> *"Sauce is foundation. Get the foundation wrong and there is no recovery."* — `docs/maestro/STATIONS/SAUCIER.md`

Yes Chef.
