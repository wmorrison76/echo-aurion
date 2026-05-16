import { CoreIdentity, EchoAi3Core } from "./EchoAi3Core";

type LinkType = "support" | "contradict";

interface ReasonNode {
  id: string;
  author: CoreIdentity;
  content: string;
  confidence: number;
  timestamp: number;
  links: { target: string; type: LinkType }[];
}

export class EchoReasonGraph {
  private static instance: EchoReasonGraph | null = null;
  private readonly core = EchoAi3Core.getInstance();
  private readonly nodes: ReasonNode[] = [];

  private constructor() {}

  static getInstance() {
    if (!EchoReasonGraph.instance) {
      EchoReasonGraph.instance = new EchoReasonGraph();
    }
    return EchoReasonGraph.instance;
  }

  addThought(author: CoreIdentity, content: string, confidence = 0.75) {
    const node: ReasonNode = {
      id: `${author}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      author,
      content,
      confidence,
      timestamp: Date.now(),
      links: [],
    };
    this.nodes.push(node);
    this.core.broadcast(author, "reasonUpdate", node);
    return node;
  }

  linkThoughts(fromId: string, toId: string, type: LinkType) {
    const node = this.nodes.find((n) => n.id === fromId);
    if (node) {
      node.links.push({ target: toId, type });
    }
  }

  summarize() {
    const totals: Record<CoreIdentity, number> = { Echo: 0, Stratus: 0, Argus: 0 };
    this.nodes.forEach((node) => {
      totals[node.author] += node.confidence;
    });
    return {
      total: this.nodes.length,
      distribution: totals,
      avgConfidence: this.nodes.length
        ? this.nodes.reduce((acc, node) => acc + node.confidence, 0) / this.nodes.length
        : 0,
    };
  }

  exportGraph() {
    return this.nodes.map((node) => ({ ...node }));
  }
}
