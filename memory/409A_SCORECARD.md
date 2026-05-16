# 409A Valuation Readiness Scorecard
## EchoAurum / LUCCCA · Generated 2026-05-12

> Scoring rubric: 🟩 READY (artifact exists, dated, defensible) · 🟨 PARTIAL (in flight, needs collation) · 🟥 NOT STARTED (must build before appraiser engagement) · ⚪️ N/A

---

## Section 1 · Deployment Integrity (BLOCKER — fix first)

| # | Item | Status | Evidence / Action |
|---|------|--------|-------------------|
| 1.1 | Production build verified (no Vite dev signatures) | 🟨 | `pnpm run build:client` produces `dist/spa/` — confirm `curl -I https://cfo-toolkit-deploy.preview.emergentagent.com/` shows static asset headers. Pin a build for valuation. |
| 1.2 | Build artifact hash recorded matching git commit | 🟥 | Need: capture `git rev-parse HEAD` + checksum `dist/spa/assets/*.js` at appraisal commit. Script-able in 1 line. |
| 1.3 | Source maps stripped or access-controlled | 🟨 | Vite default emits `.map` files — set `build.sourcemap: false` in `vite.config.ts` for the valuation build OR move maps behind auth. |
| 1.4 | Screenshot/log evidence of broken→fixed state dated | 🟨 | We have `/app/test_reports/screenshots/*.png` from iter266 audit fixes. Annotate + bundle. |

**Highest-leverage fix:** Add a `scripts/freeze-build.sh` that does `git rev-parse HEAD > BUILD_HASH && sha256sum dist/spa/assets/*.js > BUILD_CHECKSUMS && zip -r dist-frozen.zip dist/`. ~10 lines.

---

## Section 2 · Codebase Quantification (COCOMO II Inputs)

| # | Item | Status | Evidence / Action |
|---|------|--------|-------------------|
| 2.1 | Total LOC by language | 🟨 | `cloc /app/client /app/backend --exclude-dir=node_modules,dist` will produce the table. Tracked: TS/TSX, Python, CSS, MD. |
| 2.2 | LOC per named algorithm | 🟥 | Need: per-module audit. Files of reference: `echo_schedule.py` (Labor Brain), `chef_outlet.py` (Monte Carlo + Auto-Build), `beverage_network.py` (Network + VIP Pre-Check), `vip_tracker_iter241.py` (VIP Atlas). |
| 2.3 | Cyclomatic + cognitive complexity per module | 🟥 | `radon cc -a /app/backend` for Python · `eslint --plugin sonarjs` or `cyclomatic-complexity` for TS. |
| 2.4 | Duplication ratio | 🟥 | `jscpd /app/client /app/backend --min-lines 8` produces JSON report. |
| 2.5 | Test coverage per module | 🟨 | `/app/test_reports/iteration_*.json` shows backend coverage by endpoint suite. Frontend: NOT YET — add Vitest run with `--coverage`. |
| 2.6 | Dependency count + proprietary vs OSS (SBOM) | 🟥 | `cyclonedx-npm` + `cyclonedx-py` produce CycloneDX SBOMs. |

**Highest-leverage fix:** Single Makefile target `make valuation-evidence` that runs cloc + radon + jscpd + cyclonedx and dumps everything under `/app/valuation/evidence/$(date +%F)/`.

---

## Section 3 · Intangible Asset Separability (CORE 409A EVIDENCE)

Four named algorithms — each needs the same evidence pack:

### 3a · Decision Clearance (= Labor Brain Advisory Rail)
| # | Item | Status |
|---|------|--------|
| 3a.1 | Module boundary (files + entry points) | 🟩 `backend/routes/echo_schedule.py:1-573` (dashboard aggregator) + `:575-810` (labor-brain rules engine, 5 prioritized rec types, severity weighting); frontend `client/modules/Schedule/index.tsx` `LaborBrainRail` component |
| 3a.2 | Call graph as distinct subsystem | 🟥 produce `pyan3` or `pydeps` diagram |
| 3a.3 | Functional spec in operator language | 🟩 `/app/memory/PRD.md` iter266.11 section |
| 3a.4 | Novelty / non-obviousness | 🟥 write claim: "Rule-based prioritization of labor-coverage anomalies surfaced as 1-tap auditable PAFs against live KPI tiles — distinct from threshold-only alerting (7shifts) and from generic anomaly detection (Toast)" |
| 3a.5 | Git timeline | 🟨 `git log -- backend/routes/echo_schedule.py` |
| 3a.6 | Sole/primary author attribution | 🟨 `git shortlog -sn -- backend/routes/echo_schedule.py` |

### 3b · Operational Collision Detection (= cross_dept_borrow + Schedule rules + BEO shared-prep)
| # | Item | Status |
|---|------|--------|
| 3b.1 | Module boundary | 🟩 `backend/routes/cross_dept_borrow.py`, `backend/routes/echo_schedule.py` shift_conflict logic, BEO same-day-prep aggregator in `chef_outlet.py:_event_detail` |
| 3b.2 | Call graph | 🟥 |
| 3b.3 | Spec in operator language | 🟨 PRD has fragments; consolidate into a single 1-pager |
| 3b.4 | Novelty | 🟥 write claim: "Cross-departmental borrow detection that respects POS revenue scoping + scheduled position skills + sister-outlet coverage gaps — vs. simple shift-trade UIs in 7shifts/Homebase" |
| 3b.5 | Git timeline | 🟨 |
| 3b.6 | Author attribution | 🟨 |

### 3c · Yield-Aware Costing (= Chef Outlet Dashboard MC forecast + invoice→recipe pipeline + commissary COGS + VIP Beverage Pre-Check)
| # | Item | Status |
|---|------|--------|
| 3c.1 | Module boundary | 🟩 `backend/routes/chef_outlet.py` (Monte Carlo bootstrap @ 1k/2k/5k/7500 iters with normal-noise overlay over outlet_capture_daily history; YTD aggregator); `backend/routes/beverage_network.py` (VIP Pre-Check expected-need heuristic; central + outlet velocity aggregator); commissary/* routes for COGS |
| 3c.2 | Call graph | 🟥 |
| 3c.3 | Spec in operator language | 🟩 PRD iter266.12, 266.14, 266.17 |
| 3c.4 | Novelty | 🟥 write claim: "Yield-aware forecasting that bridges Monte Carlo revenue prediction with central-purchasing on-hand vs. per-outlet velocity — vs. siloed forecasting (MarketMan inventory only) and siloed POS forecasting (Toast)" |
| 3c.5 | Git timeline | 🟨 |
| 3c.6 | Author attribution | 🟨 |

### 3d · Echo AI³ / Guardian / Prophet (= the orchestration layer)
| # | Item | Status |
|---|------|--------|
| 3d.1 | Module boundary | 🟨 Echo AI³ surfaces are in `client/components/echo/*`, `client/modules/*` (every dashboard); Guardian = audit-trail writes in routes; Prophet = the Monte Carlo. Need a single map. |
| 3d.2 | Call graph | 🟥 |
| 3d.3 | Spec in operator language | 🟥 most critical — Echo AI³ is the unique value prop. Write a 2-pager. |
| 3d.4 | Novelty | 🟥 write claim: "Pattern-recognition + recommendation orchestration across hospitality verticals (labor + costing + inventory + VIP + BEO) with persistent audit trail (Guardian) and forecast self-calibration (Prophet's feedback loop) — no competitor pairs all five" |
| 3d.5 | Git timeline | 🟨 |
| 3d.6 | Author attribution | 🟨 |

**Highest-leverage fix:** A single `valuation/algorithms/{a,b,c,d}.md` 2-pager per algo with sections: Files · Inputs · Outputs · Heuristic Logic · Novelty Statement · Competitor Delta. ~4-6 hours of writing.

---

## Section 4 · Development Effort Evidence

| # | Item | Status | Evidence / Action |
|---|------|--------|-------------------|
| 4.1 | Git history export (~5y window) | 🟨 `git log --since="5 years ago" --pretty=format:'%H,%ai,%an,%ae,%s' > valuation/git-history.csv` |
| 4.2 | Commit cadence + authorship | 🟥 `pip install git-of-theseus && git-of-theseus-analyze` produces line-survival graphs by author |
| 4.3 | Major architectural milestones | 🟨 PRD has fragments; build a single timeline doc: LUCCCA → panel arch → Echo AI³ → Buffet Builder → Monte Carlo → BEO Command Center |
| 4.4 | Contractor invoices / 1099s | ⚪️ N/A if sole-author; document explicitly |
| 4.5 | Founder time-allocation narrative | 🟥 "35 yrs hospitality × 5 yrs dev = labor input multiplier" — 1-page narrative |

---

## Section 5 · Market + Competitive Evidence

| # | Item | Status |
|---|------|--------|
| 5.1 | Named competitor list w/ positioning | 🟨 Toast / 7shifts / MarketMan / Tripleseat — write a 2x2 grid w/ feature matrix |
| 5.2 | Outreach log for 7 integration partners | 🟥 |
| 5.3 | LOIs / pilots / NDAs | 🟥 |
| 5.4 | Customer pipeline | 🟥 |
| 5.5 | TAM/SAM/SOM w/ sources | 🟥 |

---

## Section 6 · IP + Legal Hygiene

| # | Item | Status |
|---|------|--------|
| 6.1 | Trademark status for the 6 names | 🟥 USPTO search + intent-to-use filings |
| 6.2 | Domain ownership documentation | 🟨 |
| 6.3 | Founder IP assignment agreement | 🟥 boilerplate; critical |
| 6.4 | Cap table | 🟨 |
| 6.5 | Entity formation docs | 🟨 |
| 6.6 | OSS license compliance review | 🟥 `cyclonedx + license-checker` — verify no AGPL/GPL contamination |

---

## Section 7 · Financial Baseline

| # | Item | Status |
|---|------|--------|
| 7.1 | Bank statements covering dev period | ⚪️ founder-side artifact |
| 7.2 | Revenue (consulting/pilots) | ⚪️ |
| 7.3 | Burn rate + runway | ⚪️ |
| 7.4 | Prior valuations (SAFEs/notes) | ⚪️ |

---

## Section 8 · Forward-Looking Documentation

| # | Item | Status |
|---|------|--------|
| 8.1 | Product roadmap w/ dated milestones | 🟩 `/app/memory/PRD.md` has rolling iter266 changelog |
| 8.2 | Buffet Builder build brief | 🟨 exists separately; link from valuation index |
| 8.3 | Website audit + remediation plan | 🟥 |
| 8.4 | Network intelligence / Bloomberg-Terminal thesis | 🟥 highest-strategic-value missing doc |

---

## Section 9 · Audit-Defensibility Artifacts

| # | Item | Status |
|---|------|--------|
| 9.1 | Every tool output exported as signed/dated PDF or JSON | 🟥 `/app/test_reports/iteration_*.json` exists for backend but not signed |
| 9.2 | Single index doc mapping evidence→claim | 🟥 THIS DOC + a cross-reference matrix |
| 9.3 | Methodology notes for self-computed metrics | 🟥 COCOMO II assumptions doc |
| 9.4 | Chain-of-custody log | 🟥 who/when/from-which-commit per artifact |

---

## Section 10 · Appraiser Engagement Readiness

| # | Item | Status |
|---|------|--------|
| 10.1 | Shortlist of ASA/ABV/CVA credentialed appraisers | 🟥 |
| 10.2 | Budget range confirmed ($5-8K mid-tier) | ⚪️ founder decision |
| 10.3 | Target turnaround window aligned w/ option grants | ⚪️ |
| 10.4 | NDA template | 🟥 |
| 10.5 | Single POC + clean data room | 🟥 Google Drive or Dropbox folder mirroring this scorecard structure |

---

# Roll-up Summary

| Section | Total Items | 🟩 Ready | 🟨 Partial | 🟥 Not Started | ⚪️ N/A |
|---------|-------------|---------|-----------|---------------|--------|
| 1 · Deployment Integrity | 4 | 0 | 3 | 1 | 0 |
| 2 · Codebase Quantification | 6 | 0 | 2 | 4 | 0 |
| 3 · Intangible Asset Separability | 24 | 4 | 10 | 10 | 0 |
| 4 · Development Effort | 5 | 0 | 2 | 2 | 1 |
| 5 · Market + Competitive | 5 | 0 | 1 | 4 | 0 |
| 6 · IP + Legal Hygiene | 6 | 0 | 2 | 4 | 0 |
| 7 · Financial Baseline | 4 | 0 | 0 | 0 | 4 |
| 8 · Forward-Looking | 4 | 1 | 1 | 2 | 0 |
| 9 · Audit-Defensibility | 4 | 0 | 0 | 4 | 0 |
| 10 · Appraiser Readiness | 5 | 0 | 0 | 3 | 2 |
| **TOTAL** | **67** | **5 (7%)** | **21 (31%)** | **34 (51%)** | **7 (10%)** |

# Highest-leverage Next Moves (if time-constrained)

1. **Section 3 algorithm 2-pagers** (4-6h writing) — turns the code from "a blob" into "4 distinct intangibles," materially affecting valuation.
2. **`make valuation-evidence` Makefile** (1h) — auto-runs cloc/radon/jscpd/cyclonedx/git-of-theseus and dumps under `valuation/evidence/$(date)/`.
3. **`scripts/freeze-build.sh`** (10min) — records commit hash + asset checksums so appraiser knows exactly what they're valuing.
4. **Section 9 chain-of-custody** (1h) — wraps everything else; mandatory for IRS defense.
5. **Section 6.3 IP assignment** (founder + counsel ~$500-2K) — without this, the algorithms arguably belong to the founder personally, not the entity, and the 409A is meaningless.

# What I cannot help with from inside the codebase

- Trademark filings (USPTO)
- IP assignment agreement (counsel)
- Cap table / entity docs (founder-side)
- Bank statements / financials (founder-side)
- Appraiser shortlist + engagement (founder-side)

# What I *can* generate next-round in code

- `make valuation-evidence` Makefile + all the tool outputs it produces
- The 4 algorithm 2-pagers (3a-3d Section 3 deliverables)
- `scripts/freeze-build.sh`
- A chain-of-custody log generator that reads git + signs each artifact
- The Bloomberg-Terminal-for-hospitality thesis doc (Section 8.4)
- The competitor 2x2 matrix (Section 5.1)

Just say the word.
