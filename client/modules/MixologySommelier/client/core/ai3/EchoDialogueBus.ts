import { EchoAi3Core } from "./EchoAi3Core";
type Listener = (payload: any) => void;
export class EchoDialogueBus {
  private static instance: EchoDialogueBus | null = null;
  private readonly core = EchoAi3Core.getInstance();
  private readonly listeners = new Map<string, Set<Listener>>();
  private constructor() {}
  static getInstance() {
    if (!EchoDialogueBus.instance) {
      EchoDialogueBus.instance = new EchoDialogueBus();
    }
    return EchoDialogueBus.instance;
  }
  subscribe(topic: string, callback: Listener) {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(callback);
    return () => {
      this.listeners.get(topic)?.delete(callback);
    };
  }
  publish(topic: string, payload: any) {
    this.core.broadcast("Echo", `dialogue:${topic}`, payload);
    const set = this.listeners.get(topic);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          if (typeof console !== "undefined") {
            console.error("[EchoAi³] dialogue listener error", error);
          }
        }
      });
    }
  }
  bridgeModules(
    moduleA: string,
    moduleB: string,
    transform?: (data: any) => any,
  ) {
    return this.subscribe(moduleA, (data) => {
      const processed = transform ? transform(data) : data;
      this.publish(moduleB, processed);
    });
  }
}
