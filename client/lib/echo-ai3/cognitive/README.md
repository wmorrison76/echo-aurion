# EchoAi³ Cognitive Operating Layer

EchoAi³ is the **cognitive operating layer** of LUCCCA. It is not a chatbot. It observes the system via TraceLedger and Control Plane, orchestrates dock/panels safely, teaches users from live trace data, demonstrates workflows (audit-safe), governs agents and explains their behavior, maintains trace-anchored memory and confidence, and translates operations into executive narratives.

## Hard Constraints

- **Do NOT introduce new authority systems** — use existing TraceLedger, Control Plane, panel registry, guardrails.
- **Do NOT infer state** — only use data present in TraceLedger/payloads.
- **Do NOT bypass audit** — all demonstrations and orchestration emit trace where applicable.
- **Extend existing architecture only** — no new auth, no new policy engines.

## Build Order (Implemented)

1. **Perception** (`perception.ts`) — Trace + Control Plane binding (observe only): `observeFromTrace`, `observeFromServer`, `observeAgentTrace`.
2. **Orchestration** (`orchestration.ts`) — Dock/panel orchestration via panel-registry and panel-controller; guardrail-safe; optional trace emit.
3. **Teaching & Demonstration** (`teaching.ts`) — `buildTeachingContext` (trace-backed), `runDemoStep` (audit-safe).
4. **Agent supervision** (`agent-supervision.ts`) — `submitAgentProposal` (existing API), `explainAgentBehaviorFromTrace`.
5. **Memory & confidence** (`memory.ts`) — Trace-anchored memory (references only), `confidenceFromPayload`, `remember`, `recall`.
6. **Executive narrative** (`narrative.ts`) — `toExecutiveSegments`, `toExecutiveNarrative` from TraceLedger entries.

## Usage

```ts
import {
  observeFromTrace,
  orchestrate,
  buildTeachingContext,
  runDemoStep,
  submitAgentProposal,
  remember,
  recall,
  toExecutiveSegments,
  toExecutiveNarrative,
} from "@/lib/echo-ai3/cognitive";
```

## Dependencies

- `@/lib/trace-ledger-client` — TraceLedger (client store)
- `@/lib/panel-controller` — dock/panel events
- `@/lib/panel-registry` — panel keys and metadata
- `@/lib/echo-ai-guardrails` — parse/validate/execute commands
- `@shared/types/trace-ledger` — TraceLedgerEntry
- `@shared/types/agent-contracts` — AgentProposalRequest/Response

This document is the source of truth for the cognitive layer.
