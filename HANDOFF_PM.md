# HANDOFF_PM — AM shift to PM crew

> AM saucier, end of service. 2026-05-05.
> Active branch: `feature/audit-002-repair`
> PM target: brigade-merge-pr5 the audit-002 work to main, then pick a ticket.
> Read this cold. You should be working in 5 minutes.

---

## What landed during AM shift (with commit hashes)

**On `main` (already merged, no PM action needed for these):**

| Commit | What |
|---|---|
| `1cce89b97` (via merge `5fde0fa11`) | **TICKET_001 close-out** — `tests/echo_resonance/migrations/foundation-migrations.test.ts` (35 static tests passing in 9ms + 9 DB-integration `it.todo` gated on `DATABASE_URL_TEST`); `HANDOFF_OVERNIGHT.md` documenting Blockers A/B/C |
| `1021ae195` then `17725ad69` (via merge `9cc5f3867`) | **TICKET_002 merge to main** — 7 foundation type files aligned to SQL schema 008-012 (`shared/types/signals/*` + `shared/types/resonance/*`); ARCHITECTURE.md Type-system conventions section; `docs/maestro/tickets/TICKET_003_PREP.md` (handoff context for the 3 downstream consumers); `docs/maestro/tickets/TICKET_003.md` (Phase 1.3 Backend core ticket draft, READY TO FIRE) |

**On `feature/audit-001-type-errors` (pushed to origin, NEVER MERGED to main):**

| Commit | What |
|---|---|
| `060e76679` | **AUDIT_001 report** — `docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md` and `docs/audits/_data/tsc-errors.txt` (4122-line full tsc log). The audit content was later cherry-pulled onto `feature/audit-002-repair` and corrected during AM shift. **You can let `feature/audit-001-type-errors` die on the vine** — its content is superseded on `feature/audit-002-repair`. |

**On `feature/audit-002-repair` (pushed to origin, NOT MERGED — see next section):**

| Commit | What |
|---|---|
| `4a213344f` | **TASK A1 cluster 1** — Maestro/data UUID files: 6 `.md` docs archived to `docs/archive/maestro-banquets-integration/`, 11 UUID noise files deleted (3 `.tsx` + 5 orphan configs + 3 with-twin duplicates) |
| `078315290` | **TASK A1 cluster 2** — `client/modules/EchoEventStudio/client/pages/Index_backup.tsx` deleted (0 importers, twin `Index.tsx` exists) |
| `01eaf1a23` | **TASK A1 cluster 3** — `client/modules/Whiteboard/WhiteboardSession.broken.tsx` deleted (77 KB abandoned snapshot, 0 importers, twin `WhiteboardSession.tsx` is the live version) |
| `538944699` | **Audit report import + C1 reclassification** — brought audit content from audit-001 branch onto this branch + inserted "Post-AUDIT_002 corrections" section documenting line-comment-swallow data-loss discovery (Category C reclassified to D2) |
| `754b42aee` | **NAME-SWEEP** — `git mv client/modules/BanquetMenuBuilder/EMERGENT_INSTRUCTIONS.md → INSTALL_INSTRUCTIONS.md` (single rename; INSTALL/ files are gitignored). Audit report updated with NAME-SWEEP actual outcome + tool-author survey findings. |

**TASK A1 net error reduction:** 4122 → 3909 (delta: −213). TICKET_001 regression: 35/35 passing throughout.

**TASK C1 — HALTED.** Discovered that the audit's "cascade reformat" strategy is unworkable: the minified files contain **line-comment-swallow** data loss (declarations like `export async function` and `interface X` are syntactically inside `//` comments after a Cursor minification session ate the newlines). Prettier, TypeScript API, and SWC all fail at the same parse points. No formatter can recover code that was eaten by `//`. **The damaged files are reclassified as a new category D2 (rewrite-required) — XL effort per file, AI-assisted reconstruction, not a single sweep.** Full evidence in `docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md`.

---

## What's NOT YET MERGED (critical for PM crew)

**`feature/audit-002-repair` — 5 commits ahead of main, NOT MERGED.**

This is your **highest-priority handoff item.** The branch contains:
- TASK A1 dead-code sweep (3 commits)
- Audit report import + C1 reclassification with D2 discovery (1 commit)
- NAME-SWEEP outcome (1 commit)

**Recommended PM action:** generate a `brigade-merge-pr5.sh` from the `pr4` template (`scripts/brigade-merge-pr4.sh` is in working tree, untracked — use it as the model), adapted for `feature/audit-002-repair`. Run it. Land this work to main BEFORE starting any new shift work. Otherwise the next AUDIT_001 reader will get the original report without the C1 corrections, and the dead code sweeps won't propagate.

**Branch backup state:** pushed to `origin/feature/audit-002-repair`. PR-link: https://github.com/wmorrison76/Echo_Aurion-LUCCCA_Framework/pull/new/feature/audit-002-repair

---

## Active blockers (carry-forward)

These persist from prior shifts plus tonight's discovery. Each blocks a specific class of work.

### Blocker A — Test database not provisioned
**From TICKET_001 HANDOFF_OVERNIGHT.** No `.env.test`, no `DATABASE_URL_TEST` env var, no test-DB convention in the repo. The 9 `it.todo` cases in `foundation-migrations.test.ts` cannot execute. **Required before TICKET_003** (Phase 1.3 Backend core writes new integration tests against signal-recorder/query/decay).
**Unblock:** provision a Neon test database (or local Postgres) with `DATABASE_URL_TEST` in `.env` (gitignored).

### Blocker B — Migration rollback strategy
**From TICKET_001 HANDOFF_OVERNIGHT.** `server/database/migrate.ts` is forward-only. `server/services/migration-rollback-service.ts` is supabase-based + marked `TODO-023`. Migrations don't ship reverse SQL. *"Rolls back cleanly"* in TICKET_001/003 acceptance is structurally unverifiable.
**Unblock:** doctrinal call from pass — write reverse SQL alongside forward, programmatic test teardown, or relax the rollback criterion. Recommendation in TICKET_001 HANDOFF_OVERNIGHT was option 2 (programmatic teardown) for test-only purposes, with a separate ticket for production-grade rollback.

### Blocker C — Q3 auth multi-candidate
**From TICKET_001 HANDOFF_OVERNIGHT.** Four `auth*.ts` candidates (`server/middleware/auth.ts`, `auth-jwt.ts`, `server/lib/auth.ts`, `server/routes/auth.ts`) — pass needs to name the canonical one. **Required before route work** (Phase 1.4 — `server/routes/resonance.ts`, `server/routes/signals.ts`). Phase 1.3 services do not directly need auth, but `signal-decay` cron may need staff context for audit logs.
**Unblock:** pass inspects the 4 candidates and names canonical or dispatches consolidation.

### Blocker D2 — Line-comment-swallow data loss (NEW tonight)
**Discovered during AUDIT_002 TASK C1.** Files in PurchasingReceiving (1513 errors), Culinary (848), EchoEventStudio (738), Schedule (331), Whiteboard (211), and others contain `//` line comments that consumed real declarations during a Cursor minification session. Sample from `client/modules/PurchasingReceiving/shared/api/invoices.ts`:
```ts
// ============================================================================ export async function getInvoices( outletId: string, ...
```
The `export async function getInvoices(...)` is inside a `//` comment. **Prettier cannot fix this. Heuristic regex cannot safely fix this.** Only careful per-file rewrite can fix it.
**Unblock:** dispatch D2 rewrite tickets — separate shift per file (or per small cluster), AI-assisted where possible. Estimated 50-150 dispatches across the codebase to clear D2.

---

## Audit credibility caveat (NEW LEARNING for PM crew)

**AUDIT_001's narrow grep undercounted importers.** The original audit greped for `from ['"]\(.*\)/${base}\b` — a tight pattern that misses common import forms. As a result, the audit's "0 importers" claims were wrong in at least one verified case:

- `client/modules/Whiteboard/ExportManager.ts` — audit said 0 importers / Category A dead code. Broader grep (`import.*${base}\|from.*${base}`) shows 3 active importers: `WhiteboardSession.tsx`, `VideoExportManager.ts`, `gdpr-compliance.ts`. **Not dead** — it's a Category D2 minified file that's actively consumed.

**Generalization:** treat any AUDIT_001 "0 imports" claim as a **candidate requiring re-verification**, not as ground truth. Use the broader grep pattern when confirming reachability. The audit report's "Discovery 2" section in `docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md` documents this caveat.

---

## Recommended next ticket and why

`docs/maestro/tickets/TICKET_003.md` is drafted on main and ready to fire. **Phase 1.3 Backend core**, 7 services:

1. `server/services/signals/signal-recorder.ts` (single write path; **Tenet 2 + 7 enforcement point**)
2. `server/services/signals/signal-query.ts` (read path)
3. `server/services/signals/signal-decay.ts` (cron, **Tenet 7 enforcement point**)
4. `client/lib/resonance/score.ts` (pure score math)
5. `server/services/echo-ai3/resonance/resonance-engine.ts` (engine, **Tenet 2 enforcement**)
6. `server/services/echo-ai3/resonance/trajectory-engine.ts` (lift tracking; broken `PropertyId` import to fix)
7. `server/services/echo-ai3/resonance/intervention-library.ts` (templates + dispatch)

Plus mirror tests + the non-negotiable `tests/echo_resonance/privacy/tenet-3-tone-isolation.test.ts` (resonance-engine outputs cannot import from pricing/sales/marketing).

**Two reasonable PM service paths:**

1. **Provision Blocker A first → fire TICKET_003.** Real Echo Resonance forward motion. After test DB is wired, the integration tests in TICKET_003 can run against real schema (TICKET_001's migrations 008-012). This is the path of least friction toward the Phase 1 ship target.

2. **Fire D2 rewrite shifts on most-damaged modules first → cleaner substrate for TICKET_003.** PurchasingReceiving (1513 errors) and Culinary (848 errors) are the largest D2 clusters; clearing them gives TICKET_003 a less-noisy `tsc --noEmit` baseline. This delays Echo Resonance forward motion but reduces eventual cleanup debt.

**Pass call.** Path 1 is the more direct dinner service. Path 2 is more thorough mise en place. Either is defensible.

---

## Where the money is being made

**Phase 1 ship target per `IMPLEMENTATION_ORDER.md`:** *A GM at the pilot property uses the trajectory dashboard during a real shift. Staff capture observations via the whisper widget. The system suggests interventions when trajectories enter the red zone.*

That's the dinner service of this project. Everything between now and then is mise en place for that one moment. The plate the platform fires when it's ready.

Concrete path from current state to that ship target:
1. ✅ TICKET_001 (migrations 008-012) — landed
2. ✅ TICKET_002 (foundation types) — landed
3. ⏭ **TICKET_003** (Phase 1.3 services) — drafted, blocked on Blocker A
4. ⏭ Phase 1.4 routes — blocked on Blocker C (Q3 auth)
5. ⏭ Phase 1.5 frontend (whisper widget, sparkline tile, trajectory dashboard, intervention card)
6. ⏭ Phase 1.6 module integration into existing FOH dashboard
7. ⏭ Phase 1.7 seed + demo end-to-end

---

## Files updated tonight that PM crew should look at

- **`docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md`** — read this for Category C reclassification rationale (D2 discovery), the audit credibility caveat, and the NAME-SWEEP survey findings on Cursor / Builder.io / Emergent / ChatGPT.
- **`docs/maestro/tickets/TICKET_003.md`** — ready-to-fire Phase 1.3 ticket. Same structure as TICKET_001. Awaits Blocker A.
- **`docs/maestro/tickets/TICKET_003_PREP.md`** — handoff context for the 3 downstream consumer files (`resonance-engine.ts`, `trajectory-engine.ts`, `suggestion-ranker.ts`) affected by TICKET_002 type tightening. **Mandatory pre-flight reading for whoever fires TICKET_003.**
- **`HANDOFF_OVERNIGHT.md`** — last night's saucier handoff (still relevant for Blockers A/B/C context). Complementary to this PM handoff.
- **`docs/archive/maestro-banquets-integration/`** — 6 archived `.md` docs from the Maestro Banquets sub-project (BUILD_STATUS.md, COMMUNICATION_SYSTEM.md, ECHO_CRM_INTEGRATION.md, INTEGRATION_GUIDE.md, PRODUCTION_SETUP.md, SESSION_2_SUMMARY.md). Historical artifacts preserved during A1 cleanup.

---

## Smaller items worth knowing

- **`scripts/brigade-merge-pr3.sh` and `pr4.sh` are untracked** in working tree. They were used to merge TICKET_001 (`pr3`) and TICKET_002 (`pr4`). Leave them in working tree — they're useful templates for `pr5`. Pass call still open from prior shifts: track in git or `.gitignore` as developer-local.
- **`npm run typecheck` is broken** — references `tsconfig.smoke.json` which doesn't exist at repo root. Pre-existing package.json bug. Workaround: `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --skipLibCheck -p tsconfig.json`.
- **`client/imported/.../zelda-backup.js`** flagged from A1 as a backup file but tsconfig-excluded (in `client/imported/**`); not in error count. Editorial cleanup, low priority. Carry to a future shift.
- **AUDIT_001 branch (`feature/audit-001-type-errors`)** — pushed to origin, never merged. Its content is superseded on `feature/audit-002-repair`. Safe to let die or `git push origin --delete` as cleanup.

---

## Hat tip

Last night's saucier wrote `HANDOFF_OVERNIGHT.md` using this same pattern — read it cold and start working in 5 minutes. Match that quality. The chef who picks this up shouldn't have to spelunk for context.

The work is the work.

---

> *"The brigade depends on each other's success. The saucier cannot succeed if the prep failed. The pass cannot succeed if the line is in the weeds."* — `docs/maestro/THE_LINE.md`

> *"The only break you get is the day you got hired. After that, it's only work."* — Tom Hill, Sous Chef, Victoria & Albert's

Yes Chef.
