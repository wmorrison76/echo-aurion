import type { CalendarEvent } from "@/types/calendar";

const KEY = "luccca.calendar.localEvents.v1";

function loadAll(): Record<string, CalendarEvent> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, CalendarEvent>;
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, CalendarEvent>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function upsertLocalCalendarEvent(event: CalendarEvent): CalendarEvent {
  const all = loadAll();
  all[event.id] = event;
  saveAll(all);
  return event;
}

export function listLocalCalendarEvents(): CalendarEvent[] {
  const all = loadAll();
  return Object.values(all).sort((a, b) => String(b.start_time || b.date || "").localeCompare(String(a.start_time || a.date || "")));
}

export function removeLocalCalendarEvent(eventId: string): void {
  const all = loadAll();
  delete all[eventId];
  saveAll(all);
}

