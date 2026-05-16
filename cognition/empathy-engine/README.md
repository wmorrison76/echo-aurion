# Empathy Engine 2.0

This module stores tone curves, sentiment thresholds, and persona presets used by the Sarcasm Slider and other empathy tooling.

Populate `profiles/` with JSON files:

```json
{
  "id": "vip-banquet",
  "baseline": 0.3,
  "caps": { "sarcasm": 0.25, "humor": 0.4 },
  "tips": ["Keep acknowledgements formal", "Offer proactive wine pairings"]
}
```

Use these profiles inside Echo’s runtime to clamp tone levels before sending responses.
