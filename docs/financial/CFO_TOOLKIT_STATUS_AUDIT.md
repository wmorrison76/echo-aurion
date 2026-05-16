# CFO Toolkit — Status Audit and Additions

> Date: 2026-05-09
>
> Companion to `CFO_TOOLKIT_VERIFICATION_AND_RECOMMENDATIONS.md`.
> That doc proposed Part A (5 plumbing fixes) + Part B (22 additional
> tools). This doc audits what's actually shipped against that list,
> identifies what's been built that wasn't on the original list, and
> proposes high-value tools that should be added.

---

## 1 — Status against the original recommendation doc

### Part A — Plumbing fixes to make the 21-day forecast truly live

| #   | Fix                                                       | Status      |
|-----|-----------------------------------------------------------|-------------|
| A.1 | Wire POS check-close webhooks to event log               | **Not done** |
| A.2 | Replace `forecast_21day.py` hardcoded patterns w/ live signals | **Not done** (the new outlet_capture system is the *intended* replacement source of truth, but `forecast_21day.py` itself still contains its hardcoded patterns + `random.uniform()` calls) |
| A.3 | Wire reservations / OTA / direct-booking → `reservations_pipeline` | **Not done** |
| A.4 | Wire NOAA/NWS weather feed                                 | **Not done** |
| A.5 | Wire payroll's actual blended hourly wage per outlet      | **Not done** |

**Part A score: 0/5 done.** The architecture for these signals to land
is in place (the event-bus subscribers in `outlet_capture.py` are
wired and waiting). The integrations themselves — flipping the actual
external pipes on — have not happened. **This is the highest-priority
remaining work.**

### Part B — 22 additional tools

| Tier  | #    | Tool                                                       | Status                                                       |
|-------|------|------------------------------------------------------------|--------------------------------------------------------------|
| 1     | B.1  | Forecast accuracy tracker                                  | **Partially done** — outlet capture system has rolling MAPE per outlet × horizon over a 60-day window, with trend direction (improving / degrading / stable). Property-level rollup is not built. |
| 1     | B.2  | Pace report ("60% through month, 71% of revenue target")   | **Not done**                                                 |
| 1     | B.3  | Probabilistic P10 / P50 / P90 fan charts                   | **Done** — outlet capture forecasts return P10/P50/P90 + production_recommendation at P75. Frontend rendering not built (Emergent ticket). |
| 1     | B.4  | What-if scenario sandbox                                   | **Not done**                                                 |
| 1     | B.5  | Driver-based forecast (live-wire budget engine)            | **Not done** — `budget_engine.py` still uses placeholder default drivers. |
| 2     | B.6  | Recipe-level food cost variance                            | **Not done**                                                 |
| 2     | B.7  | Vendor spend Pareto + price tracking                       | **Not done**                                                 |
| 2     | B.8  | Labor productivity drilldown by daypart × outlet × position | **Not done**                                                |
| 2     | B.9  | Tip distribution audit                                     | **Not done**                                                 |
| 2     | B.10 | Menu engineering matrix (Stars / Plowhorses / Puzzles / Dogs) | **Not done**                                              |
| 3     | B.11 | Loan covenant tracker                                      | **Not done**                                                 |
| 3     | B.12 | Daily cash burn / runway                                   | **Not done**                                                 |
| 3     | B.13 | Inter-company eliminations workbench                       | **Not done** (in original backlog)                          |
| 3     | B.14 | Tax provision calculator                                   | **Not done**                                                 |
| 4     | B.15 | Universal "why did this change?" drill                     | **Not done** — D28 append-only event log substrate exists, but the cross-cutting drill UI is not built. |
| 4     | B.16 | Audit trail on every override                              | **Partially done** — `outlet_capture_weights_history` is the model for this (every weight version preserved with trigger reason, append-only). Not yet generalized to forecast overrides, budget overrides, schedule overrides. |
| 4     | B.17 | Director-level salary masking with hierarchical drill      | **Claimed done in D9** — not independently verified by the audit. |
| 4     | B.18 | Period-close auto-close engine                             | **Not done**                                                 |
| 4     | B.19 | Exception-based daily review                               | **Not done**                                                 |
| 5     | B.20 | Sous-Chef-CFO conversational Q&A                           | **Not done**                                                 |
| 5     | B.21 | Automatic board pack and lender pack drafting              | **Not done**                                                 |
| 5     | B.22 | Anomaly explanation chain                                  | **Not done**                                                 |

**Part B score: 1 done, 3 partially done, 18 not done.**

### What was built that's NOT on the original list

The outlet capture system shipped two things the original doc didn't
anticipate:

  · **Per-outlet capture-ratio architecture (3 ratios standardized)**
    — total / eligible / available capture, defined precisely so
    staff and AI compute the same number. This is foundational and
    enables many of the unbuilt tools.

  · **Trial-level Monte Carlo retrospective with signal attribution**
    — the "never-satisfied" doctrine version. Stores every Monte
    Carlo trial's per-signal draws; finds the trials within 2% of
    actual after the fact; decomposes what they sampled differently
    from the median; computes effect size in sigma units; produces
    a §2.5-framed walkback narrative that runs even on hits. **This
    is novel hospitality forecasting and a genuine competitive
    differentiator** — most platforms just give you a P50.

These two together comprise about 1,700 lines of new backend code +
two architecture documents. They are the **substrate** that B.1, B.2,
B.3, B.4, B.5, B.10, B.21, and B.22 will eventually consume.

---

## 2 — Additional tools worth adding (beyond the original 22)

Curated, hospitality-specific, ranked by leverage. These are tools
that don't appear in standard finance platforms (Toast Hospitality,
Avero, Hotelligence360) but make a real difference in operations.

### High-leverage forecasting and yield

**T.1 — Yield-per-occupied-minute dashboard** *(Medium effort)*
For function rooms, restaurant tables, spa treatment rooms, cabanas:
revenue per occupied minute. Identifies underused space and over-
allocated space. Pairs with the outlet capture substrate; a function
room rented for $8,000 for an 8-hour event is $16.67/min; the same
room rented for $4,500 for 4 hours is $18.75/min — better yield.
Most operators have never computed this.

**T.2 — Forfeiture / no-show analytics** *(Small effort, high value)*
Group blocks that didn't materialize. No-show diners. Walked-out
spa appointments. Per-channel no-show rate. **No-shows are pure
margin bleed and this is the single most underbuilt tool in
hospitality.** Pairs with the reservations_pipeline (A.3).

**T.3 — Weather-adjusted year-over-year comparison** *(Small effort)*
Separate "we had a bad day" from "the weather was bad." YoY
comparison of two different rainy days vs YoY of two different sunny
days. Removes the most-asked-about excuse from quarterly reviews.
Pairs with the weather feed (A.4).

**T.4 — Forecast confidence-drift alarm** *(Small effort)*
When MAPE itself starts trending UP (the model is getting WORSE),
something structural has changed. Different alarm than absolute
MAPE — surfaces the *velocity* of error. Pairs with the outlet
capture accuracy gauge (B.1) and the regime-change detector already
in `outlet_capture_learner.py`.

### Cost & margin (hospitality-specific)

**T.5 — Channel-cost analyzer** *(Medium effort)*
Direct booking vs OTA vs travel agent vs group: all-in cost per
booking (commissions + tech fees + chargebacks + amenity fees +
brand-program splits). Shows the *true* profitability of each
channel. A guest booked through Booking.com at $400 may net $278;
the same guest direct nets $380. Operators rarely see the all-in
math.

**T.6 — Production yield tracking by recipe** *(Medium effort)*
What was prepped vs sold vs wasted, recipe-level. *"We prepped 80
short rib portions; sold 62; 18 were re-purposed for staff meal
(75% of original menu margin lost). Saturday's prep should be 65."*
Specifically a kitchen tool, not a finance tool, but the financial
implication is enormous. Pairs with the recipe variance tool (B.6).

**T.7 — Server-level conversion rate** *(Small effort)*
Cover-to-revenue ratio per server. Identifies your top earners and
helps schedule them on big nights. *"Maria converts $112/cover on
Friday dinners; the team average is $84. She should be on the floor
this Friday."* Sensitive — masks salary detail per Tenet 3 and the
director-masking rule, but surfaces the productivity signal.

### Group business

**T.8 — Group-block ROI tracker** *(Medium effort)*
Every group block has costs (DOSM commissions, complimentary
upgrades, F&B credit, comped suite) and benefits (room nights, F&B
spend, spa bookings). Track per-block ROI vs. transient business
during the same window. Strategic question: are we accepting the
wrong groups? Some groups look full-rate but bleed margin.

**T.9 — Cancellation pattern analyzer** *(Small effort)*
When do reservations cancel — 7 days out? 24 hours out? Day-of?
Different patterns = different forecasting confidence. Pairs with
the cancellation policies tool (revenue management).

### Multi-property

**T.10 — Cross-property benchmarking** *(Medium effort)*
For operators with 2+ properties, compare per-outlet KPIs side by
side. Identify outliers. *"Why is Pier 66's spa converting 28% of
property guests vs. Naples' spa at 19%?"* Allow a "what is property
X doing differently" deep-dive that surfaces operational patterns.

**T.11 — Ramp-up tracker for new / reopened outlets** *(Small effort)*
When an outlet opens (or reopens after renovation, new chef, new
menu), capture ratio takes 30-90 days to converge. Track the ramp-
up curve and compare to peer-outlet ramp-up curves. Flag if ramp-up
is slower than peer median (early warning that something is wrong
with the launch).

### Loyalty / membership

**T.12 — Member vs non-member capture cohort** *(Small effort)*
For properties with loyalty programs: member capture rate vs non-
member capture rate per outlet. Surface the loyalty premium per
outlet in dollars. Justifies the loyalty investment and identifies
outlets where the loyalty value isn't landing.

**T.13 — Membership lifetime-value driftmap** *(Medium effort)*
Cohort analysis of members by year-of-enrollment: revenue per
member-year, attrition rate, second-stay-within-6-months rate.
Flags cohorts where retention is breaking down before they age
out.

### Forward operations

**T.14 — Weather-driven prep alert** *(Small effort)*
*"Rain forecast for Saturday — banquet outdoor breakdown risk + IRD
volume +15% predicted; pre-stage backup IRD prep tomorrow."*
Connects forecast to action; doesn't just predict, it tells the
ops team what to do. Pairs with weather feed (A.4) and the
production recommendation (B.6 / outlet_capture).

**T.15 — Bridge forecast for transition periods** *(Medium effort)*
For properties undergoing renovation / partial closure / re-flag:
bridge forecasts that account for partial outlet availability.
*"Restaurant closed for refurb May 1-15; project IRD volume shift
+22%, bar +18%, spa flat."* Most forecasting tools assume steady
state; bridge forecasts model transition states explicitly.

---

## 3 — Recommended sequencing

If the plan is to ship the highest-leverage stuff first:

### Phase 1 — Plumbing (Part A)

These five fixes are blocking everything else. Do these first.
They take 2–8 weeks each depending on the property's existing PMS
and POS. **Until POS is wired, no revenue dashboard is real;
until reservations are wired, no forward forecast is real.**

  1. POS check-close webhooks (A.1)
  2. Reservations / OTA → reservations_pipeline (A.3)
  3. NOAA weather (A.4) — cheapest, fastest, highest signal/cost ratio
  4. Replace forecast_21day.py synthesis (A.2) — read from
     outlet_capture_forecasts instead
  5. Payroll blended hourly wages (A.5)

### Phase 2 — Director-grade decision support

  6. Pace report (B.2) — the single most-used view
  7. What-if scenario sandbox (B.4)
  8. Forecast accuracy tracker — property-level rollup (complete B.1)
  9. Driver-based forecast wiring (B.5)
  10. Weather-driven prep alerts (T.14) — connects forecast to action

### Phase 3 — Cost & margin intelligence

  11. Recipe-level food cost variance (B.6)
  12. Production yield tracking by recipe (T.6)
  13. Vendor spend Pareto + price tracking (B.7)
  14. Labor productivity drilldown (B.8)
  15. Channel-cost analyzer (T.5)
  16. Menu engineering matrix (B.10)

### Phase 4 — Treasury & audit

  17. Loan covenant tracker (B.11)
  18. Daily cash burn / runway (B.12)
  19. Universal "why did this change?" drill (B.15)
  20. Period-close auto-close engine (B.18)
  21. Exception-based daily review (B.19)
  22. Audit trail generalization (complete B.16)

### Phase 5 — AI-augmented (highest leverage on top of right substrate)

  23. Sous-Chef-CFO conversational Q&A (B.20)
  24. Anomaly explanation chain (B.22)
  25. Automatic board / lender pack drafting (B.21)

### Phase 6 — Multi-property & advanced

  26. Cross-property benchmarking (T.10)
  27. Inter-company eliminations (B.13)
  28. Group-block ROI tracker (T.8)
  29. Cancellation pattern analyzer (T.9)
  30. Forfeiture / no-show analytics (T.2)
  31. Member capture cohort + LTV driftmap (T.12, T.13)
  32. Yield-per-occupied-minute (T.1)
  33. Bridge forecast for transitions (T.15)
  34. Server-level conversion (T.7) — sensitive, requires masking discipline
  35. Ramp-up tracker (T.11)
  36. Weather-adjusted YoY (T.3)
  37. Tax provision calculator (B.14)
  38. Tip distribution audit (B.9)
  39. Forecast confidence-drift alarm (T.4)

---

## 4 — Honest closing

  · **Of the 27 originally proposed items, ~3 are partially done.**
    The rest is open work.

  · **The 1,700 lines of outlet-capture code shipped this week is
    the architectural substrate** for at least 8 of those 27 items.
    Without it, the items have nowhere to read from. The substrate
    is real and tested at the import / route level.

  · **The trial-level retrospective with signal attribution and the
    never-satisfied doctrine encoding is a genuine competitive
    differentiator** that wasn't even on the original list. It's the
    kind of thing that lands a CFO demo. *"The model walked back
    yesterday's 8% miss and identified that 12 trials in the Monte
    Carlo did predict it correctly — they all sampled the high tail
    of the group block signal. Tomorrow we widen that signal."*

  · **The plumbing fixes (Part A) are still 0/5 and they are
    blocking.** Everything else assumes data flows that don't yet
    flow. The substrate is plumbing-ready but the upstream pipes
    aren't turned on.

  · **The recommended next ticket** is probably A.1 (wire POS
    check-close events end-to-end on at least one property) — it
    proves the architecture works against real revenue data and
    unlocks the rest.

  · **The total open backlog (Part A + B + T) is ~36 items** as of
    this audit. That's a 12–18 month roadmap for a focused team. It
    is also a defensible, differentiated product if executed in
    order.

The doctrine wins or loses in the execution.
