# Where Documentation Lives

> Last updated: 2026-05-07 · D63
>
> Honest answer to "where should the docs live and what stays in
> Aurion Holdings, Inc.?"

---

## The four homes

Every piece of documentation lives in exactly ONE of four places.
Putting the same doc in two places guarantees they drift apart.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  1. THIS REPO (public, version-controlled, engineering source)   │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  • API documentation (auto-generated from FastAPI / OpenAPI)     │
│  • Architectural Decision Records (ADRs)                         │
│  • Module READMEs (one per module)                               │
│  • Ops runbooks (incident response, deploy, hosting)             │
│  • Test results + coverage reports                               │
│  • CHANGELOG.md (auto-generated)                                 │
│  • Engineering doctrine (THE_LINE, NO_PLACEHOLDER_POLICY,        │
│    PRIVACY_TENETS, doctrine ADRs)                                │
│                                                                  │
│  Lives at: docs/ + each module's README.md                       │
│  Audience: every engineer / AI assistant / tech reviewer         │
│  Confidentiality: public-tier (assume git is leakable)           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  2. IN-APP DOCS (rendered to operators inside the product)       │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  • Module help pages ("How does Allergen Cascade work?")         │
│  • Quick-start tours (D63 help agent)                            │
│  • Onboarding wizard scripts                                     │
│  • What's New release notes (CHANGELOG digest, not raw)          │
│                                                                  │
│  Lives at: app routes /docs/{module}, /help/{topic}              │
│  Source-of-truth: same Markdown files in repo, rendered live     │
│  Audience: end users (chefs, managers, GMs)                      │
│  Confidentiality: customer-facing (no doctrine internals)        │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  3. AURION HOLDINGS, INC. (your company governance — PRIVATE)    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  • Operating agreement, IP assignment, employee NDAs             │
│  • Board materials, financial models, runway forecasts           │
│  • Customer contracts, MSAs, Order Forms                         │
│  • Cap table, equity grants, 409A valuations                     │
│  • Patent filings (when you file them — file the doctrine        │
│    framework patent in the next 90 days per D62 advisory)        │
│  • M&A correspondence, NDAs with potential acquirers             │
│  • HR records (offer letters, performance reviews,               │
│    PIP records, terminations)                                    │
│  • Insurance policies (E&O, D&O, cyber, GL)                      │
│  • Trade secrets (the doctrine internal mechanisms — what's      │
│    NOT in the public ADRs)                                       │
│  • Customer data flows / DPIA / CCPA registers                   │
│                                                                  │
│  Lives at: a SEPARATE private system (NOT in this repo)          │
│  Recommendation: Notion + Google Workspace for soft docs;        │
│    Iron Mountain or law firm vault for executed agreements;      │
│    LegalSifter / Ironclad for contract registry at scale         │
│  Audience: officers + board + counsel                            │
│  Confidentiality: trade-secret tier (legal liability if leaked)  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  4. PUBLIC MARKETING (your customer-acquisition surface)         │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  • Marketing site (aurionholdings.com)                           │
│  • Public docs site (docs.aurionholdings.com)                    │
│  • Help center for prospects (not yet customers)                 │
│  • Blog posts, whitepapers, case studies                         │
│  • Pricing pages                                                 │
│                                                                  │
│  Lives at: separate static site (Vercel-hosted, GitHub-backed)   │
│  Audience: prospects, journalists, analysts                      │
│  Confidentiality: deliberately public                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## The decision rubric — "where does THIS doc go?"

When you write something new, ask:

**Q1: Does it describe HOW the code works?**
   YES → Repo (`docs/` or module README)
   NO → continue

**Q2: Is it customer-facing operational guidance?**
   YES → In-app docs (sourced from same MD in repo, rendered live)
   NO → continue

**Q3: Could it expose company secrets, IP strategy, or financial info?**
   YES → Aurion Holdings governance (private; never in repo, never in
   chat transcripts, never in customer-visible docs)
   NO → continue

**Q4: Is it part of how you sell or position the product?**
   YES → Public marketing site
   NO → reconsider whether it needs to exist at all

---

## Specific recommendations for Aurion Holdings, Inc.

### Set up these governance systems before you sign your first customer contract

| Need | Recommended tool | Cost / month |
|---|---|---|
| Soft docs (board memos, financial models, strategy) | Notion Business or Google Workspace | $25–50 |
| Contract registry (MSAs, customer agreements) | Ironclad or PandaDoc | $250+ when revenue justifies |
| HR records / PII | BambooHR or Rippling | $8–15 per employee |
| Cap table | Carta | Free for early stage |
| Patent filings | a real IP law firm (Wilson Sonsini, Cooley, Fenwick) | $5K–25K per filing |
| Customer data privacy register (CCPA / GDPR) | OneTrust / Drata | $300+ at scale |
| Trade-secret tier docs | Sealed in escrow with law firm | minimal until you have material secrets |

### What goes in the company-private repo (NOT this one)

When Aurion Holdings has its own private repo for governance:

```
aurionholdings-governance/    (private, executive access only)
├── corporate/
│   ├── operating_agreement.pdf
│   ├── bylaws.pdf
│   ├── ip_assignment_template.pdf
│   ├── nda_template.pdf
│   └── 409a_valuations/
├── board/
│   ├── meeting_minutes/
│   ├── deck_template.pptx
│   └── runway_model.xlsx
├── customers/
│   ├── contract_registry.csv
│   ├── signed/
│   └── master_service_agreement.docx
├── ip/
│   ├── patent_filings/
│   ├── trade_secrets_register.md   ← what's NOT in public ADRs
│   └── trademark_filings/
├── financials/
│   ├── monthly_close/
│   ├── quarterly_board_pack/
│   └── annual_audit/
└── people/
    ├── offer_letters/
    ├── equity_grants/
    └── insurance/
```

The IP assignment template is critical — every contributor (you,
employees, contractors, AI assistants on contract) signs an
assignment that all code they produce belongs to Aurion Holdings.
Without it, a disgruntled contractor can claim joint ownership of
your codebase. Get a lawyer to draft this in week 1.

---

## The drift problem

Why this matters: documentation drift is one of the most common
failure modes in software companies.

The pattern:
  · Engineer writes detailed README.
  · Marketing copies sections to the public site.
  · Customer support copies sections to in-app help.
  · Engineer updates README.
  · Public site + in-app help silently drift.
  · Customer reads stale doc → opens support ticket → support
    looks at in-app doc, says "looks right to me" → customer
    files complaint → engineer learns the doc was stale.

The cure: **single source of truth in the repo, exported to all
other surfaces by automation, never manually copied.**

For LUCCCA / Echo specifically:

```
docs/modules/{module}.md   ← single source
        │
        ├── In-app /docs/{module}  (rendered live by the API)
        ├── Public docs site       (built from the same MD)
        └── Help agent             (parses sections as steps)
```

When you update `docs/modules/admin.md`, all three surfaces get
the new content on next deploy. No manual sync, no drift.

---

## What stays in the repo no matter what

Even in your most paranoid breach scenario, these MUST stay in the
repo because they govern how the code itself works:

  · ADRs (architectural decisions encode WHY the system is shaped
    this way; without them, the next engineer rebuilds wrong)
  · Module READMEs (engineers can't work without these)
  · Ops runbooks (incident response is tied to the code)
  · CLAUDE.md, AGENT_START_HERE.md, doctrine docs
    (next AI session needs these)
  · Test fixtures + smoke tests (test suite is part of the code)
  · CHANGELOG.md (auto-generated from commits)

If a buyer or acquirer wants to do due diligence, this repo is
what they look at. Make it organized + complete.

---

## What NEVER goes in the repo

Even with the best intentions to keep things organized:

  ❌ Customer-identifying data (real Pier 66 invoices, guest
     records, employee SSNs)
  ❌ Vendor API keys (Toast, Stripe, anyone)
  ❌ Database connection strings with credentials
  ❌ Internal pricing strategy
  ❌ Customer contract terms / discounts given
  ❌ Roadmap items you haven't announced
  ❌ Weaknesses in the product you haven't fixed yet
  ❌ Personal employee information (addresses, salaries,
     performance reviews)
  ❌ Trade secrets (the parts of the doctrine framework you
     haven't published)
  ❌ Pre-publication patent claims
  ❌ Anything subject to NDA with another company

Every one of these has bitten a company that put them in a repo
"just for now." They get indexed, they leak, they show up in
training data. Once they're in git history they're hard to
remove (rebases preserve them; only force-pushes erase them
and force-pushes are dangerous).

---

## Closing line

The repo is the engineering source of truth.
Aurion Holdings governance is the company source of truth.
The in-app docs are the customer source of truth.
The marketing site is the prospect source of truth.

Each has a different audience, a different confidentiality tier,
and a different update cadence. The single rule across all four:
**document like the next person reading it doesn't have you
available.** Because eventually they won't.
