import { CapabilityGraph, buildCapabilityGraph, summariseGraph } from "../capability-graph/graph";
import { CapabilityManifest, loadCapabilityManifests } from "../capability-graph/parser";

export interface MeshNode {
  id: string;
  name: string;
  tags: string[];
  owner?: string;
  dependsOn: string[];
  provides: string[];
}

export interface MeshSummary {
  graph: CapabilityGraph;
  heatmap: Record<string, number>;
  orphanedCapabilities: string[];
  recipeToInventory: Array<{ recipe: string; inventory: string }>;
  meta: ReturnType<typeof summariseGraph>;
}

export interface MeshOptions {
  manifests?: CapabilityManifest[];
  root?: string;
}

async function ensureManifests(options: MeshOptions): Promise<CapabilityManifest[]> {
  if (options.manifests) return options.manifests;
  if (!options.root) {
    throw new Error("Either manifests or root must be provided to build the cognitive mesh");
  }
  return loadCapabilityManifests(options.root, { excludeDirs: ["node_modules", "dist"] });
}

export async function buildCognitiveMesh(options: MeshOptions): Promise<MeshSummary> {
  const manifests = await ensureManifests(options);
  const graph = buildCapabilityGraph(manifests);
  const heatmap: Record<string, number> = {};
  const orphaned: string[] = [];
  const recipeToInventory: Array<{ recipe: string; inventory: string }> = [];

  for (const node of graph.nodes.values()) {
    heatmap[node.owner ?? "unassigned"] = (heatmap[node.owner ?? "unassigned"] ?? 0) + 1;

    const dependencies = graph.adjacency.get(node.id);
    if (!dependencies || dependencies.size === 0) {
      orphaned.push(node.id);
    }

    if (node.tags.includes("recipe")) {
      for (const dependency of dependencies ?? []) {
        const depNode = graph.nodes.get(dependency);
        if (depNode && depNode.tags.includes("inventory")) {
          recipeToInventory.push({ recipe: node.id, inventory: dependency });
        }
      }
    }
  }

  return {
    graph,
    heatmap,
    orphanedCapabilities: orphaned,
    recipeToInventory,
    meta: summariseGraph(graph),
  };
}
