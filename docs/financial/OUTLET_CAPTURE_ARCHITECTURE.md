# Outlet Capture System — Architecture

> Built 2026-05-09 in response to: *"We need to grab the actual capture
> percentage per outlet of available guest and total guest... 21-day
> forecast updates as soon as a number is changed... constantly improves
> accuracy over time... outlets dashboard with Monte Carlo to predict
> production needs 10/5/3/1 days, precision is key to reduce
> overproduction."*

---

## 1. The honest framing

### 1.1 — Why three capture ratios, not one

"Capture ratio" is a deceptively simple term. Without disambiguation,
staff and AI will compute different numbers from the same data. This
system standardizes three definitions:

| Ratio name             | Numerator                         | Denominator                                                         | Use                                                            |
|------------------------|-----------------------------------|---------------------------------------------------------------------|----------------------------------------------------------------|
| **Total capture**      | unique guests who used outlet O   | total property guests on the day                                    | "What fraction of all guests touched this outlet?"            |
| **Eligible capture**   | unique guests who used outlet O   | property guests who were *eligible* (age, hours, room class, etc.)  | "Of guests who could use this outlet, what fraction did?"     |
| **Available capture**  | actual guest-touches              | maximum capacity (seats × turns × hours)                            | "How full was the outlet vs. its physical capacity?"          |

**Eligible capture** is the metric staff care about most — it's the
number that says "we left guests on the table." **Available capture**
is what the GM cares about — it says "we could fit more if we sold
harder." **Total capture** is what the brand cares about — it tracks
guest-experience breadth across properties.

The system computes and stores all three. UIs default to **eligible
capture** because that's what's actionable for an outlet manager.

### 1.2 — The accuracy floor (and why the pursuit is the doctrine)

The 0.0001% goal is the right *direction* but unreachable in
practice. Forecasting human behavior has an **irreducible noise
floor** — guests make decisions in the moment that no signal predicts
(a guest skipping dinner because of a late nap; a wedding party
cancelling banquet wine because the groom is hung over).

Empirical floor for hospitality forecasting:

| Horizon       | Best-in-class MAPE | Acceptable MAPE  | Failure threshold |
|---------------|-------------------:|-----------------:|------------------:|
| Next-day      |             1–2%   |             3–5% |              >10% |
| 3-day         |             2–3%   |             4–7% |              >12% |
| 5-day         |             3–5%   |             6–9% |              >15% |
| 10-day        |             5–8%   |            8–12% |              >20% |
| 21-day        |            7–12%   |           12–18% |              >25% |

But the destination isn't the doctrine — **the pursuit is the
doctrine**. The model is not permitted to be "occasionally correct."
Even on a hit, the daily walkback continues to ask:

  · Inside the Monte Carlo, which individual trials predicted the
    actual quantity correctly?
  · What did those trials sample differently from the median?
  · What signal does that suggest we under-weight in aggregate?

This is the §2.4 retrospective practice mechanized. The chef tasting
the sauce after service and recognizing the moment when it was right,
then asking why. The system **measures** accuracy and **publishes**
MAPE, but it never declares victory. Tomorrow we widen what the
winners saw, and we walk back again.

That posture is enforced in code, not just documented:

  · `_compute_forecast` records every Monte Carlo trial's per-signal
    draws to `outlet_capture_forecast_trials`. The trials are not
    discarded after percentile extraction — they are **the source of
    truth for the next day's retrospective**.
  · `outlet_capture_retrospective.py` runs every morning. It finds
    the trials within 2% of actual (the "winners"), decomposes their
    signal draws against the median trial, and computes an effect
    size per signal. Effect size ≥0.3σ surfaces as a §2.5-framed
    observation: *"the winners sampled DOW high with moderate effect
    (+0.42σ). The model could see this if its DOW distribution were
    widened in that direction."*
  · The retrospective applies bounded width-nudges (cap 3%/day) so
    the model widens its sampling toward where the winners lived.
    Width nudges are different from mean nudges — they teach the
    model to **explore the tail it under-explored**, not just to
    shift its center estimate.
  · The dashboard endpoint surfaces the latest walkback as
    `doctrine_posture` so staff see the model's self-critique every
    morning. Observational, never accusatory (§2.5).
  · The retrospective runs **even on hits**. A 1% MAPE day still
    asks which trial was tightest and what it knew. The model is
    never permitted to be "occasionally correct."

That's the never-satisfied posture. Doctrine §1.1 — transparency
about both the destination's unreachability AND the pursuit's
permanence.

### 1.3 — Event-driven recompute, with debouncing

The user's requirement: *"21-day forecast updates as soon as a number
is changed."* The naïve implementation — recompute all 21 days × N
outlets on every event — would thrash the database and waste compute.

The architecture instead:

  1. Events flow into the unified event bus (existing `event_bus.py`)
  2. The capture forecaster subscribes to relevant event types
  3. Each event identifies the **affected outlet × date** scope (often
     just a few cells, not the full grid)
  4. Recomputes are **debounced** (60s default) and **scoped** —
     only the affected outlet × date is recomputed, not the full grid
  5. After recompute, a `forecast.updated` event fires; the UI
     subscribes and re-renders the affected cells

End-state: from a guest's reservation booking to the kitchen's prep
forecast updating is **<60 seconds** with O(1) recompute cost per event.

---

## 2. Domain model

### 2.1 — Collections

| Collection                     | Purpose                                                                          | Append-only? |
|--------------------------------|----------------------------------------------------------------------------------|--------------|
| `outlets`                      | Registry of all revenue outlets across all properties                            | No (mutable) |
| `outlet_capture_events`        | Append-only log of every guest-outlet touch (the source of truth)                | **Yes**      |
| `outlet_capture_daily`         | Daily aggregations (precomputed for fast reads)                                  | No (rebuild) |
| `outlet_capture_forecasts`     | Per-outlet, per-horizon Monte Carlo forecast bands (P10/P50/P90)                 | No (rebuild) |
| `outlet_capture_weights`       | Active-learning weights per outlet × dimension, versioned                        | No (mutable) |
| `outlet_capture_accuracy`      | Rolling MAPE per outlet × horizon, append-only history                           | **Yes**      |
| `outlet_capture_recompute_q`   | Debounced recompute work queue                                                   | No           |

### 2.2 — Outlet schema

```jsonc
{
  "outlet_id": "pier66-galley",
  "property_id": "pier-sixty-six",
  "name": "The Galley",
  "outlet_type": "restaurant",   // restaurant | ird | banquet | bar | spa | retail | minibar | etc.
  "capacity": {
    "seats": 80,
    "turns_per_service": 2.4,
    "max_daily_covers": 192      // computed: seats × turns × services-per-day
  },
  "hours": [
    {"day": "mon", "open": "07:00", "close": "22:00", "dayparts": ["breakfast", "lunch", "dinner"]},
    {"day": "tue", "open": "07:00", "close": "22:00", "dayparts": ["breakfast", "lunch", "dinner"]}
    // ...
  ],
  "eligibility": {
    "min_age": 0,
    "requires_reservation": false,
    "room_classes": ["all"],     // all | suite_only | club_only
    "ticketed_event": false
  },
  "active": true,
  "created_at": "2026-05-09T...",
  "updated_at": "2026-05-09T..."
}
```

### 2.3 — Capture event schema (append-only)

```jsonc
{
  "event_id": "uuid",
  "outlet_id": "pier66-galley",
  "property_id": "pier-sixty-six",
  "guest_id": "uuid",            // anonymized; tenant-isolated
  "date": "2026-05-09",          // YYYY-MM-DD (local)
  "daypart": "dinner",
  "ts": "2026-05-09T19:42:00Z",
  "source": "pos.toast",         // pos.* | reservation | concierge | qr | walk_in
  "covers": 4,                   // party size
  "revenue_cents": 28450,        // Money — integer cents
  "is_property_guest": true,     // staying at the property
  "stay_id": "uuid",             // if is_property_guest, the stay
  "doctrine_version_hash": "..." // per the patent — tied to current doctrine
}
```

### 2.4 — Forecast schema

```jsonc
{
  "forecast_id": "uuid",
  "outlet_id": "pier66-galley",
  "property_id": "pier-sixty-six",
  "for_date": "2026-05-12",
  "horizon_days": 3,             // days ahead from forecast_made_at
  "forecast_made_at": "2026-05-09T06:00:00Z",
  "metric": "covers",            // covers | revenue | capture_eligible | capture_available | capture_total
  "p10": 142,                    // 10th percentile (low band)
  "p50": 168,                    // median
  "p90": 192,                    // 90th percentile (high band)
  "drivers": [                   // top contributors to the forecast
    {"signal": "dow", "weight": 0.42, "value": "thu"},
    {"signal": "weather", "weight": 0.18, "value": "rainy"},
    {"signal": "occupancy", "weight": 0.32, "value": 0.84},
    {"signal": "manager_note", "weight": 0.08, "value": "VIP arrival"}
  ],
  "weights_version": 47,         // monotonically increasing version
  "model": "monte_carlo_v1"
}
```

---

## 3. The active learning loop

### 3.1 — Loop diagram

```
                ┌────────────────────────────────────────┐
                │                                        │
                ▼                                        │
       ┌────────────────┐                                │
       │  Forecast made │                                │
       │  for date D    │                                │
       └────────┬───────┘                                │
                │                                        │
                ▼                                        │
       ┌────────────────┐                                │
       │  Date D arrives│                                │
       │  Actuals close │                                │
       └────────┬───────┘                                │
                │                                        │
                ▼                                        │
       ┌────────────────┐                                │
       │ Compute MAPE   │                                │
       │ per horizon    │                                │
       └────────┬───────┘                                │
                │                                        │
                ▼                                        │
       ┌────────────────┐                                │
       │ Decompose error│                                │
       │ by signal      │                                │
       └────────┬───────┘                                │
                │                                        │
                ▼                                        │
       ┌────────────────┐                                │
       │ Nudge weights  │                                │
       │ toward truth   │                                │
       └────────┬───────┘                                │
                │                                        │
                ▼                                        │
       ┌────────────────┐                                │
       │  Persist       │                                │
       │  weights v+1   ├────────────────────────────────┘
       └────────────────┘
```

### 3.2 — Why this loop converges (and when it doesn't)

**Converges when:** the underlying signals (weather, DOW, occupancy,
reservations, manager notes, prior-day actuals) genuinely correlate
with the outcome. Hospitality has strong cyclical structure (weekday/
weekend, season, holiday calendars) so convergence is normally fast —
30–60 days of actuals to reach single-digit MAPE.

**Does NOT converge when:**
  · A property has structural change (renovation, new menu, new GM,
    rebrand). Old weights apply to a system that no longer exists.
    **Mitigation:** weight-nudge is bounded; severe drift triggers a
    "regime change" alert and weights are reset to neighbor-property
    defaults.
  · A signal is missing entirely (no POS data wired). Weights flatten
    toward equal-weight; MAPE stays high.
    **Mitigation:** the system reports "data coverage" as a gauge —
    if POS isn't wired, that's surfaced explicitly so no one thinks
    the forecast is sharper than it is.
  · Volatility exceeds signal (small properties with high variance per
    day). The forecast bands become wide; precision is genuinely low.
    **Mitigation:** report bands honestly; don't compress P10/P90
    artificially to look sharper.

### 3.3 — The doctrine alignment

The active learning loop IS the §2.4 retrospective practice from
`THE_LINE.md`: *"every shift, after service, the brigade walks back
through the night and asks where each plate could have been better."*
The loop is precisely that, mechanized: compare forecast to actual,
ask where the model could have been better, nudge weights.

The append-only `outlet_capture_events` log is the §3.1 substrate.
Every actual capture event persists forever; weights are derived from
events; weights can be re-derived from events at any time. Forensic
replay (per the patent draft) means an auditor can reconstruct what
the model believed on any historical date.

---

## 4. Surfaces

### 4.1 — Outlet dashboard (per the user's spec)

For each outlet, displayed in `/EchoStratus/outlets/{outlet_id}`:

  · **Today** — live capture ratios (eligible / available / total)
    refreshed every 60s
  · **Tomorrow (1d horizon)** — Monte Carlo P10/P50/P90 covers,
    revenue, prep needs. **Tightest precision.**
  · **3-day horizon** — same metrics, wider bands
  · **5-day horizon** — same metrics, wider bands, used for staffing
  · **10-day horizon** — same metrics, used for purchasing
  · **21-day horizon** — full strategic view
  · **Accuracy gauge** — current MAPE at each horizon, plotted over
    last 60 days (so the team sees the model getting sharper)
  · **Top drivers** — what signals are driving today's forecast
    (weather +12%, group block +18 covers, etc.)
  · **Production recommendation** — translates the P50 forecast +
    confidence interval into prep quantities, with a *production cap
    suggestion* set at P75 (slight over-prep buffer to avoid
    walk-out, but bounded to prevent waste)

### 4.2 — Property-level dashboard

Aggregates across outlets:

  · Total property guests forecast at each horizon
  · Per-outlet capture ratio (eligible) at each horizon
  · "Revenue capture potential" — what we'd earn if every outlet hit
    its top-decile historical capture (the optimization headroom)
  · Cross-outlet correlation matrix — when restaurant is busy, IRD
    is empty; when banquet is on, bar is up — surfaces in a heatmap

### 4.3 — Onboarding integration

When a new outlet is registered during property onboarding:

  1. The onboarding wizard creates the outlet record
  2. A `outlet.created` event fires
  3. The capture system subscribes; creates a `outlet_capture_weights`
    row with cold-start defaults (taken from the average of similar
    outlets at peer properties of similar size and market)
  4. The outlet immediately appears in the dashboard with the cold-
    start forecast and a "Cold-start" banner that fades after 30 days
    of actuals
  5. As actuals flow in, the weights diverge from defaults toward
    property-specific reality

---

## 5. Implementation map

| Component                                  | Status          | File                                                |
|--------------------------------------------|-----------------|-----------------------------------------------------|
| Outlet registry + capture events + ratios  | Built this PR   | `backend/routes/outlet_capture.py`                  |
| Active learning loop                       | Built this PR   | `backend/echo/outlet_capture_learner.py`            |
| Onboarding hook                            | Built this PR   | `backend/routes/onboarding_wizard.py` (extended)    |
| Event-bus subscribers (debounced recompute)| Built this PR   | inside `outlet_capture.py`                          |
| Scheduler jobs (daily aggregation + nudge) | Built this PR   | `backend/scheduler.py` (extended)                   |
| Server router registration                 | Built this PR   | `backend/server.py` (extended)                      |
| Frontend dashboards                        | **Not in this PR** | UI commission for Emergent — separate ticket    |
| Replace `forecast_21day.py` synthesis      | **Not in this PR** | Larger refactor — separate ticket                |

---

## 6. What this gives the human

  · A real, append-only log of every guest-outlet touch.
  · Three precisely-defined capture ratios available everywhere.
  · Per-outlet, per-horizon (1d / 3d / 5d / 10d / 21d) forecasts with
    P10/P50/P90 bands.
  · An active learning loop that publishes its accuracy honestly and
    drives error down asymptotically.
  · Event-driven incremental recompute — under 60s from a change to
    the updated forecast.
  · Onboarding-aware — new outlets enter the system on registration
    with cold-start defaults.
  · Doctrine-aligned — append-only, transparent, retrospective.

  · It does NOT promise 0.0001% accuracy. It publishes the actual
    error every day and lets the team watch it converge.
