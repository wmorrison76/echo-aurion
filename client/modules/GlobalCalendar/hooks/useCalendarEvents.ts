/**
 * useCalendarEvents
 * Fetches calendar events from the API with filters.
 * Integrates with the GlobalCalendar Zustand store and manages loading/error state.
 */

import { useCallback, useEffect, useState } from "react";

/** Only warn once when calendar API is unavailable (reduces console noise). */
let calendarFetchWarned = false;
import { osBus } from "@/lib/os-bus";
import {
  useCalendarStore,
  useSelectedDate,
  useSelectedOutlets,
} from "../stores/useCalendarStore";
import type { CalendarEvent, ListEventsFilter } from "@/types/calendar";
import { EventSeverity, EventStatus } from "@/types/calendar";
import type { ProspectCalendarEvent } from "@shared/types/prospect";

function getOrgIdForRequest(): string {
  if (typeof window === "undefined") return "default";

  const orgRaw = localStorage.getItem("auth_org");
  if (orgRaw) {
    try {
      const parsed = JSON.parse(orgRaw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      /* ignore */
    }
  }

  const userRaw = localStorage.getItem("auth_user");
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      const id = String(parsed?.org_id || "").trim();
      if (id) return id;
    } catch {
      /* ignore */
    }
  }

  const alt = String(localStorage.getItem("orgId") || "").trim();
  if (alt) return alt;
  return "default";
}

export interface UseCalendarEventsOptions {
  autoFetch?: boolean;
  debounceMs?: number;
}

export interface UseCalendarEventsResult {
  events: CalendarEvent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  total: number;
  hasMore: boolean;
}

function mapProspectToCalendarEvent(
  prospect: ProspectCalendarEvent,
  orgId: string,
  outletIdFallback?: string,
): CalendarEvent {
  const date = prospect.date;
  const start_time = prospect.dateTime || `${date}T12:00:00.000Z`;
  const end_time = prospect.dateTime
    ? new Date(
        new Date(prospect.dateTime).getTime() + 4 * 60 * 60 * 1000,
      ).toISOString()
    : `${date}T16:00:00.000Z`;

  const riskSeverity =
    prospect.risk_level === "high"
      ? EventSeverity.HIGH
      : prospect.risk_level === "medium"
        ? EventSeverity.MEDIUM
        : EventSeverity.NORMAL;

  return {
    id: prospect.id,
    org_id: orgId,
    outlet_id: prospect.outlet_id || outletIdFallback || "default",
    title: `${prospect.title} (Possible)`,
    start_time,
    end_time,
    date,
    department: "Events",
    status: EventStatus.PENDING,
    severity: riskSeverity,
    guest_count: prospect.guest_count,
    revenue: prospect.estimated_revenue,
    contact_person: prospect.contact_email,
    created_by: "system",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ["prospect"],
    metadata: {
      prospectId: prospect.prospect_id,
      prospectStage: prospect.status,
      eventTypeCode: prospect.event_type_code,
      isProspect: true,
      scheduling_conflicts: prospect.scheduling_conflicts,
    },
  };
}

export function useCalendarEvents(
  options: UseCalendarEventsOptions = {},
): UseCalendarEventsResult {
  const { autoFetch = true, debounceMs = 300 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const events = useCalendarStore((s) => s.events);
  const setEvents = useCalendarStore((s) => s.setEvents);
  const addEvent = useCalendarStore((s) => s.addEvent);
  const updateEvent = useCalendarStore((s) => s.updateEvent);
  const setIsLoadingEvents = useCalendarStore((s) => s.setIsLoadingEvents);

  const selectedOutlets = useSelectedOutlets();
  const selectedDate = useSelectedDate();

  const fetchEvents = useCallback(
    async (filters?: ListEventsFilter) => {
      try {
        setIsLoading(true);
        setIsLoadingEvents(true);
        setError(null);

        const params = new URLSearchParams();

        if (selectedOutlets.length > 0) {
          params.append("outlet_ids", selectedOutlets.join(","));
        }

        const dateObj = new Date(selectedDate);
        const endDate = new Date(dateObj);
        endDate.setDate(endDate.getDate() + 30);

        params.append("start_date", selectedDate);
        params.append("end_date", endDate.toISOString().split("T")[0]);

        if (filters) {
          if (filters.status?.length)
            params.append("status", filters.status.join(","));
          if (filters.search) params.append("search", filters.search);
          if (filters.location_room)
            params.append("location_room", filters.location_room);
          if (filters.department)
            params.append("department", filters.department);
          if (filters.limit) params.append("limit", String(filters.limit));
          if (filters.offset) params.append("offset", String(filters.offset));
        }

        const response = await fetch(
          `/api/calendar/events?${params.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-Org-ID": getOrgIdForRequest(),
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.statusText}`);
        }

        const data = await response.json();
        const orgId = getOrgIdForRequest();
        if (data?.success && data?.data) {
          const baseEvents = data.data.items || [];
          let mergedEvents = baseEvents;
          try {
            const prospectParams = new URLSearchParams();
            prospectParams.append("date_from", selectedDate);
            prospectParams.append(
              "date_to",
              endDate.toISOString().split("T")[0],
            );
            if (selectedOutlets.length === 1) {
              prospectParams.append("outlet_id", selectedOutlets[0]);
            }
            const prospectsResponse = await fetch(
              `/api/calendar/prospects?${prospectParams.toString()}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "X-Org-ID": orgId,
                },
              },
            );
            if (prospectsResponse.ok) {
              const prospectData = await prospectsResponse.json();
              const prospectEvents = (prospectData?.events || [])
                .filter((evt: ProspectCalendarEvent) => evt?.status !== "lost")
                .map((evt: ProspectCalendarEvent) =>
                  mapProspectToCalendarEvent(evt, orgId, selectedOutlets[0]),
                );
              mergedEvents = [...baseEvents, ...prospectEvents];
            }
          } catch (prospectError) {
            // eslint-disable-next-line no-console
            console.warn("Failed to fetch prospect events:", prospectError);
          }
          setEvents(mergedEvents);
          setTotal(data.data.total || 0);
          setHasMore(data.data.has_more || false);
        } else {
          throw new Error(data?.error || "Failed to fetch events");
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        // Log once per page load when calendar API is unavailable (e.g. 404) to reduce console noise
        if (!calendarFetchWarned) {
          calendarFetchWarned = true;
          console.warn(
            "Calendar events API unavailable:",
            e instanceof Error ? e.message : e,
          );
        }
      } finally {
        setIsLoading(false);
        setIsLoadingEvents(false);
      }
    },
    [selectedOutlets, selectedDate, setEvents, setIsLoadingEvents],
  );

  useEffect(() => {
    if (!autoFetch) return;
    const timer = window.setTimeout(() => {
      void fetchEvents();
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [autoFetch, debounceMs, fetchEvents]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      osBus.on("calendar:event_created", (payload: any) => {
        const evt = payload?.event ?? payload?.data?.event ?? null;
        if (evt) {
          addEvent(evt);
          return;
        }
        void fetchEvents();
      }),
    );

    unsubs.push(
      osBus.on("calendar:event_updated", (payload: any) => {
        const evt = payload?.event ?? payload?.data?.event ?? null;
        if (evt) {
          updateEvent(evt);
          return;
        }
        void fetchEvents();
      }),
    );

    return () => unsubs.forEach((u) => u());
  }, [addEvent, fetchEvents, updateEvent]);

  return {
    events,
    isLoading,
    error,
    refetch: () => fetchEvents(),
    total,
    hasMore,
  };
}

export function useCalendarEvent(eventId: string | null) {
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      return;
    }

    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/calendar/events/${eventId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Org-ID": getOrgIdForRequest(),
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch event: ${response.statusText}`);
        }

        const data = await response.json();
        if (data?.success && data?.data) {
          setEvent(data.data.event);
        } else {
          throw new Error(data?.error || "Failed to fetch event");
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        // eslint-disable-next-line no-console
        console.error("Error fetching event:", e);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchEvent();
  }, [eventId]);

  return { event, isLoading, error };
}

export function useCreateEvent() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const addEvent = useCalendarStore((s) => s.addEvent);

  const createEvent = useCallback(
    async (eventData: any) => {
      try {
        setIsCreating(true);
        setError(null);

        const response = await fetch("/api/calendar/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Org-ID": getOrgIdForRequest(),
          },
          body: JSON.stringify(eventData),
        });

        if (!response.ok)
          throw new Error(`Failed to create event: ${response.statusText}`);

        const data = await response.json();
        if (data?.success && data?.data) {
          addEvent(data.data.event);
          return data.data;
        }
        throw new Error(data?.error || "Failed to create event");
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        // eslint-disable-next-line no-console
        console.error("Error creating event:", e);
        throw e;
      } finally {
        setIsCreating(false);
      }
    },
    [addEvent],
  );

  return { createEvent, isCreating, error };
}

export function useUpdateEvent(eventId: string) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const updateEvent = useCalendarStore((s) => s.updateEvent);

  const updateEventData = useCallback(
    async (updates: any) => {
      try {
        setIsUpdating(true);
        setError(null);

        const response = await fetch(`/api/calendar/events/${eventId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Org-ID": getOrgIdForRequest(),
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok)
          throw new Error(`Failed to update event: ${response.statusText}`);

        const data = await response.json();
        if (data?.success && data?.data) {
          updateEvent(data.data.event);
          return data.data;
        }
        throw new Error(data?.error || "Failed to update event");
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        // eslint-disable-next-line no-console
        console.error("Error updating event:", e);
        throw e;
      } finally {
        setIsUpdating(false);
      }
    },
    [eventId, updateEvent],
  );

  return { updateEvent: updateEventData, isUpdating, error };
}

export function useDeleteEvent() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const removeEvent = useCalendarStore((s) => s.removeEvent);

  const deleteEvent = useCallback(
    async (eventId: string, hardDelete: boolean = false) => {
      try {
        setIsDeleting(true);
        setError(null);

        const url = new URL(
          `/api/calendar/events/${eventId}`,
          window.location.origin,
        );
        if (hardDelete) url.searchParams.append("hard_delete", "true");

        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Org-ID": getOrgIdForRequest(),
          },
        });

        if (!response.ok)
          throw new Error(`Failed to delete event: ${response.statusText}`);

        const data = await response.json();
        if (data?.success) {
          removeEvent(eventId);
          return data;
        }
        throw new Error(data?.error || "Failed to delete event");
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        // eslint-disable-next-line no-console
        console.error("Error deleting event:", e);
        throw e;
      } finally {
        setIsDeleting(false);
      }
    },
    [removeEvent],
  );

  return { deleteEvent, isDeleting, error };
}

export function useRefreshEvents() {
  const { refetch } = useCalendarEvents();
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  return { refresh };
}
