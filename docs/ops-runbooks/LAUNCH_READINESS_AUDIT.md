# Launch-Readiness Audit — what 409A reviewers and senior SWE teams look for

> Date: 2026-05-09
>
> Honest inventory of what's already shipped, what's missing that
> moves valuation up, and what ranks highest by leverage. Written
> after PR #68 (D64 release: 0.64.0).

---

## Part 1 — What you already have that 409A reviewers / senior SWE teams actually love

These are the items in the codebase that genuinely move a valuation
upward. Listed by *leverage on enterprise-grade trust*, not by
chronological order.

### Architecture moat

  · **Doctrine-as-Code enforcement** (the core patent thesis). Pre-
    commit gate that prevents tenet violations at the data layer.
    Rare. Defensible. Patent draft on file.
  · **Append-only event log** (D28) with cryptographic linkage to
    doctrine version. Forensic-grade audit trail. Every state change
    replayable.
  · **Trial-level retrospective with signal attribution** (D64).
    Hospitality forecasting platforms don't have this. It's the
    "never satisfied" doctrine in code.
  · **Multi-tenant isolation** (D27) — tenant_id on every read/write,
    contract-tested.
  · **Money type + GL guardians** (B1, B2). CPA-grade arithmetic.
    Decimal.js, banker's rounding, exact-equality invariants.

### Operational maturity

  · **Idempotent + resumable migration runner**. Crash-mid-migration
    isn't a corruption event.
  · **Upgrade safety infrastructure** (just shipped — `/api/upgrade/*`):
    version stamp, health probe, changelog, snapshot manifests,
    feature-flag visibility.
  · **Outlet capture active-learning loop with bounded weight nudges**
    + regime-change escalation. Self-improving forecasts that don't
    silently degrade.
  · **Doctrine of transparent failures** — every endpoint that's
    missing data returns `{"available": false, "reason": "..."}`
    rather than synthesizing a value.
  · **Lifecycle engine + 8 hospitality templates** — the operating
    rituals (close, renovation, opening, F&B rollout, SOC 2,
    CapEx, BEO, marketing) are now systematic, auditable, and
    editable per property.

### Security and privacy posture

  · **Privacy Tenets** (the constitution). Enforced in code via
    static analysis on import paths.
  · **Sensitive-flag decay engine** (Tenet 7). Time-bound storage of
    psychologically sensitive data.
  · **Forbidden-path partition** (Tenet 8). Compile-time analysis
    that prevents prohibited code paths from existing in the
    deployed binary.
  · **Patent draft** with trade-secret inventory (separating
    disclosable architecture from protectable parameters).

### Engineering hygiene

  · **Doctrine-aligned commit messages** (every D-series commit
    explains the *why*, not just the *what*).
  · **Architecture Decision Records** (ADR-0001 MongoDB choice,
    ADR-0003 D17 fuse-box, ADR-0005 doctrine-as-contract).
  · **Service-recovery runbook**, station check list, no-placeholder
    policy — the brigade discipline is itself a moat for an
    institutional buyer auditing engineering culture.

A 409A or technical due diligence reviewer who walks through the
codebase finds **rare-for-this-stage architectural commitments** that
typically only surface in Series-B+ companies. That's worth real
basis points on the multiple.

---

## Part 2 — What's missing that I can build now (no external dependencies)

These are the items that move "good codebase" to "best-in-class
codebase." Each one is buildable in this session without waiting for
external services or vendor onboarding. Listed in priority order.

### Tier 1 — High leverage, small build

| # | Item | What it gives | Effort |
|---|---|---|---|
| **L.1** | **Canonical `/api/health` endpoint** that aggregates every subsystem (DB, event bus, scheduler, upgrade-safety, outlet capture) with red/amber/green per subsystem | Load balancer can use it for health-gated rollouts; ops can see at a glance what's wrong | Small |
| **L.2** | **Structured logging** with request IDs, trace IDs, and a logging middleware on every endpoint | Every line in production logs is correlatable; debugging session goes from hours to minutes | Small |
| **L.3** | **Rate limiter** on public endpoints (per-tenant + per-IP) | Survives a curl loop; demonstrably brought-up cost of abuse | Medium |
| **L.4** | **OpenAPI / Swagger docs** auto-generated from FastAPI + a hosted `/docs` UI gate-able to admins | Customers can integrate; AppFolio-grade API documentation; reviewers see contract precision | Small (FastAPI does most of it) |
| **L.5** | **Audit log of admin actions** (separate from the event bus — focused on who-logged-in, who-accessed-what, who-changed-config) with append-only persistence | SOC 2 access-control evidence; forensic answer to "who changed the budget on May 9?" | Medium |
| **L.6** | **Backup verification runner** — a scheduled job that takes a backup, restores to a scratch DB, runs row-count + sum-of-money checksums, persists the result to `backup_drills` | Demonstrates "backup actually works" — the failure mode of every well-meaning team | Medium |
| **L.7** | **Performance profiler / slow-query log** — tag every endpoint and DB query with timing; persist anomalous outliers; surface a `/admin/perf` view | Identifies the 5% of endpoints generating 80% of latency before customers notice | Medium |
| **L.8** | **PII tag scanner + reflection at query time** — every field declared with a `pii_class` annotation; query layer enforces masking based on caller authorization | Privacy Tenet 4 enforcement made structural; SOC 2 + GDPR diligence answer | Medium |

### Tier 2 — Medium leverage, medium build

| # | Item | What it gives | Effort |
|---|---|---|---|
| **L.9** | **Read-replica routing** — reads go to replicas, writes go to primary | Survives 10x load; standard SaaS pattern; reviewers expect it | Medium |
| **L.10** | **Idempotency keys** on POST endpoints (already partially done for events; expand to all mutating endpoints) | Survives network retries without double-charging; standard payments-grade pattern | Small |
| **L.11** | **Cursor-based pagination** on every list endpoint (currently mostly limit-based) | Scales to 100k+ rows; customer dashboards stay fast | Medium |
| **L.12** | **Webhook delivery system with retry + dead-letter** — for outbound notifications to customer integrations | Standard SaaS table-stakes; once a customer integrates with us, our reliability is theirs | Medium |
| **L.13** | **Per-endpoint SLO definitions** + a `/admin/slo` dashboard | Makes operational excellence visible; a senior eng team's expected output | Small |
| **L.14** | **Database connection pool monitoring** + connection leak detector | Long-running process hygiene; one of the silent killers in production | Small |
| **L.15** | **Disaster recovery runbook** — written, tested, with named ownership for each step | The piece that proves "we wouldn't lose the company in a regional outage" | Documentation |
| **L.16** | **`/api/admin/audit` console** showing every admin action across the system | SOC 2 evidence + customer trust + insider-threat protection | Medium |

### Tier 3 — High leverage, but requires a frontend or external service

| # | Item | What it requires | Where I help |
|---|---|---|---|
| **L.17** | Code coverage report | `pytest --cov` + Codecov or Coveralls account | I can wire the report; you provision the service |
| **L.18** | Mutation testing on financial modules (Stryker on Money + GL) | Stryker dependency in package.json; CI integration | I can write the config + targets |
| **L.19** | Static-analysis ratchet | Semgrep + ratchet in CI (don't allow new violations even if old ones remain) | I can write the rules; CI runs them |
| **L.20** | Frontend-side performance budget (Lighthouse CI, bundle analyzer) | A frontend build pipeline | I can specify the budgets; Emergent's frontend ticket implements |
| **L.21** | Customer-success telemetry (activation events, retention cohorts, NPS prompts) | A telemetry sink (Snowflake, Mixpanel, Amplitude) + frontend integration | I can write the event-bus tap; you provision the sink |

---

## Part 3 — What requires people / services / time (not codeable)

These are the items where money + paper + people change hands.
**Most of them move 409A valuation more than any code change because
they prove institutional readiness.**

| # | Item | Cost | Time | Why it matters |
|---|---|---|---|---|
| **P.1** | **IP assignment agreements signed by every contributor (employee + contractor)** | $0–$2k legal | 2 weeks | **THIS IS THE #1 PRE-VALUATION ITEM.** Without it, no 409A reviewer trusts the IP belongs to the company. Without it, the patent draft is unfilable. **Do this week 1.** |
| **P.2** | **Patent provisional filed** (the draft already exists) | $300 USPTO + $3-5k attorney | 30 days | Locks priority date; signals to reviewer that the moat is real |
| **P.3** | **Trademark applications** (every Echo* mark + LUCCCA + the black-hat logo) | $350-1500/mark + $1-2k attorney for the bundle | 60-90 days | Brand defensibility |
| **P.4** | **SOC 2 Type I evidence collection started** | $30-80k (Vanta / Drata / Secureframe + auditor) | 6-12 months | Required for any luxury hotel chain procurement |
| **P.5** | **Independent pen-test** by a Tier 2 firm (Bishop Fox, NCC, Trail of Bits, NetSPI) | $25-60k | 2-week engagement | Required pre-payment-processing, required for SOC 2 |
| **P.6** | **Formal 409A valuation** | $5-15k | 30 days | Required for option grants; must be by an independent firm |
| **P.7** | **Privacy policy + DPIA + subprocessor list published** | $2-5k legal | 2 weeks | Customer-trust artifact; required for GDPR/CCPA |
| **P.8** | **Cyber liability insurance + tech E&O insurance** | $5-15k/year | 2 weeks | Standard SaaS table stakes; required by enterprise customers |
| **P.9** | **Cap table cleanup + option-pool documented** | $2-5k legal | 2 weeks | 409A reviewer reads this first |
| **P.10** | **D&O insurance** (when you take outside money) | $3-10k/year | 2 weeks | Standard board-formation prerequisite |

**The institutional readiness items (P.1–P.10) typically move
valuation more than the code items in Tier 1–3.** A reviewer scanning
P.1–P.10 done = "this team is ready for outside money." All ten
items missing = "early-stage; needs guidance before we can value."

---

## Part 4 — Honest priority recommendation

If the goal is "ready for a 409A or a strategic-buyer conversation":

### This week (homework on the human side, ~$0–5k legal)

  1. **P.1 IP assignment agreements.** The single highest-ROI move
     in this entire document.
  2. **P.7 Privacy policy + subprocessor list.** Cheap; required.
  3. **P.9 Cap table cleanup.** Cheap; required.

### Next 30 days (~$10–25k)

  4. **P.2 Patent provisional filed.**
  5. **P.6 Formal 409A valuation.**
  6. **P.3 Trademark applications.**
  7. **L.1, L.2, L.4, L.10** — canonical health, structured logging,
     OpenAPI docs, idempotency keys. (I can ship these this week if
     you say go.)

### Next 90 days (~$50–100k, dependent on outside services)

  8. **P.4 Start SOC 2 evidence collection** (6-12 month process).
  9. **P.5 Independent pen-test scheduled before first revenue.**
  10. **L.5–L.8** — admin audit log, backup verification, performance
      profiler, PII tag scanner.

### Within 6 months (gets you to "Series A-quality" engineering)

  11. **L.9–L.16** — read replicas, webhook delivery, SLO dashboards,
      DR runbook tested.
  12. **L.17–L.21** — code coverage, mutation testing, telemetry
      pipeline.

---

## Part 5 — What I can ship right now

If you say "do the next batch," I can build all of these in the next
turn or two with no external dependencies:

  · **L.1** Canonical `/api/health` consolidator
  · **L.2** Structured logging middleware + request ID
  · **L.4** OpenAPI doc surface (mostly already there via FastAPI;
    add the gating + a hosted `/docs` page)
  · **L.5** Admin action audit log
  · **L.10** Idempotency keys on all POSTs
  · **L.13** Per-endpoint SLO definitions + dashboard
  · **L.14** Connection pool monitoring

That's roughly 6 hours of focused work for me; substantial
operational uplift; zero external dependencies. **Just say "build the
launch-readiness batch" and it ships.**

---

## Closing — the honest read

**You're closer to investor-grade than most pre-seed companies.** The
architecture moat (doctrine-as-code + patent + trial-level
retrospective + outlet-capture active learning) is uncommon at this
stage and gets noticed.

**The gap is the institutional paper trail** (P.1–P.10). Most of it
is cheap and fast. The ones that aren't cheap and fast (SOC 2,
pen-test, formal 409A) all benefit from being started early — they
have long lead times and "we started in February" is a different
diligence answer than "we'll start once we have the money."

**The code-side gap is observability** (L.1, L.2, L.5, L.7) — not
because it's missing-features but because production debugging gets
exponentially harder without it. Once you have one paying customer
and one outage at 3am, you'll wish you'd built it in week 1.

The codebase is genuinely strong. The next moves are mostly
*operational* and *institutional*, not *engineering*.
