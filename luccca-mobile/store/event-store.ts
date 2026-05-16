/**
 * Event Store
 * Manages calendar events and offline storage
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Event, SyncQueueItem } from "@/lib/database/schema";
import {
  querySql,
  querySqlOne,
  executeSql,
  withTransaction,
} from "@/lib/database/sqlite";
import { get, post, patch, remove } from "@/lib/api-client";

export interface EventFilter {
  startDate?: string;
  endDate?: string;
  outletId?: string;
  status?: string;
  searchTerm?: string;
}

export interface EventStats {
  total: number;
  unsynced: number;
  conflicts: number;
}

export interface EventState {
  // State
  events: Event[];
  selectedEvent: Event | null;
  isLoading: boolean;
  error: string | null;
  stats: EventStats;

  // Actions
  loadEvents: (filter?: EventFilter) => Promise<void>;
  getEvent: (eventId: string) => Promise<Event | null>;
  createEvent: (event: Partial<Event>) => Promise<Event>;
  updateEvent: (eventId: string, updates: Partial<Event>) => Promise<Event>;
  deleteEvent: (eventId: string) => Promise<void>;
  selectEvent: (event: Event | null) => void;
  clearError: () => void;
  getStats: () => Promise<void>;
  getConflicts: (eventId: string) => Promise<any[]>;
  markEventSynced: (eventId: string) => Promise<void>;
}

export const useEventStore = create<EventState>()(
  devtools((set, get) => ({
    events: [],
    selectedEvent: null,
    isLoading: false,
    error: null,
    stats: { total: 0, unsynced: 0, conflicts: 0 },

    loadEvents: async (filter?: EventFilter) => {
      set({ isLoading: true, error: null });
      try {
        let query = "SELECT * FROM events WHERE 1=1";
        const params: any[] = [];

        if (filter?.startDate) {
          query += " AND start_time >= ?";
          params.push(filter.startDate);
        }

        if (filter?.endDate) {
          query += " AND end_time <= ?";
          params.push(filter.endDate);
        }

        if (filter?.outletId) {
          query += " AND outlet_id = ?";
          params.push(filter.outletId);
        }

        if (filter?.status) {
          query += " AND status = ?";
          params.push(filter.status);
        }

        query += " ORDER BY start_time ASC";

        const events = await querySql<Event>(query, params);

        // Filter by search term if provided
        let filteredEvents = events;
        if (filter?.searchTerm) {
          const term = filter.searchTerm.toLowerCase();
          filteredEvents = events.filter(
            (e) =>
              e.title.toLowerCase().includes(term) ||
              e.description?.toLowerCase().includes(term) ||
              e.location?.toLowerCase().includes(term),
          );
        }

        set({ events: filteredEvents, isLoading: false });
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to load events",
          isLoading: false,
        });
      }
    },

    getEvent: async (eventId: string) => {
      try {
        const event = await querySqlOne<Event>(
          "SELECT * FROM events WHERE id = ?",
          [eventId],
        );
        return event;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Failed to get event",
        });
        return null;
      }
    },

    createEvent: async (event: Partial<Event>) => {
      set({ isLoading: true, error: null });
      try {
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const newEvent: Event = {
          id: eventId,
          org_id: event.org_id!,
          outlet_id: event.outlet_id,
          title: event.title!,
          description: event.description,
          start_time: event.start_time!,
          end_time: event.end_time!,
          location: event.location,
          guest_count: event.guest_count,
          status: "confirmed",
          is_all_day: event.is_all_day || false,
          is_recurring: event.is_recurring || false,
          conflict_detected: false,
          is_synced: false,
          created_at: now,
          updated_at: now,
        };

        // Save to local database
        await executeSql(
          `INSERT INTO events (
            id, org_id, outlet_id, title, description, start_time, end_time,
            location, guest_count, status, is_all_day, is_recurring,
            conflict_detected, is_synced, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newEvent.id,
            newEvent.org_id,
            newEvent.outlet_id,
            newEvent.title,
            newEvent.description,
            newEvent.start_time,
            newEvent.end_time,
            newEvent.location,
            newEvent.guest_count,
            newEvent.status,
            newEvent.is_all_day ? 1 : 0,
            newEvent.is_recurring ? 1 : 0,
            newEvent.conflict_detected ? 1 : 0,
            newEvent.is_synced ? 1 : 0,
            newEvent.created_at,
            newEvent.updated_at,
          ],
        );

        // Add to sync queue
        const queueId = `sync_${Date.now()}`;
        await executeSql(
          `INSERT INTO sync_queue (id, event_id, action, payload, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [queueId, newEvent.id, "create", JSON.stringify(newEvent), now, now],
        );

        // Update local state
        set((state) => ({
          events: [...state.events, newEvent],
          isLoading: false,
        }));

        // Try to sync to server
        try {
          const serverEvent = await post("/calendar/events", newEvent);
          if (serverEvent) {
            await get().markEventSynced(newEvent.id);
          }
        } catch (error) {
          console.warn("Event sync failed, queued for later:", error);
        }

        return newEvent;
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to create event",
          isLoading: false,
        });
        throw error;
      }
    },

    updateEvent: async (eventId: string, updates: Partial<Event>) => {
      set({ isLoading: true, error: null });
      try {
        const now = new Date().toISOString();

        // Update local database
        const updateFields = Object.keys(updates)
          .map((k) => `${k} = ?`)
          .join(", ");

        const params = [...Object.values(updates), now, eventId];

        await executeSql(
          `UPDATE events SET ${updateFields}, updated_at = ? WHERE id = ?`,
          params,
        );

        // Get updated event
        const updatedEvent = await querySqlOne<Event>(
          "SELECT * FROM events WHERE id = ?",
          [eventId],
        );

        if (updatedEvent) {
          // Add to sync queue
          const queueId = `sync_${Date.now()}`;
          await executeSql(
            `INSERT INTO sync_queue (id, event_id, action, payload, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [queueId, eventId, "update", JSON.stringify(updates), now, now],
          );

          // Update local state
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId ? updatedEvent : e,
            ),
            isLoading: false,
          }));

          // Try to sync to server
          try {
            await patch(`/calendar/events/${eventId}`, updates);
            await get().markEventSynced(eventId);
          } catch (error) {
            console.warn("Event sync failed, queued for later:", error);
          }

          return updatedEvent;
        }

        throw new Error("Event not found");
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to update event",
          isLoading: false,
        });
        throw error;
      }
    },

    deleteEvent: async (eventId: string) => {
      set({ isLoading: true, error: null });
      try {
        const now = new Date().toISOString();

        // Soft delete locally
        await executeSql(
          "UPDATE events SET is_synced = 0, updated_at = ? WHERE id = ?",
          [now, eventId],
        );

        // Add to sync queue
        const queueId = `sync_${Date.now()}`;
        await executeSql(
          `INSERT INTO sync_queue (id, event_id, action, payload, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [queueId, eventId, "delete", JSON.stringify({}), now, now],
        );

        // Update local state
        set((state) => ({
          events: state.events.filter((e) => e.id !== eventId),
          isLoading: false,
        }));

        // Try to sync to server
        try {
          await remove(`/calendar/events/${eventId}`);
        } catch (error) {
          console.warn("Event deletion sync failed, queued for later:", error);
        }
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to delete event",
          isLoading: false,
        });
        throw error;
      }
    },

    selectEvent: (event: Event | null) => set({ selectedEvent: event }),

    clearError: () => set({ error: null }),

    getStats: async () => {
      try {
        const total = await querySqlOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM events",
        );
        const unsynced = await querySqlOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM events WHERE is_synced = 0",
        );
        const conflicts = await querySqlOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM events WHERE conflict_detected = 1",
        );

        set({
          stats: {
            total: total?.count || 0,
            unsynced: unsynced?.count || 0,
            conflicts: conflicts?.count || 0,
          },
        });
      } catch (error) {
        console.error("Failed to get event stats:", error);
      }
    },

    getConflicts: async (eventId: string) => {
      try {
        const conflicts = await querySql(
          `SELECT * FROM conflicts WHERE event_id = ? AND is_resolved = 0`,
          [eventId],
        );
        return conflicts;
      } catch (error) {
        console.error("Failed to get conflicts:", error);
        return [];
      }
    },

    markEventSynced: async (eventId: string) => {
      try {
        const now = new Date().toISOString();
        await executeSql(
          "UPDATE events SET is_synced = 1, synced_at = ? WHERE id = ?",
          [now, eventId],
        );

        // Remove from sync queue
        await executeSql("DELETE FROM sync_queue WHERE event_id = ?", [
          eventId,
        ]);

        set((state) => ({
          events: state.events.map((e) =>
            e.id === eventId ? { ...e, is_synced: true, synced_at: now } : e,
          ),
        }));
      } catch (error) {
        console.error("Failed to mark event synced:", error);
      }
    },
  })),
);
