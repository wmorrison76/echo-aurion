# Launch-Readiness Master Tier List

> One organized list, three tiers, every item from the audit + addendum
> + CFO toolkit deferred items + institutional packets. Each item shows
> cost, time, owner, source doc, and why it's at that tier.
>
> Use this as the single decision document. The deep explanations live
> in the referenced packets.

---

## TIER 1 — Cannot launch / cannot 409A / cannot sign first customer without these

**Total budget:** ~$15-25k legal + ~$300-500/mo recurring
**Total calendar time:** 30 days
**Why this tier:** these items are gating. Investors won't value a
company without a clean cap table. Customers won't sign without
ToS + Privacy Policy. The patent draft is unfilable without the IP
assignments. Skip any of these and the next milestone collapses.

### A. Foundational legal (homework on you, ~2 weeks each)

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T1-A1** | **Founder CIIA + Pre-Incorporation IP Assignment + 83(b) check** | $1,500-3,000 | 1-2 wk | You + Delaware C-corp attorney | `P1_IP_ASSIGNMENT_PACKET.md` |
| **T1-A2** | **Confirm QSBS eligibility** during the same attorney session | $0 incremental | 30 min | You + attorney | `LAUNCH_READINESS_ADDENDUM.md` T0.2 |
| **T1-A3** | **Cap table tool (Pulley or Carta) + bundled 409A** | $200-300/mo + $1-2.5k for 409A | 30 min setup + 5-15 days for 409A | You | `P9_CAP_TABLE_GUIDE.md` |
| **T1-A4** | **Privacy Policy + Subprocessor List published** at `echoaurion.com/privacy` and `/subprocessors` | $1,500-3,000 (attorney review) | 1-2 wk | You + attorney | `P7_PRIVACY_PACKET.md` |
| **T1-A5** | **Terms of Service + SLA published** at `echoaurion.com/terms` | $1,500-3,000 (attorney) | 1-2 wk | You + attorney | `LAUNCH_READINESS_ADDENDUM.md` T1.1, T1.2 |
| **T1-A6** | **DPIA filed in compliance records** | $0 | 1 hr | You | `P7_PRIVACY_PACKET.md` |

### B. Customer-trust artifacts (mostly free + a SaaS subscription each)

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T1-B1** | **Public status page** (Atlassian Statuspage / BetterStack) reading from `/api/health` | $25-100/mo | 2-4 hr setup | You | `LAUNCH_READINESS_ADDENDUM.md` T1.3 |
| **T1-B2** | **Cookie policy + consent banner** (Cookiebot / Osano / Termly) | $30-100/mo | 2-4 hr | You | `LAUNCH_READINESS_ADDENDUM.md` T1.4 |
| **T1-B3** | **`security@echoaurion.com` + `/.well-known/security.txt` + VDP page** | $0 | 2-3 hr | You | `LAUNCH_READINESS_ADDENDUM.md` T1.5 |
| **T1-B4** | **Demo property loaded with realistic data** (`seed_demo_property.py`) | $0 | 2 hr | Me — say "build the demo seed" | `LAUNCH_READINESS_ADDENDUM.md` T1.7 |

### C. Tax wins (deadline-driven; biggest dollar leverage)

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T1-C1** | **R&D Tax Credit (Section 41)** — engage TaxTaker / Strike Tax / Clarus R+D / KBKG | $5-15k specialist + 10-20% of credit | 4-6 wk | You + R&D credit specialist | `LAUNCH_READINESS_ADDENDUM.md` T0.1 |
| **T1-C2** | **EIN + business banking (Mercury) + accounting (QuickBooks/Xero)** | $0 + $30-200/mo | 1 day total | You | `P3-P4-P5-P6_FILING_AND_VENDOR_PACKET.md` Bonus |

### D. Code already shipped (no further action)

These are already merged or in PR #68:
- ✅ **L.1** Canonical `/api/health`
- ✅ **L.2** Structured logging
- ✅ **L.4** OpenAPI surface
- ✅ **L.5** Admin audit log
- ✅ **L.10** Idempotency middleware
- ✅ **L.13** SLO definitions
- ✅ **L.14** Connection pool monitor
- ✅ **B.18** Period-close lifecycle scheduler
- ✅ **A.2** Forecast 21-day rewrite
- ✅ **B.13** Intercompany eliminations
- ✅ Lifecycle engine + 8 templates
- ✅ Outlet capture system
- ✅ All 18 CFO toolkit modules
- ✅ Upgrade safety infrastructure (version + changelog + snapshots)

### Tier 1 totals

| Item | Cost | Time |
|---|---|---|
| Legal (founder + privacy + ToS) | $4,500-9,000 | 2-3 wk |
| Tools (cap table + status + cookies) | $255-500/mo + $1-2.5k one-time | 1 day setup |
| Tax (R&D credit) | $5-15k | 4-6 wk |
| Banking + accounting | $30-200/mo | 1 day |
| Demo seed | $0 (I build) | 2 hr |
| **Tier 1 totals** | **~$11-27k one-time + ~$300-700/mo** | **~30 days** |

---

## TIER 2 — Cannot scale / cannot land enterprise / cannot Series-A without these

**Total budget:** ~$60-150k over 90 days
**Total calendar time:** 90 days
**Why this tier:** these unlock the next stage. The first hospitality-
chain procurement asks for SOC 2 + pen-test. A Series A diligence
asks for trademarks + pitch deck + LOI. Insurance is required by
enterprise customers and by SOC 2.

### A. Institutional papers + filings

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T2-A1** | **Trademark applications: top 4 marks** (EchoAurion + LUCCCA + EchoAurum + EchoConcierge) classes 9 + 42 | $5-8k | 30-60 days | You + trademark attorney (Gerben / Stripe Atlas) | `P3-P4-P5-P6_FILING_AND_VENDOR_PACKET.md` P.3 |
| **T2-A2** | **Patent provisional filed** (the draft already exists) | $300 USPTO + $3-5k attorney | 30 days | You + patent attorney | `PATENT_DRAFT_doctrine_enforcement.md` + `PATENT_POSITIONING_STRATEGY.md` |
| **T2-A3** | **Insurance bundle** — GL + tech E&O + cyber + D&O via Vouch / Embroker / Founder Shield | $5-25k/yr | 1-2 wk | You + insurance broker | `P3-P4-P5-P6` Bonus.10-12 |
| **T2-A4** | **Delaware Franchise Tax: Assumed Par Value method** | $0 | 30 min/yr | You | `LAUNCH_READINESS_ADDENDUM.md` T0.3 |
| **T2-A5** | **Stock plan + first option grants** (when first hire) | $1-2.5k legal | 1-2 wk | You + attorney | `P3-P4-P5-P6` Bonus.14 |
| **T2-A6** | **Employee CIIA + Contractor IP templates ready to use** | $1-2k legal | 1-2 wk | You + attorney | `P1_IP_ASSIGNMENT_PACKET.md` |

### B. Compliance program

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T2-B1** | **SOC 2 Type I evidence collection started** (Vanta or Drata + auditor lined up) | $7-15k/yr platform + $15-30k auditor | 6-12 mo to Type I report | You + Vanta/Drata + auditor | `P3-P4-P5-P6` P.4 |
| **T2-B2** | **Independent pen-test** (Bishop Fox / NCC / NetSPI / Cobalt) | $25-60k | 2-wk engagement scheduled 30-60 days before first revenue | You + pen-test firm | `P3-P4-P5-P6` P.5 |
| **T2-B3** | **Accessibility statement + VPAT** | $3-10k for VPAT | 1 hr statement + 4-6 wk audit | You + accessibility audit firm (Deque / Level Access) | `LAUNCH_READINESS_ADDENDUM.md` T1.6 |

### C. Operational runbooks + tooling

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T2-C1** | **Incident response runbook** | $0 (writing time) | 1-2 days | You | `LAUNCH_READINESS_ADDENDUM.md` T2.1 |
| **T2-C2** | **DR drill executed + documented** | $0 | 1 day | You | `LAUNCH_READINESS_ADDENDUM.md` T2.2 |
| **T2-C3** | **Secret rotation policy + first rotation** | $0-50/mo (Doppler / AWS Secrets Manager) | 1-2 hr | You | `LAUNCH_READINESS_ADDENDUM.md` T2.3 |
| **T2-C4** | **Dependabot enabled** | $0 | 5 min | You | `LAUNCH_READINESS_ADDENDUM.md` T2.4 |
| **T2-C5** | **Google Workspace SSO across all tools** (GitHub, Pulley, Vanta, AWS) | $0 (included in Workspace) | 30 min/integration | You | `LAUNCH_READINESS_ADDENDUM.md` T2.5 |

### D. Code (next-priority observability + plumbing)

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T2-D1** | **L.6 Backup verification runner** — quarterly drill that takes a backup, restores to scratch DB, runs checksums | $0 | 1 day | Me — say "build L.6" | `LAUNCH_READINESS_AUDIT.md` |
| **T2-D2** | **L.7 Performance profiler / slow-query log** | $0 | 1-2 days | Me | `LAUNCH_READINESS_AUDIT.md` |
| **T2-D3** | **L.8 PII tag scanner + masking at query time** | $0 | 1-2 days | Me | `LAUNCH_READINESS_AUDIT.md` |
| **T2-D4** | **A.1 POS check-close webhook** wired on first property | $0-200/mo (POS-side) | 1-3 days property IT | You + property IT | `CFO_TOOLKIT_REMAINING_WORK_PLAYBOOK.md` |
| **T2-D5** | **A.5 Payroll wages API** wired (ADP / Gusto / Paychex / Rippling) | $0 (included in payroll subscription) | half day | You + payroll admin | `CFO_TOOLKIT_REMAINING_WORK_PLAYBOOK.md` |
| **T2-D6** | **B.20-22 AI-augmented features** — Sous-Chef-CFO Q&A, board pack drafting, anomaly explanation chain | $20-200/mo Anthropic usage | 1 day per feature | Me — once `ANTHROPIC_API_KEY` is provisioned | `CFO_TOOLKIT_REMAINING_WORK_PLAYBOOK.md` |

### E. Customer-facing materials

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T2-E1** | **Documentation site for customers** (Mintlify / Readme.io / GitBook / Docusaurus) | $0-200/mo | 1-2 wk to populate | You + me (content) | `LAUNCH_READINESS_ADDENDUM.md` T3.1 |
| **T2-E2** | **Sandbox environment** (auto-resets daily) | $50-200/mo hosting | 1-2 days | Me + ops | `LAUNCH_READINESS_ADDENDUM.md` T3.3 |

### F. Strategic + sales materials

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T2-F1** | **Pricing strategy document** | $0 | 1-2 days | You + me (draft) | `LAUNCH_READINESS_ADDENDUM.md` T4.1 |
| **T2-F2** | **Pitch deck — investor version** (12-15 slides) | $0-3k (designer) | 1-2 wk | You + me (draft) | `LAUNCH_READINESS_ADDENDUM.md` T4.2 |
| **T2-F3** | **Pitch deck — customer version** (10 slides) | $0-2k | 1 wk | You + me (draft) | `LAUNCH_READINESS_ADDENDUM.md` T4.2 |
| **T2-F4** | **First customer LOI signed** (Pier Sixty-Six) | $0 | 1-4 wk to negotiate | You | `LAUNCH_READINESS_ADDENDUM.md` T4.3 |
| **T2-F5** | **Updated competitive landscape doc 2026** | $0 | 1-2 days | Me | `LAUNCH_READINESS_ADDENDUM.md` T4.4 |

### Tier 2 totals

| Bucket | Cost | Time |
|---|---|---|
| Trademarks + patent + stock plan | $9-17k | 30-60 days |
| Insurance | $5-25k/yr | 1-2 wk |
| SOC 2 program | $22-45k | 6-12 mo to Type I |
| Pen-test | $25-60k | 2-wk engagement |
| Accessibility VPAT | $3-10k | 4-6 wk |
| Operational runbooks + tooling | $0-50/mo | ~3 days |
| Documentation site + sandbox | $50-400/mo | 2-3 wk |
| **Tier 2 totals** | **~$64-157k over 90 days + ~$50-450/mo** | **3 months** |

---

## TIER 3 — Continuous improvement / Year-2 / Post-Series-A

**Total budget:** ~$50-200k over 12-24 months
**Why this tier:** these compound over time but aren't blocking
launch or first-paying-customer or Series A. A senior eng team
should know they exist; a first-funded team starts working on them.

### A. Compliance maturity

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T3-A1** | **SOC 2 Type II audit** | $25-50k/audit | 6-12 mo evidence + 3-6 mo audit | You + auditor | `P3-P4-P5-P6` P.4 |
| **T3-A2** | **D&O insurance** (when board forms) | $3-10k/yr | 1-2 wk | You + broker | `P3-P4-P5-P6` Bonus.12 |
| **T3-A3** | **State tax nexus + sales tax (Anrok / Avalara / TaxJar)** | $200-1k/mo + $2-5k initial | 2-4 wk | You + state tax consultant | `LAUNCH_READINESS_ADDENDUM.md` T0.4 |
| **T3-A4** | **Tax provision calculator (B.14)** with hospitality CPA firm | $3-8k initial + me 2 days build | 4-8 wk | You + CPA | `CFO_TOOLKIT_REMAINING_WORK_PLAYBOOK.md` B.14 |
| **T3-A5** | **Madrid Protocol international trademark filings** (top 4 marks) | $2.5-5k per mark per bloc | 6-12 mo | You + trademark attorney | `P3-P4-P5-P6` P.3 |
| **T3-A6** | **Annual pen-test re-test** | $25-60k/yr | 2-wk engagement/yr | You + pen-test firm | `P3-P4-P5-P6` P.5 |

### B. Engineering maturity

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T3-B1** | **L.9 Read-replica routing** | $0 incremental | 1 wk | Me | `LAUNCH_READINESS_AUDIT.md` |
| **T3-B2** | **L.11 Cursor-based pagination** on every list endpoint | $0 | 1 wk | Me | `LAUNCH_READINESS_AUDIT.md` |
| **T3-B3** | **L.12 Webhook delivery system** with retry + dead-letter (for outbound notifications) | $0 | 1-2 wk | Me | `LAUNCH_READINESS_AUDIT.md` |
| **T3-B4** | **L.15 DR runbook tested annually** | $0 | 1 day/yr | You | `LAUNCH_READINESS_AUDIT.md` |
| **T3-B5** | **L.16 Admin audit console UI** | $0 | 1 wk | Me + Emergent (UI) | `LAUNCH_READINESS_AUDIT.md` |
| **T3-B6** | **T5.1 Code coverage to 80%** on critical paths (Money, GL, doctrine gate, capture engine) | $0 | 4-8 wk | Me | `LAUNCH_READINESS_ADDENDUM.md` T5.1 |
| **T3-B7** | **T5.2 Stryker mutation testing** on financial modules | $0 | 2 wk | Me | `LAUNCH_READINESS_ADDENDUM.md` T5.2 |
| **T3-B8** | **T5.3 Performance benchmarks + CI budgets** | $0 | 1 wk | Me | `LAUNCH_READINESS_ADDENDUM.md` T5.3 |
| **T3-B9** | **T3.2 API client SDKs** auto-generated from OpenAPI (Speakeasy / Stainless) | $0-500/mo | 1-2 days | Me + tooling | `LAUNCH_READINESS_ADDENDUM.md` T3.2 |
| **T3-B10** | **Customer telemetry pipeline** (Snowflake / Mixpanel / Amplitude) | $200-1k/mo | 2-4 wk | Me + ops | `LAUNCH_READINESS_AUDIT.md` |
| **T3-B11** | **Frontend perf budgets + Lighthouse CI** | $0 | 1 wk | Emergent | `LAUNCH_READINESS_AUDIT.md` |

### C. People + ops

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T3-C1** | **401(k) plan** (Guideline / Human Interest / Vestwell) when employees exist | $39-150/mo + per-employee | 2-4 wk | You + provider | `LAUNCH_READINESS_ADDENDUM.md` T2.6 |
| **T3-C2** | **Health insurance via PEO** (Justworks / Trinet / Sequoia) when employees exist | varies | 2-4 wk | You + PEO | implied; not yet documented |
| **T3-C3** | **Trademark watch service** | $200-500/yr | 30 min setup | You | `P3-P4-P5-P6` Bonus.13 |
| **T3-C4** | **Vendor-management system** — track every SaaS subscription, contract, renewal date | $0 (Notion) - $50/mo (Vendr) | ongoing | You | implied; not yet documented |

### D. Multi-property + advanced features

| # | Item | Cost | Time | Owner | Source |
|---|---|---|---|---|---|
| **T3-D1** | **Trademark applications: remaining 9 marks** (EchoStratus, EchoCronos, EchoConnect, EchoLayout, EchoWaste, EchoEventStudio, EchoCanvasStudio, EchoCoder, EchoAI³, the black-hat logo design mark) | $10-17k | 6-12 mo | You + trademark attorney | `P3-P4-P5-P6` P.3 |
| **T3-D2** | **A.3 Reservations / OTA pipeline** wired (Opera Cloud / Mews / Cloudbeds) | $0 modern PMS, $200-800/mo legacy | 2-8 wk per property | You + property IT | `CFO_TOOLKIT_REMAINING_WORK_PLAYBOOK.md` A.3 |
| **T3-D3** | **Frontend dashboards for outlet capture system** (Emergent ticket) | varies (frontend dev work) | 4-8 wk | Emergent + me (specs) | implied |
| **T3-D4** | **Tier 4 UI / system icons** (14 remaining: Settings, Notifications, Profile, etc.) | $7-12k bulk illustrator rate | 4-8 wk | You + illustrator | `UX_ICON_MASTER_LIST.md` |

### Tier 3 totals

| Bucket | Cost | Time |
|---|---|---|
| SOC 2 Type II + D&O + sales tax + tax provision | $35-75k + $200-2k/mo | 12-24 mo |
| Engineering maturity (10 items) | $200-2k/mo + ~6 wk of build | continuous |
| People + ops | varies based on hiring | ongoing |
| Madrid trademarks + remaining 9 marks | $20-30k | 12 mo |
| **Tier 3 totals** | **~$50-200k over 12-24 months** | **continuous** |

---

## All-in summary

| Tier | All-in cost (12-mo view) | Calendar time | Cumulative meaning |
|---|---|---|---|
| **Tier 1** | $11-27k one-time + $300-700/mo | 30 days | Cleared to launch + 409A + first paying customer |
| **Tier 2** | $64-157k + $50-450/mo | 90 days | Cleared to scale + first enterprise + Series A diligence |
| **Tier 3** | $50-200k + $200-2k/mo | 12-24 months | Mature SaaS, multi-property, post-Series-A |
| **All three** | **~$125-385k year-1** + **$550-3,150/mo** ongoing | 12-24 months end-to-end | Series-A-ready, enterprise-ready, customer-trust-blue-chip |

The R&D tax credit (Tier 1, item C1) typically returns more than the
Tier 1 + Tier 2 combined cost. Tier 3 has more spread; it's the
"how long do you want to wait" question.

---

## What I'd action this week (5 things, ~$5-10k, ~10 hours of your time)

1. **Find a Delaware C-corp attorney** — Stripe Atlas Lawyers,
   Founders Workbench, or BigLaw if budget allows. Send them
   `P1_IP_ASSIGNMENT_PACKET.md` and `P9_CAP_TABLE_GUIDE.md` as the
   starting drafts. **Specifically ask them to confirm QSBS
   eligibility** during the founder paperwork pass.
2. **Sign up for Pulley or Carta** for cap table; trigger the
   bundled 409A.
3. **Get insurance quote from Vouch** (GL + tech E&O + cyber + D&O
   bundled).
4. **Send `P7_PRIVACY_PACKET.md` to your attorney** for review;
   plan to publish at `echoaurion.com/privacy` and
   `/subprocessors`.
5. **Engage TaxTaker or Strike Tax** for an R&D tax credit
   analysis. If you've been working on this for months already,
   the credit applies retroactively.

Items 1-4 unblock the whole institutional readiness program.
Item 5 funds it.

If you also want me to **build the demo property seed (T1-B4)**
and **draft the pricing + investor + customer pitch decks (T2-F1,
T2-F2, T2-F3)** while you're doing the homework, just say so and
I'll ship them in the next commit.
