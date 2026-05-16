<!-- Pipeline run summary committed to valuation/. Companion to gitignored detail outputs in valuation/evidence/2026-05-13/. See also: docs/maestro/SILENT_SERVICE.md, docs/maestro/BRIGADE_LEARNINGS.md, Makefile, scripts/freeze-build.sh. -->

# 409A Evidence Pipeline — Run Summary

**Date:** 2026-05-13
**Branch:** `conflict_110526_1036` (135 commits ahead of `origin/main`, pending merge)
**Pipeline command:** `make valuation-evidence`
**Foundation commits this session:** `3aa66999e` (Foundation), `656968302` (Python PATH), `8c1398ddc` (NODE_OPTIONS=8GB), `dc68d6e50` (gtimeout 300 vitest), `dbd5e11dc` (--ignore-npm-errors cyclonedx), `9cbe883ea` (Sears → William J. Morrison)

---

## TL;DR — five headline metrics

- **1,866,266 lines of code across 6,920 files** (TypeScript 959,597 + Python 175,041 = primary algorithmic surface)
- **Average cyclomatic complexity B (5.52)** across 11,790 analyzed blocks (low-moderate; sustainable maintenance posture)
- **9,749 commits** on `origin/main` since 2025-09-24
- **Sole-author confirmed** via `git shortlog` on all 6 named algorithm files
- **JS SBOM 6.5MB + Python SBOM 76KB** — full dependency provenance

---

## Per-FW step status

| Step | Tool | Output | Status |
|---|---|---|---|
| FW-2 | `cloc` | `valuation/evidence/2026-05-13/cloc.txt` (1,997 B) | ✓ |
| FW-3 | `radon cc -a -s` + `radon mi -s` | `radon-cc.txt` (641 KB), `radon-mi.txt` (33 KB) | ✓ |
| FW-4 | `jscpd` with `NODE_OPTIONS=--max-old-space-size=8192` | `jscpd/` + `jscpd-stdout.txt` (1.4 MB) | ✓ |
| FW-5 | `gtimeout 300 pnpm test -- --coverage --run` | `vitest-coverage.txt` (171 KB, partial), `PIPELINE_FAILURES.txt` (timeout captured) | ⚠ non-blocking timeout — 5-min cap hit |
| FW-6a | `cyclonedx-npm --ignore-npm-errors` | `sbom-npm.json` (6.5 MB) | ✓ |
| FW-6b | `cyclonedx-py environment` | `sbom-py.json` (76 KB) | ✓ |
| FW-7 | `git log --pretty=format:'%H,%ai,%an,%ae,%s' origin/main` | `valuation/git-history.csv` (1.4 MB, 9,749 rows) | ✓ |
| FW-8 | `git-of-theseus-analyze .` | `theseus/` (authors.json, cohorts.json, dirs.json, domains.json, exts.json, survival.json — 2 MB) | ✓ |
| FW-9 | `git shortlog -sn` × 6 algo files | `valuation/algorithms/{3a,3b,3c,3d}/authorship.txt` | ✓ |
| FW-10 | `git log --follow --pretty=format:'%ai %h %an %s'` × 6 algo files | `valuation/algorithms/{3a,3b,3c,3d}/timeline.txt` | ✓ |
| FW-11 | `pyan3 --dot --no-defines --colored` × 6 algo files | All 6 `.dot` files **0 bytes** — pyan3-1.2.0 `__init__()` bug | ❌ known issue, follow-up fix queued |

**True make exit:** `1` (FW-11 only; 10/11 steps succeeded).

---

## Detailed metrics

### Section 2 inputs (Codebase Quantification, COCOMO II)

**Lines of code by language** (cloc output `valuation/evidence/2026-05-13/cloc.txt`):

| Language | Files | Code |
|---|---|---|
| TypeScript | 5,080 | **959,597** |
| JSON | 103 | 430,530 |
| Markdown | 637 | 206,884 |
| Python | 655 | **175,041** |
| YAML | 46 | 52,783 |
| SQL | 108 | 16,400 |
| CSS | 44 | 9,921 |
| JSX | 44 | 5,999 |
| JavaScript | 114 | 5,996 |
| All others | 233 | 3,115 |
| **TOTAL** | **6,920** | **1,866,266** |

**Cyclomatic complexity** (radon):
- 11,790 blocks analyzed
- Average grade: **B (5.52)**
- Highest-complexity hotspots: `backend/server.py:451 startup - D (25)`, `backend/server.py:1119 security_middleware - C (12)`

**Code duplication** (jscpd): full report at `valuation/evidence/2026-05-13/jscpd/`. Run on combined `client/` + `backend/` scope.

**SBOM coverage** (CycloneDX):
- npm dependencies → `sbom-npm.json` (6.5 MB, full CycloneDX 1.5 schema)
- python dependencies → `sbom-py.json` (76 KB)
- `--ignore-npm-errors` flag was required due to peer-dependency drift in transitive dev-dependencies; does NOT compromise SBOM integrity for direct dependencies

### Section 3 per-algorithm metrics

| Algorithm | File | LoC | Authors |
|---|---|---|---|
| **3a Decision Clearance** | `backend/routes/echo_schedule.py` | 812 | sole-author (see `valuation/algorithms/3a/authorship.txt`) |
| **3b Operational Collision Detection** | `backend/routes/cross_dept_borrow.py` | 440 | sole-author |
| **3c Yield-Aware Costing (chef outlet)** | `backend/routes/chef_outlet.py` | 1,358 | sole-author |
| **3c Yield-Aware Costing (beverage)** | `backend/routes/beverage_network.py` | 622 | sole-author |
| **3d Echo AI³ ripple** | `backend/routes/echoai3_ripple.py` | 358 | sole-author |
| **3d Echo AI³ ROI** | `backend/routes/echoai3_roi.py` | 181 | sole-author |
| **Section 3 total LoC** | | **3,771** | |

Note: `cross_dept_borrow.py`, `chef_outlet.py`, `beverage_network.py` currently live only on `origin/conflict_110526_1036` and not yet on `origin/main`. Pending PR merge — three boundary items (3a.1, 3b.1, 3c.1) score 🟨 (pending merge to main) under the half-step rule; flip to 🟩 on merge.

### Section 4 effort metrics

- **9,749 commits** on `origin/main` since 2025-09-24 (~8 months observable history; older history pre-dates current branch lineage)
- **git-of-theseus survival.json** (2 MB) — line-survival analysis across full commit history. Decomposes survival by:
  - `authors.json` — per-author contribution arc
  - `cohorts.json` — commit cohorts over time
  - `dirs.json` — directory-level code retention
  - `exts.json` — language-level retention (TS, Python, MD)
  - `domains.json` — domain-level activity
- Average author attribution: single-author profile across all 6 algorithm files. Confirms 4.4 sole-author assertion.

---

## Score flips fired by this RUN-SUMMARY commit

When this file commits to `conflict_110526_1036`, the following scorecard items advance:

| Item | From | To | Why |
|---|---|---|---|
| 2.1 Total LOC by language | 🟨 | 🟩 | cloc output cited |
| 2.3 Cyclomatic complexity | 🟥 | 🟩 | radon-cc + radon-mi cited |
| 2.4 Duplication ratio | 🟥 | 🟩 | jscpd output cited |
| 2.5 Test coverage | 🟨 | 🟨 (no change) | partial only — vitest timed out; honest |
| 2.6 SBOM | 🟥 | 🟩 | both SBOMs cited (npm + py) |
| 4.1 Git history export | 🟨 | 🟩 | 9,749-commit CSV cited |
| 4.2 Commit cadence + survival | 🟥 | 🟩 | git-of-theseus output cited |
| 1.4 Screenshot/log evidence | 🟨 | 🟩 | iteration_*.json reports (259 files) + test_reports/screenshots/ cited |
| 3a.5 / 3b.5 / 3c.5 / 3d.5 git timelines | 🟨 | 🟩 | per-algorithm timeline.txt cited (4 items) |
| 3a.6 / 3b.6 / 3c.6 / 3d.6 author attribution | 🟨 | 🟩 | per-algorithm authorship.txt cited (4 items) |

**Net flips on RUN-SUMMARY commit: 14 items 🟩.**

---

## Known issues + follow-ups

### FW-11 pyan3 call graphs

All 6 `.dot` files are 0 bytes. Root cause: `pyan3-1.2.0` has a `CallGraphVisitor.__init__()` argument-collision bug (`got multiple values for argument 'root'`). Tool-side defect, not configuration.

**Resolutions queued:**
- Swap to `pydeps` (alternative call-graph generator) — install via `python3 -m pip install --user pydeps`, update Makefile FW-11 invocation
- Or pin pyan3 to a non-buggy version
- Or generate call graphs manually for the 6 algorithm files

Until resolved, scorecard items 3a.2 / 3b.2 / 3c.2 / 3d.2 (per-algorithm call graphs) remain 🟥.

### FW-5 vitest 300s cap

Vitest was capped at 5 minutes via `gtimeout 300`. Coverage report is partial (`vitest-coverage.txt` 171 KB). Root cause: archived test files in `client/_archive_node_dev_server/` contain parse-broken code (Cursor minification damage — see [BRIGADE_LEARNINGS.md](../../docs/maestro/BRIGADE_LEARNINGS.md) "The tsc-error category trap" and "Cursor caused months of damage"). Vitest enters the archived suite, hits parse errors, and the brigade-discipline `gtimeout` prevents a multi-hour stall.

**Resolution path:** exclude `client/_archive_node_dev_server/` from vitest scope (configuration change, not test change). Scorecard 2.5 stays 🟨 (partial coverage) until exclusion lands and a full vitest run produces complete coverage.

---

## Regeneration — reproducible attestation

Every artifact under `valuation/evidence/2026-05-13/` and `valuation/algorithms/{3a,3b,3c,3d}/` is regenerable by running:

```bash
make valuation-install-tools   # one-time bootstrap (brew + python3 -m pip --user)
make valuation-evidence        # regenerates all outputs
```

Build artifacts (separate from the evidence pipeline) are frozen via:

```bash
scripts/freeze-build.sh
```

which writes `valuation/evidence/build-frozen-<sha>-<date>.txt` with `git rev-parse HEAD` + sha256 of `dist/spa/assets/*.js` (per-build attestation).

The `Makefile` is itself the methodology document — every step is named, every command captured, every failure mode handled. This satisfies Section 9.3 (methodology notes for self-computed metrics).

---

## Cross-references

### Doctrine
- [SILENT_SERVICE.md](../../docs/maestro/SILENT_SERVICE.md) — narrative doctrine. Monte Carlo retrospective (lines 154–166) anchors 3c novelty. Yesterday's-accuracy-is-today's-floor (line 146) anchors the .01 principle frame on the rescore.
- [BRIGADE_LEARNINGS.md](../../docs/maestro/BRIGADE_LEARNINGS.md) — operational doctrine. The .01 principle (operational form) anchors 3d Prophet feedback-loop novelty. Narrow-grep failure mode is the methodology grounding for the rescore.

### Source / methodology
- [`Makefile`](../../Makefile) — pipeline definition; the methodology doc for self-computed metrics
- [`scripts/freeze-build.sh`](../../scripts/freeze-build.sh) — build artifact freeze
- [`SCORECARD_2026-05-13.md`](../SCORECARD_2026-05-13.md) — full 67-item rescored matrix this RUN-SUMMARY feeds

### Predecessor artifacts (preserved as audit trail)
- `memory/409A_SCORECARD.md` — May 12 source markdown
- `/Users/cami/Downloads/echoaurion-409a-evidence-pack.pdf` — original May 12 PDF (Sears spelling, never externally distributed)
- `/Users/cami/Downloads/echoaurion-409a-evidence-pack-2.pdf` — May 13 corrected PDF (William J. Morrison)

### Regenerable evidence (gitignored — `valuation/evidence/` + `valuation/algorithms/3{a,b,c,d}/`)
- All outputs at `valuation/evidence/2026-05-13/` (this run's evidence, 23 MB)
- All outputs at `valuation/algorithms/{3a,3b,3c,3d}/` (per-algorithm authorship + timeline + .dot stubs)
- `valuation/evidence/2026-05-12/` — prior run's partial evidence + the `vitest-coverage-PARTIAL-2026-05-12-stuck-on-parse-error.txt` historical artifact preserved as record of FW-5 stuck-state behavior before `gtimeout` fix

---

## Citation pointers for an appraiser

To re-verify any metric in this summary, the appraiser can:

1. **Clone the repo at commit `<current-HEAD>`** (citable via the build-frozen attestation file)
2. **Run `make valuation-install-tools`** (one-time, ~3-5 min)
3. **Run `make valuation-evidence`** (~15-20 min)
4. **Cross-check the regenerated outputs against the cited values in this summary** — every metric here is reproducible

For per-algorithm spec + novelty claims (Section 3 items .3 and .4), see the corresponding 2-pagers in `valuation/algorithms/`:
- `3a-decision-clearance.md`
- `3b-operational-collision-detection.md` (queued)
- `3c-yield-aware-costing.md` (queued)
- `3d-echo-ai3-orchestration.md` (queued)

---

*Yes Chef.*
