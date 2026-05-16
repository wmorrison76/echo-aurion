# Remaining-Work Playbook — what YOU need to do

> Companion to `CFO_TOOLKIT_STATUS_AUDIT.md`.
>
> The original audit said 8 items were "deferred." This playbook
> separates them into three buckets so you know exactly what action
> moves each one forward — and which ones I can build *for* you the
> moment you provide one specific input.

---

## Bucket 1 — I can build these immediately if you give me one thing

These three are not actually blocked by external integrations. They
were deferred only because they need **one piece of input from you
that is not in the codebase**. Provide it, I build it.

### Item 1.A — Replace `forecast_21day.py` synthesis (A.2)

**What it is today:**
The 21-day forecast endpoint at `/api/forecast-21/forecast` still
contains the old hardcoded patterns + `random.uniform()` calls. The
new outlet_capture system already produces real forecasts; the
21-day endpoint just hasn't been re-pointed to read from it.

**What I need from you:** **Nothing.** Just tell me to do it.

**What I'd do:** Rewrite `forecast_21day.py` to:
  · Call `outlet_capture_forecasts` for each property × date in the
    next 21 days
  · Aggregate per-outlet bands into a property-level rollup
  · Remove every `random.uniform()` call
  · Keep the existing endpoint shape so frontend doesn't break

**Effort:** ~1 commit, ~200 lines net delete + rewrite. Honestly the
biggest risk is the existing endpoint having quirks the frontend
depends on. Worth doing carefully.

**Just say:** *"Do A.2"* and it ships next turn.

---

### Item 1.B — Inter-company eliminations (B.13)

**What I need from you:** the **eliminations rules** for your
multi-property entity structure. Specifically:
  · A list of properties under common ownership (`Pier 66`,
    `Naples`, `Aspen`, etc.)
  · For each pair where one bills the other, the GL accounts to
    eliminate (e.g., `Naples` charges `Pier 66` for shared marketing;
    that intercompany rev/expense has to net to zero on consolidation)
  · Whether you want elimination at the trial balance or at the
    journal entry level

**What I'd build once you provide that:**
  · `backend/routes/intercompany_eliminations.py`
  · A config endpoint where you POST the eliminations rules
  · A consolidation endpoint that takes a list of property_ids +
    a period and returns a consolidated trial balance with the
    eliminations applied
  · An audit row per eliminated entry (doctrine §3.1 — append-only
    so the auditor can see exactly what was eliminated)

**Effort:** 1 commit, ~400 lines, ~3 hours of building.

**Format I need:**
```yaml
# Example — replace with your actual structure
entities:
  - id: aurion_holdings_inc
    consolidates: [pier_sixty_six, naples, aspen]

eliminations:
  - description: "Aurion Holdings shared marketing — billed by Naples"
    selling_property: naples
    buying_property: pier_sixty_six
    gl_account_seller: 4900_intercompany_revenue
    gl_account_buyer:  6900_intercompany_expense
```

---

### Item 1.C — Period-close auto-close engine (B.18)

**What I need from you:** your **current period-close runbook**.
The 14 manual steps you (or the property accountant) walk through
today. They typically include things like:
  1. Freeze JE posting at end of day on the 1st
  2. Run depreciation entries
  3. Post recurring JEs (insurance, rent, RE tax accruals)
  4. Reconcile bank accounts
  5. Reconcile credit card merchant accounts
  6. Generate the variance memo
  7. Email the audit packet to auditors
  8. Mark period closed

**What I'd build:**
  · `backend/routes/period_close.py`
  · A POST `/period-close/run` endpoint that orchestrates the steps
    in order, captures the result of each, and rolls back if any
    critical step fails (idempotent)
  · A `period_close_runs` collection that records every close
    attempt with timestamps per step (audit trail)
  · Notification on completion (or on failure with which step
    failed and why)

**Effort:** 1 commit, ~350 lines, ~3 hours. Most of the work is
wiring the existing sub-piece endpoints together; the orchestration
itself is straightforward.

**Format I need:** just a numbered list of the steps in your current
close. I'll map each to the existing endpoint that does it and stub
in any missing ones (with a "human approves before this runs" gate).

---

## Bucket 2 — These need external services or credentials

These are blocked by something outside the codebase. Each requires
specific actions on your side or your property's side. I cannot
unblock these — but I can build the integration the moment the
credentials/data flow is provisioned.

### Item 2.A — POS check-close webhooks (A.1) — **HIGHEST PRIORITY**

**Why this matters most:** until POS is wired, every revenue number
in the system is approximated. Wire this and everything else
sharpens.

**Property-side actions per POS system:**

#### If the property uses **Toast**:
  1. Log into Toast Web → **Integrations** → **Toast Partner Connect**
  2. Search for / register a custom integration (you'll need a Toast
     restaurant admin login)
  3. In the integration setup, add the webhook URL:
     `https://[your-deployment-domain]/api/pos-connector/webhook/toast`
  4. Subscribe to event types: `OrderCreated`, `OrderModified`,
     `OrderClosed`
  5. Copy the **shared secret** Toast gives you and POST it to your
     own admin endpoint:
     `POST /api/pos-connector/connections/{id}/credentials` with
     `{"shared_secret": "..."}`
  6. Toast will fire a test webhook automatically — you'll see it
     land in `pos_check_closed` events on your end

**Time:** ~2 hours of property IT work + 30 minutes of testing.

#### If the property uses **Aloha (NCR)**:
NCR uses a different model — you (or NCR) install a small connector
on the property's back-of-house server that polls Aloha's local DB
and pushes to your webhook. The connector is built; configuration
needed:
  1. Property IT runs the Aloha connector installer (you provide it)
  2. Configure it with the property's webhook URL
  3. Set polling interval (default 30 seconds)

**Time:** ~half a day of NCR/IT engagement per property.

#### If the property uses **Micros (Oracle Simphony)**:
Oracle has an open API but auth is OAuth 2.0 and requires:
  1. A Simphony admin to create an OAuth app for your integration
  2. They give you `client_id` + `client_secret`
  3. POST to `/api/pos-connector/connections/{id}/credentials`
  4. The system polls the Simphony API every 30 seconds

**Time:** ~half a day per property.

**Cost:** $0 for Toast/Square/Clover (their APIs are free). Aloha
may charge a connector fee (~$50-200/month/property). Micros
typically free if you have an existing license.

---

### Item 2.B — Reservations / OTA / direct-booking (A.3)

**What this gives you:** the 21-day forecast actually knows about
on-the-books bookings instead of guessing from current occupancy.

**The path depends on the property's PMS (Property Management System):**

#### Modern PMS (Opera Cloud / Mews / Cloudbeds / Stayntouch):
  1. Property gives you (or me) **API credentials** for the PMS
  2. Most modern PMSs have a "reservations webhook" — configure it
     to POST to `/api/reservations/webhook/{pms_name}`
  3. The PMS will start firing reservation create/modify/cancel
     events immediately

**Time:** half-day per property.

#### Legacy PMS (Opera on-prem, RoomMaster, etc.):
Two options:
  · **Channel manager middleware** — SiteMinder, RateGain, eRevMax
    — they sit between your PMS and the OTAs, and can ALSO push
    reservations to a webhook. ~$200-500/month/property.
  · **Direct PMS read** — if the PMS exposes a SQL view, you
    schedule a nightly diff push to your webhook.

#### Group blocks (sales/catering):
  · If you use Tripleseat / Delphi for group business, both have
    REST APIs. Same pattern: get API key, configure webhook.

**Cost:** $0 if PMS supports it natively. $200-800/month/property
for channel-manager middleware on legacy PMSs.

---

### Item 2.C — Payroll blended hourly wages (A.5)

**What this gives you:** the labor productivity drilldown (B.8) and
the 21-day forecast use **real** wages per outlet instead of
hardcoded $18.50/hr defaults.

**Path depends on payroll system:**

#### ADP / Gusto / Paychex / Rippling:
All have REST APIs. Steps:
  1. In the payroll admin, create an API user (or OAuth integration)
  2. Provide the API key/secret to the system
  3. We pull a weekly employee snapshot:
     `{employee_id, outlet, role, blended_hourly_rate_cents}`
  4. Stored in `labor_blended_rates` collection, refreshed weekly

**Time:** ~half day to integrate per payroll system. ADP has the
most mature API; Gusto has the cleanest.

#### Roll-your-own / Excel-based payroll:
  1. Export a CSV from your accountant once a week with:
     `employee_id, outlet, role, gross_wage_per_hour, benefits_per_hour, taxes_per_hour`
  2. POST to `/api/payroll/import-rates`

**Cost:** typically $0 — your existing payroll system has the API
included in your subscription.

---

### Item 2.D — AI-augmented features (B.20-22)

**What's blocked:**
  · B.20 Sous-Chef-CFO conversational Q&A
  · B.21 Auto-drafted board / lender pack
  · B.22 Anomaly explanation chain

**What you need to do:**

  1. **Get an Anthropic API key.**
     - Go to console.anthropic.com → sign up / log in
     - **Settings → API Keys → Create Key**
     - Copy the key (it starts with `sk-ant-...`)
     - **Important:** treat this like a credit card. Don't commit it
       to git, don't paste it in Slack. Store in your secrets manager.

  2. **Set spending limits** in the Anthropic console
     - Suggested: $50/month limit while testing, raise to $200-500/
       month once features are in regular use
     - Each Sous-Chef-CFO question costs $0.05-0.30; a board pack
       costs $0.50-2.00 to draft

  3. **Provision the key on your server** as an environment variable:
     `ANTHROPIC_API_KEY=sk-ant-...`
     Most hosting providers have a "secrets" or "env vars" UI. If
     you're on Railway / Render / Fly.io, it's a few clicks. AWS
     Secrets Manager / GCP Secret Manager / Azure Key Vault all
     work too.

  4. **Tell me the key is provisioned** (do NOT send the actual
     key — just confirm it's set). I build B.20-22 the next turn.

**Cost:** $20-200/month depending on how much your team uses the
conversational features. Pay-as-you-go.

**Time on your side:** 30 minutes total (sign up, set key, set
budget). My side: ~1 day to build all three features.

---

## Bucket 3 — Hire someone for this (not technical work)

### Item 3.A — Tax provision calculator (B.14)

**Why I can't just build this:** tax provision math depends on **your
specific entity structure** — federal corporate rate, state rates per
property, property tax assessments, sales tax registrations, NOL
balances, deferred tax computations, transfer pricing if multi-state.
A wrong tax provision is a regulatory finding.

**What you need:**
  1. **Your CPA firm** writes the provision rules in plain English:
     "Federal 21%, FL state 5.5% on Pier 66, AZ state 4.9% on
     Sedona, etc. NOL carryforwards: $X. Section 263A capitalization:
     yes/no."
  2. They review the entity diagram and identify which provisions
     apply per property.

**Then I build:**
  · `backend/routes/tax_provision.py`
  · A config-driven engine that reads the rules and computes the
    quarterly + annual provision per property
  · Surfaces the working papers so the CPA can audit my math
  · Generates the journal entries for the provision posting

**Cost:** **CPA firm** — ~$3-8k for the initial provision-rules
setup. Then me: ~2 days to build the engine.

**Recommendation:** if you don't already have a hospitality-
specialized CPA firm, the standard candidates are PKF O'Connor
Davies, Withum, or Citrin Cooperman. For mid-size: Squire & Company,
HBK, Cherry Bekaert.

---

## Quick-action summary — what to do this week

In priority order:

| # | Action | Who | Time | Cost |
|---|---|---|---:|---:|
| 1 | Tell me to do **A.2** (refactor forecast_21day) | You | 5 min | $0 |
| 2 | Get an Anthropic API key, set on server, tell me | You | 30 min | $20-200/mo |
| 3 | Send me your eliminations rules for **B.13** | You + accountant | 1 hour | $0 |
| 4 | Send me your period-close runbook for **B.18** | You | 30 min | $0 |
| 5 | Enable Toast webhook on Pier 66 (**A.1**) | Property IT | 2 hours | $0 |
| 6 | Get Opera Cloud API credentials (**A.3**) | Property IT | half day | $0 |
| 7 | Get ADP/Gusto API key (**A.5**) | Payroll admin | half day | $0 |
| 8 | Engage CPA firm for tax provision rules (**B.14**) | You | 2-4 weeks | $3-8k |

If you do items 1-4 this week (~2 hours of your time, $0-200/mo
ongoing), I can ship 6 of the 8 deferred items in the next 3 days.

Items 5-7 are property-IT work and unlock the live data flow that
makes everything sharper. Item 8 is a real engagement, not a
quick fix.

---

## What it looks like fully built

Once all 8 are done you have:
  · A 21-day forecast that's truly live, updates within 60 seconds
    of any signal change, and never claims precision it doesn't have
  · A morning Director ritual: pace report, exception digest,
    forecast accuracy gauge, and an AI variance commentary, all
    on one screen
  · A close-the-month button that runs in 30 seconds and produces
    an audit packet
  · Conversational Q&A with a CFO-grade AI grounded in your real
    data
  · Inter-company consolidation in real time
  · Tax provision auto-computed each quarter

The substrate for all of that is already in the repo as of this
week. The remaining work is mostly turning on external pipes and
giving me your specific business rules.
