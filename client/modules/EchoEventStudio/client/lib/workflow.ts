import { get, post, put } from "@/lib/api-client";
import { osBus } from "@/lib/os-bus";
import type { Prospect, ProspectStage } from "@shared/types/prospect";

export type ProspectRecord = Prospect;

type CalendarEventResponse = {
  success: boolean;
  data?: {
    event?: any;
  };
};

const PROSPECT_EVENT_KEY = "echo:prospect:event-map";

function readProspectEventMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PROSPECT_EVENT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeProspectEventMap(map: Record<string, string>) {
  try {
    localStorage.setItem(PROSPECT_EVENT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

async function getOrgOutletId(): Promise<string> {
  const res = await fetch("/api/calendar/outlets");
  const data = await res.json().catch(() => ({}));
  const outlets = Array.isArray(data?.data) ? data.data : [];
  const outletId = outlets?.[0]?.id;
  if (!outletId) {
    throw new Error("No calendar outlet configured. Create an outlet first.");
  }
  return outletId;
}

export async function ensureCrmClientFromProspect(prospect: ProspectRecord) {
  const search = encodeURIComponent(prospect.email || prospect.name);
  const res = await get<any>(
    `/api/crm/contacts?limit=10&offset=0&search=${search}`,
  );
  const existing = Array.isArray(res?.contacts) ? res.contacts : [];
  const match = existing.find(
    (c: any) =>
      String(c.email || "").toLowerCase() === prospect.email.toLowerCase(),
  );
  if (match?.id) return match.id as string;

  const created = await post<any>("/api/crm/contacts", {
    name: prospect.name,
    email: prospect.email,
    phone: prospect.phone || null,
    company: prospect.name,
    notes: prospect.description || null,
  });
  return created?.contact?.id || created?.id;
}

export async function ensureCalendarEventForProspect(
  prospect: ProspectRecord,
  status: "pending" | "confirmed",
) {
  const map = readProspectEventMap();
  const existingId = map[prospect.id];

  const outletId = prospect.outlet_id || (await getOrgOutletId());
  const startTime = `${prospect.event_date}T09:00:00Z`;
  const endTime = `${prospect.event_date}T13:00:00Z`;

  if (existingId) {
    const updated = await put<CalendarEventResponse>(
      `/api/calendar/events/${existingId}`,
      {
        title: prospect.name,
        outlet_id: outletId,
        start_time: startTime,
        end_time: endTime,
        guest_count: prospect.guest_count || 0,
        revenue: prospect.estimated_revenue || 0,
        status,
        event_type_code: prospect.event_type_code,
        notes: prospect.description || undefined,
        contact_person: prospect.contact_name || undefined,
        metadata: {
          prospect_id: prospect.id,
          source: "EchoEventStudio",
          stage: prospect.status,
        },
      },
    );
    const event = updated?.data?.event;
    if (event?.id) {
      osBus.emit("calendar:event_updated", {
        eventId: event.id,
        event,
        source: "EchoEventStudio",
      });
    }
    return event?.id || existingId;
  }

  const created = await post<CalendarEventResponse>("/api/calendar/events", {
    title: prospect.name,
    outlet_id: outletId,
    start_time: startTime,
    end_time: endTime,
    guest_count: prospect.guest_count || 0,
    revenue: prospect.estimated_revenue || 0,
    status,
    severity: "normal",
    department: "Banquets",
    event_type_code: prospect.event_type_code,
    notes: prospect.description || undefined,
    contact_person: prospect.contact_name || undefined,
    metadata: {
      prospect_id: prospect.id,
      source: "EchoEventStudio",
      stage: prospect.status,
    },
  });
  const event = created?.data?.event;
  if (event?.id) {
    map[prospect.id] = event.id;
    writeProspectEventMap(map);
    osBus.emit("calendar:event_created", {
      eventId: event.id,
      event,
      source: "EchoEventStudio",
    });
    return event.id;
  }
  return null;
}

export function emitProspectSignals(
  prospect: ProspectRecord,
  stage: ProspectStage,
) {
  osBus.emit("prospect:stage_changed", {
    prospectId: prospect.id,
    stage,
    prospect,
    source: "EchoEventStudio",
  });
  osBus.emit("ai:ops_context", {
    topic: "prospect",
    event: "stage_changed",
    payload: { prospect, stage },
    at: Date.now(),
    source: "EchoEventStudio",
  });
  osBus.emit("financial:event", {
    event: {
      type: "PROSPECT_FORECAST",
      prospectId: prospect.id,
      outletId: prospect.outlet_id || null,
      eventDate: prospect.event_date,
      estimatedRevenue: prospect.estimated_revenue || 0,
      guestCount: prospect.guest_count || 0,
      stage,
      source: "EchoEventStudio",
      timestamp: new Date().toISOString(),
    },
    source: "EchoEventStudio",
  });
}
