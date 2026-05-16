# Pre-Echo-Resonance type-error triage

> Audit report — AUDIT_001
> Saucier station, audit role
> Generated 2026-05-05 against `main` (commit ahead of TICKET_001 merge, prior to TICKET_002 merge)
> Scope: forensic categorization only — **no fixes applied**

---

## Executive summary

The 4122 pre-existing tsc errors surfaced during TICKET_002 are **overwhelmingly parser-cascade errors from minified TypeScript source files, not semantic type errors**. 4061 of 4122 (98.5%) are TS1xxx codes (TS1005, TS1434, TS1128, etc.) — all syntax-level. TS2305 (missing exports, the broken-imports pattern that prompted this audit) reports as **0** in the full-repo log, despite being demonstrably present in `shared/types/voyage/*` — flagged as Category E unknown.

**Top 6 modules account for 93% of the count.** A targeted intervention — dead-code sweep + per-module prettier reformat — could plausibly clear 70-90% of the 4122 errors **without touching any business logic**, leaving only a long tail of real bugs (~600-800 errors) for case-by-case repair.

---

## Methodology

- Cache-cleared full-repo `tsc --noEmit` on `feature/audit-001-type-errors` (branched from `main`)
- 8GB heap (matches the broken `npm run typecheck` script's intent)
- tsconfig.json (canonical config; `tsconfig.smoke.json` referenced by package.json doesn't exist — pre-existing repo bug, separately noted)
- Full log captured at `docs/audits/_data/tsc-errors.txt` (committed for reproducibility; `.txt` extension to avoid root `*.log` gitignore)
- Reachability sampling: per-file `grep` for `import.*<basename>"` across `client/`, `server/`, `shared/` — sampled top 10 errored files; **not exhaustive** for the long tail
- Per-module aggregation via `sed`-extracting the module slug from each error path

### Reproducibility

```bash
git checkout feature/audit-001-type-errors
rm -f .tsbuildinfo
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --skipLibCheck -p tsconfig.json > docs/audits/_data/tsc-errors.txt 2>&1
```

---

## Headline findings

1. **Errors are overwhelmingly parser-failure (TS1xxx), not type-failure (TS2xxx).**
   ```
   2407  TS1005  ', or ; expected'
    483  TS1434  'Unexpected keyword or identifier'
    377  TS1128  'Declaration or statement expected'
    315  TS1472  ''catch' or 'finally' expected'
    107  TS1003  'Identifier expected'
     85  TS1109  'Expression expected'
     65  TS1382  'Unexpected token. Did you mean {">"} or &gt;?'
     61  TS1068  'Unexpected token. A constructor, method, accessor, or property was expected'
     47  TS1011  'An element access expression should take an argument'
     43  TS1381  'Unexpected token. Did you mean {"}"} or &rbrace;?'
     19  TS1127  'Invalid character'
     18  TS1002  'Unterminated string literal'
     15  TS1435  'Unknown keyword or identifier'
     13  TS17008 'JSX element X has no corresponding closing tag'
     12  TS1160  'Unterminated template literal'
   ```
   **TS2305 (`Module has no exported member`) count = 0.**

2. **Dominant root cause: minified source code in `.ts` / `.tsx` files.** Sample of `client/modules/EchoEventStudio/client/types/database.ts` (306 errors): the entire file is on **one line** (errors at line 1, columns 102, 177, 232, 256, 284…). Sample of `client/modules/Culinary/server/lib/ai-llm-service.ts`: `from"react"` (no space), interface bodies and comments collapsed onto single lines. tsc fails token-by-token, cascading hundreds of errors per file.

3. **Top 6 modules account for 3853 of 4122 errors (93%):**
   ```
   1513  PurchasingReceiving       (37%)
    848  Culinary                  (21%)
    738  EchoEventStudio           (18%)
    331  Schedule                  (8%)
    212  Maestro                   (5%)
    211  Whiteboard                (5%)
   ```

4. **Maestro/data is a probable dropped-in foreign project.** The directory contains UUID-suffixed duplicates of standard project files: `package-UUID.json` alongside `package.json`, `vite.config-UUID.ts` alongside `vite.config.ts`, `tailwind.config-UUID.ts`, `pnpm-lock-UUID.yaml`, `netlify-UUID.toml`, plus `nova-lab-{App,chart,sidebar}-UUID.tsx` files. Pattern is consistent with a Builder.io export or similar tool dump pasted into the repo. **Strong dead-code signal**, pending pass approval to delete.

5. **File error-count distribution:**
   ```
    46 files with 10+ errors    (cascade candidates — Category C)
   253 files with 2-9 errors    (mid-tail mix — Categories C/D)
   184 files with 1 error       (long tail — likely Category D)
   ----
   483 unique errored files / 4122 total errors
   ```

---

## ⚠️ Post-AUDIT_002 corrections (added 2026-05-05)

**This section supersedes earlier categorization where it conflicts. Read it first.** Two empirical findings during the AUDIT_002 repair shift falsified key assumptions in the original report.

### Discovery 1 — Category C is data loss, not cascade reformat

The audit's claim that Category C errors could be cleared by `prettier --write` was tested in AUDIT_002 TASK C1 and **fails**. The minified files contain a pattern the audit did not detect: **line-comment-swallow**.

**Sample evidence** from `client/modules/PurchasingReceiving/shared/api/invoices.ts`:

```ts
// ============================================================================ export async function getInvoices( outletId: string, ...
```

The `//` line comment swallowed the `export async function getInvoices(...)` declaration. Same pattern in `client/modules/Culinary/server/lib/ai-llm-service.ts`:

```ts
// NOTE: Anthropic SDK temporarily disabled - install with: pnpm add @anthropic-ai/sdk interface ExperimentDesignRequest { ...
```

The `interface ExperimentDesignRequest` is consumed by the line comment.

**Parser verification:** TypeScript API (117 parseDiagnostics on `invoices.ts`) and SWC (`Expression expected at line 5 col 1`) both fail at the same locations. Prettier's parser fails the same way. **No formatter can recover code that was eaten by `//`.** The function/interface declarations are syntactically inside a comment; the data is gone.

**Implication:** the C1 strategy (`prettier --write per module`) is unworkable. The 158 prettier-failed files in PurchasingReceiving alone (≈1500 errors) are not reformat-fixable. They require per-file rewrite — AI-assisted reconstruction from damaged source + intent, manual rewrite from documented behavior, or delete-and-rebuild for non-essential files.

### Discovery 2 — Category A had grep-undercount errors

The original report's 0-import claim for `client/modules/Whiteboard/ExportManager.ts` was wrong. A broader grep pattern surfaces real importers: `WhiteboardSession.tsx`, `VideoExportManager.ts`, `gdpr-compliance.ts`. **ExportManager.ts is NOT dead** — it's a minified file (now Category D2) that's actively consumed.

**Generalization:** treat AUDIT_001's "0 importers" claims as candidates that need re-verification with a broader grep pattern, not as ground truth. The original audit grepped for `from ['"]\(.*\)/${base}\b` which only catches a narrow form of import paths. A more permissive `import.*${base}\|from.*${base}` catches the rest.

### New: Category D2 — REWRITE-REQUIRED (data loss from comment-swallow)

Files where automated reformat is structurally impossible because line comments have consumed real code. **Subset of what was originally Category C**, escalated to its own category for clarity.

**Identification:** files that cause `prettier --check` to emit `SyntaxError`. In PurchasingReceiving alone, **158 of 542 .ts/.tsx files** match this pattern.

**Effort:** **L→XL per file**, not M per module. Strategies:
1. AI-assisted reconstruction (feed damaged source + file purpose to Claude, regenerate)
2. Manual rewrite from documented behavior or runtime spec
3. Delete-and-rebuild for non-essential files

Each strategy requires per-file verification against consumers. **A single sweep cannot deliver this.** Each affected file is essentially its own ticket worth of work.

### Revised category structure

| Category | Original definition | Revised definition |
|---|---|---|
| A — Dead code | Files with 0 importers, safe to delete | Same. AUDIT_002 A1 swept ~213 errors. |
| B — Stub code | `throw new Error` scaffolds | Same. ~0 errors. |
| ~~C — Cascade~~ | ~~prettier clears~~ | **HALTED.** Empirically infeasible. Files reclassified to **D2**. |
| D — Real bugs | Long-tail syntax/type bugs | Same. ~440 files, ~600-800 errors. |
| **D2 — Rewrite-required** | (new) | Comment-swallow data loss. ~158+ files in PR alone. Per-file XL effort. |
| E — Unknown | TS2305 invisibility, excluded sub-modules | Same. |

### Revised effort estimates

| Category | Files | Errors | Effort | Tools |
|---|---|---|---|---|
| A — Dead code | ~10-30 | ~500-900 | **S** | `git rm` |
| B — Stub code | ~0 | ~0 | N/A | — |
| ~~C — Cascade~~ | (halted) | (escalated to D2) | (n/a) | — |
| D — Real bugs | ~440 | ~600-800 | **L** | case-by-case |
| **D2 — Rewrite-required** | **~158+** in PR alone | **~3000-3500** | **XL** per-file | AI-assisted rewrite, manual reconstruction, or delete-and-rebuild |
| E — Unknown / re-audit | — | — | **M** | re-run audit semantically |

### Revised recommendation order

1. **First — Category A dead-code sweep.** ✅ Done in AUDIT_002 TASK A1.
2. **Second — Tool-author NAME-SWEEP** (AUDIT_002 TASK NAME-SWEEP). Lower-risk content cleanup. **Constraint added 2026-05-05:** do NOT modify comments inside D2 (comment-swallow) files — those comments may contain code awaiting rewrite. Only sweep names from cleanly-formatted files.
3. **Third — Category D2 per-file rewrites.** Separate dispatches per file or per small cluster. AI-assisted where possible, manual where not. Each affected file is its own ticket. Estimated 50-150 dispatches needed across the codebase to clear D2.
4. **Fourth — Category D real-bug triage** by module. Genuine syntax/type bugs in cleanly-formatted files; smaller surface than D2.
5. **Fifth — Re-audit on clean baseline.** Likely surfaces additional TS2305 / TS2322 errors that parser cascades were masking.

### Post-A1 actual results (AUDIT_002 shift)

| Step | Action | Errors freed |
|---|---|---|
| A1 commit 1 (`4a213344f`) | Maestro/data UUID files: 6 archived to `docs/archive/maestro-banquets-integration/`, 11 deleted | −212 |
| A1 commit 2 (`078315290`) | EchoEventStudio `Index_backup.tsx` deleted | 0 (file had no errors) |
| A1 commit 3 (`01eaf1a23`) | Whiteboard `WhiteboardSession.broken.tsx` deleted | −1 |
| C1 attempted | `prettier --write` on PurchasingReceiving | 0 (158 files unparseable) → **C1 HALTED** |
| **Net error count** | **4122 → 3909** (delta: −213) | |

TICKET_001 regression checked after each step: **35/35 passing throughout.**

### Post-NAME-SWEEP actual results (AUDIT_002 shift)

The original NAME-SWEEP plan called for 5 renames + 2 deletes + 3 surgical edits across 7 `EMERGENT_INSTRUCTIONS*.md` files. **Actual scope reduced to 1 rename** after a discovery during execution.

**Discovery:** `INSTALL/` is gitignored (line 118 of `.gitignore`). The 6 EMERGENT_INSTRUCTIONS files in `INSTALL/` subdirectories are intentionally untracked, developer-local archives. git can't `mv`/`rm`/edit untracked files for inclusion in a commit; doing so would only affect the developer's working copy with no shared-codebase impact.

| Step | Action | Result |
|---|---|---|
| File #1: `client/modules/BanquetMenuBuilder/EMERGENT_INSTRUCTIONS.md` | git mv → `INSTALL_INSTRUCTIONS.md` | ✅ Committed (active module, tracked) |
| Files #2-#6: `INSTALL/Pkg{1-5}/EMERGENT_INSTRUCTIONS*.md` | (planned: rename / edit / delete) | ⊘ Skipped — gitignored |
| File #7: `INSTALL/files-3/EMERGENT_INSTRUCTIONS_P3.md` (byte-dupe of Pkg3 P3) | (planned: delete) | ⊘ Skipped — gitignored |

**Tool-author survey findings beyond INSTALL/:**
- **"Cursor"** (235 hits) — ~95% are mouse-cursor / collaboration tracking code (`MultiCursorTracker.tsx`, `CollaboratorCursors.tsx`, `RemoteCursors.tsx`), NOT Cursor.ai references. Domain vocabulary, not noise.
- **"Builder.io"** (750 hits) — most are legitimate `@builder.io/sdk` SDK imports (active dep in package.json) + competitive analysis docs in `EchoCoder/` (`ECHOCODER_VS_BUILDER_IO_COMPLETE_COMPARISON.md`). Sweep would damage active code or erase intentional comparisons.
- **"Emergent"** (137 hits) — Emergent is an **active production dependency** (LLM gateway: Claude Sonnet 4.5 / Whisper STT / Gemini 2.5 Flash via Emergent LLM Key + Outlook/Gmail OAuth via Emergent Google OAuth, per `memory/PRD.md`, `memory/OPERATOR_TEST_RUNBOOK.md`, `auth_testing.md`). Sweeping would erase accurate documentation of production infrastructure.
- **"ChatGPT"** (22 hits) — low volume, mostly competitive analysis docs. Out of scope for this shift.

**Carry-forward for future shifts:** If `INSTALL/` archive cleanup is wanted, that's a developer-local filesystem operation outside any commit's scope. Pass call required to either (a) accept INSTALL/ stays as gitignored archive untouched, (b) un-gitignore INSTALL/ wholesale (significant scope expansion), or (c) execute filesystem-only cleanup with no git visibility.

### Honest framing for the record

AUDIT_001 was a useful starting point. The categorization of "cascade vs real bugs" provided a working hypothesis. The C1 attempt falsified the cascade hypothesis: what the audit called "minified-source cascade fixable by prettier" is actually irreversible source damage from line-comment-swallow during a Cursor minification session. The Echo Resonance platform is being built on top of a codebase with significant pre-existing rot. The methodology is letting the team see it honestly. Address it eventually, not by lying about its scope tonight.

---

## Per-category breakdown

### Category A — DEAD CODE (safe to delete)

**Confirmed dead (0 imports from grep across `*.ts`/`*.tsx`):**

| File | Errors | Notes |
|---|---|---|
| `client/modules/Maestro/data/nova-lab-sidebar-9e7a38ea-95f9-42cb-ab91-a49c88c9e16d.tsx` | 210 | Auto-generated UUID name |
| `client/modules/Whiteboard/ExportManager.ts` | 159 | 0 importers |

**Probable dead (UUID-named siblings, same pattern; need confirmation):**

| File | Errors | Notes |
|---|---|---|
| `client/modules/Maestro/data/nova-lab-App-830a8d04-e3b1-48a3-a559-67cee323140e.tsx` | (sample needed) | UUID name |
| `client/modules/Maestro/data/nova-lab-chart-1ba1c874-9d9b-4c29-9a4b-7d7d3f112434.tsx` | (sample needed) | UUID name |
| `client/modules/Maestro/data/index-*UUID*.html` | n/a | Duplicates of `index.html` |
| `client/modules/Maestro/data/package-*UUID*.json` | n/a | Duplicate of `package.json` |
| `client/modules/Maestro/data/vite.config-*UUID*.ts` | n/a | Duplicate of `vite.config.ts` |
| `client/modules/Maestro/data/tailwind.config-*UUID*.ts` | n/a | Duplicate |
| `client/modules/Maestro/data/pnpm-lock-*UUID*.yaml` | n/a | Duplicate |
| `client/modules/Maestro/data/netlify-*UUID*.toml` | n/a | Duplicate |
| `client/modules/Maestro/data/manifest-*UUID*.json` | n/a | Duplicate |
| `client/modules/Maestro/data/{BUILD_STATUS,COMMUNICATION_SYSTEM,…}-*UUID*.md` | n/a | Foreign project docs |

**Estimated reach:** 2-4 high-confidence files (~370-500 errors freed) + 15-25 sibling UUID files (estimated ~200-400 additional errors freed if any of them parse-error in the log)

**Effort:** **S** — `git rm` per file after final import grep. No logic changes. ~1-2 hours total.

---

### Category B — STUB CODE (pending implementation, not bugs)

`throw new Error('Not implemented')` files in `server/services/echo-ai3/*` and similar typically don't produce parser errors — their type signatures parse fine, the body throws. **Direct contribution to the 4122 count: ~0.**

The scaffolded type files in `shared/types/voyage/*` and `shared/types/resonance/forecast.ts` DO have broken imports (`PropertyId`, `ISODateTime`, `GuestId`, `VisitId` — none exported from `base.ts`). These would normally surface as TS2305 errors, but **TS2305 count is 0 in this log** (see Category E for why this is suspicious). If/when those become visible, they'd be ~10-15 errors total — Category D, not B, since the imports are bugs in scaffold-state files.

**Effort:** N/A — stubs are intended scaffolding, not repair targets. Leave alone per the no-placeholder-policy distinction (honestly-incomplete vs hidden-broken).

---

### Category C — ROOT-CAUSE CASCADES (one bug, many error reports)

**Dominant category. ~46 files with 10+ errors each, totaling ~3000-3500 errors.**

Cascade signature: minified `.ts`/`.tsx` source → tsc fails parsing token-by-token → hundreds of TS1xxx errors per file. **One reformat = thousands of errors gone.**

**Top 10 cascade files:**

| File | Errors | Imports | Notes |
|---|---|---|---|
| `client/modules/EchoEventStudio/client/types/database.ts` | 306 | 11 | Whole file on line 1 (Supabase generated types, then minified) |
| `client/modules/Culinary/server/lib/ai-llm-service.ts` | 277 | 2 | Minified, anthropic-sdk commented out |
| `client/modules/Maestro/data/nova-lab-sidebar-…UUID….tsx` | 210 | **0** | **Also Category A** |
| `client/modules/Whiteboard/ExportManager.ts` | 159 | **0** | **Also Category A** |
| `client/modules/EchoEventStudio/client/core/layout/PlannerToStudioBridge.ts` | 157 | 3 | Minified, deeply consumed |
| `client/modules/Culinary/server/routes/rdlabs-project-extraction.ts` | 121 | 3 | Minified Express route |
| `client/modules/PurchasingReceiving/shared/api/invoices.ts` | 117 | 12 | Minified API client, **deeply consumed** |
| `client/modules/PurchasingReceiving/shared/api/waste-logs.ts` | 115 | 1 | Minified |
| `client/modules/PurchasingReceiving/shared/api/waste-prevention.ts` | 105 | (sample) | Minified |
| `client/modules/PurchasingReceiving/shared/api/sensor-readings.ts` | 101 | (sample) | Minified |

**Estimated count:** ~3000-3500 errors across the 46 high-error files plus a portion of the 253 mid-tier files

**Effort:** **M** per module. Strategy:
1. `prettier --write client/modules/<MODULE>/**/*.{ts,tsx}` (dry-run first via `--check`)
2. Re-run tsc on the module post-format
3. Commit per module so a rollback is granular

**Risk:** prettier expects parseable input. Severely-broken source may not reformat cleanly. Mitigation: per-file fallback (manual reformat) for files that prettier rejects.

---

### Category D — REAL BUGS (need fixing)

The medium and long tail. ~440 files with 1-9 errors each, ~600-800 errors total. These are genuine syntax/type bugs in code that's reasonably formatted.

**Sample (1-error file):** `server/services/integrations/pos/touchbistro.ts` (5 errors but pattern representative). Real bug at line 11: `async subscribeToWebhooks?.(_callback: WebhookCallback): Promise<void> {}` — invalid TS class syntax. The `?.()` syntax is for call sites (optional chaining), not class member declarations. Should be `subscribeToWebhooks?(...): Promise<void>` (interface) or `subscribeToWebhooks?: (cb) => Promise<void>` (property with optional function type).

**Sample (1-error file):** `client/modules/Culinary/mobile/screens/auth/LoginScreen.tsx` — single TS1005 at line 10 col 1 (probably a missing close brace or unterminated block).

**Estimated count:** ~600-800 errors across ~440 files.

**Effort:** **L** — case-by-case. Some are 1-line fixes; others are deeper logic. Recommended approach: triage per-module *after* Category C reformat clears the noise. Many "1-error" files may actually be cascade tails that reformat resolves.

---

### Category E — UNKNOWN / NEEDS PASS REVIEW

1. **TS2305 invisibility — the missing-exports mystery.**
   Focused tsc on individual files reveals 8+ TS2305 errors (`shared/types/voyage/{trip,plan,corporate,brief}.ts`, `shared/types/resonance/forecast.ts`, `server/services/echo-ai3/resonance/trajectory-engine.ts`, `server/services/echo-ai3/voyage/gap-finder.ts` — all importing nonexistent `ISODateTime`/`GuestId`/`VisitId`/`PropertyId` from `base.ts`).
   Full-repo tsc reports **0** TS2305 errors.
   Hypothesis: when tsc encounters severe parser failures cascading through the dependency graph, semantic checking is skipped or short-circuits for downstream files. This means **the 4122 figure may understate the actual error count once Category C cascades are resolved**. A re-audit pass on a cleaner baseline is likely needed.
   **Pass call needed:** is the 4122 baseline load-bearing for repair-ticket scoping, or do we plan a re-audit post-Category-C reformat?

2. **Maestro/data dropped-in project — full deletion?**
   `client/modules/Maestro/data/` contains 20+ UUID-suffixed files that appear to be a Builder.io (or similar) export pasted wholesale into the repo. Sibling files (e.g., `package.json` and `package-UUID.json`, `vite.config.ts` and `vite.config-UUID.ts`) suggest the UUID-tagged set is the foreign import. **Pass call needed:** delete all `Maestro/data/*UUID*` files in one sweep, or treat as historical artifacts to preserve?

3. **Sub-modules excluded by tsconfig.**
   `client/modules/CulinaryEngine/**` and `client/modules/EchoAurum/**` are tsconfig-excluded — their type-error state is unknown. Out of this audit's scope. Flagging for future audit.

4. **`scripts/brigade-merge-pr3.sh` untracked.**
   Side observation: the pr3 brigade-merge script is in the working tree but untracked. Used to merge TICKET_001 to main. Worth deciding: track in git or `.gitignore` it as a developer-local helper.

---

## Per-module breakdown

### PurchasingReceiving — 1513 errors (37%)

Concentrated in `shared/api/*.ts` (8 files contributing 831 errors) and `server/lib/*-edi-connector.ts` (132 errors). All show minified-source pattern. Top 8 files:
```
117  shared/api/invoices.ts          (12 importers)
115  shared/api/waste-logs.ts        (1 importer)
105  shared/api/waste-prevention.ts
101  shared/api/sensor-readings.ts
101  shared/api/accounting.ts
 94  shared/api/iot-alerts.ts
 91  shared/api/rfid-tags.ts
 83  shared/api/waste-disposal.ts
```

**Recommendation:** batch prettier reformat across `client/modules/PurchasingReceiving/**/*.{ts,tsx}`. **Estimated to resolve ~80-90% of the 1513 errors in this module.**
**Effort:** M (run prettier, verify post-format, regression-test runtime if reachable).

### Culinary — 848 errors (21%)

Mixed: top files are minified (`server/lib/ai-llm-service.ts` 277, `server/routes/rdlabs-project-extraction.ts` 121, `server/lib/pdf-knowledge-extractor.ts` 17). Mobile screens (`mobile/screens/auth/{Login,SignUp}Screen.tsx`, `mobile/App.tsx`, `mobile/screens/tabs/OrdersScreen.tsx`) have small counts (1-2 each, likely real syntax bugs).

**Recommendation:** prettier reformat for `Culinary/server/lib/*` and `Culinary/server/routes/*` to clear minification cascade. Then case-by-case for `Culinary/mobile/*` files.
**Effort:** M-L.

### EchoEventStudio — 738 errors (18%)

Concentrated in `client/types/database.ts` (306) and `client/core/layout/*` (157 + smaller). Same minified-source pattern across the module. Some `client/components/*` and `client/pages/*` files in the 25-30 error range — likely cascade with smaller surface.

**Recommendation:** prettier reformat for the whole module.
**Effort:** M.

### Schedule — 331 errors (8%)

Top file: `server/services/autoRepair.ts` (22 errors). Smaller per-file counts than other modules, suggesting **higher real-bug density** rather than pure cascade.

**Recommendation:** sample first. If minified, reformat. If real bugs, case-by-case. Don't prettier-reformat blindly.
**Effort:** M.

### Maestro — 212 errors (5%)

**210 of those errors are in one file** (`client/modules/Maestro/data/nova-lab-sidebar-…UUID….tsx`) that has 0 imports. **Category A dead code.**

**Recommendation:** delete the file. The 210 errors disappear with one `git rm`. Then audit the rest of `Maestro/data/*UUID*` for the same treatment.
**Effort:** S.

### Whiteboard — 211 errors (5%)

**159 of those errors are in `ExportManager.ts`** (0 imports — Category A). Remainder is small per-file in `client/components/*`.

**Recommendation:** delete `ExportManager.ts` after a final-confirmation grep, then triage the small-count remainder.
**Effort:** S.

---

## Effort estimates summary

| Category | Files | Errors | Effort | Tools | When |
|---|---|---|---|---|---|
| A — Dead code | ~10-30 confirmed + ~30-100 candidates | ~500-900 | **S** | `git rm` after import grep | First |
| B — Stub code | ~0 in this log | ~0 | N/A | — | N/A |
| C — Cascade reformat | ~46 high + portion of 253 mid | ~3000-3500 | **M** per module | `prettier --write` | Second |
| D — Real bugs | ~440 | ~600-800 | **L** | case-by-case | Third |
| E — Unknown / re-audit | — | — | **M** | re-run audit semantically | Fourth |

S = ≤1 day, M = 1-3 days, L = 1-3 weeks, XL = 1+ months

---

## Recommendation order

**Sequence:**
1. **First — Category A dead-code sweep**, starting with `client/modules/Maestro/data/*-UUID*` (the dropped-in project) and `client/modules/Whiteboard/ExportManager.ts`. **Highest ROI — zero-risk deletion of files no one imports.** Estimated to clear 500-900 errors in ~1-2 hours.
2. **Second — Category C per-module reformat**, starting with PurchasingReceiving (largest module, all-cascade pattern). Pattern: dry-run prettier first, verify, commit per module. Estimated to clear 2500-3000 errors over 1-3 days.
3. **Third — Category D real-bug triage** by module. Now that the noise is gone, what remains is real. Estimated 1-3 weeks depending on bug depth.
4. **Fourth — Category E re-audit** with semantic-error focus once cascades are resolved. Likely surfaces additional TS2305 / TS2322 / etc. that the parser cascade was masking.

**Why this order:**
- Dead code first: zero-risk, frees up cleanup space and reduces tsc noise immediately
- Cascade reformat second: highest leverage (one prettier pass = thousands of errors gone) and prerequisite for accurate Category D triage
- Real bugs only addressable after the noise clears (otherwise the long tail is buried in cascade reports)
- Re-audit at end to catch what was masked

---

## Open questions for pass

1. **Approve dead-code deletion** of `client/modules/Maestro/data/*-UUID*` files (the dropped-in project artifacts) and `client/modules/Whiteboard/ExportManager.ts`?
2. **Approve `prettier --write` as the strategy** for Category C, or do you want to investigate the root cause of the minification (was a tool stripping whitespace on save? does the file commit history show when this happened?) before the reformat dispatch?
3. **TS2305 audit gap:** is the 4122 figure load-bearing for repair-ticket scoping, or do we plan a re-audit on a clean baseline post-Category-C reformat?
4. **Out-of-scope visibility:** `client/modules/CulinaryEngine/**` and `client/modules/EchoAurum/**` are tsconfig-excluded. Audit them in a follow-up, or accept the gap?
5. **`scripts/brigade-merge-pr3.sh` untracked** — track in git or gitignore as developer-local?

---

> *"The check list is not for the chefs who don't know what they're doing. It is for the chefs who do."*
> — `docs/maestro/STATION_CHECK_LIST.md`

Yes Chef.
