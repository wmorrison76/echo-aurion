import { Router, Request, Response } from "express";

const router = Router();

// Types for event data
interface EventData {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  guestCount: number;
  status: "confirmed" | "tentative" | "cancelled" | "completed";
  requirementsNotes: string;
  staffingNeeds?: {
    role: string;
    count: number;
  }[];
  foodBeverage?: {
    itemName: string;
    quantity: number;
    unit: string;
  }[];
  budgetAmount?: number;
}

interface SyncResult {
  eventId: string;
  maestroSynced: boolean;
  scheduleSynced: boolean;
  calendarSynced: boolean;
  errors: string[];
  timestamp: number;
}

// Mock CRM data source (would be replaced with real Supabase queries)
const getMockEventData = (): EventData[] => [
  {
    id: "event-1",
    name: "Corporate Gala – BEO 876309",
    date: "2024-12-15",
    startTime: "18:00",
    endTime: "23:00",
    location: "Grand Ballroom",
    guestCount: 180,
    status: "confirmed",
    requirementsNotes: "Vegetarian options required, formal dress code",
    staffingNeeds: [
      { role: "Chef", count: 3 },
      { role: "Waiter", count: 12 },
      { role: "Bartender", count: 2 },
    ],
    foodBeverage: [
      { itemName: "Filet Mignon", quantity: 180, unit: "servings" },
      { itemName: "Seasonal Vegetables", quantity: 180, unit: "servings" },
      { itemName: "Champagne", quantity: 48, unit: "bottles" },
    ],
    budgetAmount: 25000,
  },
];

// Sync event to Maestro production system
const syncToMaestro = async (event: EventData): Promise<boolean> => {
  try {
    console.log(`[EVENT-STUDIO] Syncing event ${event.id} to Maestro`);

    // Create work orders for production items
    const workOrders =
      event.foodBeverage?.map((item, idx) => ({
        id: `wo-${event.id}-${idx}`,
        eventId: event.id,
        name: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        status: "pending",
        dueDate: event.date,
        dueTime: "14:00", // 4 hours before event start
      })) || [];

    console.log(
      `[EVENT-STUDIO] Created ${workOrders.length} work orders for Maestro`,
    );

    // In production, this would POST to /api/production/work-orders
    // For now, just log success
    return true;
  } catch (error) {
    console.error("[EVENT-STUDIO] Error syncing to Maestro:", error);
    return false;
  }
};

// Sync event to Schedule system for staffing
const syncToSchedule = async (event: EventData): Promise<boolean> => {
  try {
    console.log(`[EVENT-STUDIO] Syncing event ${event.id} to Schedule`);

    // Create staffing requirements
    const staffingRequirements =
      event.staffingNeeds?.map((need, idx) => ({
        id: `staff-req-${event.id}-${idx}`,
        eventId: event.id,
        role: need.role,
        requiredCount: need.count,
        eventDate: event.date,
        eventStart: event.startTime,
        eventEnd: event.endTime,
        status: "open",
      })) || [];

    console.log(
      `[EVENT-STUDIO] Created ${staffingRequirements.length} staffing requirements`,
    );

    // In production, this would POST to /api/schedule/staffing-requirements
    // For now, just log success
    return true;
  } catch (error) {
    console.error("[EVENT-STUDIO] Error syncing to Schedule:", error);
    return false;
  }
};

// Sync event to Global Calendar
const syncToCalendar = async (event: EventData): Promise<boolean> => {
  try {
    console.log(`[EVENT-STUDIO] Syncing event ${event.id} to Global Calendar`);

    // Map EventStudio event to calendar format
    const calendarEvent = {
      title: event.name,
      outlet_id: "events-outlet", // Default outlet for synced events
      start_time: `${event.date}T${event.startTime}:00`,
      end_time: `${event.date}T${event.endTime}:00`,
      location_room: event.location,
      guest_count: event.guestCount,
      department: "Events", // Default department
      status: mapEventStudioStatusToCalendarStatus(event.status),
      notes: event.requirementsNotes,
      beo_id: event.id, // Link back to the BEO
      revenue: event.budgetAmount,
      contact_person: event.name,
      metadata: {
        source: "event-studio",
        staffingNeeds: event.staffingNeeds,
        foodBeverage: event.foodBeverage,
      },
    };

    // In production, this would POST to /api/calendar/events
    console.log(`[EVENT-STUDIO] Calendar event payload:`, calendarEvent);

    // For now, just log success
    return true;
  } catch (error) {
    console.error("[EVENT-STUDIO] Error syncing to Calendar:", error);
    return false;
  }
};

// Map EventStudio status to Calendar status
const mapEventStudioStatusToCalendarStatus = (
  status: "confirmed" | "tentative" | "cancelled" | "completed",
): "pending" | "confirmed" | "conflict" | "locked" => {
  switch (status) {
    case "confirmed":
    case "completed":
      return "confirmed";
    case "tentative":
      return "pending";
    case "cancelled":
      return "locked";
    default:
      return "pending";
  }
};

// Get all events from CRM
router.get("/events", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(
      `[EVENT-STUDIO] Fetching events from ${startDate} to ${endDate}`,
    );

    const events = getMockEventData();

    // Filter by date range if provided
    let filteredEvents = events;
    if (startDate && endDate) {
      filteredEvents = events.filter(
        (e) => e.date >= (startDate as string) && e.date <= (endDate as string),
      );
    }

    res.json({ events: filteredEvents, total: filteredEvents.length });
  } catch (error) {
    console.error("[EVENT-STUDIO] Error fetching events:", error);
    res.status(500).json({
      error: "Failed to fetch events",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Sync an event to Maestro, Schedule, and Calendar
router.post("/sync/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    console.log(`[EVENT-STUDIO] Starting sync for event: ${eventId}`);

    const events = getMockEventData();
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Sync to all systems
    const maestroSynced = await syncToMaestro(event);
    const scheduleSynced = await syncToSchedule(event);
    const calendarSynced = await syncToCalendar(event);

    const result: SyncResult = {
      eventId,
      maestroSynced,
      scheduleSynced,
      calendarSynced,
      errors: [],
      timestamp: Date.now(),
    };

    if (!maestroSynced) {
      result.errors.push("Failed to sync to Maestro");
    }
    if (!scheduleSynced) {
      result.errors.push("Failed to sync to Schedule");
    }
    if (!calendarSynced) {
      result.errors.push("Failed to sync to Calendar");
    }

    console.log(`[EVENT-STUDIO] Sync completed for event ${eventId}:`, result);

    res.json(result);
  } catch (error) {
    console.error("[EVENT-STUDIO] Error syncing event:", error);
    res.status(500).json({
      error: "Failed to sync event",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Sync all new/updated events
router.post("/sync-all", async (req: Request, res: Response) => {
  try {
    console.log("[EVENT-STUDIO] Starting full sync of all events");

    const events = getMockEventData();
    const results: SyncResult[] = [];

    for (const event of events) {
      const maestroSynced = await syncToMaestro(event);
      const scheduleSynced = await syncToSchedule(event);
      const calendarSynced = await syncToCalendar(event);

      results.push({
        eventId: event.id,
        maestroSynced,
        scheduleSynced,
        calendarSynced,
        errors: [
          ...(maestroSynced ? [] : ["Maestro sync failed"]),
          ...(scheduleSynced ? [] : ["Schedule sync failed"]),
          ...(calendarSynced ? [] : ["Calendar sync failed"]),
        ],
        timestamp: Date.now(),
      });
    }

    console.log(`[EVENT-STUDIO] Full sync completed: ${results.length} events`);

    res.json({
      total: results.length,
      successful: results.filter(
        (r) => r.maestroSynced && r.scheduleSynced && r.calendarSynced,
      ).length,
      failed: results.filter(
        (r) => !r.maestroSynced || !r.scheduleSynced || !r.calendarSynced,
      ).length,
      results,
    });
  } catch (error) {
    console.error("[EVENT-STUDIO] Error in full sync:", error);
    res.status(500).json({
      error: "Failed to sync events",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get event details with full requirements
router.get("/events/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    console.log(`[EVENT-STUDIO] Fetching details for event: ${eventId}`);

    const events = getMockEventData();
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({
      event,
      maestroWorkOrders: event.foodBeverage?.length || 0,
      staffingRequirements: event.staffingNeeds?.length || 0,
    });
  } catch (error) {
    console.error("[EVENT-STUDIO] Error fetching event details:", error);
    res.status(500).json({
      error: "Failed to fetch event details",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Sync specific event to Calendar only
router.post("/sync-calendar/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    console.log(`[EVENT-STUDIO] Syncing event ${eventId} to Calendar`);

    const events = getMockEventData();
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const calendarSynced = await syncToCalendar(event);

    res.json({
      eventId,
      calendarSynced,
      timestamp: Date.now(),
      message: calendarSynced
        ? "Event synced to calendar successfully"
        : "Failed to sync event to calendar",
    });
  } catch (error) {
    console.error("[EVENT-STUDIO] Error syncing to calendar:", error);
    res.status(500).json({
      error: "Failed to sync event to calendar",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update event status (confirmed, cancelled, etc.)
router.put("/events/:eventId/status", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    console.log(
      `[EVENT-STUDIO] Updating event ${eventId} status to: ${status}`,
    );

    const events = getMockEventData();
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Also sync to calendar when status changes
    const calendarSynced = await syncToCalendar(event);

    // In production, this would update the database and trigger updates to Maestro/Schedule/Calendar
    res.json({
      eventId,
      status,
      updated: true,
      calendarSynced,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[EVENT-STUDIO] Error updating event status:", error);
    res.status(500).json({
      error: "Failed to update event status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
