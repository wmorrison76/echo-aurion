import type { CalendarEvent } from "@/../shared/types/calendar";

/**
 * Calendar API helper
 * - single place to fetch canonical event objects
 * - keeps MaestroBQT from re-implementing fetch logic
 */

export async function fetchCalendarEvent(
  eventId: string,
): Promise<CalendarEvent> {
  const res = await fetch(
    `/api/calendar/events/${encodeURIComponent(eventId)}`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch calendar event ${eventId}: ${res.status} ${text}`,
    );
  }

  const data = await res.json();

  // Minimal normalization (defensive)
  return {
    id: data.id ?? eventId,
    title: data.title ?? data.name ?? "Untitled Event",
    start: data.start ?? data.startTime ?? data.start_at ?? "",
    end: data.end ?? data.endTime ?? data.end_at ?? "",
    timezone: data.timezone,

    locationName: data.locationName ?? data.location ?? data.outletName,
    room: data.room ?? data.space ?? data.venue,

    outletId: data.outletId,
    outletName: data.outletName,

    status: data.status,
    classification: data.classification ?? data.eventClassification,

    exp: data.exp ?? data.counts?.exp,
    gtd: data.gtd ?? data.counts?.gtd,
    set: data.set ?? data.counts?.set,

    contactName: data.contactName ?? data.contacts?.primaryContactName,
    contactEmail: data.contactEmail ?? data.contacts?.primaryContactEmail,
    contactPhone: data.contactPhone ?? data.contacts?.primaryContactPhone,

    notes: data.notes ?? data.additionalInfo?.notes,
    updatedAt: data.updatedAt ?? data.updated_at,
  };
}
