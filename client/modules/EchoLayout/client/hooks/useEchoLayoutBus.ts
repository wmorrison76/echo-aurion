/** * React hooks for EchoLayout event bus */ import { useEffect } from "react";
import { bus, type EchoLayoutBusEvents } from "../lib/eventBus";
export function useBus(handler: (e: EchoLayoutBusEvents) => void) {
  useEffect(() => {
    const unsubscribe = bus.on(handler);
    return unsubscribe;
  }, [handler]);
}
export function sayToAssistant(text: string) {
  bus.emit({ type: "assistant-say", text });
}
export function armEquipmentPlacement(equipmentKey: string | null) {
  bus.emit({ type: "place-equipment-arm", equipmentKey });
}
export function announceSelection(id: string | null) {
  bus.emit({ type: "selection-changed", id });
}
export function announceLayout(objects: any[]) {
  bus.emit({ type: "layout-changed", objects });
}
export function openPanel(id: string) {
  bus.emit({ type: "open-panel", id });
}
export function focusZone(zoneId: string | null) {
  bus.emit({ type: "zone-focus", zoneId });
}
