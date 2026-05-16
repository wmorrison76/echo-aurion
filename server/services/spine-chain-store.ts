import path from "path";
import { promises as fs } from "fs";

export type SpineNodeType =
  | "invoice"
  | "ingredient"
  | "storage"
  | "recipe"
  | "dish"
  | "menu"
  | "pos"
  | "export";

export type SpineNode = {
  id: string;
  type: SpineNodeType;
  label: string;
};

export type SpineLink = {
  fromId: string;
  toId: string;
  relation: string;
};

export type SpineChain = {
  id: string;
  orgId: string;
  nodes: SpineNode[];
  links: SpineLink[];
  createdAt: string;
};

type StoreShape = {
  version: 1;
  chains: Record<string, SpineChain[]>;
};

const STORE_PATH = path.resolve(process.cwd(), "server/localdata/spine-chain.v1.json");

const nowIso = () => new Date().toISOString();

const ensureDir = async () => {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
};

const readStore = async (): Promise<StoreShape> => {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || parsed.version !== 1 || typeof parsed.chains !== "object") {
      return { version: 1, chains: {} };
    }
    return parsed;
  } catch {
    return { version: 1, chains: {} };
  }
};

const writeStore = async (next: StoreShape) => {
  await ensureDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
};

const createId = () => `spine_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const createSpineChain = async (orgId: string, nodes: SpineNode[], links: SpineLink[]) => {
  const store = await readStore();
  if (!store.chains[orgId]) {
    store.chains[orgId] = [];
  }
  const chain: SpineChain = {
    id: createId(),
    orgId,
    nodes,
    links,
    createdAt: nowIso(),
  };
  store.chains[orgId].unshift(chain);
  await writeStore(store);
  return chain;
};

export const getSpineChain = async (orgId: string, chainId: string) => {
  const store = await readStore();
  return store.chains[orgId]?.find((chain) => chain.id === chainId) ?? null;
};

export const findSpinePath = (chain: SpineChain, start: SpineNodeType, end: SpineNodeType) => {
  const nodesById = new Map(chain.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, string[]>();
  chain.links.forEach((link) => {
    if (!adjacency.has(link.fromId)) adjacency.set(link.fromId, []);
    adjacency.get(link.fromId)?.push(link.toId);
  });

  const startNodes = chain.nodes.filter((node) => node.type === start);
  const endNodeIds = new Set(
    chain.nodes.filter((node) => node.type === end).map((node) => node.id),
  );

  for (const startNode of startNodes) {
    const queue: string[] = [startNode.id];
    const visited = new Set<string>([startNode.id]);
    const parent = new Map<string, string | null>([[startNode.id, null]]);

    while (queue.length) {
      const current = queue.shift()!;
      if (endNodeIds.has(current)) {
        const path: SpineNode[] = [];
        let cursor: string | null = current;
        while (cursor) {
          const node = nodesById.get(cursor);
          if (node) path.unshift(node);
          cursor = parent.get(cursor) ?? null;
        }
        return path;
      }
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          parent.set(next, current);
          queue.push(next);
        }
      }
    }
  }
  return null;
};
