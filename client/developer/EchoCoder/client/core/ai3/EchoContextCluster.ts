import { EchoMemoryVault } from "./EchoMemoryVault";
import { EchoPersonas } from "./EchoPersonas";

interface ContextPacket {
  module: string;
  topic: string;
  persona: string;
  data: any;
  timestamp: number;
}

export class EchoContextCluster {
  private static instance: EchoContextCluster | null = null;
  private readonly vault = EchoMemoryVault.getInstance();
  private readonly personas = EchoPersonas.getInstance();
  private readonly cache = new Map<string, ContextPacket>();

  private constructor() {}

  static getInstance() {
    if (!EchoContextCluster.instance) {
      EchoContextCluster.instance = new EchoContextCluster();
    }
    return EchoContextCluster.instance;
  }

  async syncContext(module: string, topic: string, data: any) {
    const persona = this.personas.getPersona();
    const packet: ContextPacket = {
      module,
      topic,
      persona: persona.mode,
      data,
      timestamp: Date.now(),
    };
    this.cache.set(this.key(module, topic), packet);
    await this.vault.storeMemory(this.key(module, topic), packet);
    return packet;
  }

  async recallContext(module: string, topic: string) {
    const cached = this.cache.get(this.key(module, topic));
    if (cached) return cached;
    const stored = await this.vault.recallMemory<ContextPacket>(this.key(module, topic));
    if (stored) {
      this.cache.set(this.key(module, topic), stored);
    }
    return stored;
  }

  summarizeModules() {
    const summary: Record<string, number> = {};
    this.cache.forEach((packet) => {
      summary[packet.module] = (summary[packet.module] || 0) + 1;
    });
    return summary;
  }

  private key(module: string, topic: string) {
    return `${module}::${topic}`;
  }
}
