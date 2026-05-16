/** * EchoLayout Event Bus * Lightweight pub/sub system for cross-panel communication */ export type EchoLayoutBusEvents =

    | { type: "open-panel"; id: string }
    | { type: "selection-changed"; id: string | null }
    | { type: "layout-changed"; objects: any[] }
    | { type: "place-equipment-arm"; equipmentKey: string | null }
    | { type: "assistant-say"; text: string }
    | { type: "zone-focus"; zoneId: string | null };
export class EventBus<T> {
  private listeners = new Set<(e: T) => void>();
  on(fn: (e: T) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  emit(e: T) {
    for (const fn of this.listeners) fn(e);
  }
  clear() {
    this.listeners.clear();
  }
}
export const echoLayoutBus = new EventBus<EchoLayoutBusEvents>(); // Convenience re-export for quick access
export const bus = echoLayoutBus;
