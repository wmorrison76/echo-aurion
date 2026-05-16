/**
 * EchoBus — the nervous system that lets Echo (or any module) operate the whole app.
 *
 * Turns Echo from "answers questions" into "operates the system":
 *   echo.openPanel("cake-viewer", { sessionId: "..." })
 *   echo.insertBlock("beo-menu-builder", { kind: "course", payload })
 *   echo.highlight("inventory", { rowId: "ing-42" })
 *   echo.action("purchasing-engine", "submit_po", { vendor_id, confirm: true })
 *   echo.watch("kds-expo", ["order_created", "ticket_stale"])
 *
 * Design:
 *   - typed pub/sub with namespace prefixes
 *   - panels register handlers on mount, unregister on unmount
 *   - Echo can call openPanel/insertBlock/etc without knowing panel internals
 *   - browser CustomEvent under the hood so non-React modules can join too
 */

type EchoAction = "open" | "insert" | "highlight" | "action" | "focus" | "close" | "emit";

export interface EchoCommand<T = any> {
  verb: EchoAction;
  panelId: string;
  payload?: T;
  correlationId?: string;
  timestamp: number;
  source?: "echo" | "user" | "system";
}

export interface PanelHandlers {
  onOpen?: (payload?: any) => void;
  onInsert?: (payload: any) => void;
  onHighlight?: (payload: any) => void;
  onAction?: (name: string, payload?: any) => Promise<any> | any;
  onFocus?: () => void;
  onClose?: () => void;
}

interface EventTapeEntry {
  id: string;
  at: number;
  verb: EchoAction;
  panelId: string;
  label: string;
  outcome?: "pending" | "success" | "error" | "awaiting-review";
  detail?: string;
}

class EchoBusImpl {
  private handlers = new Map<string, PanelHandlers>();
  private subscribers = new Set<(cmd: EchoCommand) => void>();
  private tape: EventTapeEntry[] = [];
  private tapeSubs = new Set<(tape: EventTapeEntry[]) => void>();
  private activePanelId: string | null = null;
  private focusSubs = new Set<(panelId: string | null) => void>();

  // ─── Registration API (panels call on mount) ───
  register(panelId: string, handlers: PanelHandlers): () => void {
    this.handlers.set(panelId, handlers);
    return () => this.handlers.delete(panelId);
  }

  setFocus(panelId: string | null) {
    if (this.activePanelId === panelId) return;
    this.activePanelId = panelId;
    this.focusSubs.forEach((cb) => cb(panelId));
  }

  getFocus(): string | null {
    return this.activePanelId;
  }

  onFocusChange(cb: (panelId: string | null) => void): () => void {
    this.focusSubs.add(cb);
    return () => this.focusSubs.delete(cb);
  }

  // ─── Command API (Echo / other modules call) ───
  openPanel(panelId: string, payload?: any, source: EchoCommand["source"] = "echo"): void {
    this._emit({ verb: "open", panelId, payload, timestamp: Date.now(), source });
    const h = this.handlers.get(panelId);
    h?.onOpen?.(payload);
    // Also fire the legacy global event that App.tsx listens to, so panel ACTUALLY opens
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: panelId, payload } }));
    }
    this._appendTape({
      id: this._uid(),
      at: Date.now(),
      verb: "open",
      panelId,
      label: `opened ${panelId}`,
      outcome: "success",
    });
  }

  insertBlock(panelId: string, payload: any, source: EchoCommand["source"] = "echo"): void {
    this._emit({ verb: "insert", panelId, payload, timestamp: Date.now(), source });
    const h = this.handlers.get(panelId);
    if (h?.onInsert) {
      h.onInsert(payload);
      this._appendTape({
        id: this._uid(), at: Date.now(), verb: "insert", panelId,
        label: `inserted into ${panelId}`, outcome: "success",
        detail: typeof payload === "object" ? JSON.stringify(payload).slice(0, 120) : String(payload).slice(0, 120),
      });
    } else {
      this._appendTape({
        id: this._uid(), at: Date.now(), verb: "insert", panelId,
        label: `insert failed — ${panelId} not mounted`, outcome: "error",
      });
    }
  }

  highlight(panelId: string, payload: any, source: EchoCommand["source"] = "echo"): void {
    this._emit({ verb: "highlight", panelId, payload, timestamp: Date.now(), source });
    this.handlers.get(panelId)?.onHighlight?.(payload);
    this._appendTape({
      id: this._uid(), at: Date.now(), verb: "highlight", panelId,
      label: `highlighted in ${panelId}`, outcome: "success",
    });
  }

  async action(panelId: string, name: string, payload?: any, source: EchoCommand["source"] = "echo"): Promise<any> {
    this._emit({ verb: "action", panelId, payload: { name, ...payload }, timestamp: Date.now(), source });
    const tapeId = this._uid();
    this._appendTape({
      id: tapeId, at: Date.now(), verb: "action", panelId,
      label: `running ${name} in ${panelId}`, outcome: "pending",
    });
    const h = this.handlers.get(panelId);
    if (!h?.onAction) {
      this._updateTape(tapeId, { outcome: "error", label: `action failed — ${panelId} has no handler` });
      throw new Error(`No action handler registered for panel "${panelId}"`);
    }
    try {
      const result = await h.onAction(name, payload);
      this._updateTape(tapeId, { outcome: "success", label: `completed ${name} in ${panelId}` });
      return result;
    } catch (e: any) {
      this._updateTape(tapeId, { outcome: "error", label: `${name} failed in ${panelId}: ${e?.message?.slice(0, 80)}` });
      throw e;
    }
  }

  focus(panelId: string): void {
    this._emit({ verb: "focus", panelId, timestamp: Date.now() });
    this.handlers.get(panelId)?.onFocus?.();
  }

  close(panelId: string): void {
    this._emit({ verb: "close", panelId, timestamp: Date.now() });
    this.handlers.get(panelId)?.onClose?.();
    if (this.activePanelId === panelId) this.setFocus(null);
  }

  emit<T = any>(panelId: string, payload: T, source: EchoCommand["source"] = "system"): void {
    this._emit({ verb: "emit", panelId, payload, timestamp: Date.now(), source });
  }

  // ─── Subscriptions ───
  subscribe(cb: (cmd: EchoCommand) => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  // ─── Event tape (sentient interface — what Echo is doing right now) ───
  getTape(): EventTapeEntry[] { return [...this.tape]; }
  subscribeTape(cb: (tape: EventTapeEntry[]) => void): () => void {
    this.tapeSubs.add(cb);
    cb(this.tape);
    return () => this.tapeSubs.delete(cb);
  }
  appendTape(entry: Omit<EventTapeEntry, "id" | "at">): string {
    const full: EventTapeEntry = { id: this._uid(), at: Date.now(), ...entry };
    this._appendTape(full);
    return full.id;
  }
  updateTape(id: string, patch: Partial<EventTapeEntry>): void {
    this._updateTape(id, patch);
  }

  clearTape(): void {
    this.tape = [];
    this.tapeSubs.forEach((cb) => cb(this.tape));
  }

  // ─── internals ───
  private _emit(cmd: EchoCommand): void {
    this.subscribers.forEach((cb) => { try { cb(cmd); } catch {} });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("echo-bus", { detail: cmd }));
    }
  }
  private _appendTape(entry: EventTapeEntry): void {
    this.tape = [entry, ...this.tape].slice(0, 200);
    this.tapeSubs.forEach((cb) => cb(this.tape));
  }
  private _updateTape(id: string, patch: Partial<EventTapeEntry>): void {
    this.tape = this.tape.map((e) => (e.id === id ? { ...e, ...patch } : e));
    this.tapeSubs.forEach((cb) => cb(this.tape));
  }
  private _uid(): string { return Math.random().toString(36).slice(2, 10); }
}

// singleton
export const echoBus = new EchoBusImpl();

// Browser-global for non-React modules and dev-tools access
if (typeof window !== "undefined") {
  (window as any).echo = echoBus;
}

// React hook wrapper — keeps the bus usable in functional components
import { useEffect } from "react";
export function useEchoPanel(panelId: string, handlers: PanelHandlers, deps: any[] = []): void {
  useEffect(() => {
    if (!panelId) return;
    const off = echoBus.register(panelId, handlers);
    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId, ...deps]);
}

export function useEchoFocus(panelId: string, active: boolean): void {
  useEffect(() => {
    if (active) echoBus.setFocus(panelId);
    else if (echoBus.getFocus() === panelId) echoBus.setFocus(null);
  }, [panelId, active]);
}
