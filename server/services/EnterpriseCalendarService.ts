/**
 * Enterprise Calendar Service
 * Handles all calendar business logic, permissions, audit logging, and conflict detection
 */

import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import {
  CalendarEvent,
  CalendarOutlet,
  EventPermission,
  CalendarConflict,
  EventAttachment,
  AuditLogEntry,
  CreateEventRequest,
  UpdateEventRequest,
  ListEventsFilter,
  ShareEventRequest,
  CreateOutletRequest,
  DetectConflictsRequest,
  AccessLevel,
  EventStatus,
  AuditAction,
} from "@/types/calendar";

/**
 * EnterpriseCalendarService
 * Main service for calendar operations with full audit trail and permission checks
 */
export class EnterpriseCalendarService {
  private supabase;
  private supabaseUrl: string;
  private supabaseKey: string;
  private fallbackEventsByOrg = new Map<string, CalendarEvent[]>();

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabaseUrl = supabaseUrl || process.env.SUPABASE_URL || "";
    this.supabaseKey =
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    // Only initialize if valid Supabase credentials provided
    if (
      this.supabaseUrl &&
      this.supabaseKey &&
      this.isValidSupabaseUrl(this.supabaseUrl)
    ) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } else {
      console.warn(
        "Supabase not properly configured. Calendar will use fallback mode with in-memory storage.",
      );
      this.supabase = null;
    }
  }

  private isValidSupabaseUrl(url: string): boolean {
    // Validate that it's a proper Supabase URL (should contain .supabase.co domain)
    return url && url.includes(".supabase.co");
  }

  private getFallbackEvents(orgId: string): CalendarEvent[] {
    return this.fallbackEventsByOrg.get(orgId) ?? [];
  }

  private setFallbackEvents(orgId: string, events: CalendarEvent[]): void {
    this.fallbackEventsByOrg.set(orgId, events);
  }

  private findFallbackEvent(
    eventId: string,
  ): { orgId: string; event: CalendarEvent } | null {
    for (const [orgId, events] of this.fallbackEventsByOrg.entries()) {
      const match = events.find((e) => e.id === eventId);
      if (match) return { orgId, event: match };
    }
    return null;
  }

  private async upsertRoomBookingForEvent(
    event: CalendarEvent,
    userId: string,
  ): Promise<void> {
    if (!this.supabase) return;
    if (!event.space_id) {
      await this.cancelRoomBookingsByEvent(event.id);
      return;
    }

    const bookingPayload = {
      org_id: event.org_id,
      outlet_id: event.outlet_id,
      room_id: event.space_id,
      event_id: event.id,
      booked_from: event.start_time,
      booked_until: event.end_time,
      booking_type: "event",
      status: event.status === EventStatus.CANCELLED ? "cancelled" : "confirmed",
      notes: event.notes || null,
      created_by: userId,
    };

    const { data: existing, error: fetchError } = await this.supabase
      .from("room_bookings")
      .select("id, room_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.warn("Room booking lookup failed:", fetchError);
      return;
    }

    if (existing?.id) {
      const { error } = await this.supabase
        .from("room_bookings")
        .update({
          ...bookingPayload,
          room_id: event.space_id,
        })
        .eq("id", existing.id);
      if (error) {
        console.warn("Room booking update failed:", error);
      }
      return;
    }

    const { error } = await this.supabase.from("room_bookings").insert([bookingPayload]);
    if (error) {
      console.warn("Room booking insert failed:", error);
    }
  }

  private async cancelRoomBookingsByEvent(eventId: string): Promise<void> {
    if (!this.supabase) return;
    const { error } = await this.supabase
      .from("room_bookings")
      .update({ status: "cancelled" })
      .eq("event_id", eventId);
    if (error) {
      console.warn("Room booking cancel failed:", error);
    }
  }

  // =====================================================
  // EVENT CRUD OPERATIONS
  // =====================================================

  /**
   * Create a new calendar event
   */
  async createEvent(
    orgId: string,
    eventData: CreateEventRequest,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CalendarEvent> {
    try {
      // Check outlet access (if Supabase available)
      if (this.supabase) {
        await this.checkOutletAccess(
          orgId,
          eventData.outlet_id,
          userId,
          "create",
        );
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      const eventPayload = {
        id,
        org_id: orgId,
        outlet_id: eventData.outlet_id,
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        date: eventData.start_time.split("T")[0],
        location_room: eventData.location_room,
        space_id: eventData.space_id,
        guest_count: eventData.guest_count,
        department: eventData.department,
        status: eventData.status || EventStatus.PENDING,
        severity: eventData.severity || "normal",
        created_by: userId,
        created_at: now,
        updated_at: now,
        notes: eventData.notes,
        beo_id: eventData.beo_id,
        revenue: eventData.revenue,
        contact_person: eventData.contact_person,
        metadata: eventData.metadata || {},
      };

      // If Supabase is not available, persist in memory and return
      if (!this.supabase) {
        const next = [
          ...this.getFallbackEvents(orgId),
          eventPayload as CalendarEvent,
        ];
        this.setFallbackEvents(orgId, next);
        console.warn(
          "Supabase not available, event created in fallback mode",
          eventPayload,
        );
        return eventPayload as CalendarEvent;
      }

      const { data, error } = await this.supabase
        .from("calendar_events")
        .insert([eventPayload])
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await this.logAudit(
        orgId,
        id,
        userId,
        AuditAction.CREATE,
        eventPayload,
        {},
        ipAddress,
        userAgent,
      );

      await this.upsertRoomBookingForEvent(eventPayload as CalendarEvent, userId);

      return data as CalendarEvent;
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  }

  /**
   * Get a single event by ID
   */
  async getEvent(
    eventId: string,
    userId: string,
  ): Promise<CalendarEvent | null> {
    try {
      if (!this.supabase) {
        const found = this.findFallbackEvent(eventId);
        return found?.event ?? null;
      }

      const { data, error } = await this.supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error || !data) return null;

      // Check permission to view
      await this.checkEventAccess(data, userId, "read");

      // Log view action
      await this.logAudit(
        data.org_id,
        eventId,
        userId,
        AuditAction.VIEW,
        {},
        {},
      );

      return data as CalendarEvent;
    } catch (error) {
      console.error("Error fetching event:", error);
      return null;
    }
  }

  /**
   * List events with filters
   */
  async listEvents(
    orgId: string,
    userId: string,
    filters?: ListEventsFilter,
  ): Promise<{ events: CalendarEvent[]; total: number }> {
    try {
      // Fallback mode: list in-memory events
      if (!this.supabase) {
        const allEvents = this.getFallbackEvents(orgId).filter(
          (e) => !(e as any).deleted_at,
        );

        const filtered = allEvents
          .filter((e) => {
            if (filters?.outlet_ids && filters.outlet_ids.length > 0) {
              if (!filters.outlet_ids.includes(e.outlet_id)) return false;
            }

            if (filters?.start_date && e.date < filters.start_date)
              return false;
            if (filters?.end_date && e.date > filters.end_date) return false;

            if (filters?.status && filters.status.length > 0) {
              if (!(filters.status as any[]).includes(e.status)) return false;
            }

            if (filters?.location_room) {
              if (e.location_room !== filters.location_room) return false;
            }

            if (filters?.department) {
              if (e.department !== filters.department) return false;
            }

            if (filters?.search) {
              const q = String(filters.search).toLowerCase();
              const hay = `${e.title} ${e.description ?? ""}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }

            return true;
          })
          .sort((a, b) => {
            const sortBy = filters?.sort_by || "start_time";
            const ascending = filters?.sort_order !== "desc";
            const av = (a as any)[sortBy];
            const bv = (b as any)[sortBy];

            const an = typeof av === "number" ? av : Date.parse(String(av));
            const bn = typeof bv === "number" ? bv : Date.parse(String(bv));
            if (!Number.isNaN(an) && !Number.isNaN(bn)) {
              return ascending ? an - bn : bn - an;
            }

            const as = av == null ? "" : String(av);
            const bs = bv == null ? "" : String(bv);
            return ascending ? as.localeCompare(bs) : bs.localeCompare(as);
          });

        const offset = filters?.offset || 0;
        const limit = filters?.limit || 100;
        const events = filtered.slice(offset, offset + limit);

        return { events, total: filtered.length };
      }

      let query = this.supabase
        .from("calendar_events")
        .select("*", { count: "exact" })
        .eq("org_id", orgId)
        .is("deleted_at", null);

      // Filter by outlet IDs
      if (filters?.outlet_ids && filters.outlet_ids.length > 0) {
        query = query.in("outlet_id", filters.outlet_ids);
      }

      // Filter by date range
      if (filters?.start_date) {
        query = query.gte("date", filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte("date", filters.end_date);
      }

      // Filter by status
      if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      // Filter by location
      if (filters?.location_room) {
        query = query.eq("location_room", filters.location_room);
      }

      // Filter by department
      if (filters?.department) {
        query = query.eq("department", filters.department);
      }

      // Text search
      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
        );
      }

      // Sorting
      const sortBy = filters?.sort_by || "start_time";
      const sortOrder = filters?.sort_order === "desc" ? false : true;
      query = query.order(sortBy, { ascending: sortOrder });

      // Pagination
      const offset = filters?.offset || 0;
      const limit = filters?.limit || 100;
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      // Filter by user permissions (client-side filtering)
      const accessibleEvents = await Promise.all(
        (data || []).map(async (event) => {
          try {
            await this.checkEventAccess(event, userId, "read");
            return event;
          } catch {
            return null;
          }
        }),
      );

      const filteredEvents = accessibleEvents.filter(
        Boolean,
      ) as CalendarEvent[];

      return {
        events: filteredEvents,
        total: count || 0,
      };
    } catch (error) {
      console.error("Error listing events:", error);
      // Return empty list instead of throwing to allow graceful degradation
      return {
        events: [],
        total: 0,
      };
    }
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    userId: string,
    updates: UpdateEventRequest,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CalendarEvent> {
    try {
      if (!this.supabase) {
        const found = this.findFallbackEvent(eventId);
        if (!found) throw new Error("Event not found");

        const now = new Date().toISOString();
        const current = found.event;
        const nextEvent: CalendarEvent = {
          ...current,
          ...updates,
          updated_at: now,
          date: (updates.start_time ?? current.start_time).split("T")[0],
          metadata:
            updates.metadata !== undefined
              ? { ...(current.metadata || {}), ...(updates.metadata || {}) }
              : current.metadata,
        };

        const nextEvents = this.getFallbackEvents(found.orgId).map((e) =>
          e.id === eventId ? nextEvent : e,
        );
        this.setFallbackEvents(found.orgId, nextEvents);

        return nextEvent;
      }

      // Get existing event
      const { data: existingEvent, error: fetchError } = await this.supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (fetchError || !existingEvent) throw new Error("Event not found");

      // Check permission
      await this.checkEventAccess(existingEvent, userId, "write");

      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      // Only include fields that were actually provided
      if (updates.title !== undefined) updatePayload.title = updates.title;
      if (updates.description !== undefined)
        updatePayload.description = updates.description;
      if (updates.start_time !== undefined)
        updatePayload.start_time = updates.start_time;
      if (updates.end_time !== undefined)
        updatePayload.end_time = updates.end_time;
      if (updates.location_room !== undefined)
        updatePayload.location_room = updates.location_room;
      if (updates.space_id !== undefined)
        updatePayload.space_id = updates.space_id;
      if (updates.guest_count !== undefined)
        updatePayload.guest_count = updates.guest_count;
      if (updates.department !== undefined)
        updatePayload.department = updates.department;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.severity !== undefined)
        updatePayload.severity = updates.severity;
      if (updates.notes !== undefined) updatePayload.notes = updates.notes;
      if (updates.beo_id !== undefined) updatePayload.beo_id = updates.beo_id;
      if (updates.revenue !== undefined)
        updatePayload.revenue = updates.revenue;
      if (updates.contact_person !== undefined)
        updatePayload.contact_person = updates.contact_person;

      // Update date based on start_time if it changed
      if (updates.start_time) {
        updatePayload.date = updates.start_time.split("T")[0];
      }

      const { data, error } = await this.supabase
        .from("calendar_events")
        .update(updatePayload)
        .eq("id", eventId)
        .select()
        .single();

      if (error) throw error;

      await this.upsertRoomBookingForEvent(data as CalendarEvent, userId);

      // Log audit trail with previous data
      await this.logAudit(
        existingEvent.org_id,
        eventId,
        userId,
        AuditAction.UPDATE,
        updatePayload,
        existingEvent,
        ipAddress,
        userAgent,
      );

      return data as CalendarEvent;
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  }

  /**
   * Delete an event (soft delete)
   */
  async deleteEvent(
    eventId: string,
    userId: string,
    hardDelete: boolean = false,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      if (!this.supabase) {
        const found = this.findFallbackEvent(eventId);
        if (!found) throw new Error("Event not found");

        const now = new Date().toISOString();
        const events = this.getFallbackEvents(found.orgId);
        const nextEvents = hardDelete
          ? events.filter((e) => e.id !== eventId)
          : events.map((e) =>
              e.id === eventId
                ? ({ ...e, deleted_at: now } as CalendarEvent)
                : e,
            );

        this.setFallbackEvents(found.orgId, nextEvents);
        return;
      }

      const { data: existingEvent, error: fetchError } = await this.supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (fetchError || !existingEvent) throw new Error("Event not found");

      // Check permission
      await this.checkEventAccess(existingEvent, userId, "delete");

      if (hardDelete) {
        // Hard delete (only for admins or data cleanup)
        await this.supabase.from("calendar_events").delete().eq("id", eventId);
      } else {
        // Soft delete
        await this.supabase
          .from("calendar_events")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", eventId);
      }

      await this.cancelRoomBookingsByEvent(eventId);

      // Log audit trail
      await this.logAudit(
        existingEvent.org_id,
        eventId,
        userId,
        AuditAction.DELETE,
        { hard_delete: hardDelete },
        existingEvent,
        ipAddress,
        userAgent,
      );
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  }

  // =====================================================
  // PERMISSIONS & SHARING
  // =====================================================

  /**
   * Share an event with a user/team/role
   */
  async shareEvent(
    eventId: string,
    userId: string,
    shareRequest: ShareEventRequest,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<EventPermission> {
    try {
      // Get event to verify ownership
      const { data: event, error: eventError } = await this.supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError || !event) throw new Error("Event not found");

      // Only owner or org admins can share
      if (event.created_by !== userId) {
        // Check if user is org admin
        const isAdmin = await this.isOrgAdmin(event.org_id, userId);
        if (!isAdmin) throw new Error("Only event owner can share");
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      const permissionPayload = {
        id,
        event_id: eventId,
        user_id: shareRequest.user_id,
        team_id: shareRequest.team_id,
        role_id: shareRequest.role_id,
        access_level: shareRequest.access_level,
        granted_by: userId,
        granted_at: now,
        expires_at: shareRequest.expires_at,
      };

      const { data, error } = await this.supabase
        .from("calendar_event_permissions")
        .insert([permissionPayload])
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await this.logAudit(
        event.org_id,
        eventId,
        userId,
        AuditAction.SHARE,
        {
          shared_with: shareRequest.user_id || shareRequest.team_id,
          access_level: shareRequest.access_level,
        },
        {},
        ipAddress,
        userAgent,
      );

      return data as EventPermission;
    } catch (error) {
      console.error("Error sharing event:", error);
      throw error;
    }
  }

  /**
   * Revoke event access from user/team/role
   */
  async revokeAccess(
    eventId: string,
    permissionId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Get event
      const { data: event } = await this.supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (!event) throw new Error("Event not found");

      // Check ownership
      if (event.created_by !== userId) {
        const isAdmin = await this.isOrgAdmin(event.org_id, userId);
        if (!isAdmin) throw new Error("Only event owner can revoke access");
      }

      await this.supabase
        .from("calendar_event_permissions")
        .delete()
        .eq("id", permissionId);
    } catch (error) {
      console.error("Error revoking access:", error);
      throw error;
    }
  }

  /**
   * Get event permissions
   */
  async getEventPermissions(eventId: string): Promise<EventPermission[]> {
    try {
      const { data, error } = await this.supabase
        .from("calendar_event_permissions")
        .select("*")
        .eq("event_id", eventId);

      if (error) throw error;
      return data as EventPermission[];
    } catch (error) {
      console.error("Error fetching event permissions:", error);
      return [];
    }
  }

  // =====================================================
  // OUTLETS MANAGEMENT
  // =====================================================

  /**
   * Create a new calendar outlet
   */
  async createOutlet(
    orgId: string,
    userId: string,
    outletData: CreateOutletRequest,
  ): Promise<CalendarOutlet> {
    try {
      // Note: Admin check is performed in the route before calling this method

      const id = uuidv4();
      const now = new Date().toISOString();

      const outletPayload = {
        id,
        org_id: orgId,
        name: outletData.name,
        description: outletData.description,
        color: outletData.color || "#3b82f6",
        icon: outletData.icon || "calendar",
        is_system: false,
        is_archived: false,
        created_by: userId,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await this.supabase
        .from("calendar_outlets")
        .insert([outletPayload])
        .select()
        .single();

      if (error) throw error;
      return data as CalendarOutlet;
    } catch (error) {
      console.error("Error creating outlet:", error);
      throw error;
    }
  }

  /**
   * Get outlets accessible to a user
   */
  async getAccessibleOutlets(
    orgId: string,
    userId: string,
  ): Promise<CalendarOutlet[]> {
    try {
      // Return default outlets if Supabase is not available
      if (!this.supabase) {
        return this.getDefaultOutlets(orgId);
      }

      // System outlets are accessible to all
      const { data: systemOutlets, error: systemError } = await this.supabase
        .from("calendar_outlets")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_system", true)
        .eq("is_archived", false);

      if (systemError) throw systemError;

      // User's specific outlets
      const { data: userOutlets, error: userError } = await this.supabase
        .from("calendar_outlets")
        .select(
          `
          id, org_id, name, description, color, icon, is_system, is_archived,
          created_by, created_at, updated_at, archived_at
        `,
        )
        .eq("org_id", orgId)
        .eq("is_archived", false);

      if (userError) throw userError;

      // Combine and deduplicate
      const outletMap = new Map();
      (systemOutlets || []).forEach((o) => outletMap.set(o.id, o));
      (userOutlets || []).forEach((o) => {
        if (!outletMap.has(o.id)) {
          outletMap.set(o.id, o);
        }
      });

      const outlets = Array.from(outletMap.values()) as CalendarOutlet[];
      return outlets.length > 0 ? outlets : this.getDefaultOutlets(orgId);
    } catch (error) {
      console.error("Error fetching outlets:", error);
      return this.getDefaultOutlets(orgId);
    }
  }

  private getDefaultOutlets(orgId: string): CalendarOutlet[] {
    const now = new Date().toISOString();
    return [
      {
        id: "banquets",
        org_id: orgId,
        name: "Banquets",
        color: "#3b82f6",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "culinary",
        org_id: orgId,
        name: "Culinary",
        color: "#8b5cf6",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "hr",
        org_id: orgId,
        name: "HR Training",
        color: "#ec4899",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "us-holidays",
        org_id: orgId,
        name: "US Holidays",
        color: "#ef4444",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "religious-holidays",
        org_id: orgId,
        name: "Religious Holidays",
        color: "#06b6d4",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];
  }

  // =====================================================
  // CONFLICT DETECTION
  // =====================================================

  /**
   * Detect conflicts for an event
   */
  async detectConflicts(
    eventId: string,
    detectionRequest: DetectConflictsRequest,
    userId: string,
  ): Promise<CalendarConflict[]> {
    try {
      if (!this.supabase) {
        const found = this.findFallbackEvent(eventId);
        if (!found) return [];

        const event = found.event;
        const outletIds =
          detectionRequest.outlet_ids && detectionRequest.outlet_ids.length > 0
            ? detectionRequest.outlet_ids
            : [event.outlet_id];

        const candidates = this.getFallbackEvents(found.orgId).filter(
          (e) =>
            e.id !== eventId &&
            !e.deleted_at &&
            outletIds.includes(e.outlet_id) &&
            (detectionRequest.include_all_outlets
              ? true
              : e.outlet_id === event.outlet_id),
        );

        const conflicts: CalendarConflict[] = [];
        for (const other of candidates) {
          const hasTimeOverlap = this.hasTimeOverlap(event, other);
          const hasLocationOverlap =
            !!event.location_room &&
            !!other.location_room &&
            event.location_room === other.location_room;

          if (hasTimeOverlap && hasLocationOverlap) {
            conflicts.push({
              id: uuidv4(),
              org_id: found.orgId,
              event_id_1: eventId < other.id ? eventId : other.id,
              event_id_2: eventId < other.id ? other.id : eventId,
              conflict_type: hasLocationOverlap ? "location" : "time",
              severity: this.calculateConflictSeverity(event, other),
              message: `${event.title} conflicts with ${other.title}`,
              detected_at: new Date().toISOString(),
              metadata: {
                event_1_title: event.title,
                event_2_title: other.title,
                event_1_outlet: event.outlet_id,
                event_2_outlet: other.outlet_id,
              },
            });
          }
        }

        return conflicts;
      }

      // Get the event
      const { data: event, error: eventError } = await this.supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError || !event) throw new Error("Event not found");

      const outletIds = detectionRequest.outlet_ids || [];
      if (outletIds.length === 0) {
        return [];
      }

      // Find all events in those outlets that might conflict
      const { data: potentialConflicts, error: conflictError } =
        await this.supabase
          .from("calendar_events")
          .select("*")
          .in("outlet_id", outletIds)
          .neq("id", eventId)
          .is("deleted_at", null)
          .eq("org_id", event.org_id);

      if (conflictError) throw conflictError;

      const conflicts: CalendarConflict[] = [];

      // Check for overlaps
      for (const potentialConflict of potentialConflicts || []) {
        const hasTimeOverlap = this.hasTimeOverlap(event, potentialConflict);
        const hasLocationOverlap =
          event.location_room &&
          potentialConflict.location_room &&
          event.location_room === potentialConflict.location_room;

        if (hasTimeOverlap && hasLocationOverlap) {
          // Check if conflict already exists
          const existingConflictId = await this.getExistingConflict(
            eventId,
            potentialConflict.id,
          );

          const conflictPayload = {
            id: existingConflictId || uuidv4(),
            event_id_1:
              eventId < potentialConflict.id ? eventId : potentialConflict.id,
            event_id_2:
              eventId < potentialConflict.id ? potentialConflict.id : eventId,
            org_id: event.org_id,
            conflict_type: hasLocationOverlap ? "location" : "time",
            severity: this.calculateConflictSeverity(event, potentialConflict),
            message: `${event.title} conflicts with ${potentialConflict.title}`,
            detected_at: new Date().toISOString(),
            metadata: {
              event_1_title: event.title,
              event_2_title: potentialConflict.title,
              event_1_outlet: event.outlet_id,
              event_2_outlet: potentialConflict.outlet_id,
            },
          };

          if (!existingConflictId) {
            const { data: conflictData, error: insertError } =
              await this.supabase
                .from("calendar_conflicts")
                .insert([conflictPayload])
                .select()
                .single();

            if (insertError) {
              console.error("Error inserting conflict:", insertError);
            } else {
              conflicts.push(conflictData as CalendarConflict);
            }
          } else {
            conflicts.push(conflictPayload as CalendarConflict);
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error("Error detecting conflicts:", error);
      return [];
    }
  }

  /**
   * Get conflicts for an event
   */
  async getEventConflicts(eventId: string): Promise<CalendarConflict[]> {
    try {
      const { data, error } = await this.supabase
        .from("calendar_conflicts")
        .select("*")
        .or(`event_id_1.eq.${eventId},event_id_2.eq.${eventId}`)
        .is("resolved_at", null);

      if (error) throw error;
      return data as CalendarConflict[];
    } catch (error) {
      console.error("Error fetching conflicts:", error);
      return [];
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    userId: string,
    resolutionNotes: string,
  ): Promise<CalendarConflict> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from("calendar_conflicts")
        .update({
          resolved_at: now,
          resolved_by: userId,
          resolution_notes: resolutionNotes,
        })
        .eq("id", conflictId)
        .select()
        .single();

      if (error) throw error;
      return data as CalendarConflict;
    } catch (error) {
      console.error("Error resolving conflict:", error);
      throw error;
    }
  }

  /**
   * Acknowledge conflict without resolving
   */
  async acknowledgeConflict(
    conflictId: string,
    userId: string,
  ): Promise<CalendarConflict> {
    try {
      const { data: conflict } = await this.supabase
        .from("calendar_conflicts")
        .select("*")
        .eq("id", conflictId)
        .single();

      if (!conflict) throw new Error("Conflict not found");

      const acknowledgedBy = conflict.acknowledged_by || [];
      if (!acknowledgedBy.includes(userId)) {
        acknowledgedBy.push(userId);
      }

      const { data, error } = await this.supabase
        .from("calendar_conflicts")
        .update({
          acknowledged_by: acknowledgedBy,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", conflictId)
        .select()
        .single();

      if (error) throw error;

      // Log acknowledgement
      await this.logAudit(
        conflict.org_id,
        conflict.event_id_1,
        userId,
        AuditAction.ACKNOWLEDGE_CONFLICT,
        { conflict_id: conflictId },
        {},
      );

      return data as CalendarConflict;
    } catch (error) {
      console.error("Error acknowledging conflict:", error);
      throw error;
    }
  }

  // =====================================================
  // ATTACHMENTS
  // =====================================================

  /**
   * Add attachment to event
   */
  async addAttachment(
    eventId: string,
    userId: string,
    attachment: Partial<EventAttachment>,
  ): Promise<EventAttachment> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const attachmentPayload = {
        id,
        event_id: eventId,
        attachment_url: attachment.attachment_url || "",
        attachment_type: attachment.attachment_type || "document",
        file_name: attachment.file_name || "attachment",
        file_size: attachment.file_size,
        mime_type: attachment.mime_type,
        uploaded_by: userId,
        created_at: now,
        metadata: attachment.metadata || {},
      };

      const { data, error } = await this.supabase
        .from("calendar_event_attachments")
        .insert([attachmentPayload])
        .select()
        .single();

      if (error) throw error;
      return data as EventAttachment;
    } catch (error) {
      console.error("Error adding attachment:", error);
      throw error;
    }
  }

  /**
   * Get event attachments
   */
  async getEventAttachments(eventId: string): Promise<EventAttachment[]> {
    try {
      const { data, error } = await this.supabase
        .from("calendar_event_attachments")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EventAttachment[];
    } catch (error) {
      console.error("Error fetching attachments:", error);
      return [];
    }
  }

  // =====================================================
  // AUDIT LOGGING
  // =====================================================

  /**
   * Log an audit trail entry
   */
  async logAudit(
    orgId: string,
    eventId: string,
    userId: string,
    action: AuditAction,
    changeData: any = {},
    previousData: any = {},
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      // Skip audit logging if Supabase is not available
      if (!this.supabase) {
        console.debug("Supabase not available, skipping audit log", {
          action,
          eventId,
        });
        return;
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      const auditPayload = {
        id,
        org_id: orgId,
        event_id: eventId,
        user_id: userId,
        action,
        change_data: changeData,
        previous_data: previousData,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: now,
      };

      // Use service role to bypass RLS for audit inserts
      const { error } = await this.supabase
        .from("calendar_audit_log")
        .insert([auditPayload]);

      if (error) {
        // Don't throw error - audit should not block main operations
        console.warn("Failed to log audit trail:", error);
      }
    } catch (error) {
      // Silently catch - audit failures should not break operations
      console.warn("Error logging audit trail:", error);
    }
  }

  /**
   * Get audit log for an event
   */
  async getAuditLog(
    eventId: string,
    userId: string,
    orgId: string,
  ): Promise<AuditLogEntry[]> {
    try {
      // Return empty log if Supabase is not available
      if (!this.supabase) {
        console.warn("Supabase not available, returning empty audit log");
        return [];
      }
      // Get event to check ownership
      const { data: event } = await this.supabase
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (!event || event.created_by !== userId) {
        throw new Error("Only event owner can view audit log");
      }

      const { data, error } = await this.supabase
        .from("calendar_audit_log")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AuditLogEntry[];
    } catch (error) {
      console.error("Error fetching audit log:", error);
      throw error;
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Check if user has access to outlet
   */
  private async checkOutletAccess(
    orgId: string,
    outletId: string,
    userId: string,
    requiredLevel: "view" | "create" | "manage",
  ): Promise<void> {
    // Skip access check if Supabase is not available
    if (!this.supabase) {
      return;
    }

    // Get outlet
    const { data: outlet } = await this.supabase
      .from("calendar_outlets")
      .select("*")
      .eq("id", outletId)
      .single();

    if (!outlet) throw new Error("Outlet not found");

    // System outlets allow all org members
    if (outlet.is_system) return;

    // Check explicit permissions
    const { data: perm } = await this.supabase
      .from("calendar_outlet_permissions")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("user_id", userId)
      .single();

    if (!perm) throw new Error("Access denied to outlet");

    // Check access level
    const levels = ["view", "create", "manage"];
    const requiredIndex = levels.indexOf(requiredLevel);
    const userIndex = levels.indexOf(perm.access_level);

    if (userIndex < requiredIndex) {
      throw new Error("Insufficient permissions for outlet");
    }
  }

  /**
   * Check if user has access to event
   */
  private async checkEventAccess(
    event: CalendarEvent,
    userId: string,
    requiredLevel: "read" | "write" | "delete" | "manage",
  ): Promise<void> {
    // Owner has full access
    if (event.created_by === userId) return;

    // Skip permission check if Supabase is not available
    if (!this.supabase) {
      return;
    }

    // Check explicit permissions
    const { data: perm } = await this.supabase
      .from("calendar_event_permissions")
      .select("*")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .single();

    if (!perm) throw new Error("Access denied");

    const levels = ["read", "write", "delete", "manage"];
    const requiredIndex = levels.indexOf(requiredLevel);
    const userIndex = levels.indexOf(perm.access_level);

    if (userIndex < requiredIndex) {
      throw new Error("Insufficient permissions");
    }
  }

  /**
   * Check if user is org admin
   */
  private async isOrgAdmin(orgId: string, userId: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    const { data: user } = await this.supabase
      .from("auth.users")
      .select("role")
      .eq("id", userId)
      .single();

    return user?.role === "admin" || user?.role === "owner";
  }

  /**
   * Check if two events have time overlap
   */
  private hasTimeOverlap(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): boolean {
    const start1 = new Date(event1.start_time).getTime();
    const end1 = new Date(event1.end_time).getTime();
    const start2 = new Date(event2.start_time).getTime();
    const end2 = new Date(event2.end_time).getTime();

    return start1 < end2 && start2 < end1;
  }

  /**
   * Calculate conflict severity based on event properties
   */
  private calculateConflictSeverity(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): string {
    // If either event is locked, it's critical
    if (
      event1.status === EventStatus.LOCKED ||
      event2.status === EventStatus.LOCKED
    ) {
      return "critical";
    }

    // If either is confirmed, it's warning
    if (
      event1.status === EventStatus.CONFIRMED ||
      event2.status === EventStatus.CONFIRMED
    ) {
      return "warning";
    }

    return "info";
  }

  /**
   * Get existing conflict ID if it exists
   */
  private async getExistingConflict(
    event1Id: string,
    event2Id: string,
  ): Promise<string | null> {
    const [id1, id2] =
      event1Id < event2Id ? [event1Id, event2Id] : [event2Id, event1Id];

    if (!this.supabase) return null;

    const { data } = await this.supabase
      .from("calendar_conflicts")
      .select("id")
      .eq("event_id_1", id1)
      .eq("event_id_2", id2)
      .is("resolved_at", null)
      .single();

    return data?.id || null;
  }
}

// Export singleton instance
export const calendarService = new EnterpriseCalendarService();
