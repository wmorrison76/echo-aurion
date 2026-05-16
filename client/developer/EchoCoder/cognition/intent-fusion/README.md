# Intent Fusion Router

Intent Fusion combines heuristics with the cognitive mesh to determine which module should handle a user utterance. The export `routeIntent` accepts a transcript and optional mesh root to load capability manifests.

```ts
import { routeIntent } from "@/cognition/intent-fusion/router";

const routed = await routeIntent({
  channel: "voice",
  transcript: "Create an order guide for the dessert station",
  meshRoot: process.cwd(),
});
```

Extend the `intentMatchers` array to cover additional hospitality tasks. For custom models, feed the result into a Transformer or API-based classifier first and use the mesh as a fallback. Ensure transcripts are filtered through privacy guardrails before routing.
