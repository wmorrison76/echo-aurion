# Customer Pitch Deck — Echo / LUCCCA

> 10 slides for a 30-minute customer meeting. Markdown source;
> designer converts to a Keynote / branded version. The customer
> version is **shorter on vision, longer on specific value**, and
> always opens with the customer's pain — not our brand.

---

## Slide 1 — Their reality (open with their pain)

**The luxury hospitality operator's Monday morning:**

  · 9 vendor dashboards open
  · 3 of them disagree about last week's revenue
  · 2 of them require a manual export to reconcile
  · The forecast is a guess; the labor schedule is a guess; the
    F&B cost is yesterday's number
  · The CFO walks into the EC meeting with numbers that are 96%
    accurate and nobody knows which 4% is wrong

> *"You're paying $140-180k per year for a stack that creates
> the problem it's supposed to solve."*

**Speaker note:** Open with their reality, not our brand. Don't
say "Echo" yet. Get them nodding before you introduce yourself.

---

## Slide 2 — What if Monday morning looked like this instead

**One platform. One source of truth. One screen.**

  · Yesterday's actuals close at 4am UTC; pace report ready by 7am
  · The morning digest surfaces only the exceptions — what's
    overdue, what's outside its band, what's been flagged
  · The forecast for the next 21 days updates within 60 seconds
    of any reservation, manager note, or override
  · The trial-level retrospective walks back yesterday's miss
    and says: "12 trials in the Monte Carlo got it right; here's
    what they sampled differently"

**Speaker note:** Don't say "AI." Show the operational outcome.

---

## Slide 3 — Echo / LUCCCA — what it is

**One operating system. Six modules. One discipline.**

  · **EchoAurum** — financial close, P&L, forecast, budget,
    audit packet
  · **Echo Capture** — per-outlet capture-ratio tracking with
    Monte Carlo forecasts
  · **EchoCronos** — schedule, payroll, labor productivity
  · **EchoConcierge** — guest journey, IRD, allergen alerts,
    service recovery
  · **EchoLayout** + **EchoEventStudio** — banquet event
    operations, BEO production cycles
  · **Echo AI³** — the doctrine layer that ties it all together

**The discipline:** the 8 Privacy Tenets, enforced in code.
Aurion learns you to serve you better. It forgets when you ask.
It never sells you to anyone.

**Speaker note:** Show the architecture diagram briefly. The
discipline matters as much as the modules.

---

## Slide 4 — How it pays for itself

For a typical 7-outlet Independent property:

| Today (fragmented) | Echo / LUCCCA | Annual saving |
|---|---|---|
| POS + PMS + 6 SaaS | $145k/yr | $135k/yr | **$10k saved on stack** |
| Manual reconciliation | 8-12 hr/week | <2 hr/week | **~$26k labor saved** |
| F&B cost variance | unmonitored | recipe-level alert | **6-12% margin improvement = $80-160k/yr** |
| Labor productivity | gut-feel | daypart × position drilldown | **5-10% labor saved = $40-80k/yr** |
| Forecast accuracy | ±15-20% MAPE | ±5-8% MAPE within 90 days | **fewer overstaffed shifts** |
| **Total Year-1 net savings** | | | **$150-250k+** |

**Echo costs $135k. The platform pays for itself by month 4-6.**

**Speaker note:** The CFO is the easiest sell once they see the
math. Walk through one line at a time.

---

## Slide 5 — The substrate that makes it work

What's underneath every screen:

  · **Append-only event log** — every state change is recorded
    forever; you can replay any moment in your business's history
  · **Active-learning forecasting** — bounded weight nudges based
    on yesterday's accuracy; regime-change escalation when the
    model is degrading
  · **Trial-level retrospective** — the model is never permitted
    to be "occasionally correct"; it walks back inside the Monte
    Carlo every morning to find what the winning trials knew
  · **Multi-tenant isolation** — every read/write tagged with
    your property; never crosses tenant boundaries
  · **Privacy doctrine** — the 8 Tenets enforced via compile-time
    forbidden-path partition + sensitive-flag decay engine

**Speaker note:** Most customers don't care about architecture
until you show them the doctrine — then they realize it's
the differentiator.

---

## Slide 6 — Specific module proof

**The CFO toolkit (already shipped):**

  · **Pace Report** — "60% through May, 71% of revenue target. On
    pace to finish at $2.4M ± $180k."
  · **Recipe Variance** — "Short rib plated cost up 12% MoM
    because beef went up; menu price unchanged; margin compressed
    from 68% to 56%."
  · **Vendor Pareto** — "Top 6 vendors are 80% of spend; flagged
    Sysco price hike +8% on heavy cream."
  · **Labor Productivity** — "Friday dinner labor is 38% of
    revenue; industry red line is 35%; investigate."
  · **Tip Audit** — "Maria's tip share for week of May 6: $387.
    Hours-weighted by role pool. Verifiable forensic chain."

**The lifecycle engine (already shipped):**

  · 8 hospitality lifecycle templates including renovation,
    property opening (90-day playbook), F&B menu rollout, SOC 2
    evidence collection, BEO production cycle, CapEx project,
    marketing campaign — all editable per property

**Speaker note:** Show one or two of these live. The pace report
+ recipe variance + tip audit are the closers.

---

## Slide 7 — Implementation + onboarding

**Day 1-7:** White-glove onboarding. We assist with:
  · POS webhook activation
  · PMS API connection
  · Payroll integration
  · GL code mapping
  · Outlet registration + capacity setup
  · Initial budget configuration
  · User accounts + roles

**Day 8-30:** First-month review. We run weekly sessions to
calibrate forecasts + iron out any data discrepancies.

**Day 31-90:** Cold-start banner fades from outlet capture as
30+ days of actuals accumulate. By day 90, the active-learning
loop is producing forecasts at empirical-floor accuracy.

**Day 91+:** Standard operating mode. Quarterly business reviews
+ ad-hoc support.

**Speaker note:** Customers are skeptical of "AI gets better over
time." Show the timeline; explain the cold-start banner; show
the accuracy gauge that they can see drop themselves.

---

## Slide 8 — What you get on signing

**Day 1 deliverables:**

  · Dedicated Customer Success engineer for first 90 days
  · Implementation kickoff + integration mapping
  · Demo property pre-loaded for training
  · Access to the 18 CFO toolkit modules + Echo Capture +
    Lifecycle Engine
  · Privacy + Security packet (Privacy Policy + DPIA + SOC 2
    program timeline + Pen-Test report when available)
  · Quarterly business review cadence established
  · 24/5 support during onboarding (24/7 by Year 2)

**Pricing for your tier:**

  · Base fee: $[X]
  · 7 outlets × $9,000: $63,000
  · Add-ons (if any): $[Y]
  · **Total Year-1 ACV: $[Z]**
  · Implementation fee: $25,000 (one-time, can be amortized)

**Speaker note:** This slide is customizable per customer. Pre-
fill the math before the meeting.

---

## Slide 9 — What we're asking from you

**The customer's commitment:**

  · 24-month initial term (with month-13 termination right if
    things aren't working)
  · POS + PMS + payroll integration access during onboarding
  · One internal champion per major module (Finance lead for
    Aurum, F&B Director for Capture/Recipe, etc.)
  · Quarterly business review attendance
  · Reference call availability after 6 months of usage

**What's negotiable:**

  · Pricing tier + add-on selection
  · Implementation fee structure (lump sum vs amortized)
  · Custom integration work for property-specific systems
  · Multi-property volume discount if you have sister properties

**What's not negotiable:**

  · The Privacy Tenets (we won't dilute them for any customer)
  · The doctrine framework (you get the same architecture every
    other customer gets)
  · The append-only event log (your history is preserved
    permanently)

**Speaker note:** Be honest about what's not negotiable. Customers
respect a vendor with a backbone.

---

## Slide 10 — Closing — let's set up onboarding

**Next steps:**

  1. Sign the LOI (non-binding, captures intent)
  2. Schedule a technical-integration discovery call (POS, PMS,
     payroll mapping)
  3. Schedule the kickoff for [proposed date]

**Or — if you want to validate first:**

  1. 14-day sandbox access to the demo property
  2. Side-by-side analysis of one of YOUR weeks' data against
     the demo
  3. Reconvene in 14 days for the decision

> *"Aurion learns you to serve you better. It forgets when you
> ask. It never sells you to anyone. The work is the work."*

[contact info]

**Speaker note:** Always close with two paths: the "let's go now"
and the "let me try first." Some customers buy on the first call;
most need 14 days. Either is fine.

---

# Appendix slides (used in Q&A)

## A1 — Security + privacy details

  · Multi-tenant isolation
  · Encryption at rest + in transit
  · The 8 Privacy Tenets verbatim
  · SOC 2 Type I program status (in progress, expected by [date])
  · Pen-test schedule + reporting cadence
  · GDPR/CCPA compliance

## A2 — Integration list

  · POS systems supported: Toast, Aloha, Micros, Square, Clover
  · PMS systems supported: Opera Cloud, Mews, Cloudbeds (others
    via D17 fuse-box pattern, ~2-week integration time)
  · Payroll: ADP, Gusto, Paychex, Rippling
  · Banking: Plaid, Stripe Treasury
  · Calendar: Google, Outlook, Apple

## A3 — Pricing comparables

  · Side-by-side with Toast Hospitality, Avero, Hotelligence360,
    Tripleseat, Knowcross
  · Why our price is higher than any one competitor but lower
    than the sum

## A4 — Customer success plan

  · 90-day onboarding milestones
  · Quarterly business review template
  · Escalation paths (CS engineer → CS lead → me)
  · Annual product roadmap input session

## A5 — Reference customers

[Update as the customer list grows. For first sales calls, this
slide is "Pier Sixty-Six is our design partner; we're co-developing
the platform with them; they're available for a reference call."]

## A6 — The doctrine (for the CFO/CTO who asks)

  · The 8 Privacy Tenets
  · The brigade methodology (NO_PLACEHOLDER_POLICY,
    SERVICE_RECOVERY, etc.)
  · The patent thesis (Doctrine-as-Code Enforcement)
  · The trial-level retrospective doctrine

This is the slide that turns a skeptical CTO into a champion.
Save it for them; they'll appreciate the depth.
