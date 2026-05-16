<!-- Rescored 409A scorecard. Predecessor pack: memory/409A_SCORECARD.md (source markdown, internal only) + /Users/cami/Downloads/echoaurion-409a-evidence-pack.pdf (rendered, never distributed externally). Doctrine cross-links: docs/maestro/SILENT_SERVICE.md, docs/maestro/BRIGADE_LEARNINGS.md. -->

# 409A Valuation Readiness Scorecard — Rescored

**Date:** 2026-05-13
**Predecessor:** May 12, 2026 evidence pack (source: `memory/409A_SCORECARD.md`; rendered PDF: local-only, not externally distributed)
**Operator:** William J. Morrison · Founder
**Scope:** 67-item readiness matrix across 10 sections, rescored item-by-item against current `origin/main` and `origin/conflict_110526_1036`
**Status:** Rescore — *no remediation work has begun.* Halted for founder review.

---

## Methodology

### Scoring rubric (unchanged from May 12 pack)

- **🟩 READY** — artifact exists on `origin/main`, dated, defensible to an outside reviewer
- **🟨 PARTIAL** — in flight; either evidence is partial, lives only on an unmerged branch, or is drafted but not finalized/executed
- **🟥 NOT STARTED** — artifact must be produced before appraiser engagement
- **⚪ N/A** — not applicable to this engagement (e.g., sole-founder makes contractor 1099s moot)

### Rescore rules in effect for this pass

1. **Half-step rule (founder instruction, 2026-05-13).** Evidence that lives only on `conflict_110526_1036` and not yet on `origin/main` scores 🟨, not 🟩. An appraiser reads main. Pending-merge is half-step, not full step.
2. **Per-item count is ground truth.** Where the May 12 pack's roll-up arithmetic disagrees with its own per-item table, the per-item table wins. (See QA finding below.)
3. **No invented evidence.** Where an artifact is claimed but not literally verifiable, the item drops to 🟨 or 🟥. Substance under different headings does not promote a 🟨 to 🟩 without explicit operator confirmation.
4. **No softening.** False precision is forbidden — confidence and accuracy must match. Where the score went *down*, the score went *down*. The .01 principle frame (see [BRIGADE_LEARNINGS.md](../docs/maestro/BRIGADE_LEARNINGS.md), [SILENT_SERVICE.md:146](../docs/maestro/SILENT_SERVICE.md)) reads "yesterday's accuracy is today's floor" — meaning yesterday's *precise* score is the floor, not yesterday's *flattering* score. This rescore is more precise.
5. **Branch comparison frame.** Every Section 3 module-boundary item is checked against both `origin/main` and `origin/conflict_110526_1036`. Pending-merge caveats are noted inline.

### Internal QA finding (one line, for follow-up)

> The May 12 pack's roll-up summary reports `5🟩 / 21🟨 / 34🟥 / 7⚪`. The pack's own per-item table sums to `6🟩 / 22🟨 / 32🟥 / 7⚪`. Two arithmetic slips: Section 3 roll-up shows 4🟩 (per-item: 5), Section 6 roll-up shows 2🟨/4🟥 (per-item: 3🟨/3🟥). Source markdown `memory/409A_SCORECARD.md` should be corrected in a follow-up commit. This rescore uses the per-item baseline (6🟩) as ground truth.

---

## Roll-up Summary with Deltas

| Section | Items | Pack 🟩 | Resc 🟩 | Pack 🟨 | Resc 🟨 | Pack 🟥 | Resc 🟥 | Pack ⚪ | Resc ⚪ | Net Δ |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 · Deployment Integrity | 4 | 0 | **1** | 3 | **2** | 1 | 1 | 0 | 0 | +1🟩 |
| 2 · Codebase Quantification | 6 | 0 | 0 | 2 | 2 | 4 | 4 | 0 | 0 | none |
| 3 · Intangible Asset Separability | 24 | 5 | **0** | 10 | **15** | 9 | 9 | 0 | 0 | **-5🟩** |
| 4 · Development Effort | 5 | 0 | 0 | 2 | 2 | 2 | 2 | 1 | 1 | none |
| 5 · Market + Competitive | 5 | 0 | 0 | 1 | 1 | 4 | 4 | 0 | 0 | none |
| 6 · IP + Legal Hygiene | 6 | 0 | 0 | 3 | **4** | 3 | **2** | 0 | 0 | +1🟨 |
| 7 · Financial Baseline | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 4 | none |
| 8 · Forward-Looking | 4 | 1 | 1 | 1 | 1 | 2 | 2 | 0 | 0 | none |
| 9 · Audit-Defensibility | 4 | 0 | 0 | 0 | 0 | 4 | 4 | 0 | 0 | none |
| 10 · Appraiser Readiness | 5 | 0 | 0 | 0 | 0 | 3 | 3 | 2 | 2 | none |
| **TOTAL** | **67** | **6** | **2** | **22** | **27** | **32** | **31** | **7** | **7** | **-4🟩** |

### What moved, in plain language

**Gains (+):**
- `1.3` Source maps stripped: 🟨→🟩 (`vite.config.ts:479 sourcemap: false` is set)
- `6.3` Founder IP assignment: 🟥→🟨 (`docs/legal/P1_IP_ASSIGNMENT_PACKET.md` template on `main`, awaiting attorney finalization)

**Regressions (-):**
- `3a.1`, `3b.1`, `3c.1` Module boundaries: 🟩→🟨 (half-step rule — `cross_dept_borrow.py`, `chef_outlet.py`, `beverage_network.py` live only on `conflict_110526_1036`; `echo_schedule.py` on main is 381 lines, on conflict is 812 lines)
- `3a.3`, `3c.3` Spec in operator language: 🟩→🟨 (claimed PRD section references — `iter266.11/12/14/17` — do not literally appear in `memory/PRD.md`; iter266 references exist only in `test_reports/pytest/` test output filenames, which is not spec evidence)

**Net effect:** -4🟩, +5🟨, -1🟥. Ready count drops from 6 to 2 — not because anything was lost, but because the May 12 pack scored against `conflict_110526_1036` implicitly and accepted PRD-claim references that don't literally verify. The honest face is partial-pending-merge, not ready.

### The .01 principle frame

The score moved down. That is not a regression in the work. It is a regression in the *story we were telling about the work.* The platform is the same; the brigade has been busy on `conflict_110526_1036`; the doctrine has landed (BRIGADE_LEARNINGS commit `80fedc5c0`). What changed is the rescore refuses to grade homework that hasn't been turned in. *Yesterday's accuracy is today's floor* — and yesterday's accuracy, on closer reading, was overstated by four items. Today's floor is 2🟩, honestly held.

---

## 67-Item Rescored Table

### Section 1 · Deployment Integrity (BLOCKER — fix first)

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 1.1 | Production build verified (no Vite dev signatures) | 🟨 | 🟨 | none | `package.json` has `build:client` target with `vite build`; `vite.config.ts:479 sourcemap: false`. Pack also wanted a `curl -I` against the deployed preview URL to confirm static-asset headers — not run from inside this session. `scripts/freeze-build.sh` still missing. |
| 1.2 | Build artifact hash recorded matching git commit | 🟥 | 🟥 | none | No `BUILD_HASH`, `BUILD_CHECKSUMS`, or `dist-frozen.zip` on disk. |
| 1.3 | Source maps stripped or access-controlled | 🟨 | 🟩 | **+1🟩** | `vite.config.ts:479 sourcemap: false` confirmed on `origin/main`. |
| 1.4 | Screenshot/log evidence of broken→fixed state dated | 🟨 | 🟨 | none | `test_reports/screenshots/`, `public/screenshots/`, plus 259 `test_reports/iteration_*.json` reports exist. No curated valuation bundle. |

### Section 2 · Codebase Quantification (COCOMO II Inputs)

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 2.1 | Total LOC by language | 🟨 | 🟨 | none | `cloc` not installed/run. No `valuation/evidence/` output. |
| 2.2 | LOC per named algorithm | 🟥 | 🟥 | none | No per-algorithm audit doc. `echo_schedule.py` 812 lines (conflict) / 381 lines (main); `chef_outlet.py` 1358 lines (conflict, missing on main). |
| 2.3 | Cyclomatic + cognitive complexity per module | 🟥 | 🟥 | none | `radon` not installed. No eslint complexity output. |
| 2.4 | Duplication ratio | 🟥 | 🟥 | none | `jscpd` not run. |
| 2.5 | Test coverage per module | 🟨 | 🟨 | none | Backend: 259 `iteration_*.json` reports. Frontend coverage NOT YET — needs Vitest `--coverage`. |
| 2.6 | Dependency count + proprietary vs OSS (SBOM) | 🟥 | 🟥 | none | No CycloneDX SBOM. |

### Section 3 · Intangible Asset Separability (CORE 409A EVIDENCE)

#### 3a · Decision Clearance (= Labor Brain Advisory Rail)

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 3a.1 | Module boundary (files + entry points) | 🟩 | 🟨 | **-1🟩** | On `origin/main`: `backend/routes/echo_schedule.py` is 381 lines, dashboard-only. The Labor Brain rules engine (+432 lines, 18 references to `labor_brain`/`rec_type`/`severity`) lives only on `origin/conflict_110526_1036`. `client/modules/Schedule/index.tsx:617 LaborBrainRail` exists on both. **Pending merge to main.** |
| 3a.2 | Call graph as distinct subsystem | 🟥 | 🟥 | none | No `pyan3`/`pydeps` output in `valuation/algorithms/`. |
| 3a.3 | Functional spec in operator language | 🟩 | 🟨 | **-1🟩** | Pack referenced "PRD.md iter266.11 section" — literal string not present in `memory/PRD.md`. `iter266_11_labor_brain.xml` exists in `test_reports/pytest/` but that is test output, not spec. Substance may exist under different headings — but cannot be promoted to 🟩 without verification. |
| 3a.4 | Novelty / non-obviousness claim | 🟥 | 🟥 | none | No `valuation/algorithms/3a/novelty.md` or equivalent. |
| 3a.5 | Git timeline | 🟨 | 🟨 | none | `git log -- backend/routes/echo_schedule.py` available; not exported as artifact. First commit on main: 2026-04-27 (`emergent-agent-e1`). |
| 3a.6 | Sole/primary author attribution | 🟨 | 🟨 | none | `git shortlog -sn` on main: `1 emergent-agent-e1`. Not exported as artifact. |

#### 3b · Operational Collision Detection (= cross_dept_borrow + Schedule rules + BEO shared-prep)

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 3b.1 | Module boundary | 🟩 | 🟨 | **-1🟩** | On `origin/main`: `backend/routes/cross_dept_borrow.py` **MISSING**; `backend/routes/chef_outlet.py` **MISSING** (so `_event_detail` / `beo_event_detail:914` aggregator only on conflict); `_check_shift_compliance` does exist in `echo_schedule.py:191` on main. **Two of three named files pending merge.** |
| 3b.2 | Call graph | 🟥 | 🟥 | none | |
| 3b.3 | Spec in operator language | 🟨 | 🟨 | none | PRD fragments per pack; no consolidated 1-pager. |
| 3b.4 | Novelty | 🟥 | 🟥 | none | |
| 3b.5 | Git timeline | 🟨 | 🟨 | none | |
| 3b.6 | Author attribution | 🟨 | 🟨 | none | |

#### 3c · Yield-Aware Costing (= Chef Outlet Dashboard MC forecast + invoice→recipe pipeline + commissary COGS + VIP Beverage Pre-Check)

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 3c.1 | Module boundary | 🟩 | 🟨 | **-1🟩** | On `origin/main`: `backend/routes/chef_outlet.py` **MISSING**; `backend/routes/beverage_network.py` **MISSING**. Both exist on `origin/conflict_110526_1036` (chef_outlet 1358 lines with `_monte_carlo_forecast` at line 318, `ALLOWED_ITER` constraint, operator-selectable iterations 1k/2k/5k/7500; beverage_network 25,897 bytes). `commissary/*` routes — partial existence on main. **Pending merge.** |
| 3c.2 | Call graph | 🟥 | 🟥 | none | |
| 3c.3 | Spec in operator language | 🟩 | 🟨 | **-1🟩** | Pack referenced "PRD iter266.12, 266.14, 266.17" — none literally present in `memory/PRD.md`. Test files (`iter266_12_chef_outlet.xml`, `iter266_14_results.xml`, `iter266_17_results.xml`) exist but are test output, not spec. |
| 3c.4 | Novelty | 🟥 | 🟥 | none | **Doctrine cross-link opportunity:** Monte Carlo retrospective practice on disk at [SILENT_SERVICE.md:154-166](../docs/maestro/SILENT_SERVICE.md); .01 principle operational articulation at [BRIGADE_LEARNINGS.md](../docs/maestro/BRIGADE_LEARNINGS.md). The novelty claim for 3c should cite both. |
| 3c.5 | Git timeline | 🟨 | 🟨 | none | |
| 3c.6 | Author attribution | 🟨 | 🟨 | none | |

#### 3d · Echo AI³ / Guardian / Prophet (= the orchestration layer)

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 3d.1 | Module boundary | 🟨 | 🟨 | none | `client/components/echo/` exists; 216 `client/modules/*/index.tsx` (every dashboard); `backend/routes/echoai3_ripple.py`, `backend/routes/echoai3_roi.py` on main. No single architecture map. |
| 3d.2 | Call graph | 🟥 | 🟥 | none | |
| 3d.3 | Spec in operator language (the most-critical 2-pager) | 🟥 | 🟥 | none | **Highest-leverage gap.** Pack flagged: "Echo AI³ is the unique value prop. Write a 2-pager." |
| 3d.4 | Novelty | 🟥 | 🟥 | none | **Doctrine cross-link opportunity:** the Prophet feedback loop = the .01 principle in software ([BRIGADE_LEARNINGS.md](../docs/maestro/BRIGADE_LEARNINGS.md)); Guardian's "audit-trail writes" = beneath-the-waterline doctrine ([SILENT_SERVICE.md:63,89](../docs/maestro/SILENT_SERVICE.md)). Both anchor the novelty claim. |
| 3d.5 | Git timeline | 🟨 | 🟨 | none | |
| 3d.6 | Author attribution | 🟨 | 🟨 | none | |

### Section 4 · Development Effort Evidence

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 4.1 | Git history export (~5y window) | 🟨 | 🟨 | none | `origin/main` has 9,750 commits since 2025-09-24 — ~8 months, not 5 years. Caveat to record. |
| 4.2 | Commit cadence + authorship | 🟥 | 🟥 | none | `git-of-theseus` not installed. |
| 4.3 | Major architectural milestones | 🟨 | 🟨 | none | PRD fragments only. No single timeline doc. |
| 4.4 | Contractor invoices / 1099s | ⚪ | ⚪ | none | Sole-author. Documented assertion still needed. |
| 4.5 | Founder time-allocation narrative | 🟥 | 🟥 | none | Pack: "35 yrs hospitality × 5 yrs dev = labor input multiplier" — 1-page narrative not written. |

### Section 5 · Market + Competitive Evidence

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 5.1 | Named competitor list w/ positioning | 🟨 | 🟨 | none | Substantial off-scorecard substrate: `docs/legal/PATENT_POSITIONING_STRATEGY.md` (537 lines); `docs/strategy/PRICING_STRATEGY.md` ("0.4–0.8% of property revenue" thesis). No 2x2 grid yet — but the source material is rich. |
| 5.2 | Outreach log for 7 integration partners | 🟥 | 🟥 | none | Founder activity. |
| 5.3 | LOIs / pilots / NDAs | 🟥 | 🟥 | none | Founder activity. |
| 5.4 | Customer pipeline | 🟥 | 🟥 | none | Founder activity. |
| 5.5 | TAM/SAM/SOM w/ sources | 🟥 | 🟥 | none | Founder + research. |

### Section 6 · IP + Legal Hygiene

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 6.1 | Trademark status for the 6 names | 🟥 | 🟥 | none | USPTO filings external. |
| 6.2 | Domain ownership documentation | 🟨 | 🟨 | none | |
| 6.3 | Founder IP assignment agreement | 🟥 | 🟨 | **+1🟨** | `docs/legal/P1_IP_ASSIGNMENT_PACKET.md` (18,673 bytes, same SHA on main & conflict) is a **drafted template packet** with Founder CIIA, Pre-Incorporation Assignment, and Employee/Contractor templates. Self-marked "DRAFT TEMPLATES — REVIEW WITH A LICENSED ATTORNEY BEFORE SIGNING." Substantial groundwork done; execution pending. |
| 6.4 | Cap table | 🟨 | 🟨 | none | `docs/legal/P9_CAP_TABLE_GUIDE.md` (303 lines) is a guide, not a filled table. |
| 6.5 | Entity formation docs | 🟨 | 🟨 | none | No entity docs in repo. Pack already 🟨. |
| 6.6 | OSS license compliance review | 🟥 | 🟥 | none | No SBOM, no license sweep, no `LICENSE` file at root. |

### Section 7 · Financial Baseline

> 60-second financial-proxy probe (founder-instruction): `docs/strategy/PRICING_STRATEGY.md`, `server/migrations/060_crm_revenue_goals.sql`, `server/localdata/forecast-plan.v1.json`, `CFO_TOOLKIT_*.md` exist in repo. These are **internal modeling capability** (Section 5/Section 8 substrate), not bank statements or actual revenue. Section 7 items stay ⚪ as founder-side artifacts not codebase-resident.

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 7.1 | Bank statements covering dev period | ⚪ | ⚪ | none | Founder-side artifact, not codebase-resident. |
| 7.2 | Revenue (consulting/pilots) | ⚪ | ⚪ | none | Founder-side. |
| 7.3 | Burn rate + runway | ⚪ | ⚪ | none | Founder-side. |
| 7.4 | Prior valuations (SAFEs/notes) | ⚪ | ⚪ | none | Founder-side. |

### Section 8 · Forward-Looking Documentation

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 8.1 | Product roadmap w/ dated milestones | 🟩 | 🟩 | none | `memory/PRD.md` exists with rolling iter changelog. |
| 8.2 | Buffet Builder build brief | 🟨 | 🟨 | none | `backend/routes/buffet_planner.py` exists; no separate "build brief" doc found. |
| 8.3 | Website audit + remediation plan | 🟥 | 🟥 | none | |
| 8.4 | Network intelligence / Bloomberg-Terminal thesis | 🟥 | 🟥 | none | **Highest-strategic-value missing doc** (per pack). Code surface exists: `shared/types/network-intelligence.ts`, `server/services/network-intelligence/`, `INSTALL/BanquetMenuBuilder-Pkg5-Templates/{components,hooks,services}/NetworkIntelligence*`. Thesis doc itself: not written. |

### Section 9 · Audit-Defensibility Artifacts

> Off-scorecard audit-defensibility evidence already on disk (not credited in pack): 4 GitHub Actions workflows (`a11y.yml`, `ci.yml`, `echo-ci.yml`, `license-and-coverage.yml`); `.semgrep.yml` (155 lines, custom rules tuned to LUCCCA risk surface); 3 substantive audit docs in `docs/audits/` (`EMERGENT_CLAIM_VERIFICATION_2026-05-09.md`, `PRE_ECHO_RESONANCE_TYPE_ERRORS.md`, `SCAFFOLD_VS_MASTER_DOC.md`). These don't directly satisfy 9.1–9.4 but materially strengthen the audit-defensibility narrative.

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 9.1 | Every tool output exported as signed/dated PDF or JSON | 🟥 | 🟥 | none | 259 `test_reports/iteration_*.json` exist (latest: iteration_273.json) — unsigned. |
| 9.2 | Single index doc mapping evidence→claim | 🟥 | 🟥 | none | **This rescored scorecard, once committed, becomes the seed cross-reference matrix** — will flip to 🟨 on commit. Full evidence→claim matrix requires additional cross-walk. |
| 9.3 | Methodology notes for self-computed metrics | 🟥 | 🟥 | none | COCOMO II assumptions doc not written. |
| 9.4 | Chain-of-custody log | 🟥 | 🟥 | none | |

### Section 10 · Appraiser Engagement Readiness

| # | Item | May 12 | 2026-05-13 | Δ | Evidence / Gap |
|---|---|---|---|---|---|
| 10.1 | Shortlist of ASA/ABV/CVA credentialed appraisers | 🟥 | 🟥 | none | Founder + research. |
| 10.2 | Budget range confirmed ($5-8K mid-tier) | ⚪ | ⚪ | none | Founder decision. |
| 10.3 | Target turnaround window | ⚪ | ⚪ | none | Founder decision. |
| 10.4 | NDA template | 🟥 | 🟥 | none | |
| 10.5 | Single POC + clean data room | 🟥 | 🟥 | none | Pack: "Google Drive or Dropbox folder mirroring this scorecard structure." `valuation/` directory now exists (this commit) — first foundation stone. |

---

## Off-Scorecard Evidence Found

Artifacts the May 12 pack did not credit, but which strengthen the broader 409A case:

### Legal corpus (`docs/legal/`)
Beyond the IP Assignment Packet (6.3 evidence), the repo contains:
- `PATENT_DRAFT_doctrine_enforcement.md` (**811 lines** — substantive provisional patent drafting framework, explicitly "For attorney review. DO NOT FILE WITHOUT COUNSEL.")
- `PATENT_POSITIONING_STRATEGY.md` (537 lines)
- `P3-P4-P5-P6_FILING_AND_VENDOR_PACKET.md`
- `P7_PRIVACY_PACKET.md`
- `P9_CAP_TABLE_GUIDE.md` (303 lines)
- `T1-4-T1-6_ACCESSIBILITY_AND_COOKIES.md`
- `T1-A5_SLA.md`
- `T1-A5_TERMS_OF_SERVICE.md`

**Implication:** the IP-strategy story is materially richer than 6.x captures. Patent draft + positioning strategy provide direct support for Section 3 novelty claims.

### Financial strategy substrate
- `docs/strategy/PRICING_STRATEGY.md` (per-property + per-outlet model, "0.4–0.8% of property revenue" thesis)
- `server/migrations/060_crm_revenue_goals.sql`
- `server/localdata/forecast-plan.v1.json`
- `CFO_TOOLKIT_REMAINING_WORK_PLAYBOOK.md`, `CFO_TOOLKIT_STATUS_AUDIT.md`, `CFO_TOOLKIT_VERIFICATION_AND_RECOMMENDATIONS.md`
- `OUTLET_CAPTURE_ARCHITECTURE.md`

**Implication:** Section 5.1 competitor positioning + Section 8.4 Bloomberg thesis can draw on real internal pricing/forecasting work, not be written from scratch.

### Audit-defensibility infrastructure
- `.github/workflows/{a11y,ci,echo-ci,license-and-coverage}.yml`
- `.semgrep.yml` (155-line custom ruleset)
- `docs/audits/EMERGENT_CLAIM_VERIFICATION_2026-05-09.md` (17,694 bytes)
- `docs/audits/PRE_ECHO_RESONANCE_TYPE_ERRORS.md` (27,314 bytes)
- `docs/audits/SCAFFOLD_VS_MASTER_DOC.md` (11,921 bytes)
- 259 dated `test_reports/iteration_*.json` files (iteration_1 through iteration_273)

**Implication:** Section 9 has more groundwork than 0/0/4🟥 suggests. The signing/dating step is still missing, but the artifact corpus is real.

### Recent main merge history (PRs #56–#70 visible in `git log`)
PRs that strengthen the scorecard:
- **#68 D64** — Outlet capture + 18 CFO toolkit modules + lifecycle engine + launch readiness (delivered PRICING_STRATEGY, CFO_TOOLKIT corpus, forecast-plan)
- **#67 D30** — Forensic accountant phase 1 (3-way match + vendor fingerprint + sub-recipe drift)
- **#61 D23** — Semgrep config (Section 9 infrastructure)

Plus 28 unmerged branches on `claude/D31–D63` carrying additional substance.

---

## Remediation Buckets

### (a) Free Wins — under 1 hour each, existing repo evidence

| # | Action | Effort | Flips |
|---|---|---|---|
| FW-1 | Write `scripts/freeze-build.sh` (10 lines: `git rev-parse HEAD > BUILD_HASH && sha256sum dist/spa/assets/*.js > BUILD_CHECKSUMS && zip -r dist-frozen.zip dist/`) | 10m | `1.1 🟨→🟩`, `1.2 🟥→🟩` |
| FW-2 | Run `cloc client/ backend/ --exclude-dir=node_modules,dist > valuation/evidence/2026-05-13/cloc.txt` | 15m | `2.1 🟨→🟩` |
| FW-3 | Run `radon cc -a backend/ > valuation/evidence/2026-05-13/radon-cc.txt`; run eslint `--rule complexity:[error,10]` capture | 1h | `2.3 🟥→🟩` |
| FW-4 | Run `npx jscpd client/ backend/ --output valuation/evidence/2026-05-13/jscpd/` | 30m | `2.4 🟥→🟩` |
| FW-5 | Run `pnpm test -- --coverage` (frontend Vitest) + capture; pair with iteration_*.json index | 1h | `2.5 🟨→🟩` |
| FW-6 | Run `npx cyclonedx-npm + cyclonedx-py` → `valuation/evidence/2026-05-13/sbom-{npm,py}.json` | 45m | `2.6 🟥→🟩` |
| FW-7 | Export `git log --since="2025-09-01" --pretty=format:'%H,%ai,%an,%ae,%s' origin/main > valuation/git-history.csv` (with 5y-window caveat noted in 4.1 evidence) | 15m | `4.1 🟨→🟩` |
| FW-8 | `pip install git-of-theseus && git-of-theseus-analyze . > valuation/evidence/2026-05-13/theseus.json` | 45m | `4.2 🟥→🟩` |
| FW-9 | `git shortlog -sn -- backend/routes/{echo_schedule,cross_dept_borrow,chef_outlet,beverage_network,echoai3_ripple,echoai3_roi}.py > valuation/algorithms/authorship.txt` | 10m | `3a.6 🟨→🟩`, `3b.6 🟨→🟩`, `3c.6 🟨→🟩`, `3d.6 🟨→🟩` |
| FW-10 | `git log --follow --pretty=format:'%ai %h %an %s' -- <each algo file> > valuation/algorithms/{a,b,c,d}/timeline.txt` | 15m | `3a.5 🟨→🟩`, `3b.5 🟨→🟩`, `3c.5 🟨→🟩`, `3d.5 🟨→🟩` |
| FW-11 | `pip install pyan3 && pyan3 backend/routes/echo_schedule.py --dot > valuation/algorithms/3a/callgraph.dot` (and equivalent for 3b/3c/3d) | 45m | `3a.2 🟥→🟩`, `3b.2 🟥→🟩`, `3c.2 🟥→🟩`, `3d.2 🟥→🟩` |
| FW-12 | Document the sole-author assertion at `valuation/contractors-and-1099s.md` (one paragraph + git shortlog dump) | 15m | `4.4 ⚪→⚪ (formalized)` |
| FW-13 | When this scorecard commits to `conflict_110526_1036`, item 9.2 flips from 🟥→🟨 (seed cross-reference matrix exists; full matrix is real-work) | 0m (already done on commit) | `9.2 🟥→🟨` |

**Free wins total effort: ~6h. Item flips: 17 status flips, of which 14 advance to 🟩.**

### (b) Real Work — 1–8 hours each, requires writing

| # | Action | Effort | Flips |
|---|---|---|---|
| RW-1 | Write Section 3 algorithm 2-pagers: `valuation/algorithms/{3a,3b,3c,3d}.md` (Files · Inputs · Outputs · Heuristic Logic · Novelty Statement · Competitor Delta). Cross-link [SILENT_SERVICE.md:154-166](../docs/maestro/SILENT_SERVICE.md) (Monte Carlo) + [BRIGADE_LEARNINGS.md](../docs/maestro/BRIGADE_LEARNINGS.md) (.01 principle) in 3c and 3d. | 4-6h | `3a.4 🟥→🟩`, `3b.4 🟥→🟩`, `3c.4 🟥→🟩`, `3d.4 🟥→🟩`, `3b.3 🟨→🟩`, `3d.3 🟥→🟩` |
| RW-2 | Re-anchor per-algorithm specs: Section 3*.3 needs a real spec in operator language. Write `valuation/algorithms/{3a,3c}/spec.md` (the items dropped to 🟨 in rescore). | 2h | `3a.3 🟨→🟩`, `3c.3 🟨→🟩` |
| RW-3 | Write `Makefile` target `valuation-evidence` that wraps FW-2 through FW-11 + FW-13 as repeatable | 1h | Strengthens `1.1` (production-build evidence reproducibility); enables 9.3 (methodology) |
| RW-4 | Write `valuation/milestones-timeline.md`: LUCCCA → panel arch → Echo AI³ → Buffet Builder → Monte Carlo → BEO Command Center (with PR refs to merges #56–#70) | 1h | `4.3 🟨→🟩` |
| RW-5 | Write `valuation/founder-time-allocation.md`: "35 yrs hospitality × 5 yrs dev = labor input multiplier" narrative | 1h | `4.5 🟥→🟩` |
| RW-6 | Write `valuation/competitive-matrix.md` (2x2 grid from PRICING_STRATEGY + PATENT_POSITIONING_STRATEGY + named competitors Toast/7shifts/MarketMan/Tripleseat) | 1h | `5.1 🟨→🟩` |
| RW-7 | Write `valuation/section-8-network-intelligence-thesis.md` (Bloomberg-Terminal for hospitality thesis — pack flagged "highest-strategic-value missing doc"). Draw on `shared/types/network-intelligence.ts`, `server/services/network-intelligence/`, INSTALL templates, PRICING_STRATEGY.md unit economics, CFO_TOOLKIT | 3-4h | `8.4 🟥→🟩` |
| RW-8 | Write `valuation/section-9-1-signed-artifact-manifest.md` + script to wrap each `test_reports/iteration_*.json` with `git rev-parse HEAD` + SHA256 signature manifest | 2h | `9.1 🟥→🟩` |
| RW-9 | Write `valuation/cocomo-methodology.md` (Section 9.3 — assumptions, scale factors, EAF rationale) | 1h | `9.3 🟥→🟩` |
| RW-10 | Write `valuation/chain-of-custody.md` + generator (who/when/from-which-commit per artifact, populated by Makefile run) | 2h | `9.4 🟥→🟩` |
| RW-11 | Build `valuation/evidence-claim-matrix.md` — full cross-walk from each scorecard item to the artifact(s) supporting it (this scorecard is the seed; the matrix is the finished form) | 2h | `9.2 🟨→🟩` |
| RW-12 | Locate or write `valuation/buffet-builder-build-brief.md` (Section 8.2; backend/routes/buffet_planner.py exists, brief itself separate) | 1h | `8.2 🟨→🟩` |
| RW-13 | Write `valuation/section-8-3-website-audit.md` (audit + remediation plan) | 2h | `8.3 🟥→🟩` |
| RW-14 | Write `valuation/section-10-4-nda-template.md` (standard Mutual NDA + Founder-Counsel-Appraiser NDA) | 1h | `10.4 🟥→🟩` |
| RW-15 | Write `valuation/section-10-5-data-room-structure.md` + provision a Google Drive or Dropbox mirroring `valuation/` (founder must provision the cloud folder; structure spec is mine) | 1h | `10.5 🟥→🟨 (structure spec)` — flips to 🟩 only when founder provisions the cloud mirror |
| RW-16 | Write `valuation/single-poc-and-engagement-letter.md` (Section 10.5 POC) | 30m | Combined with RW-15 → `10.5 🟨→🟩` |

**Real-work total effort: ~22-26h. Item flips: 17 status flips to 🟩 (some sub-flips share an action).**

### (c) Founder-Only / External — only William or external parties

| # | Action | Cost / Time | Flips |
|---|---|---|---|
| FO-1 | **Engage IP attorney to finalize + execute `P1_IP_ASSIGNMENT_PACKET.md`.** Pack's #1-priority intervention. Without this, the algorithms arguably belong to the founder personally, not the entity, and the 409A is meaningless. | $1,500-2,500 / 5-10 days | `6.3 🟨→🟩` |
| FO-2 | USPTO trademark filings for the 6 names (intent-to-use filings are faster than full registration) | $2,500-3,500 + filing fees / 3-6 months for full registration | `6.1 🟥→🟩` |
| FO-3 | Domain ownership consolidation: WHOIS dump + transfer-to-entity records | $0 (founder) / 1h | `6.2 🟨→🟩` |
| FO-4 | Cap table: fill `docs/legal/P9_CAP_TABLE_GUIDE.md` template with current ownership data | $0 (founder) / 30m | `6.4 🟨→🟩` |
| FO-5 | Entity formation docs: Delaware C-corp registration + EIN + bylaws + initial board consent | $500-1,500 / 2-4 weeks | `6.5 🟨→🟩` |
| FO-6 | OSS license sweep with founder disposition decisions on any AGPL/GPL flags | $0 (founder review) / 2h (after SBOM in FW-6) | `6.6 🟥→🟩` |
| FO-7 | Section 7 financial baseline: share bank statements, revenue records, burn/runway analysis, prior SAFE/note history to a private valuation folder | $0 (founder) / 4-8h | `7.1, 7.2, 7.3, 7.4 ⚪→🟩` (or stay ⚪ if appraiser doesn't require) |
| FO-8 | Section 5 founder activities: outreach log for 7 integration partners; LOIs/pilots/NDAs; customer pipeline; TAM/SAM/SOM | $0 / 2-6 weeks of activity | `5.2, 5.3, 5.4, 5.5 🟥→🟩` (only flips as the activities actually happen) |
| FO-9 | Appraiser shortlist (3-5 ASA/ABV/CVA credentialed firms) + budget decision + turnaround window | $0 (founder + Boutique appraiser search) / 1-2 weeks | `10.1 🟥→🟩`, `10.2, 10.3 ⚪→🟩` |
| FO-10 | Patent counsel review of `PATENT_DRAFT_doctrine_enforcement.md` and decision on provisional vs. non-provisional path | $1,500-3,000 / 2-4 weeks | (off-scorecard — strengthens 3.* novelty claims; doesn't flip a scorecard item) |
| FO-11 | Curl-check the deployed preview URL (`https://cfo-toolkit-deploy.preview.emergentagent.com/`) for static-asset headers (no Vite dev signatures) | $0 / 5m | Strengthens `1.1` final 🟩 |

**Founder-only cash: ~$5K-10K. Founder time: ~3 days attention spread over ~2 weeks. Elapsed: 3-6 months for USPTO full registration.**

---

## Path to 100%

### Working-week floor (no founder cash, no external action)

Execute FW-1 through FW-13 + RW-1 through RW-13. **Effort: ~28-32 hours = 4 brigade days.**

Resulting state:
- 🟩: 2 → **~26** (Section 1: 4, Section 2: 5; Section 3: ~16 of 24; Section 4: 4; Section 5: 1; Section 6: 0; Section 7: 0; Section 8: 3; Section 9: 4; Section 10: 0)
- 🟨: 27 → **~6** (3a.1, 3b.1, 3c.1 stay 🟨 *until conflict_110526_1036 merges*; some 3d items stay 🟨 pending Echo AI³ map)
- 🟥: 31 → **~5** (Section 5.2-5.5 stay 🟥 until founder activities happen; Section 6.x stay 🟥 until founder/attorney execute; Section 10.1 stays 🟥 until appraiser shortlist)
- ⚪: 7 → 7

**Working-week floor estimate: ~26🟩 / 6🟨 / 5🟥 / 7⚪ achievable in ~32 hours.**

### Merge-to-main inflection

After `conflict_110526_1036` merges to `main` (founder/brigade coordination):
- 3a.1, 3b.1, 3c.1 flip 🟨→🟩 (+3🟩)
- Strengthens 3*.4 novelty claims (now on main, not pending)

**Post-merge state: ~29🟩 / 3🟨 / 5🟥 / 7⚪.**

### Full founder execution ceiling

After FO-1 through FO-9:
- Section 6: all 6 items flip → +6🟩
- Section 7: 4 items (founder choice — 🟩 if data shared, stays ⚪ otherwise)
- Section 5.2-5.5: 4 items → +4🟩 (only as activities happen)
- Section 10: 3 items → +3🟩

**Full execution ceiling: ~45-50🟩 / 0🟨 / ~3-5🟥 (residual founder-side items in flight) / 0-7⚪.**

100% Ready is **achievable in roughly 60-90 days elapsed** if founder action follows the brigade work, dominated by USPTO turnaround.

---

## Top 5 Highest-Leverage Actions (by impact ÷ effort)

### 1. PR `conflict_110526_1036` → `main` (founder/brigade coordination)
**Impact:** Flips 3 boundary items 🟨→🟩. Reframes the entire Section 3 narrative from "pending merge" to "landed."
**Effort:** Low — the code is written, the work is done. Cleanup + review + merge.
**Why this is #1:** Three items don't flip individually unless this lands. It's the single non-writing action that produces the biggest scorecard delta.

### 2. Section 3 algorithm 2-pagers — `valuation/algorithms/{3a,3b,3c,3d}.md` (RW-1)
**Impact:** Flips 6 items at once (3a.4, 3b.4, 3c.4, 3d.4, 3b.3, 3d.3). 3d.3 is the pack's explicitly-flagged "most-critical Echo AI³ 2-pager."
**Effort:** 4-6 hours.
**Why this is #2:** Highest single-action writing leverage. Turns the codebase from "a blob" into "four distinct intangibles" — the central reframe an appraiser uses to value the work.

### 3. Bulk free-win tooling run — FW-2 through FW-11 (cloc + radon + jscpd + cyclonedx + git-of-theseus + pyan3 + shortlogs + git timelines)
**Impact:** Flips ~14 items in Sections 2, 3, 4. Massive Ready-count delta.
**Effort:** ~5 hours of tool runs + capture. Mostly waiting on subprocess outputs.
**Why this is #3:** Volume play. Each individual flip is small; aggregated, this single brigade afternoon doubles the Ready count.

### 4. `scripts/freeze-build.sh` + `Makefile valuation-evidence` (FW-1 + RW-3)
**Impact:** Flips 1.1 + 1.2 directly. Enables FW-2 through FW-11 to be repeatable on every commit. Becomes the data-room generation backbone.
**Effort:** ~1.5 hours combined.
**Why this is #4:** Foundation infrastructure. Every other piece of evidence becomes auditable and reproducible.

### 5. Engage IP attorney to execute `P1_IP_ASSIGNMENT_PACKET.md` (FO-1)
**Impact:** Flips 6.3 to 🟩. Pack's explicit statement: "without this, the algorithms arguably belong to the founder personally, not the entity, and the 409A is meaningless."
**Effort (founder):** $1,500-2,500, 5-10 days elapsed.
**Why this is #5:** Highest founder-side leverage. Cheapest single intervention that unlocks the most downstream value (patent filing path, 409A defensibility, fundraise readiness). Note: Section 6.3 is the only IP-side item where the *substrate* is already drafted on main (18,673-byte packet) — the founder action is *finalization*, not *creation*.

---

## Honest Gaps — What I Cannot Help With From Inside the Codebase

The brigade rule "do not invent answers" applies categorically to these items. They are **not soft-stoppers** — they are *founder-only* or *external-only* actions. Listing for explicitness:

| Item | Why it's outside the codebase |
|---|---|
| 5.2 Outreach log for 7 integration partners | Founder activity (real outreach must happen). |
| 5.3 LOIs / pilots / NDAs | Counterparty signatures required. |
| 5.4 Customer pipeline | Founder activity + CRM data not in repo. |
| 5.5 TAM/SAM/SOM with sources | Founder + research (Gartner/IDC subscriptions, hospitality-industry reports). |
| 6.1 Trademark filings | USPTO + counsel. External agency action. |
| 6.2 Domain ownership documentation | Founder-side WHOIS/registrar records. |
| 6.3 IP assignment **execution** (template exists on main) | Licensed attorney must finalize + countersign. |
| 6.4 Cap table | Founder-held ownership data; template (`P9_CAP_TABLE_GUIDE.md`) exists for fill-in. |
| 6.5 Entity formation docs | Delaware C-corp registration; counsel-mediated. |
| 6.6 OSS license review (disposition decisions on flagged libs) | Founder decision after SBOM is generated. |
| 7.1-7.4 (all four) | Founder-side financial artifacts. Pack already marked all ⚪. |
| 10.1 Appraiser shortlist | Founder + research (ASA/ABV/CVA-credentialed firms). |
| 10.2-10.3 Budget + turnaround | Founder decision. |
| Patent counsel review of `PATENT_DRAFT_doctrine_enforcement.md` | Licensed patent attorney work. |
| Curl-check of deployed preview URL | Requires hitting `cfo-toolkit-deploy.preview.emergentagent.com` from founder's network; not run from inside this session. |

---

## Cross-References

### Doctrine
- [SILENT_SERVICE.md](../docs/maestro/SILENT_SERVICE.md) — narrative doctrine. Monte Carlo retrospective at lines 154-166 (cross-link for Section 3c novelty). "Yesterday's accuracy is today's floor" at line 146 (the narrative .01 principle frame anchoring this rescore's "honest precision over flattering score" methodology). "Beneath the waterline" at lines 63, 89 (cross-link for Section 3d Guardian audit-trail novelty).
- [BRIGADE_LEARNINGS.md](../docs/maestro/BRIGADE_LEARNINGS.md) — operational doctrine. The .01 principle (cross-link for Section 3c yield-aware costing and Section 3d Prophet feedback-loop novelty). Narrow-grep failure mode (methodology grounding for this rescore — broader greps verified what narrow ones missed).

### Predecessor / source artifacts
- **Predecessor pack source markdown:** `memory/409A_SCORECARD.md` (12,196 bytes, dated 2026-05-12). Note internal arithmetic slip flagged in Methodology — schedule a follow-up fix.
- **Predecessor pack PDF (local-only, never externally distributed):** `/Users/cami/Downloads/echoaurion-409a-evidence-pack.pdf` (1,719,859 bytes, 106 pages)
- **Working text extract for verification:** `/Users/cami/Downloads/evidence-pack.txt` (5,353 lines, generated 2026-05-12 via `pdftotext -layout`)

### Relevant repo artifacts
- **Section 3 algorithm files:**
  - `backend/routes/echo_schedule.py` (main: 381 lines; conflict: 812 lines — Labor Brain rules engine pending merge)
  - `backend/routes/cross_dept_borrow.py` (conflict only — pending merge)
  - `backend/routes/chef_outlet.py` (conflict only — pending merge; `_monte_carlo_forecast` at line 318)
  - `backend/routes/beverage_network.py` (conflict only — pending merge)
  - `backend/routes/echoai3_ripple.py`, `backend/routes/echoai3_roi.py` (main — partial Echo AI³ surfaces)
  - `client/components/echo/`, 216 `client/modules/*/index.tsx`
- **Legal corpus (`docs/legal/`):** P1 IP Assignment Packet, P3-P6 Filing/Vendor Packet, P7 Privacy, P9 Cap Table Guide, Patent Draft + Positioning Strategy, T1 SLA + Terms + Accessibility
- **Strategy:** `docs/strategy/PRICING_STRATEGY.md`
- **CFO toolkit:** `CFO_TOOLKIT_*.md` (3 files at repo root), `OUTLET_CAPTURE_ARCHITECTURE.md`
- **Audit corpus (`docs/audits/`):** EMERGENT_CLAIM_VERIFICATION_2026-05-09 (17,694 bytes), PRE_ECHO_RESONANCE_TYPE_ERRORS (27,314 bytes), SCAFFOLD_VS_MASTER_DOC (11,921 bytes)
- **CI/CD:** `.github/workflows/{a11y,ci,echo-ci,license-and-coverage}.yml`
- **Security tooling:** `.semgrep.yml` (155-line custom ruleset, D23)
- **Test reports:** 259 `test_reports/iteration_*.json` (iter1 through iter273)

### Branch state at rescore
- **`origin/main`:** 9,750 commits since 2025-09-24, latest merge PR #70 (`fix: lockfile drift + pnpm version alignment`)
- **`origin/conflict_110526_1036`:** 133 commits ahead of main, 0 behind. Carries Section 3 algorithm completeness pending PR.
- **Archive tags from session preservation:** 8 `archive/*` tags + 2 `backup/*` tags preserve every retired piece (see session memory `project_brigade_learnings.md`)

---

## Closing — Halt for Founder Review

This rescore is the **honest face** of the 409A readiness as of 2026-05-13. The Ready count dropped from 6 to 2 because:

1. **The half-step rule** correctly downgraded three Section 3 module boundaries to 🟨 — the work exists on `conflict_110526_1036` but an appraiser reads `main`.
2. **The "do not invent evidence" rule** dropped two PRD-claim items (3a.3, 3c.3) to 🟨 — the literal references the May 12 pack cited do not appear in `memory/PRD.md`.
3. **Two genuine gains** offset partially: 1.3 sourcemaps (now 🟩) and 6.3 IP packet template (now 🟨, awaiting attorney finalization).

The platform did not regress. The story we were telling regressed; this rescore corrects it. *Precision toward the truth, even when the truth carries less flattering numbers.*

The path to 100% is executable. Brigade-side ~32 hours of work delivers ~26🟩. Founder-side $5-10K + ~3 days attention + 60-90 days elapsed delivers ~45-50🟩. Full appraiser-readiness is reachable.

**No remediation work has begun. No file outside this scorecard has been written. Awaiting William's direction on which remediation actions to fire first.**

*Yes Chef.*

---

**File metadata**
- Path: `valuation/SCORECARD_2026-05-13.md`
- Status: written to working tree, **not committed**
- Companion: original `valuation/` directory created with this file as its first inhabitant
- Next decision: commit + push (or revise) — operator call
