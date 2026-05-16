# Launch-Readiness Addendum — what we haven't covered yet

> Companion to `LAUNCH_READINESS_AUDIT.md`. The audit covered:
> 21 codeable items (L.1–L.21) and 10 institutional paper items
> (P.1–P.10). This addendum covers the items I deliberately *didn't*
> include the first time and that, on reflection, are worth surfacing
> before launch / 409A.
>
> Ordered by *leverage on dollars* (top of the list = biggest
> financial impact relative to effort).

---

## Tier 0 — Tax wins you don't know you have (highest dollar leverage)

These move real money and have hard deadlines tied to your fiscal
year. Easy to miss; expensive to recover later.

### T0.1 — R&D Tax Credit (IRC Section 41) — **$50,000-200,000+ over 4 years**

The R&D tax credit lets you offset payroll tax (or income tax once
profitable) for qualified research expenses. Most pre-seed companies
skip this because they think it's only for biotech or hardware. It's
not — **software development qualifies.** AI work qualifies. Patent-
related R&D qualifies.

For a pre-revenue startup, the credit can offset up to **$500,000
of payroll tax per year** (the cap was raised under the Inflation
Reduction Act). For Echo / LUCCCA's R&D activities (the patent
draft, the doctrine framework, the active learning loop, the
forecasting models), this is real money.

**What you do:**
  · Engage an R&D credit specialist firm — TaxTaker, Strike Tax,
    Clarus R+D, KBKG, or your accounting firm if they have an R&D
    practice
  · They'll review your last 1-3 years of expenses and compute the
    qualified research expense (QRE) base
  · File Form 6765 with your annual tax return (or amend prior
    returns going back 3 years)

**Cost:** $5,000-15,000 to the specialist firm; they often work on
a percentage of the credit captured (~10-20%)
**Net:** typically $30,000-100,000+ per year of payroll tax offset
**Time:** 4-6 weeks for the analysis; credit applies retroactively
to the tax year it's filed for

---

### T0.2 — QSBS qualification (IRC Section 1202) — **potentially $10M+ tax-free**

If structured correctly, **founder + early employee stock can
qualify for a 100% federal capital gains exclusion** when sold,
up to $10 million per taxpayer per company (10x basis if higher).

**Requirements:**
  · Issuing entity is a domestic C-corp (you have this — Aurion
    Holdings, Inc.)
  · At time of issuance, the corp has **<$50 million in aggregate
    gross assets** (you have this; you're pre-funding)
  · Stock is held for **>5 years** before sale
  · The corporation passes the **active business test** (>80% of
    assets used in qualified trade or business — software is
    qualified)
  · No prior buyback within 2 years of issuance over certain limits

**The danger:** if your incorporation paperwork doesn't capture the
QSBS-eligibility correctly, or if you take an investment that
disqualifies you (e.g., LLC conversion to C-corp can break the
clock), you lose this. **Confirm with your attorney during the
founder paperwork that QSBS eligibility is being preserved.**

For founders, **this can mean $1-3 million in tax savings per
founder** at exit. Cheapest tax planning move you can make. Just
needs to be confirmed in writing.

**What you do:** ask your attorney during the P.1 founder
paperwork to confirm QSBS eligibility and document it.

**Cost:** $0 incremental; included in attorney work
**Time:** 30 minutes of attorney time

---

### T0.3 — Delaware Franchise Tax — **avoid the $200,000+ surprise**

Delaware C-corps owe annual franchise tax. There are **two
calculation methods** and the wrong choice is brutal:

  · **Authorized Shares Method** (default) — based on number of
    authorized shares. With your 10M authorized shares, this can
    be **$75,000-200,000+** annually.
  · **Assumed Par Value Capital Method** — based on assumed-par-
    value calculation. For a pre-revenue company, this is typically
    **$400-1,000** annually.

The state's annual notice will show the higher of the two. **You
must elect the Assumed Par Value method to pay the lower amount.**
If you don't know to choose, you might pay the default.

**What you do:** when the Delaware franchise tax notice arrives
(typically February), use the Assumed Par Value Method calculator
on Delaware's site (https://corp.delaware.gov/frtaxcalc/) and pay
the lower amount.

**Cost:** $0 to know; $74,000-199,000 saved annually
**Time:** 30 minutes / year

---

### T0.4 — State tax nexus + sales tax (where applicable)

**Income tax nexus:** if you have an employee in another state,
you have income-tax nexus there. Need to register and file
returns in each such state. Most easy to ignore, painful when
audited.

**Sales tax nexus:** SaaS is taxable in some states (TX, WA, NY,
PA, OH, AZ, CT, DC, IL, IN, KY, ME, MA, MN, MS, NM, RI, SD, TN,
UT, WV) and not others (CA, FL, MI, NJ, NC, NV, OR). Hospitality
SaaS specifically is taxable in even more states. **Most early-
stage SaaS companies underestimate sales tax obligations and end
up with 6-figure back-tax bills + penalties when caught.**

**What you do:**
  · Once you have your first paying customers, engage a state-tax
    consultant (or use a service like **TaxJar**, **Avalara**,
    **Anrok**) to:
    - Map your nexus footprint (where do you have customers,
      employees, contractors?)
    - Register for sales tax in each obligated state
    - Set up automated tax calculation + remittance per invoice

**Cost:** $200-1,000/month for the SaaS service; $2,000-5,000 for
initial nexus analysis
**Time:** 2-4 weeks to set up

---

## Tier 1 — Customer-trust artifacts you can't launch without

### T1.1 — Terms of Service (ToS)

The Privacy Policy (P.7) covers data; the ToS covers the
**commercial relationship**. Without a ToS, every customer
interaction is governed by default state contract law — risky
for both sides.

A SaaS ToS typically covers:
  · License grant + restrictions
  · Service availability + SLA
  · Customer data ownership
  · Acceptable use policy
  · Limitation of liability + indemnification
  · Termination + survival
  · Governing law + dispute resolution

**What you do:** have your attorney draft a ToS using a SaaS
template. Cost: $1,500-3,000. Time: 1-2 weeks. Publish at
echoaurion.com/terms.

---

### T1.2 — Service Level Agreement (SLA)

Customers ask "what's your uptime guarantee" before they sign.
SLAs typically commit to:
  · **99.9% monthly uptime** for production environments
  · **Service credits** if missed (typically 10-25% of monthly
    fee per breach)
  · **Excluded events:** scheduled maintenance, force majeure,
    customer-caused issues

You already have the SLO infrastructure (L.13) shipped. The SLA
is the customer-facing wrapper.

**What you do:** draft a one-page SLA, attach to the ToS.

**Cost:** $500-1,500 (legal review)
**Time:** 1 week

---

### T1.3 — Public status page

A public site (status.echoaurion.com) showing:
  · Current operational status of each subsystem
  · Recent incidents (open + resolved)
  · Scheduled maintenance windows
  · Historical uptime per component

Customers expect this. SOC 2 auditors expect this. Investors
notice when you don't have it.

**Tooling options:**
  · **Atlassian Statuspage** — the gold standard ($29-1,499/mo)
  · **BetterStack (formerly Better Uptime)** — modern UX, cheaper
    ($25-200/mo)
  · **Instatus** — cheapest entry tier ($20+/mo)

The status page reads from your existing `/api/health` endpoint
(which you just shipped in L.1). The integration is one webhook.

**Cost:** $25-100/mo
**Time:** 2-4 hours to set up + integrate

---

### T1.4 — Cookie policy + consent banner

Required by GDPR, CCPA, and ePrivacy Directive. The Privacy Policy
covers the data-flow; the Cookie Policy specifically lists which
cookies you set, what they do, how long they last, and offers
granular consent.

**Tooling options:**
  · **OneTrust** — enterprise-grade ($1k+/mo)
  · **Cookiebot** — mid-tier ($10-50/mo)
  · **Osano** — startup-friendly ($75/mo)
  · **Termly** — bundled with cookie scan + policy generation
    ($30-100/mo)

**Cost:** $30-100/mo
**Time:** 2-4 hours setup

---

### T1.5 — Security disclosure policy + security.txt

Two artifacts that signal "we take security seriously":

  1. **`security@echoaurion.com`** mailbox monitored for
     vulnerability reports
  2. **`/.well-known/security.txt`** at the public root with
     contact + disclosure policy (RFC 9116 standard)
  3. A **VDP (Vulnerability Disclosure Policy)** page at
     `echoaurion.com/security` describing safe-harbor for ethical
     researchers

A simple bug-bounty program via **HackerOne** or **Intigriti**
adds ~$200-500/mo of monitoring + a coordinated disclosure
funnel.

**Cost:** $0-500/mo
**Time:** 2-3 hours setup

---

### T1.6 — Accessibility compliance statement (WCAG 2.1 AA)

Enterprise customers (especially government, education, healthcare)
require **WCAG 2.1 AA conformance**. Even if you're not perfect
yet, having an accessibility statement that:
  · States your commitment
  · Lists known gaps
  · Links to a contact for accessibility issues
  · References an ongoing remediation plan

…is the artifact procurement teams want.

**A VPAT (Voluntary Product Accessibility Template)** is the
formal version; a third-party accessibility audit ($3-10k from
Deque, Level Access, AudioEye) generates it.

**What you do:** publish an accessibility statement at
`echoaurion.com/accessibility` with a contact email. Plan for the
formal VPAT before first enterprise contract.

**Cost:** $0 immediately; $3-10k for VPAT before enterprise sales
**Time:** 1 hour for statement; 4-6 weeks for VPAT

---

### T1.7 — Demo property (loaded with realistic data)

Sales calls go nowhere without a demo. You need a **fictional
"Pier 66 Demo"** property with:
  · 6-12 outlets registered
  · 90 days of capture events (synthesized but realistic)
  · A real period-close run mid-flight
  · A few BEO production-cycle runs in different states
  · A handful of approvals + audit events
  · An open regime-change alert (for the retrospective story)

This is the canonical demo every customer gets walked through.
It's also what you use for onboarding training.

**What you do:** build a `seed_demo_property.py` script in
`backend/scripts/` that drops in the demo data idempotently.

**Cost:** $0 (1-2 hours of build time — I can build this on
request)
**Time:** 2 hours

---

## Tier 2 — Operational must-haves before scale

### T2.1 — Incident response runbook

What happens at 3am when:
  · A customer reports their data leaked
  · The Mongo cluster goes down
  · A pen-tester finds a Critical the day after pen-test ends
  · An employee resigns + takes admin credentials

The runbook names roles (Incident Commander, Communications Lead,
Forensics Lead) and the steps for each scenario type.

**Templates:** PagerDuty's incident response docs are free; the
Atlassian Incident Handbook is publicly available.

**Cost:** $0 (the runbook is documentation work)
**Time:** 1-2 days to write

---

### T2.2 — DR (Disaster Recovery) drill

**You have backups (or will once Mongo Atlas is configured).
Have you ever restored from one?** The day you need to is the
worst possible time to find out it's broken.

The drill: take a backup, restore it to a scratch Mongo instance,
run row-count + sum-of-money checksums against the live cluster
to confirm parity. Document the time-to-restore.

**What you do:** schedule a quarterly DR drill. The first one is
the slow one (~1 day); subsequent ones are 1-2 hours.

**Cost:** $0 (engineer time)
**Time:** 1 day first time, 1-2 hours quarterly

---

### T2.3 — Secret rotation policy + run

When did you last rotate:
  · The Anthropic API key
  · The MongoDB Atlas password
  · The AWS root credentials
  · The Stripe / Plaid API keys
  · The session signing secret

If never, you have indefinite-window risk. Standard policy:
  · Rotate every **90 days** for high-sensitivity secrets
  · Rotate **immediately** when an employee leaves
  · Rotate **within 24h** of a suspected compromise

**Tooling:**
  · **AWS Secrets Manager** ($0.40/secret/mo) + scheduled rotation
  · **Doppler** — startup-friendly ($7/user/mo) with rotation
    automation
  · **Vault by HashiCorp** — open source; more setup

**Cost:** $0-50/mo
**Time:** 1-2 hours initial setup; 30 min per rotation

---

### T2.4 — Dependency vulnerability scanning + auto-PRs

**Dependabot** (free, GitHub-native) opens PRs for every
dependency CVE. **Snyk** ($0-200/mo) does it across multiple
languages with prioritization.

You're sitting on a multi-thousand-dependency Python + Node tree.
Without scanning, you ship known CVEs to production.

**What you do:** enable Dependabot in repo settings (free, 5
minutes); add Snyk for prioritization once budget allows.

**Cost:** $0 (Dependabot) - $200/mo (Snyk paid)
**Time:** 5 minutes for Dependabot

---

### T2.5 — Single sign-on (SSO) for company tools

Once you have employees, **everyone uses passwords for everything**
unless you set up SSO. SSO via Google Workspace (your existing
identity provider) eliminates 80% of credential-leak risk.

  · Google Workspace SSO is free with your Workspace subscription
  · **Okta** — $2-15/user/mo for enterprise SSO across
    everything
  · **JumpCloud** — $9-21/user/mo, includes device management

**What you do:** when you add the first hire, enable Google SSO
for GitHub, Pulley/Carta, Vanta/Drata, Slack, MongoDB Atlas,
AWS, Stripe.

**Cost:** $0 (Google Workspace SSO)
**Time:** 30 min per integration

---

### T2.6 — 401(k) plan (when you start hiring)

A 401(k) is part of standard hospitality / SaaS comp. Setting one
up early is cheaper than retrofitting.

**Tooling options:**
  · **Guideline** — $39 base + $8/employee/mo
  · **Human Interest** — $120 base + $4/employee/mo
  · **Vestwell** — $125 base + $5/employee/mo

Most pre-seed companies wait until the first hire requires it.
That's fine; just have it on the radar.

**Cost:** $39-150/mo + per-employee
**Time:** 2-4 weeks to set up

---

## Tier 3 — Customer-facing materials (post-MVP, pre-scale)

### T3.1 — Documentation site (for customers, not internal)

Your `docs/` directory is internal. Customers need:
  · Getting-started guides
  · Module documentation (Admin, Financial, Concierge, etc.)
  · API reference (auto-generated from OpenAPI)
  · Integration guides per POS/PMS/payroll
  · FAQ

**Tooling options:**
  · **Mintlify** — modern, AI-friendly ($0-200/mo)
  · **Readme.io** — established, with API explorer ($99-500/mo)
  · **GitBook** — clean, flexible ($0-200/mo)
  · **Docusaurus** — open source, self-hosted (free)

**Cost:** $0-200/mo
**Time:** 1-2 weeks to set up + populate

---

### T3.2 — API client SDKs (auto-generated)

From the OpenAPI schema you just shipped (L.4), you can
auto-generate SDKs in TypeScript, Python, Go, etc. Customers who
want to integrate with you in code get a typed, idiomatic SDK.

**Tooling:**
  · **Speakeasy** — $0-200/mo, generates SDKs from OpenAPI
  · **Stainless** — $0-500/mo, comparable
  · **OpenAPI Generator** — free, lower polish

**Cost:** $0-200/mo
**Time:** 1-2 hours to set up + per-language

---

### T3.3 — Demo / sandbox environment

Customers want to try before they buy. A sandbox:
  · Loads with the demo property data (T1.7)
  · Has fake Stripe/Plaid keys so transactions don't post real money
  · Auto-resets daily
  · Available at `sandbox.echoaurion.com`

**Cost:** depends on hosting; ~$50-200/mo for a small sandbox VM
**Time:** 1-2 days

---

## Tier 4 — Strategic/business artifacts before fundraise

### T4.1 — Pricing strategy document

How do you price? Per property? Per outlet? Per user? Per
transaction? Tiered?

For hospitality SaaS, common patterns:
  · **Per-property base + per-outlet add-on** — Aurion's natural
    fit
  · **Per-user seat** — for the operator portal
  · **Per-transaction** for payment processing or marketplace
  · **Tiered enterprise** for chains

This needs to be defensible. A 1-page pricing doc explaining the
math (cost to serve, margin target, market comparables) is what
investors want to see.

---

### T4.2 — Pitch deck (investor + customer versions)

Two decks; substantially different content:

  · **Investor deck:** ~12-15 slides covering problem, solution,
    market, business model, traction, team, ask. Standard YC-format
    is fine.
  · **Customer deck:** ~10 slides covering customer problem, your
    solution, ROI, social proof, pricing, next steps.

**Templates:** YC's pitch deck template is free; SequenceLabs and
Pitch.com have hospitality-specific templates.

---

### T4.3 — First customer Letter of Intent (LOI)

Even one written LOI from a target customer ("we plan to be your
customer when X is delivered") is **gold for fundraising**. The
LOI doesn't commit them to pay yet; it commits them to consider
buying once you ship.

For Echo / LUCCCA, **Pier Sixty-Six** is the obvious first LOI.

---

### T4.4 — Competitive landscape doc (current 2026)

The repo has older `COMPETITIVE_ANALYSIS_*` files. A 2026 update
covering:
  · **Toast Hospitality, Avero, Hotelligence360, Knowcross, Stayntouch,
    Mews Marketplace** etc.
  · Per competitor: features, pricing, target customer, your
    differentiation
  · The "we're not them because" sentence per competitor

Investors ask for this. So do customers in evaluations.

---

## Tier 5 — Engineering excellence I haven't covered

### T5.1 — Code coverage measurement

Run `pytest --cov` + `pnpm test --coverage`. Publish to **Codecov**
(free for open source; $10-300/mo for private). The coverage
percentage is a 409A-reviewer signal.

**Target:** 70% on critical paths (Money, GL guardians, doctrine
gate, capture engine) for first SOC 2; 80% within a year.

---

### T5.2 — Mutation testing on financial modules (Stryker)

Mutation testing actively breaks code paths and verifies your
tests catch the breaks. For financial code, this is the difference
between "tests pass" and "tests would catch a real bug."

  · Set up Stryker on `services/lib/money.ts`, `glPostingEngine`,
    and the 18 CFO toolkit modules
  · Set the bar at 70% mutation score initially

---

### T5.3 — Performance benchmarks + budgets

Before launch, document the expected p50/p95/p99 latency for:
  · The 10 most-hit endpoints
  · The 5 heaviest aggregations (cross-property, retrospective)
  · The 21-day forecast endpoint

Set **performance budgets** in CI — block any commit that regresses
a budget by >10%.

---

## Recommended priority sequence

If you do **just three things** from this addendum before launch
or 409A:

  1. **R&D tax credit application** (T0.1) — biggest dollar return
  2. **Confirm QSBS eligibility** (T0.2) with the attorney during
     P.1 paperwork — biggest founder-tax-savings later
  3. **Public status page + ToS + SLA** (T1.1, T1.2, T1.3) —
     customer-trust table-stakes

If you do **five things**, add:

  4. **Cookie policy + security.txt + security@ email** (T1.4 + T1.5)
  5. **Demo property seed** (T1.7)

If you do **all of Tier 0 + Tier 1**, you've moved from "good
codebase" to "legitimately ready to be in front of investors and
enterprise customers."

---

## Closing

You asked what else. Here's the honest list. Total cost to do
EVERY item in Tier 0 + Tier 1 + Tier 2 over the next 6 months:
**~$15,000-40,000** plus **a few weeks of your time on
attorneys / vendors**. The R&D tax credit alone often returns
more than that.

The codebase is genuinely strong. The institutional packets
(P.1-P.10) are drafted. This addendum is the "while you're in
there" list — the items that, taken together, separate "founder
who built a thing" from "company ready to scale."
