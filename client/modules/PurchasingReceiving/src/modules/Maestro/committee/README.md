# Maestro Committee Mode

This package introduces the dual-core (Planner + Risk) and triple-core (Planner + Risk + Historian) orchestration used by LUCCCA to generate banquet orders, prep, carts, and QC gates with automated guardrails.

## Quick Start

```ts
import { runCommittee } from "@modules/Maestro/committee";
import { createPlannerAgent, createRiskAgent, createHistoryAgent } from "@modules/Maestro/committee/agents";
import { resolveCommitteeConfig } from "@modules/Maestro/committee/config";

const decision = await runCommittee({
  context: { runId: "RUN-001", scheduledAt: new Date().toISOString(), eventId: "BEO-123" },
  agents: {
    planner: createPlannerAgent(async (ctx) => buildPipelineProposal(ctx)),
    risk: createRiskAgent(async (proposal, ctx) => verifyPolicy(proposal, ctx)),
    history: createHistoryAgent(async (proposal, ctx) => adjustFromHistory(proposal, ctx)),
  },
  computeMetrics: computeProposalMetrics,
  config: resolveCommitteeConfig(),
});

if (decision.state !== "approved") {
  presentDiffDrawer(decision);
}
```

Provide three async functions when running a committee:

- `planner.propose` – produce the draft proposal (demand, POs, prep, carts, QC).
- `risk.critique` – run policy checks, returning `approve`, `issues`, and `fixes`.
- `history.critique` (optional) – learning adjustments from waste/uptake history.
- `computeMetrics` – return `CommitteeMetrics` for scoring/constraints.

## Environment Flags

All toggles are optional; defaults match the dual-core baseline.

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_MAESTRO_COMMITTEE_MODE` | `dual` or `triple` | `dual` |
| `VITE_MAESTRO_COMMITTEE_ENFORCE_HARD_STOPS` | If `true`, block on hard-fail | `true` |
| `VITE_MAESTRO_COMMITTEE_UNDER_ORDER_THRESHOLD` | Max stockout probability (decimal) | `0.0025` |
| `VITE_MAESTRO_COMMITTEE_ESCALATION_DELTA_PCT` | Spend delta (%) before escalation | `0.08` |
| `VITE_MAESTRO_WEIGHT_COST` | Weight for total spend in scoring | `0.35` |
| `VITE_MAESTRO_WEIGHT_WASTE` | Weight for projected waste | `0.20` |
| `VITE_MAESTRO_WEIGHT_STOCKOUT` | Weight for stockout risk | `0.20` |
| `VITE_MAESTRO_WEIGHT_SHELF` | Weight for shelf-life violations | `0.15` |
| `VITE_MAESTRO_WEIGHT_QC` | Weight for QC failure risk | `0.05` |
| `VITE_MAESTRO_WEIGHT_LABOR` | Weight for overtime hours | `0.05` |

Use `resolveCommitteeConfig()` to merge environment values with overrides before running the committee.

## Committee Decision Output

`runCommittee` returns a `CommitteeDecision` structure containing:

- `state`: `"approved"`, `"escalate"`, or `"blocked"`.
- `finalProposal` and `initialProposal`: before/after agent fixes.
- `critique[]`: issues, fixes, and duration per agent.
- `metrics` & `baselineMetrics`: raw metrics used for scoring.
- `score`: weighted score plus normalized components.
- `hardConstraints`: pass/fail context for shelf-life, stockout, QC, etc.
- `fixesApplied`: operational summary of each applied fix (success/error).
- `reason`: human-readable summary when escalation or block occurs.

## Hard Constraints & Scoring

`metrics.ts` exposes helpers:

- `scoreMetrics(metrics, config)` – weighted score with normalized components.
- `evaluateConstraints(proposal, metrics, config)` – returns pass/fail for each registered hard constraint.

Override or extend constraint evaluators by passing a custom list to `runCommittee({ evaluators })`.

## Agent Factories

Use `createPlannerAgent`, `createRiskAgent`, and `createHistoryAgent` for simple function-based agents. They normalize optional fields and ensure `agent` identifiers are set.

## Hooks for React

`useCommitteeConfig()` memoizes `resolveCommitteeConfig` for React components (e.g., toggles in Maestro Generate). Override individual values by passing `options.overrides`.

```ts
const config = useCommitteeConfig({ overrides: { mode: "triple" } });
```

## Integration Checklist

1. Replace fixture lookups with live adapters (calendar, recipes, inventory, vendor catalog).
2. Feed Maestro pipeline output into `createPlannerAgent`.
3. Implement `risk.critique` to enforce shelf-life, allergen, T-24, and under-order policies.
4. Optionally add `history.critique` once waste/uptake data is available.
5. Wire Maestro UI toggle to `resolveCommitteeConfig()` or `useCommitteeConfig()` to select `dual` vs `triple`.
6. Capture `CommitteeDecision` in your RunId audit log and render diffs when `state !== "approved"`.

## Logging Hooks

Provide `config.logger` to capture proposals, critiques, and decisions (e.g., append to Supabase audit tables or push to Sentry breadcrumbs).

```ts
const config = resolveCommitteeConfig({
  overrides: {
    logger: {
      onDecision: (ctx, decision) => console.info("Run", ctx.runId, decision.state, decision.reason),
    },
  },
});
```

The logger callbacks are optional; omit them for silent operation.
