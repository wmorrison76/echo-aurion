export type CoreIdentity = "Echo" | "Stratus" | "Argus";

export interface CoreSignal<T = any> {
  from: CoreIdentity;
  to?: CoreIdentity | "ALL";
  type: string;
  data?: T;
  timestamp: number;
}

export type CoreListener<T = any> = (signal: CoreSignal<T>) => void;

/**
 * Lightweight event hub that mirrors the author-provided LUCCCA mesh without relying on Node's EventEmitter.
 * Works entirely in the browser and keeps a minimal state snapshot for cross-module coordination.
 */
export class EchoAi3Core {
  private static instance: EchoAi3Core | null = null;
  private listeners = new Map<string, Set<CoreListener>>();
  private state = new Map<string, any>();
  private cores: Record<CoreIdentity, any> = {
    Echo: null,
    Stratus: null,
    Argus: null,
  };

  private constructor() {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("%c[EchoAi³] Core initialized", "color:#00e0ff");
    }
  }

  static getInstance(): EchoAi3Core {
    if (!EchoAi3Core.instance) {
      EchoAi3Core.instance = new EchoAi3Core();
    }
    return EchoAi3Core.instance;
  }

  register(coreName: CoreIdentity, coreObject: any) {
    this.cores[coreName] = coreObject;
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log(`[EchoAi³] Registered core: ${coreName}`);
    }
  }

  on<T = any>(type: string, listener: CoreListener<T>) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as CoreListener);
    return () => this.off(type, listener);
  }

  once<T = any>(type: string, listener: CoreListener<T>) {
    const off = this.on(type, (signal) => {
      off();
      listener(signal);
    });
    return off;
  }

  off<T = any>(type: string, listener: CoreListener<T>) {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener as CoreListener);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  send(signal: CoreSignal) {
    const payload: CoreSignal = {
      timestamp: Date.now(),
      ...signal,
    };
    this.emit(payload.type, payload);
  }

  broadcast(from: CoreIdentity, type: string, data?: any) {
    this.emit(type, { from, to: "ALL", type, data, timestamp: Date.now() });
  }

  updateState(key: string, value: any) {
    this.state.set(key, value);
    this.emit("stateUpdate", {
      from: "Echo",
      to: "ALL",
      type: "stateUpdate",
      data: { key, value },
      timestamp: Date.now(),
    });
  }

  getState<T = any>(key: string): T | undefined {
    return this.state.get(key);
  }

  private emit(type: string, signal: CoreSignal) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(signal);
        } catch (error) {
          if (typeof console !== "undefined") {
            console.error("[EchoAi³] listener error", error);
          }
        }
      });
    }
    const wildcards = this.listeners.get("*");
    if (wildcards) {
      wildcards.forEach((listener) => {
        try {
          listener(signal);
        } catch (error) {
          if (typeof console !== "undefined") {
            console.error("[EchoAi³] wildcard listener error", error);
          }
        }
      });
    }
  }
}
