/**
 * iter210 · Typed wrapper for `echo:event:*` window CustomEvents
 * (audit recommendation FE-3).
 *
 * NOT to be confused with `./echo-bus.ts` which is a richer typed pub/sub
 * for panel↔Echo orchestration. This file only wraps the DOM-level
 * CustomEvent pattern that iter207b introduced for OpsBoard row actions.
 *
 * Before: `window.dispatchEvent(new CustomEvent("echo:event:open-viewer", { detail: {...} }))`
 *         — string-typed, no autocomplete, typos don't fail at compile time.
 *
 * After:  `echoWindowBus.emit("open-viewer", { id, name })`
 *         — full discriminated-union autocomplete.
 *
 * Already-deployed listeners (EchoViewerDrawer etc.) keep working unchanged.
 */

export type EchoWindowEventMap = {
  // OpsBoard row actions (iter207b)
  "open-schedule": { id: string; name: string };
  "open-recipes": { id: string; name: string };
  "open-viewer": { id: string; name: string };
  "open-aurum": { id: string; name: string };
  "push-maestro": { id: string; name: string };

  // iter210 · EchoWaste
  "waste:capture-complete": { entry_id: string; items: number };
  "waste:review-open": { entry_id: string };
};

type EchoWindowEventName = keyof EchoWindowEventMap;
type Listener<K extends EchoWindowEventName> = (detail: EchoWindowEventMap[K]) => void;

const PREFIX = "echo:event:";

export const echoWindowBus = {
  emit<K extends EchoWindowEventName>(name: K, detail: EchoWindowEventMap[K]): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(PREFIX + name, { detail }));
  },

  on<K extends EchoWindowEventName>(name: K, cb: Listener<K>): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = (e: Event) => cb((e as CustomEvent<EchoWindowEventMap[K]>).detail);
    window.addEventListener(PREFIX + name, handler as EventListener);
    return () => window.removeEventListener(PREFIX + name, handler as EventListener);
  },
};

export default echoWindowBus;
