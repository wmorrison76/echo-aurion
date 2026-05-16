# CFO / Director Toolkit — Verification + Recommendations

> Written 2026-05-09 in response to: *"Are there additional tools we
> can give CPAs & Directors to be better with financial planning and
> forecasting? And: improve the live 21-day, ensure that everything
> is actually wired to give a constant stream of data flow."*
>
> Two answers in one document:
>
>   **Part A** — verification of what the 21-day forecast and the
>   broader financial pipeline ACTUALLY consume vs. what's hardcoded
>   or randomized. This is the hard truth.
>
>   **Part B** — recommended additional tools, ranked by value × effort.

---

## PART A — What's wired and what isn't

### A.1 — The 21-day forecast endpoint (`/api/forecast-21/forecast`)

**Verdict:** Partly live, partly synthetic. The architecture is right;
the data sources are mostly stubbed.

**Genuinely live (read from MongoDB):**
  · Room counts and occupancy from `hk_rooms`
  · IRD revenue from `ird_orders`
  · Spa revenue from `spa_appointments`
  · Manager notes from `forecast_notes`
  · Manual overrides from `forecast_overrides`

**Hardcoded constants in `backend/routes/forecast_21day.py`:**
  · `DOW_PATTERNS` — every day-of-week multiplier is a magic number
    (Mon 0.72 occ factor, Sat 0.98, etc.). These should be **learned
    from 90 days of historical actuals**, not pinned.
  · `HOURLY_FLOW` — every hourly distribution is a magic number
    (restaurant 12% at 8am, 14% at noon, etc.). Should be learned per
    outlet from POS check-close timestamps.
  · `STAFFING_RATIOS` — covers per staff hour is a guess (8 for
    restaurant, 5 for IRD). Should be derived from actual schedules
    × actual covers per shift.
  · `LABOR_COST_PER_HOUR` — wages are pinned ($18.50 restaurant,
    $19.00 IRD, $22.00 spa). Should read from payroll's actual
    blended hourly cost per outlet.
  · `base_adr = 289.50` — base ADR is a magic number. Should be
    average rate from past 90 days of confirmed reservations.
  · `$52 F&B per occupied room`, `$18 spa`, `$35 banquet` — same
    issue. Magic numbers for revenue-per-occupied-room ratios.
  · `total_rooms = max(total_rooms, 65)` — a property with fewer
    than 65 rooms gets bumped to 65. That breaks small properties.

**Random noise injected throughout:**
  · Line 111 — `forecast_occ + random.uniform(-uncertainty, uncertainty)`
    — adds random jitter to the occupancy projection
  · Line 195 — `staff_scheduled = staff_needed + random.uniform(-0.5, 0.8)`
    — the "scheduled staff" is randomly perturbed from "needed staff."
    **There's no read of the actual schedule from the scheduler tables.**
  · Line 200 — `labor_budget = labor_cost * random.uniform(0.92, 1.08)`
    — the labor budget is the labor cost ± 8% random noise.
    **There's no read of the actual labor budget from `budget_engine`.**
  · Line 212 — `budget_occ = forecast_occ * random.uniform(0.95, 1.05)`
    — budget occupancy is randomized off forecast occupancy.

**Net effect:** the 21-day forecast endpoint produces plausible-looking
numbers but is **not consuming the actual learned forecast pipeline** —
which exists separately as the D16h Monte Carlo cron and is running but
disconnected from this endpoint.

### A.2 — The Monte Carlo forecast pipeline (D16h, scheduled daily 06:00 UTC)

**Real architecture, but the inputs aren't wired.** From the scheduler
comment in `backend/scheduler.py`:

> *"For a real deployment these signals come from POS / reservations
> / weather services — until those are wired we use sensible defaults
> so the forecast still runs and the audit loop has data to work on."*

**Honest acknowledgment that the Monte Carlo runs on defaults.** The
self-audit cron (D16h at 04:00 UTC) does compare yesterday's actuals
against yesterday's forecast and nudges signal weights — that loop IS
working — but the **forecast inputs are still defaults**, not POS / OTA
/ direct-bookings / weather feeds.

### A.3 — The budget engine (`backend/routes/budget_engine.py`)

**Driver-based architecture is correct.** The drivers (covers, avg_check,
occupancy, food_cost%, labor%, etc.) are the right primitives.

**But:** the default drivers in the `BudgetDrivers` class are universal
placeholders — `avg_daily_covers: int = 225`, `avg_check: float = 85.0`,
`occupancy_pct: float = 72.0`. Until each property OVERRIDES these with
its own numbers, every property's budget looks the same.

**Seasonality** is also pinned — `SEASONALITY = {1: 0.72, 2: 0.78, ...
12: 1.18}`. A property in a Caribbean market vs. a New England ski
resort vs. a desert convention hotel has wildly different seasonality.
Should be **learned per-property from 24 months of revenue history**.

### A.4 — What IS genuinely wired

In fairness, the following ARE flowing live:

  · `cogs_events` — D19/D22 wired EchoAurum to read live COGS events
    (the `D19: Aurium reads cogs_events` and `D22: Chronos food-cost
    tile reads cogs_events` commits)
  · `forecast_actuals` and `forecast_snapshots` — real persistence for
    forecast → actual reconciliation
  · `forecast_overrides` — Directors' manual adjustments persist
  · `forecast_notes` — manager notes persist and are read by the AI
    adjuster (lines 116-138 of `forecast_21day.py`)
  · D24 wired the audit timeline to live `/api/audit/*` — drops the
    TODO mock per the commit message
  · D26 wired the notification fabric to the inbox
  · D17 fuse-box pattern centralizes vendor adapters (Sysco, USFoods)
    so when those POS / vendor APIs ARE turned on, they have a single
    place to plug in

**The pipes exist.** What's missing is the upstream wiring to actual
external data sources (POS, OTA, weather, payroll wages).

---

## PART B — Recommended fixes to make the data flow truly live

These five fixes turn the 21-day forecast from "synthetic decoration"
to "real-time CPA-grade tool." Listed in priority order.

### Fix 1 — Wire POS check-close events to `cogs_events` and `revenue_actuals`

**Status today:** D17 has the fuse-box for Toast / Aloha / Micros /
Square / Clover but the actual webhooks aren't enabled on any property.

**What to do:**
  · For each property, configure the POS webhook to POST every check
    close to `/api/pos-connector/webhook/{pos_system}`
  · The webhook handler already exists; it parses, normalizes, and
    posts a `pos_check_closed` event to the event bus
  · Subscribers (`echoaurium_pnl_lines`, `forecast_actuals`,
    `cogs_events`) update in real time
  · End state: today's revenue at 11:47 AM is the sum of all checks
    closed since midnight, refreshed on every event

**Effort:** ~1 day per POS system per property (most of it is the
property's IT enabling the webhook from their end).

### Fix 2 — Replace `forecast_21day.py` hardcoded patterns with learned signals

**Status today:** the endpoint generates a fresh forecast on every
request from hardcoded multipliers + `random.uniform()`.

**What to do:**
  · Delete the inline forecast generation from `forecast_21day.py`
  · Replace with a read from `daily_forecasts` (the Monte Carlo
    cron's output table) for the next 21 days
  · If a date has no Monte Carlo entry yet, fall back to the cron's
    learned DOW patterns from the past 90 days — NOT the hardcoded
    `DOW_PATTERNS` dict
  · Remove every `random.uniform()` call. Replace with:
    - For occupancy: read the Monte Carlo P10/P50/P90 bands
    - For staff_scheduled: read from `schedule_shifts` (the actual
      schedule data, which exists per the A5 production-sheet-scheduler
      commit)
    - For labor_budget: read from `budget_engine`'s monthly labor
      budget pro-rated by day
    - For budget_occ: read from `budget_engine`'s occupancy budget

**Effort:** ~2 days. Same data, same endpoint shape — just stop
synthesizing.

### Fix 3 — Wire reservations / OTA / direct-booking feeds to `reservations_pipeline`

**Status today:** no `reservations_pipeline` collection exists. The
21-day endpoint uses room count from `hk_rooms` (current state) not
from forward-looking bookings.

**What to do:**
  · Create `reservations_pipeline` collection with shape:
    `{property_id, arrival_date, depart_date, rooms_blocked, rate,
    source, status, group_code, last_updated}`
  · Wire OTAs (Booking.com, Expedia, etc.) via either the property's
    PMS API (Opera, Mews, Cloudbeds) or directly via the channel
    manager
  · Wire group-block bookings from sales / catering system (Tripleseat
    / Delphi)
  · Wire direct bookings from the property's website via webhook
  · The 21-day forecast reads `reservations_pipeline` for hard
    on-the-books rooms; combines with Monte Carlo for projected
    walk-in / late bookings

**Effort:** depends entirely on the property's PMS. With Opera Cloud
(or any modern PMS with a real API): 1-2 weeks. With a legacy PMS
without a real API: 4-8 weeks of integration work or a $300-800/mo
channel-manager subscription.

### Fix 4 — Wire weather to the forecast (free, ~2 days)

**Status today:** weather is not consumed anywhere.

**What to do:**
  · Use NOAA/NWS API (free, no key needed in the US) for the property's
    coordinates
  · Cache 7-day forecast in `weather_forecast` collection, refreshed
    every 4 hours
  · The Monte Carlo pipeline reads weather as a signal for:
    - Beverage sales (rain → +12% bar, -8% pool)
    - Spa demand (rain → +15% spa)
    - Banquet outdoor-event risk
    - Restaurant covers (cold + rainy → +6% IRD, -10% restaurant)

**Effort:** 2 days. Weather is the single highest-leverage external
signal a hospitality forecast can consume that's also free.

### Fix 5 — Wire payroll's actual blended hourly wage per outlet

**Status today:** `LABOR_COST_PER_HOUR` is hardcoded ($18.50 restaurant,
$19.00 IRD, $22.00 spa).

**What to do:**
  · The payroll module already computes blended hourly cost per
    employee per outlet (gross wage + benefits + taxes / scheduled
    hours)
  · Aggregate to a `labor_blended_rates` collection by outlet, refreshed
    weekly
  · `forecast_21day.py` reads this collection instead of the constant
  · End state: each property's actual wage curve drives its labor
    forecast, including step changes when minimum wage moves

**Effort:** 1 day.

### Combined effect of fixes 1-5

**Before:** the 21-day forecast is a plausible-looking synthetic
projection. Numbers move because of `random.uniform()` and not because
of underlying business reality.

**After:** every number on the 21-day forecast traces back to a real
source — POS, PMS, payroll, weather, or the audit-replay-corrected
Monte Carlo. The CFO can drill into any number and see the events
that built it. The forecast updates every time a check closes at the
POS.

---

## PART B (continued) — Additional CFO / Director tools to add

Already shipped (per Emergent's iter285, partially verified in the
2026-05-09 audit): USALI variance, 13-week cash forecast, hospitality
KPIs (ADR, RevPAR, GOPPAR, TRevPAR), smart anomaly detection, recurring
JE engine, AI variance commentary, audit packet, period-over-period.

**The following are NOT yet shipped and are recommended in priority
order.** Each is sized as Small (1 week), Medium (2-4 weeks), or
Large (5-8 weeks).

### Tier 1 — Forecasting & planning (highest leverage)

**B.1 — Forecast accuracy tracker** *(Medium)*
Every forecast made → stored. Every actual that arrives → compared.
Surface 7-day, 14-day, 28-day MAPE (mean absolute percentage error)
per outlet, per metric. Without this, no one believes the forecast.
With this, trust compounds over time.

**B.2 — Pace report (the morning ritual)** *(Small)*
*"We're 18 days into the month, 60% of the way through, but at 71%
of revenue target. On pace to finish at $2.4M ± $180k. 90% confidence
range $2.22M to $2.58M."* This is what every chain operator looks at
first thing in the morning. Currently absent.

**B.3 — Probabilistic forecasts (P10/P50/P90 fan charts)** *(Medium)*
Instead of a point estimate (\"Saturday revenue: $118k\"), show a fan
chart with 10th / 50th / 90th percentile bands. The Monte Carlo cron
produces these; the UI just doesn't render them. Cures false precision
and prevents Directors from being held to the median as a hard target.

**B.4 — What-if scenario sandbox** *(Large)*
Director-grade modeling. *"Show me cash position if banquet revenue
drops 15% next month."* *"Show me labor cost if minimum wage goes to
$20."* *"Show me F&B margin if beef goes up 8%."* Drives the hard
conversations a CFO needs to have with ownership.

**B.5 — Driver-based forecast (live-wire the existing budget engine)**
*(Medium)*
The driver-based budget engine exists. Hook it up so when one driver
moves (covers go up, food cost percent moves), the forecast updates
the dependent line items automatically. End-state: Directors adjust
ONE slider and the entire P&L re-renders.

### Tier 2 — Cost & margin intelligence (very high value)

**B.6 — Recipe-level food cost variance** *(Medium)*
*"Our braised short rib's plated cost is up 12% MoM because beef
went up — but menu price is unchanged. Margin compressed from 68% to
56%."* This is THE most actionable financial signal in a kitchen and
the one most absent from off-the-shelf systems. The recipe data
already exists; the variance computation needs to be added and wired
to a daily digest.

**B.7 — Vendor spend Pareto + price-tracking** *(Medium)*
Top 80% of spend comes from top 20% of vendors. Track unit prices
over time per SKU per vendor. Alert on price increases > 5% week-over-
week. **This is negotiation leverage** — when the produce rep walks
in for the quarterly review, the Director shows the exact price
trend and asks for a rebate.

**B.8 — Labor productivity drilldown by daypart × outlet × position**
*(Medium)*
Covers per labor hour, sales per labor hour, broken out by:
  · daypart (breakfast / lunch / dinner / late)
  · outlet (restaurant / IRD / banquet / bar)
  · position (server / runner / busser / bartender)
Shows where staffing is misaligned. Likely 8-15% labor-cost reduction
opportunity in any property running on instinct rather than data.

**B.9 — Tip distribution audit** *(Small)*
Every tip-share computation traceable per shift, per server, per pool.
Tip-pooling lawsuits are common (FLSA violations); this is the legal
defense as well as a fairness signal.

**B.10 — Menu engineering matrix (Stars / Plowhorses / Puzzles / Dogs)**
*(Small)*
Updates daily based on actual sales velocity × margin. Flags items to
push, items to fix, items to delete. Standard menu engineering
methodology, just live-wired and updated nightly.

### Tier 3 — Treasury & compliance

**B.11 — Loan covenant tracker** *(Small)*
DSCR, debt yield, leverage ratio, interest coverage — all covenants
ticked monthly with red / yellow / green. Required for any property
with bank financing. Late warning of an impending breach prevents
panic refinancing.

**B.12 — Daily cash burn / runway** *(Small)*
Particularly important for properties in early-stage, ramp-up, or
refinancing. *"At current burn rate, cash runway is 11.4 months
absent revenue improvement."* Forces hard conversations early.

**B.13 — Inter-company eliminations workbench** *(Large — already
in your backlog)*
For any operator with 2+ properties under common ownership.
Auto-eliminates inter-property transactions (one property sells to
another) so consolidated financials don't double-count.

**B.14 — Tax provision calculator** *(Medium)*
Quarterly federal/state estimates, deferred tax computation, NOL
tracking, transfer pricing for multi-property. Currently most
operators do this in Excel; bringing it in-platform reduces month-end
close by 1-2 days.

### Tier 4 — Audit & governance (doctrine-aligned)

**B.15 — Universal "why did this change?" drill** *(Medium)*
One-click drill from any number on any screen → the source events
that built it. The Echo AI³ event log already exists; the missing
piece is the universal UI surface. Doctrine §3.1 already supports
this: every number in the system has a traceable event chain.

**B.16 — Audit trail on every override** *(Small)*
When a Director adjusts a forecast or budget, that adjustment is
timestamped, attributed, signed, and reasoned. Doctrine §3.1
append-only already supports this; surface it as the override-history
panel for every override field.

**B.17 — Director-level salary masking with hierarchical drill-down**
*(Already shipped per D9 commit — verify the drill behavior)*
Directors see down (their reports), not up or sideways (peers'
salaries, ownership comp). Per the human's note, D9 wired this for
Chronos profile drill. Verify it covers EchoAurum, payroll, and
financial reporting too.

**B.18 — Period-close cockpit auto-close engine** *(Large)*
Single button: freeze JEs → run depreciation → post recurring JEs →
generate AI variance commentary → email audit packet to auditor
distribution → mark period closed. 14 manual steps in 30 seconds.
Emergent suggested this in iter285; the suggestion is sound. **The
prerequisite is fixing the audit trail (B.16) so the auto-close
itself is auditable.**

**B.19 — Exception-based daily review** *(Small)*
Instead of reading every line of the daily P&L, surface only the
lines that breached thresholds. Save the CFO 1-2 hours/day. The
anomaly detection engine already exists; this is just packaging it
as the morning digest.

### Tier 5 — AI-augmented (highest leverage if executed well)

**B.20 — Sous-Chef-CFO conversational Q&A** *(Medium)*
Claude-powered conversational agent grounded in the property's
financials. *"What's driving prime cost above 65%?"* *"Show me the
three vendors that increased prices most this month."* *"What did we
lose on no-shows last week?"* Doctrine alignment: must respect the
salary masking and the privacy tenets — Claude can't answer questions
about data the asker isn't allowed to see.

**B.21 — Automatic board pack and lender pack drafting** *(Medium)*
Already shipped: month-end variance commentary. Extend to:
  · weekly digest (Friday afternoon)
  · monthly board pack (full P&L + balance sheet + commentary +
    KPI dashboard, ready for the board meeting Tuesday)
  · quarterly lender pack (covenant compliance + variance memo
    + 13-week cash forecast + management reps)

**B.22 — Anomaly explanation chain** *(Small)*
When the anomaly engine flags something, Claude writes a 2-sentence
explanation with the chain of events that caused it. *"Round-number
JE for $50,000 posted 5/9 by jcooper. This is the manual deposit
adjustment for the wedding party that paid by wire on 5/8 — see
Tripleseat event #4421. Likely legitimate."*

---

## Recommended sequencing

If the human is asking "what should I tell Emergent to build next,"
here's the order:

  1. **Fix 1-5 first** — wire the actual data flow. Until POS,
     reservations, weather, and payroll are live, everything else
     is decoration on a synthetic forecast.

  2. **Then B.1, B.2, B.3** — forecast accuracy tracker, pace report,
     P10/P50/P90 fan charts. These three together turn the live-
     wired data into Director-grade decision support.

  3. **Then B.6, B.7, B.8** — recipe variance, vendor Pareto, labor
     drilldown. These three together drive 5-15% margin improvement
     in most properties' first 90 days.

  4. **Then B.16, B.18, B.19** — audit trail, auto-close, exception-
     based review. These three together turn the back office from a
     reactive watch into a proactive command deck.

  5. **Then B.20, B.21, B.22** — the AI layer on top. Most leverage
     once the underlying data and audit trail are right. Most
     dangerous if the underlying data is still synthetic.

The pattern: **plumbing before features, features before AI.** AI on
top of synthetic data produces confident-sounding nonsense.

---

## Closing — the doctrine read

The single most important truth in this document is in Part A: **the
21-day forecast endpoint pretends to be live but isn't.** It's
plausible-looking synthetic decoration with `random.uniform()` calls
generating "uncertainty" instead of real Monte Carlo bands.

That's a textbook violation of `THE_LINE.md`'s standard: *"We do not
ship code we would not trust. We do not lie to ourselves about what is
done."* And it's the same pattern called out in the D62 handoff to
Emergent: claims of completion that don't survive a grep, mock smoke
tests dressed as real ones.

The fixes in Part A are concrete, sized, and ordered. The CFO toolkit
in Part B is genuinely valuable IF the underlying data flow is real.

Build Part A first. Build Part B on top.
