# Capability Graph

Capability manifests describe what each module provides and consumes. Place manifests anywhere in the repository (for example `modules/**/capability.yaml`) and the utilities in this folder will discover and parse them.

```ts
import { loadCapabilityManifests } from "@/cognition/capability-graph/parser";
import { buildCapabilityGraph } from "@/cognition/capability-graph/graph";

const manifests = await loadCapabilityManifests(process.cwd());
const graph = buildCapabilityGraph(manifests);
```

Detect cycles to prevent dependency deadlocks and use the summary data to ensure every capability has an owner.
