/**
 * MaestroBQT Central API
 * Unified data fetching layer for all orchestrated data
 */

import type {
  Event,
  Space,
  Task,
  Change,
  Shortage,
  Financial,
  Conflict,
  ApiResponse,
} from "./types";
import maestroEventBus, { EVENT_TYPES, publishEvent } from "./event-bus";
import { fetchWithRetry, fetchJsonWithRetry } from "@/lib/fetch-with-retry";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

/** Only warn once per data type when falling back to mock (reduces console noise when API is unavailable). */
const mockWarned = new Set<string>();
function warnMockOnce(dataType: string, error: unknown) {
  if (mockWarned.has(dataType)) return;
  mockWarned.add(dataType);
  console.warn(
    `[MaestroBQTApi] ${dataType} API unavailable, using mock data:`,
    error,
  );
}

// Mock data generators for fallback
function getMockEvents(): Event[] {
  const now = new Date();
  return [
    {
      id: "evt-001",
      name: "Corporate Gala",
      status: "definite",
      guestCountCurrent: 250,
      guestCountExpected: 300,
      startDateTime: new Date(
        now.getTime() + 2 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      endDateTime: new Date(
        now.getTime() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000,
      ).toISOString(),
      spaceIds: ["space-001"],
      departmentIds: ["culinary", "service"],
    },
    {
      id: "evt-002",
      name: "Wedding Reception",
      status: "tentative",
      guestCountCurrent: 150,
      guestCountExpected: 200,
      startDateTime: new Date(
        now.getTime() + 5 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      endDateTime: new Date(
        now.getTime() + 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000,
      ).toISOString(),
      spaceIds: ["space-002"],
      departmentIds: ["culinary", "service", "engineering"],
    },
  ];
}

function getMockSpaces(): Space[] {
  return [
    {
      id: "space-001",
      name: "Ballroom A",
      type: "ballroom",
      isActive: true,
      capacity: 500,
      features: ["stage", "dance_floor", "av_ready"],
    },
    {
      id: "space-002",
      name: "Garden Pavilion",
      type: "outdoor",
      isActive: true,
      capacity: 300,
      features: ["flexible_layout"],
    },
    {
      id: "space-003",
      name: "Board Room",
      type: "conference",
      isActive: true,
      capacity: 50,
      features: ["av_system", "video_conferencing"],
    },
  ];
}

function getMockTasks(): Task[] {
  const now = new Date();
  return [
    {
      id: "task-001",
      eventId: "evt-001",
      title: "Prep vegetable mise en place",
      status: "in_progress",
      department: "culinary",
      dueDateTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      priority: "high",
    },
    {
      id: "task-002",
      eventId: "evt-001",
      title: "Set up AV system",
      status: "pending",
      department: "engineering",
      dueDateTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      priority: "high",
    },
  ];
}

function getMockChanges(): Change[] {
  const now = new Date();
  return [
    {
      id: "change-001",
      eventId: "evt-001",
      changeType: "guest_count_increased",
      changedBy: "user-001",
      timestamp: now.toISOString(),
      oldValue: 240,
      newValue: 250,
      impactedDepartments: ["culinary", "service"],
    },
    {
      id: "change-002",
      eventId: "evt-002",
      changeType: "space_changed",
      changedBy: "user-002",
      timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      impactedDepartments: ["all"],
    },
  ];
}

function getMockShortages(): Shortage[] {
  return [
    {
      id: "short-001",
      itemId: "item-001",
      itemName: "Beef Tenderloin",
      requiredQuantity: 100,
      availableQuantity: 75,
      unit: "lbs",
      severity: "high",
      affectedEvents: ["evt-001"],
    },
  ];
}

function getMockFinancials(): Financial[] {
  return [
    {
      eventId: "evt-001",
      projectedRevenue: 25000,
      projectedCost: 12000,
      projectedMargin: 13000,
      margin_percentage: 52,
      riskScore: 0.2,
      keyKpis: {
        revenue_per_guest: 100,
        cost_per_guest: 48,
        labor_hours: 40,
      },
    },
  ];
}

function getMockConflicts(): Conflict[] {
  return [];
}

/** Map server event (maestro/events API) to client Event shape */
function mapMaestroEventToClient(ev: {
  id: string;
  name: string;
  date?: string;
  status?: string;
  guestCount?: number;
  guaranteedGuests?: number;
  eventTypeCode?: string;
  [k: string]: unknown;
}): Event {
  const dateStr = ev.date || new Date().toISOString().slice(0, 10);
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
  const statusMap: Record<string, Event["status"]> = {
    draft: "tentative",
    tentative: "tentative",
    confirmed: "definite",
    definite: "definite",
    in_production: "in_house",
    executed: "completed",
    archived: "completed",
    canceled: "canceled",
  };
  const guest = Number(ev.guestCount) || 0;
  const guaranteed = Number(ev.guaranteedGuests) ?? guest;
  return {
    id: ev.id,
    name: ev.name,
    status: statusMap[String(ev.status).toLowerCase()] ?? "tentative",
    guestCountCurrent: guaranteed,
    guestCountExpected: guest || guaranteed,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    spaceIds: [],
    departmentIds: [],
  };
}

// API Fetcher
class MaestroBQTApi {
  /** Production API: GET /api/maestro/events (live events). Falls back to mock on error. */
  async fetchEvents(): Promise<ApiResponse<Event[]>> {
    try {
      publishEvent(
        EVENT_TYPES.DATA_SYNC_STARTED,
        { dataType: "events" },
        "MaestroBQTApi",
      );

      const response = await fetchWithRetry(`${API_BASE}/api/maestro/events`, {
        maxRetries: 3,
        timeout: 15000,
        fallback: null,
      });

      if (!response?.ok) throw new Error(`HTTP ${response?.status}`);

      const data = await response.json();
      const rawEvents = data.events || data;
      const events = Array.isArray(rawEvents)
        ? rawEvents.map((ev: any) => mapMaestroEventToClient(ev))
        : [];

      publishEvent(
        EVENT_TYPES.DATA_SYNC_COMPLETED,
        { dataType: "events" },
        "MaestroBQTApi",
      );
      return { data: events, status: "success", timestamp: Date.now() };
    } catch (error) {
      warnMockOnce("events", error);
      return {
        data: getMockEvents(),
        status: "mock",
        timestamp: Date.now(),
      };
    }
  }

  async fetchSpaces(): Promise<ApiResponse<Space[]>> {
    try {
      publishEvent(
        EVENT_TYPES.DATA_SYNC_STARTED,
        { dataType: "spaces" },
        "MaestroBQTApi",
      );

      const response = await fetchWithRetry(`${API_BASE}/api/spaces`, {
        maxRetries: 3,
        timeout: 10000,
        fallback: null,
      });

      if (!response || !response.ok) {
        throw new Error(`HTTP ${response?.status || 'unknown'}`);
      }

      const data = await response.json();

      publishEvent(
        EVENT_TYPES.DATA_SYNC_COMPLETED,
        { dataType: "spaces" },
        "MaestroBQTApi",
      );

      return {
        data: data.spaces || data,
        status: "success",
        timestamp: Date.now(),
      };
    } catch (error) {
      warnMockOnce("spaces", error);
      return {
        data: getMockSpaces(),
        status: "mock",
        timestamp: Date.now(),
      };
    }
  }

  async fetchTasks(): Promise<ApiResponse<Task[]>> {
    try {
      publishEvent(
        EVENT_TYPES.DATA_SYNC_STARTED,
        { dataType: "tasks" },
        "MaestroBQTApi",
      );

      const response = await fetchWithRetry(`${API_BASE}/api/tasks`, {
        maxRetries: 3,
        timeout: 10000,
        fallback: null,
      });

      if (!response || !response.ok) {
        throw new Error(`HTTP ${response?.status || 'unknown'}`);
      }

      const data = await response.json();

      publishEvent(
        EVENT_TYPES.DATA_SYNC_COMPLETED,
        { dataType: "tasks" },
        "MaestroBQTApi",
      );

      return {
        data: data.tasks || data,
        status: "success",
        timestamp: Date.now(),
      };
    } catch (error) {
      warnMockOnce("tasks", error);
      return {
        data: getMockTasks(),
        status: "mock",
        timestamp: Date.now(),
      };
    }
  }

  async fetchChanges(): Promise<ApiResponse<Change[]>> {
    try {
      publishEvent(
        EVENT_TYPES.DATA_SYNC_STARTED,
        { dataType: "changes" },
        "MaestroBQTApi",
      );

      const response = await fetchWithRetry(`${API_BASE}/api/changes`, {
        maxRetries: 3,
        timeout: 10000,
        fallback: null,
      });

      if (!response?.ok) {
        throw new Error(`HTTP ${response?.status}`);
      }

      const data = await response.json();

      publishEvent(
        EVENT_TYPES.DATA_SYNC_COMPLETED,
        { dataType: "changes" },
        "MaestroBQTApi",
      );

      return {
        data: data.changes || data,
        status: "success",
        timestamp: Date.now(),
      };
    } catch (error) {
      warnMockOnce("changes", error);
      return {
        data: getMockChanges(),
        status: "mock",
        timestamp: Date.now(),
      };
    }
  }

  async fetchShortages(): Promise<ApiResponse<Shortage[]>> {
    try {
      publishEvent(
        EVENT_TYPES.DATA_SYNC_STARTED,
        { dataType: "shortages" },
        "MaestroBQTApi",
      );

      const response = await fetchWithRetry(`${API_BASE}/api/shortages`, {
        maxRetries: 3,
        timeout: 10000,
        fallback: null,
      });

      if (!response?.ok) {
        throw new Error(`HTTP ${response?.status}`);
      }

      const data = await response.json();

      publishEvent(
        EVENT_TYPES.DATA_SYNC_COMPLETED,
        { dataType: "shortages" },
        "MaestroBQTApi",
      );

      return {
        data: data.shortages || data,
        status: "success",
        timestamp: Date.now(),
      };
    } catch (error) {
      warnMockOnce("shortages", error);
      return {
        data: getMockShortages(),
        status: "mock",
        timestamp: Date.now(),
      };
    }
  }

  async fetchFinancials(): Promise<ApiResponse<Financial[]>> {
    try {
      publishEvent(
        EVENT_TYPES.DATA_SYNC_STARTED,
        { dataType: "financials" },
        "MaestroBQTApi",
      );

      const response = await fetchWithRetry(`${API_BASE}/api/financials`, {
        maxRetries: 3,
        timeout: 10000,
        fallback: null,
      });

      if (!response?.ok) {
        throw new Error(`HTTP ${response?.status}`);
      }

      const data = await response.json();

      publishEvent(
        EVENT_TYPES.DATA_SYNC_COMPLETED,
        { dataType: "financials" },
        "MaestroBQTApi",
      );

      return {
        data: data.financials || data,
        status: "success",
        timestamp: Date.now(),
      };
    } catch (error) {
      warnMockOnce("financials", error);
      return {
        data: getMockFinancials(),
        status: "mock",
        timestamp: Date.now(),
      };
    }
  }

  async fetchConflicts(): Promise<ApiResponse<Conflict[]>> {
    try {
      const response = await fetchWithRetry(`${API_BASE}/api/conflicts`, {
        maxRetries: 3,
        timeout: 10000,
        fallback: null,
      });

      if (!response?.ok) {
        throw new Error(`HTTP ${response?.status}`);
      }

      const data = await response.json();

      return {
        data: data.conflicts || data,
        status: "success",
        timestamp: Date.now(),
      };
    } catch (error) {
      warnMockOnce("conflicts", error);
      return {
        data: getMockConflicts(),
        status: "mock",
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Production API: GET /api/beo/event/:eventId – BEOs for an event (for BEO list/operations).
   */
  async fetchBEOsForEvent(
    eventId: string,
  ): Promise<{ data: any[]; status: "success" | "mock"; timestamp: number }> {
    try {
      const response = await fetchWithRetry(
        `${API_BASE}/api/beo/event/${encodeURIComponent(eventId)}`,
        {
          maxRetries: 3,
          timeout: 10000,
          fallback: null,
        }
      );
      if (!response?.ok) throw new Error(`HTTP ${response?.status}`);
      const json = await response.json();
      const data = json.data && Array.isArray(json.data) ? json.data : [];
      return { data, status: "success", timestamp: Date.now() };
    } catch (error) {
      console.warn(
        "[MaestroBQTApi] fetchBEOsForEvent failed, returning empty:",
        error,
      );
      return { data: [], status: "mock", timestamp: Date.now() };
    }
  }

  /**
   * Production API: GET /api/beo/:beoId – single BEO detail.
   */
  async fetchBEO(beoId: string): Promise<{
    data: any | null;
    status: "success" | "mock";
    timestamp: number;
  }> {
    try {
      const response = await fetchWithRetry(
        `${API_BASE}/api/beo/${encodeURIComponent(beoId)}`,
        {
          maxRetries: 3,
          timeout: 10000,
          fallback: null,
        }
      );
      if (!response?.ok) throw new Error(`HTTP ${response?.status}`);
      const json = await response.json();
      return {
        data: json.data ?? null,
        status: "success",
        timestamp: Date.now(),
      };
    } catch (error) {
      console.warn("[MaestroBQTApi] fetchBEO failed:", error);
      return { data: null, status: "mock", timestamp: Date.now() };
    }
  }

  /**
   * Fetch all data in parallel
   */
  async fetchAll() {
    const results = await Promise.all([
      this.fetchEvents(),
      this.fetchSpaces(),
      this.fetchTasks(),
      this.fetchChanges(),
      this.fetchShortages(),
      this.fetchFinancials(),
      this.fetchConflicts(),
    ]);

    return {
      events: results[0],
      spaces: results[1],
      tasks: results[2],
      changes: results[3],
      shortages: results[4],
      financials: results[5],
      conflicts: results[6],
      timestamp: Date.now(),
    };
  }
}

export const maestroApi = new MaestroBQTApi();

export default maestroApi;
