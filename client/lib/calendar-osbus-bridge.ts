import { osBus } from "@/lib/os-bus";
import type { CalendarEvent } from "@/types/calendar";
import { useCalendarStore } from "@/modules/GlobalCalendar/stores/useCalendarStore";
import { listLocalCalendarEvents, upsertLocalCalendarEvent } from "@/lib/calendar-local-store";

declare global {
  interface Window {
    __calendarOSBridgeInit?: boolean;
  }
}

function isEventLike(v: any): v is CalendarEvent {
  return Boolean(v && typeof v === "object" && typeof v.id === "string");
}

function seedStoreFromLocal() {
  const store = useCalendarStore.getState();
  const existing = store.events || [];
  const local = listLocalCalendarEvents();
  if (local.length === 0) return;

  // Merge by id (prefer latest updatedAt/start_time from incoming)
  const map = new Map<string, CalendarEvent>();
  for (const e of existing) map.set(e.id, e);
  for (const e of local) map.set(e.id, { ...(map.get(e.id) || ({} as any)), ...e });
  store.setEvents(Array.from(map.values()));
}

export function initCalendarOSBusBridge() {
  if (typeof window !== "undefined" && window.__calendarOSBridgeInit) return;
  if (typeof window !== "undefined") window.__calendarOSBridgeInit = true;

  try {
    seedStoreFromLocal();
  } catch (err) {
    console.warn("[CalendarOSBusBridge] seed failed (non-fatal):", err);
  }

  osBus.on("calendar:event_created", (payload: any) => {
    const evt: CalendarEvent | null =
      isEventLike(payload?.event) ? payload.event
      : isEventLike(payload?.data?.event) ? payload.data.event
      : null;

    // If we only got an eventId (no server available), do nothing.
    if (!evt) return;

    try {
      upsertLocalCalendarEvent(evt);
    } catch {
      // ignore
    }
    try {
      const store = useCalendarStore.getState();
      store.addEvent(evt);
    } catch {
      // ignore
    }
  });

  osBus.on("calendar:event_updated", (payload: any) => {
    const evt: CalendarEvent | null =
      isEventLike(payload?.event) ? payload.event
      : isEventLike(payload?.data?.event) ? payload.data.event
      : null;
    if (!evt) return;
    try {
      upsertLocalCalendarEvent(evt);
    } catch {
      // ignore
    }
    try {
      const store = useCalendarStore.getState();
      store.updateEvent(evt);
    } catch {
      // ignore
    }
  });
}

// Auto-init
try {
  initCalendarOSBusBridge();
} catch (err) {
  console.warn("[CalendarOSBusBridge] init failed (non-fatal):", err);
}

