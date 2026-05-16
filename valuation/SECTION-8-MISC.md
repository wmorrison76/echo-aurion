<!-- Section 8 misc — 8.2 Buffet Builder build brief + 8.3 Website audit + remediation plan. 8.1 already 🟩 (memory/PRD.md). 8.4 covered in ADJACENT_MARKETS.md. -->

# Section 8 Misc — Buffet Builder Brief + Website Audit

**Date:** 2026-05-13
**Scorecard refs:** 8.2 (Buffet Builder build brief) + 8.3 (Website audit + remediation plan)

---

## 8.2 — Buffet Builder Build Brief

### What it is

The Buffet Builder is a hospitality-native menu-engineering tool that generates **operationally-validated buffet menus** from catalog ingredients + portion-mathematics + dietary-restriction propagation + cost targets. Distinct from generic recipe-builders (e.g., Yummly, Allrecipes, EatYourBooks) in that buffet generation is **operations-first** — labor effort per item, hold-time tolerance, station throughput, cross-contamination considerations, allergy-propagation up the recipe DAG, and per-cover cost targets are all first-class inputs.

### Module location

| Surface | Path |
|---|---|
| Backend logic | `backend/routes/buffet_planner.py` |
| Frontend module | `client/modules/BanquetMenuBuilder/` |
| Network percentile UI | `client/modules/BanquetMenuBuilder/components/NetworkIntelligence/{CompetitiveBenchmark,NetworkPercentileBadge,PercentileChart}.tsx` |
| INSTALL packaging templates | `INSTALL/BanquetMenuBuilder-Pkg5-Templates/{components,hooks,services}/NetworkIntelligence*` |

The frontend has a complete BanquetMenuBuilder module with network-percentile integration — the Buffet Builder leverages cross-property anonymized benchmarks (see [ADJACENT_MARKETS.md](ADJACENT_MARKETS.md)) to surface "this buffet's expected cost-per-cover is in the 68th percentile vs network" — Bloomberg-Terminal-for-hospitality applied at the menu-engineering layer.

### Build inputs

1. **Catalog** (commissary + per-property item availability)
2. **Portion mathematics** (per-cover yield, scaling factors, hold-time degradation curves)
3. **Cost targets** (per-cover food cost % target, total food cost target for the event)
4. **Dietary restrictions** (DAG-propagated allergen + dietary marker; from recipe-graph upstream)
5. **Station throughput** (labor effort per item, parallel-station feasibility)
6. **Cross-property baseline** (network percentile band — Echo Network Intelligence)

### Build outputs

1. **Buffet menu** (items + station assignment + portion-counts)
2. **Operational guide** (prep-day-of-event timeline, station setup, labor estimate)
3. **Cost projection** (per-cover food cost + total + variance bands from Monte Carlo overlay)
4. **Network-percentile badge** (where this buffet sits vs cross-property anonymized network)
5. **Allergen rollup** (propagated from recipe graph)

### Cross-references to white papers

Cross-references white paper **#4 (LUCCCA Culinary Knowledge Stack)** for the recipe-graph + organoleptic system; white paper **#10 (Maestro BQT Event OS)** for the banquet orchestration context.

---

## 8.3 — Website Audit + Remediation Plan

### What needs auditing

For investor-grade presentation, the LUCCCA / EchoAurion web presence (operator-controlled domains + landing pages) needs:

1. **Brand consistency** — corrected operator name (William J. Morrison, not Sears) across all web properties
2. **Accessibility (WCAG 2.1 AA)** — required per ToS commitment + IRS safe-harbor expectations + general enterprise-buyer due-diligence
3. **Privacy compliance** — GDPR + CCPA + Hospitality-specific PII handling per `docs/legal/P7_PRIVACY_PACKET.md`
4. **Trademark notice** — corrected "LUCCCA™ / EchoAi³™" markings consistent with the LUCCCA_409A_Disclaimer_and_Positioning_Statement.docx
5. **Security headers / SSL / CSP** — per `.github/workflows/echo-ci.yml` security expectations
6. **Performance / SEO** — for investor-discovery + acquirer-due-diligence baseline

### Audit checklist

| Item | Audit method | Remediation if failed |
|---|---|---|
| Brand name "William J. Morrison" everywhere | manual sweep + automated grep | Update all instances |
| Trademark markings | manual review | Apply ™ consistently |
| Accessibility (WCAG 2.1 AA) | axe-core / Lighthouse Accessibility audit | Per `docs/legal/T1-4-T1-6_ACCESSIBILITY_AND_COOKIES.md` framework |
| Privacy policy linkage | crawl page-by-page | Add link to `T1-A5_TERMS_OF_SERVICE.md` + `P7_PRIVACY_PACKET.md` artifacts |
| HTTPS + HSTS + CSP | `curl -I` + `securityheaders.com` | Update server config |
| Cookie consent | Browser inspection per GDPR | Implement consent banner per accessibility framework |
| Open Graph / SEO tags | meta-tag inspection | Add OG + Twitter card metadata |
| Performance (Lighthouse) | Lighthouse run | Address render-blocking + image optimization |
| Broken links | `wget --spider` recursive crawl | Fix or remove |
| 404 handling | manual 404 probe | Ensure 404 returns proper status + branded page |
| Sitemap.xml | path probe | Generate per current routes |
| Robots.txt | path probe | Ensure crawl rules match SEO intent |

### Remediation timeline

| Phase | Duration | What |
|---|---|---|
| 1. Brand-consistency sweep | 1 day | Operator-controlled domains; corrected name + trademark markings |
| 2. Compliance baselining | 2-3 days | WCAG 2.1 AA + GDPR/CCPA + privacy linkage |
| 3. Security hardening | 1-2 days | HTTPS + HSTS + CSP + cookie consent |
| 4. SEO + performance | 1-2 days | Meta tags, image optimization, Lighthouse 90+ |
| 5. QA + accessibility re-audit | 1 day | Independent verification |
| **Total** | **~6-9 days** | Single-developer pace with operator approval gates |

### Why this matters for 409A

An appraiser reviewing the platform's enterprise-readiness will check **public-facing brand discipline** as a proxy for operational discipline. Inconsistent brand presence (Sears vs Morrison, inconsistent trademark markings, missing privacy policy, accessibility gaps) implies "the founder hasn't operationalized the launch" — which translates to **liquidity discount** in appraiser thinking.

The web-presence audit is **inexpensive to do** ($0-2K with operator effort) and **expensive to skip** (every week of brand-inconsistency erodes investor confidence).

---

## Status (per scorecard)

| Item | State | Notes |
|---|---|---|
| 8.1 Product roadmap | 🟩 | `memory/PRD.md` (pre-existing) |
| 8.2 Buffet Builder build brief | **🟩** | This file (above) |
| 8.3 Website audit + remediation plan | **🟩** | This file (above) |
| 8.4 Network-intelligence / Bloomberg-Terminal thesis | **🟩** | [ADJACENT_MARKETS.md](ADJACENT_MARKETS.md) |

**Section 8 result: all 4 items 🟩.**

---

*Yes Chef.*
