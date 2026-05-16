import { CapabilityManifest } from "./parser";
export interface CapabilityEdge {
  from: string;
  to: string;
  kind: "depends-on" | "provides" | "consumes";
}
export interface CapabilityNode {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  tags: string[];
  inputs: string[];
  outputs: string[];
  dependsOn: string[];
  rawPath: string;
}
export interface CapabilityGraph {
  nodes: Map<string, CapabilityNode>;
  edges: CapabilityEdge[];
  adjacency: Map<string, Set<string>>;
  reverseAdjacency: Map<string, Set<string>>;
  cycles: string[][];
}
export function buildCapabilityGraph(
  manifests: CapabilityManifest[],
): CapabilityGraph {
  const nodes = new Map<string, CapabilityNode>();
  const adjacency = new Map<string, Set<string>>();
  const reverseAdjacency = new Map<string, Set<string>>();
  const edges: CapabilityEdge[] = [];
  for (const manifest of manifests) {
    nodes.set(manifest.id, { ...manifest });
    adjacency.set(manifest.id, new Set());
    reverseAdjacency.set(manifest.id, new Set());
  }
  for (const manifest of manifests) {
    for (const dep of manifest.dependsOn) {
      if (!nodes.has(dep)) continue;
      adjacency.get(manifest.id)?.add(dep);
      reverseAdjacency.get(dep)?.add(manifest.id);
      edges.push({ from: manifest.id, to: dep, kind: "depends-on" });
    }
    for (const input of manifest.inputs) {
      const provider = manifests.find((candidate) =>
        candidate.outputs.includes(input),
      );
      if (provider) {
        adjacency.get(manifest.id)?.add(provider.id);
        reverseAdjacency.get(provider.id)?.add(manifest.id);
        edges.push({ from: manifest.id, to: provider.id, kind: "consumes" });
      }
    }
    for (const output of manifest.outputs) {
      edges.push({ from: manifest.id, to: output, kind: "provides" });
    }
  }
  const cycles = detectCycles(adjacency);
  return { nodes, edges, adjacency, reverseAdjacency, cycles };
}
function detectCycles(adjacency: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[][] = [];
  function dfs(node: string, path: string[]) {
    if (stack.has(node)) {
      const cycleStartIndex = path.indexOf(node);
      cycles.push(path.slice(cycleStartIndex));
      return;
    }
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    stack.add(node);
    const neighbors = adjacency.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path, neighbor]);
      }
    }
    stack.delete(node);
  }
  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      dfs(node, [node]);
    }
  }
  return cycles;
}
export function summariseGraph(graph: CapabilityGraph) {
  const owners = new Map<string, number>();
  const tags = new Map<string, number>();
  for (const node of graph.nodes.values()) {
    if (node.owner) {
      owners.set(node.owner, (owners.get(node.owner) ?? 0) + 1);
    }
    node.tags.forEach((tag) => tags.set(tag, (tags.get(tag) ?? 0) + 1));
  }
  return {
    nodeCount: graph.nodes.size,
    dependencyCount: graph.edges.filter((edge) => edge.kind !== "provides")
      .length,
    owners: Array.from(owners.entries()).map(([owner, count]) => ({
      owner,
      count,
    })),
    tags: Array.from(tags.entries()).map(([tag, count]) => ({ tag, count })),
    cycles: graph.cycles,
  };
}
