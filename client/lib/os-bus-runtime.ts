/**
 * OS Bus Runtime Wiring
 * - Bridges legacy/internal buses into the canonical OS Bus
 * - Forwards ops context into EchoAi³ dialogue bus (best-effort)
 *
 * Import this ONCE at app startup (see client/index.tsx).
 */

import { osBus } from "@/lib/os-bus";
import maestroEventBus from "@/modules/MaestroBQT/event-bus";
import { EVENT_TYPES } from "@/modules/MaestroBQT/event-bus";
import { financialEventBus } from "@/lib/financial-event-bus";
import { EchoDialogueBus } from "@/core/ai3/EchoDialogueBus";
import "@/lib/os-event-router";
import "@/lib/scheduling-osbus-bridge";
import "@/lib/calendar-osbus-bridge";
import { pushAiTransparencyEntry } from "@/lib/ai-transparency-log";

declare global {
  interface Window {
    __osBusRuntimeInit?: boolean;
  }
}

function safeString(v: any): string {
  try {
    return String(v ?? "");
  } catch {
    return "";
  }
}

export function initOSBusRuntime() {
  if (typeof window !== "undefined" && window.__osBusRuntimeInit) return;
  if (typeof window !== "undefined") window.__osBusRuntimeInit = true;

  // 1) Bridge MaestroBQT internal bus -> OS Bus (canonical)
  maestroEventBus.subscribe("*", (msg: any) => {
    osBus.emit("maestro:internal_event", { message: msg, source: "maestro-event-bus" });

    // Best-effort mapping of core lifecycle events into canonical names.
    const t = safeString(msg?.type);
    const payload = msg?.payload ?? {};
    const eventId = safeString(payload?.eventId ?? payload?.id ?? payload?.event_id).trim();

    if (t === EVENT_TYPES.EVENT_CREATED && eventId) {
      osBus.emit("calendar:event_created", { eventId, source: "maestro-event-bus" });
    }
    if ((t === EVENT_TYPES.EVENT_UPDATED || t === EVENT_TYPES.EVENT_TIME_CHANGED) && eventId) {
      osBus.emit("calendar:event_updated", { eventId, source: "maestro-event-bus" });
    }
    if (t === EVENT_TYPES.SHORTAGE_DETECTED && eventId) {
      // No dedicated OS event yet; forward as AI ops context so EchoAi can react.
      osBus.emit("ai:ops_context", {
        topic: "inventory",
        event: "shortage_detected",
        payload,
        at: Date.now(),
        source: "maestro-event-bus",
      });
    }
  });

  // 2) Bridge Financial bus -> OS Bus (canonical)
  financialEventBus.onAll(async (evt: any) => {
    osBus.emit("financial:event", { event: evt, source: "financial-event-bus" });
    osBus.emit("ai:ops_context", {
      topic: "financial",
      event: safeString(evt?.type),
      payload: evt,
      at: Date.now(),
      source: "financial-event-bus",
    });
  });

  // 3) Forward OS Bus into EchoAi³ dialogue bus (best-effort, non-blocking)
  const dialogue = EchoDialogueBus.getInstance();
  osBus.onAny((event, payload) => {
    // Keep payload small-ish; EchoAi core can always request more via module APIs later.
    dialogue.publish("ops", { event: String(event), at: Date.now(), payload });

    const eventName = String(event);
    if (
      eventName.startsWith("ai:") ||
      eventName.startsWith("echo:") ||
      eventName.startsWith("prospect:") ||
      eventName.startsWith("calendar:")
    ) {
      pushAiTransparencyEntry({
        id: `ai-log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        event: eventName,
        source: safeString((payload as any)?.source),
        summary: safeString((payload as any)?.summary || (payload as any)?.message),
        payload: (payload as any)?.event ? { event: (payload as any).event } : payload,
      });
    }
  });
}

// Auto-init on import
try {
  initOSBusRuntime();
} catch (err) {
  // Never block app boot
  console.warn("[OSBusRuntime] init failed (non-fatal):", err);
}

