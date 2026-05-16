<!-- Per-algorithm 2-pager. Parent catalog: ALGORITHM_INVENTORY.md. SCORECARD ref: Section 3c. -->

# 3c — Yield-Aware Costing

> ⚠️ **MODULE BOUNDARY STATUS — PENDING MERGE TO MAIN**
> `backend/routes/chef_outlet.py` (1358 LoC, including Monte Carlo at line 318) and `backend/routes/beverage_network.py` (622 LoC, VIP Pre-Check) live only on `origin/conflict_110526_1036`. Commissary COGS routes are partially on main.
> Score state: **3c.1 module boundary = 🟨 pending merge** until merge fires.

---

## Files

| Path | LoC | Branch | Role |
|---|---|---|---|
| `backend/routes/chef_outlet.py` | 1,358 | conflict-only | Monte Carlo forecaster + YTD aggregator + BEO event detail |
| `backend/routes/chef_outlet.py:_monte_carlo_forecast` | line 318 | conflict-only | Bootstrap-based Monte Carlo with `ALLOWED_ITER` ∈ {1k, 2k, 5k, 7500} |
| `backend/routes/beverage_network.py` | 622 | conflict-only | VIP Pre-Check + central + per-outlet velocity aggregator |
| `backend/routes/commissary*` | (multiple) | partial on main | Commissary catalog + COGS attribution + cross-outlet ordering |

## Inputs

- **outlet_capture_daily** historical revenue / cover / item-mix per outlet
- **Recipe DAG** (per `FRESH_MEAL_CLAUDE_SPEC.md` Revelation 2 — "the Recipe is a Graph, Not a List") — yield/cost/allergen propagation up the graph
- **Commissary on-hand** (central + per-outlet inventory state)
- **Per-outlet velocity** (consumption rate by SKU per outlet)
- **VIP Pre-Check expected-need** (heuristic-derived projected beverage demand from VIP arrival roster)
- **Operator-selectable iteration count** for Monte Carlo (1k cheap-fast / 7500 high-fidelity)

## Outputs

- **1-7 day revenue forecast** per outlet with **Monte Carlo confidence bands** (5th / 50th / 95th percentile)
- **Yield-aware purchasing recommendation** — how much to order centrally vs. per-outlet based on projected demand × current on-hand × per-outlet velocity
- **VIP Pre-Check beverage list** — pre-positioned bottles per VIP arrival with expected-need heuristic confidence
- **Forecast vs actual variance** (post-fact) — feeds the Prophet self-calibration loop (cross-link to 3d)
- **Commissary COGS attribution** — per-outlet cost allocation from central purchasing

## Heuristic Logic

### Monte Carlo forecasting (the inner engine)

`_monte_carlo_forecast(outlet_id, iterations, horizons)`:

1. **Historical resampling**: bootstrap from `outlet_capture_daily` with replacement
2. **Normal-noise overlay**: per-day standard deviation modeled against historical residuals
3. **Iteration count** ∈ `ALLOWED_ITER` = {1000, 2000, 5000, 7500}; operator-selectable for speed/fidelity tradeoff
4. **Horizon sweep**: 1d / 3d / 5d / 7d forward, each iteration producing a sample trajectory
5. **Percentile reduction**: 5th / 50th / 95th percentile at each horizon = confidence band

The Monte Carlo isn't ML — it's classical bootstrap with normal-noise overlay. Interpretable, operator-tunable, audit-friendly. Cross-link to [SILENT_SERVICE.md:154-166](../../docs/maestro/SILENT_SERVICE.md) — the Monte Carlo retrospective doctrine: when the forecast is wrong, the system **investigates which iteration was right and learns from it** rather than just adjusting weights.

### Yield-aware purchasing decision

Given forecast demand (from Monte Carlo) + central on-hand + per-outlet velocity:

1. **Compute net need per outlet** = forecast_demand - current_on_hand
2. **Aggregate central order requirement** = Σ(net_need by outlet) - central_on_hand
3. **Apply yield uncertainty**: recipes have yield variance (a 5lb beef tenderloin doesn't always produce 14 portions; could be 12-15). The yield band propagates up the recipe DAG.
4. **Surface to operator** with confidence: "Order 28 lb tenderloin (median forecast) ± 4 lb (90% CI). Hold 12% safety stock for VIP Pre-Check."

This is the **cross-system bridge** — Monte Carlo revenue prediction × central-purchasing on-hand × per-outlet velocity. Siloed forecasting tools (MarketMan = inventory-only, Toast = POS-only) can't compose these three dimensions.

## Novelty Statement

**Yield-aware forecasting that bridges Monte Carlo revenue prediction with central-purchasing on-hand vs per-outlet velocity** — distinct from competitors along three dimensions:

1. **Cross-system bridge.** MarketMan does inventory; Toast does POS-forecasting; LUCCCA's 3c does both in joint evaluation. No single competitor crosses the boundary.

2. **Recipe-DAG yield propagation.** Per `FRESH_MEAL_CLAUDE_SPEC.md`: "yields, allergens, costs, nutrition propagate up the graph automatically." Recipe variance — a critical hospitality cost driver — is first-class in LUCCCA, ignored or hand-rolled in competitors.

3. **Doctrinal Monte Carlo retrospective.** Cross-link [SILENT_SERVICE.md:154–166](../../docs/maestro/SILENT_SERVICE.md): "When the system is wrong... the response is not adjustment. It is investigation." LUCCCA's Monte Carlo is operator-interpretable (which iteration was right? what signal did we weight too low?) — distinct from black-box statistical forecasters (Duetto, IDeaS) which adjust weights without explanation. **The forecast is the doctrine.**

The combination of (Monte Carlo bootstrap + recipe DAG yield propagation + operator-interpretable retrospective) is the distinct intangible.

## Competitor Delta

| Competitor | What they do | Where 3c differs |
|---|---|---|
| **MarketMan** | Inventory + recipe costing in isolation | No Monte Carlo; no per-outlet velocity model; no recipe DAG with yield variance |
| **Toast** | POS-driven historical reporting + simple forecasting | No central-purchasing bridge; no yield-uncertainty model; no recipe DAG |
| **Compeat (R365)** | Inventory + accounting | No Monte Carlo; statistical-only forecasting; no operator-interpretable retrospective |
| **Duetto / IDeaS** | Hotel revenue management with deep statistics | Statistical optimization; doesn't expose iteration-level interpretation; not hospitality-F&B-native |
| **Restaurant365** | Restaurant accounting with operations layer | Reporting-out, not forecasting-out; no Monte Carlo or yield variance |
| **xtraCHEF / Plate IQ** | AP automation + invoice processing | Cost-side only; no forecasting; complementary not competitive |

## Cross-links

### Doctrine
- [SILENT_SERVICE.md](../../docs/maestro/SILENT_SERVICE.md) lines 154–166 — **the Monte Carlo retrospective doctrine** is the philosophical anchor for 3c. "What signal did I weight too low? What pattern did I fail to connect? Which of my own predictions, in some Monte Carlo branch, produced the right number — and why did I not surface it?" The forecast doesn't just predict; it teaches.
- [SILENT_SERVICE.md:146](../../docs/maestro/SILENT_SERVICE.md) — "Yesterday's accuracy is today's floor" — Monte Carlo retrospective drives toward .00001 precision (cross-link to BRIGADE_LEARNINGS .01 principle)
- [BRIGADE_LEARNINGS.md](../../docs/maestro/BRIGADE_LEARNINGS.md) — the .01 principle operational form anchors the iteration-count choice (1k cheap / 7500 high-fidelity) — operator chooses precision posture per query

### Parent catalog
- [ALGORITHM_INVENTORY.md](./ALGORITHM_INVENTORY.md) — Section B.1 item #3; Section C items #1 (Monte Carlo CONFIRMED) + #2 (Bootstrap resampling CONFIRMED) + #10 (Recipe-graph yield/cost propagation)
- White paper #4 (LUCCCA Culinary Knowledge Stack) + #5 (EchoStratus Executive Intelligence) + #14 (LUCCCA Fresh)

### Pipeline evidence on disk
- `valuation/algorithms/3c/authorship.txt`
- `valuation/algorithms/3c/timeline.txt`
- `valuation/algorithms/3c/callgraph-chef_outlet.dot`
- `valuation/algorithms/3c/callgraph-beverage_network.dot`

## Status

| Item | State |
|---|---|
| 3c.1 Module boundary | 🟨 pending merge |
| 3c.2 Call graph | 🟩 |
| 3c.3 Spec | 🟩 (this file) |
| 3c.4 Novelty | 🟩 (Novelty Statement above) |
| 3c.5 Git timeline | 🟩 |
| 3c.6 Author attribution | 🟩 |

---

*Yes Chef.*
