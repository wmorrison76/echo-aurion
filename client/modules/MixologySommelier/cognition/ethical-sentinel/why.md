# Why Ledger

Every autonomous action must include a "why" payload. Store append-only JSON objects here so auditors can reconstruct Echo's reasoning.

```json
{
  "id": "order-guide-2025-10-12",
  "timestamp": "2025-10-12T05:45:00Z",
  "action": "prepare_purchase_order",
  "inputs": ["recipes/winter-desserts"],
  "constraints": ["requires_human_send"],
  "rationale": "Chef requested five dessert recipes; inventory simulator flagged low cream so vendor order prepared for review."
}
```

Rotate files daily to keep diffs small.
