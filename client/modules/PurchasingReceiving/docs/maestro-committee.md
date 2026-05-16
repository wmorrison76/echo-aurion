# Maestro Committee Configuration

The Maestro committee orchestrates Planner, Risk, and optional Historian agents when generating purchasing and production decisions. Dual-core deployments rely on Planner + Risk, while triple-core adds Historian adjustments using recent uptake and waste data.

## Modes

- **Dual** – Planner proposes, Risk critiques. Use this while Historian data is still warming up.
- **Triple** – Planner proposes, Risk critiques, Historian refines based on history. Requires uptake, waste, and QC history feeds.

Switch modes through the Maestro page in the app or by setting `VITE_MAESTRO_COMMITTEE_MODE` in the environment.

## Environment Toggles

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_MAESTRO_COMMITTEE_MODE` | `dual` or `triple` committee orchestration | `dual` |
| `VITE_MAESTRO_COMMITTEE_ENFORCE_HARD_STOPS` | Block runs on policy failures (`true`/`false`) | `true` |
| `VITE_MAESTRO_COMMITTEE_UNDER_ORDER_THRESHOLD` | Max stockout probability (decimal) | `0.0025` |
| `VITE_MAESTRO_COMMITTEE_ESCALATION_DELTA_PCT` | Spend delta that escalates decisions (decimal) | `0.08` |
| `VITE_MAESTRO_WEIGHT_COST` | Weight for total spend in scoring | `0.35` |
| `VITE_MAESTRO_WEIGHT_WASTE` | Weight for projected waste | `0.20` |
| `VITE_MAESTRO_WEIGHT_STOCKOUT` | Weight for stockout risk | `0.20` |
| `VITE_MAESTRO_WEIGHT_SHELF` | Weight for shelf-life violations | `0.15` |
| `VITE_MAESTRO_WEIGHT_QC` | Weight for QC failure risk | `0.05` |
| `VITE_MAESTRO_WEIGHT_LABOR` | Weight for overtime labor | `0.05` |

Any flag omitted from the environment inherits the defaults above.

## Using `resolveCommitteeConfig`

The UI surfaces live environment values and lets you export overrides. Apply them in code with:

```ts
import { resolveCommitteeConfig } from "@modules/Maestro/committee";

const config = resolveCommitteeConfig({
  overrides: {
    mode: "triple",
    enforceHardStops: true,
    underOrderThreshold: 0.0015,
    escalationSpendDeltaPct: 0.06,
    weights: {
      wCost: 0.30,
      wWaste: 0.20,
      wStockout: 0.25,
      wShelf: 0.15,
      wQc: 0.05,
      wLabor: 0.05,
    },
  },
});
```

Pass the resulting config to `runCommittee` or `useCommitteeConfig` so Planner, Risk, and Historian share the same guardrails and weightings.

## Rollout Checklist

1. Enable dual mode and verify policy coverage with hard stops active.
2. Calibrate spend delta and stockout tolerance with finance before relaxing thresholds.
3. Promote triple mode once Historian metrics have at least 30 days of history.
4. Record per-tenant overrides in your deployment manifest for auditing.
