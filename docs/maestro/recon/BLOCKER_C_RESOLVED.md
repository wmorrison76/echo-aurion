# BLOCKER_C — RESOLVED for Echo Resonance

> Pass close-out, paired with the recon report at `BLOCKER_C_AUTH.md`.
> Decision logged 2026-05-05.

---

## Canonical pick

**`server/middleware/auth-jwt.ts` is canonical for Echo Resonance.**

Echo Resonance routes (Phase 1.4 — `server/routes/resonance.ts`, `server/routes/signals.ts` in TICKET_004) will use `jwtAuthMiddleware` exclusively, exactly as existing echo-ai3 routes do at `server/index.ts:548-551`:

```ts
app.post("/api/echo-ai3/chat", jwtAuthMiddleware, handleEchoAi3Chat);
app.use("/api/echo-ai3/forecast", jwtAuthMiddleware, createForecastRouter());
app.get("/api/echo-ai3/digest", jwtAuthMiddleware, generateDailyDigest);
```

## Reasoning logged

- **Wiring evidence in `server/index.ts`** shows `jwtAuthMiddleware` and `optionalJwtAuthMiddleware` as the live JWT exports the entry point binds.
- **33 routes already migrated** to it — that's the active Phase 1 pattern.
- **The 70 routes still on `auth.ts`** represent an in-progress Phase 0 → Phase 1 migration whose completion is a **separate ticket scope, not Echo Resonance's responsibility.**

## Off-limits for Echo Resonance work

| File | Importers | Status | Why off-limits |
|---|---|---|---|
| `server/middleware/auth.ts` | 70 | Active Phase 0 (mid-migration) | NOT dead. Migration of these 70 routes to JWT is a separate future ticket. Do not delete or modify in Echo Resonance work. |
| `server/lib/auth.ts` | 5 | Active library | Shared library both middlewares depend on (`JWTService`, `PasswordService`, `RateLimitService`). Do not modify in Echo Resonance work. |
| `server/routes/auth.ts` | 2 | Active route module | The auth API surface (signup, login, logout, me, OAuth, dev-login). Do not modify in Echo Resonance work. |

## Future ticket candidate (NOT a Blocker C precondition)

**Phase 0 → Phase 1 auth migration ticket** — eventually move the 70 routes using `basicAuthMiddleware` / `requireAuth` from `server/middleware/auth.ts` over to direct `jwtAuthMiddleware` use. Large surface; non-urgent; requires careful auth-compatibility testing because some routes use the `requireAuth` shim that accepts either model. Out of scope for TICKET_003 / TICKET_004.

## Status

**Blocker C is RESOLVED for Echo Resonance purposes.** TICKET_003 (Phase 1.3 Backend core) and TICKET_004 (Phase 1.4 routes) can fire forward using `jwtAuthMiddleware` without further auth-architecture work.

Remaining blockers carry-forward (separate from C):
- **Blocker A** — Test database not provisioned. Required before TICKET_003 integration tests can execute.
- **Blocker B** — Migration rollback strategy. Doctrinal call needed.
- **Blocker D2** — Line-comment-swallow data loss in minified files. Per-file rewrite shifts deferred.

---

## Saucier discipline lesson — locked into station habits

Tonight's recon caught two cases where a narrow grep pattern produced a wrong "0 importers" claim:

1. **AUDIT_001 / TICKET_002 work:** `Whiteboard/ExportManager.ts` was flagged Category A dead code via narrow grep. Broader grep showed 3 active importers.
2. **PM Plate 2 / Blocker C recon:** initial grep with the same narrow pattern showed 0 importers for all 4 auth files. Broader grep showed 70 / 33 / 5 / 2.

**The pattern that costs us:**
```
from.*['"][^'"]*${target_path}['"]
```
This requires the full path-from-root in the import literal. It misses **relative-path imports** (`from "../middleware/auth"`), **alias imports** (`from "@/lib/auth"`), and **basename-only imports**.

**The pattern that catches it:**
```
# Multiple variations, OR-combined:
from.*[\"']\.\.[^\"']*${basename}[\"']
from.*[\"']@/[^\"']*${basename}[\"']
import.*[\"'][^\"']*${basename}[\"']
# Plus a basename-symbol grep when the file exports named symbols:
${ExportedSymbol1}\|${ExportedSymbol2}
```

**Standing rule for all future reachability work:** treat any "0 importers" claim from a narrow grep as a candidate requiring re-verification with at least the basename-symbol form. Document both the narrow and broader pattern results when surfacing dead-code candidates.

---

> *"AUDIT_001 was a useful starting point ... The methodology is letting the team see it honestly."* — `docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md`

Yes Chef.
