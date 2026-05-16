# Neural Meta-Loop

The neural meta-loop daemon evaluates Echo AI³'s performance signals once per day and records a reflection plus improvement plan. The script ingests metrics emitted from guardrails, satisfaction surveys, and operations KPIs.

## Inputs

Provide a JSON array to `--metrics` with the following structure:

```json
[
  { "label": "chef_satisfaction", "value": 0.91 },
  { "label": "order_accuracy", "value": 0.88, "weight": 1.5 },
  { "label": "latency", "value": 0.42 }
]
```

Values should be normalized between 0 and 1. The optional `weight` field increases or decreases the influence of a metric.

## Outputs

The daemon writes:

- `reflection.json` – Structured data for dashboards or additional analytics.
- `log.md` – Human-readable summary that leadership can review quickly.

## Scheduling

Run `python cognition/neural-meta-loop/daemon.py --metrics metrics.json --output reports/meta-loop` from a nightly job. Combine the report with policy guardrails before Echo adjusts her own behaviour.
