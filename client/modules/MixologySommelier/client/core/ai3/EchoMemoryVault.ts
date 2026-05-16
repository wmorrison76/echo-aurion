import { EchoAi3Core } from "./EchoAi3Core";
const STORAGE_PREFIX = "echo.ai3.memory:";
export class EchoMemoryVault {
  private static instance: EchoMemoryVault | null = null;
  private readonly cache = new Map<string, any>();
  private readonly core = EchoAi3Core.getInstance();
  private constructor() {
    if (typeof window !== "undefined") {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => {
          try {
            const parsed = JSON.parse(
              window.localStorage.getItem(key) || "null",
            );
            if (parsed !== null) {
              this.cache.set(key.slice(STORAGE_PREFIX.length), parsed);
            }
          } catch {
            /* ignore corrupt entries */
          }
        });
    }
  }
  static getInstance() {
    if (!EchoMemoryVault.instance) {
      EchoMemoryVault.instance = new EchoMemoryVault();
    }
    return EchoMemoryVault.instance;
  }
  async storeMemory(topic: string, data: any) {
    this.cache.set(topic, data);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${topic}`,
        JSON.stringify(data),
      );
    }
    this.core.broadcast("Stratus", "memoryStored", { topic, data });
  }
  async recallMemory<T = any>(topic: string): Promise<T | null> {
    if (this.cache.has(topic)) {
      return this.cache.get(topic) as T;
    }
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(`${STORAGE_PREFIX}${topic}`)
        : null;
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      this.cache.set(topic, parsed);
      return parsed;
    } catch {
      return null;
    }
  }
  async forgetMemory(topic: string) {
    this.cache.delete(topic);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`${STORAGE_PREFIX}${topic}`);
    }
    this.core.broadcast("Stratus", "memoryForgotten", { topic });
  }
  listTopics() {
    return Array.from(this.cache.keys());
  }
}
