/**
 * Calendar Integration Sync Engine
 * Handles bi-directional synchronization between LUCCCA and external calendars
 * Supports Outlook, Google Calendar with conflict resolution
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { calendarService } from "./EnterpriseCalendarService";
import { graphClient } from "../integrations/microsoft-graph";
import { googleCalendarClient } from "../integrations/google-calendar-client";

export interface SyncResult {
  status: "success" | "partial" | "failed";
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errors: string[];
}

export interface SyncEvent {
  externalId: string;
  localId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: Array<{ email: string; name: string }>;
  isRecurring: boolean;
  recurrenceRule?: string;
  timezone: string;
  lastModified: Date;
}

export interface SyncConflict {
  eventId: string;
  conflictType:
    | "update_conflict"
    | "delete_conflict"
    | "time_overlap"
    | "location_overlap";
  externalEvent: SyncEvent;
  localEvent: any;
  resolution: "keep_local" | "use_external" | "merge" | "manual";
}

export class CalendarIntegrationSyncEngine {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || new Database();
  }

  /**
   * Perform full synchronization for an integration
   */
  async performFullSync(integrationId: string): Promise<SyncResult> {
    const startTime = new Date();
    let result: SyncResult = {
      status: "success",
      startedAt: startTime,
      completedAt: new Date(),
      durationMs: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      errors: [],
    };

    try {
      // Get integration details
      const integration = await this.getIntegration(integrationId);
      if (!integration) {
        throw new Error("Integration not found");
      }

      // Update sync status
      await this.updateSyncStatus(integrationId, "syncing");

      // Fetch external events
      logger.info(`[Sync] Starting full sync for ${integration.provider}`, {
        integrationId,
      });

      const externalEvents = await this.fetchExternalEvents(integration);
      const localEvents = await this.fetchLocalEvents(integration.org_id);

      // Detect changes and conflicts
      const changes = this.detectChanges(externalEvents, localEvents);
      const conflicts = await this.detectConflicts(changes, localEvents);

      // Resolve conflicts
      const resolved = await this.resolveConflicts(conflicts, integration);

      // Apply changes
      for (const change of changes.toCreate) {
        try {
          const created = await this.createLocalEvent(change, integration);
          if (created) {
            result.eventsCreated++;
            // Track sync change
            await this.trackSyncChange(
              integrationId,
              change.externalId,
              created.id,
              "created",
              "luccca",
              change.externalId,
            );
          }
        } catch (error) {
          result.errors.push(
            `Failed to create event: ${(error as Error).message}`,
          );
        }
      }

      for (const change of changes.toUpdate) {
        try {
          const updated = await this.updateLocalEvent(change, integration);
          if (updated) {
            result.eventsUpdated++;
            await this.trackSyncChange(
              integrationId,
              change.localId,
              change.externalId,
              "updated",
              "luccca",
              change.externalId,
            );
          }
        } catch (error) {
          result.errors.push(
            `Failed to update event: ${(error as Error).message}`,
          );
        }
      }

      for (const conflict of resolved) {
        result.conflictsDetected++;
        result.conflictsResolved++;
      }

      // Update sync metadata
      await this.updateSyncStatus(integrationId, "idle");
      await this.recordSyncLog(integrationId, result, "full");

      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startTime.getTime();

      logger.info(`[Sync] Full sync completed for ${integration.provider}`, {
        integrationId,
        result,
      });

      return result;
    } catch (error) {
      logger.error("[Sync] Full sync failed:", error);
      result.status = "failed";
      result.errors.push((error as Error).message);
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startTime.getTime();

      await this.updateSyncStatus(
        integrationId,
        "error",
        (error as Error).message,
      );
      await this.recordSyncLog(integrationId, result, "full");

      return result;
    }
  }

  /**
   * Perform incremental synchronization (delta sync)
   */
  async performIncrementalSync(integrationId: string): Promise<SyncResult> {
    const startTime = new Date();
    let result: SyncResult = {
      status: "success",
      startedAt: startTime,
      completedAt: new Date(),
      durationMs: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      errors: [],
    };

    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration) {
        throw new Error("Integration not found");
      }

      if (!integration.lastSyncAt) {
        // If never synced, do full sync
        return this.performFullSync(integrationId);
      }

      await this.updateSyncStatus(integrationId, "syncing");

      // Fetch only changed events since last sync
      const externalEvents = await this.fetchChangedExternalEvents(
        integration,
        new Date(integration.lastSyncAt),
      );

      // Process changes
      for (const event of externalEvents) {
        try {
          // Check if event exists locally
          const localEvent = await this.findLocalEventByExternalId(
            event.externalId,
            integration.org_id,
          );

          if (!localEvent) {
            // Create new event
            const created = await this.createLocalEvent(event, integration);
            if (created) result.eventsCreated++;
          } else {
            // Check for conflicts
            if (this.hasConflict(localEvent, event)) {
              // Handle conflict
              const resolution = await this.resolveEventConflict(
                localEvent,
                event,
                integration,
              );
              if (resolution.applied) {
                result.conflictsResolved++;
              }
            } else {
              // Update event
              const updated = await this.updateLocalEvent(event, integration);
              if (updated) result.eventsUpdated++;
            }
          }
        } catch (error) {
          result.errors.push(
            `Failed to sync event ${event.externalId}: ${(error as Error).message}`,
          );
        }
      }

      await this.updateSyncStatus(integrationId, "idle");
      await this.recordSyncLog(integrationId, result, "incremental");

      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startTime.getTime();

      return result;
    } catch (error) {
      logger.error("[Sync] Incremental sync failed:", error);
      result.status = "failed";
      result.errors.push((error as Error).message);
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startTime.getTime();

      await this.updateSyncStatus(
        integrationId,
        "error",
        (error as Error).message,
      );
      await this.recordSyncLog(integrationId, result, "incremental");

      return result;
    }
  }

  /**
   * Fetch external calendar events
   */
  private async fetchExternalEvents(integration: any): Promise<SyncEvent[]> {
    try {
      if (integration.provider === "outlook") {
        const events = await graphClient.getCalendarEvents(
          integration.access_token,
        );
        return events.map(this.convertOutlookEvent);
      } else if (integration.provider === "google") {
        const events = await googleCalendarClient.getCalendarEvents(
          integration.access_token,
        );
        return events.map(this.convertGoogleEvent);
      }
      return [];
    } catch (error) {
      logger.error("[Sync] Failed to fetch external events:", error);
      return [];
    }
  }

  /**
   * Fetch changed external events since last sync
   */
  private async fetchChangedExternalEvents(
    integration: any,
    since: Date,
  ): Promise<SyncEvent[]> {
    try {
      if (integration.provider === "outlook") {
        const events = await graphClient.getCalendarEventsUpdatedSince(
          integration.access_token,
          since,
        );
        return events.map(this.convertOutlookEvent);
      } else if (integration.provider === "google") {
        const events = await googleCalendarClient.getCalendarEventsUpdatedSince(
          integration.access_token,
          since,
        );
        return events.map(this.convertGoogleEvent);
      }
      return [];
    } catch (error) {
      logger.error("[Sync] Failed to fetch changed events:", error);
      return [];
    }
  }

  /**
   * Fetch local calendar events
   */
  private async fetchLocalEvents(orgId: string): Promise<any[]> {
    try {
      const result = await this.db.query(
        "SELECT id, title, start_time, end_time, location, org_id FROM calendar_events WHERE org_id = $1 AND is_active = true",
        [orgId],
      );
      return result.rows;
    } catch (error) {
      logger.error("[Sync] Failed to fetch local events:", error);
      return [];
    }
  }

  /**
   * Detect changes between external and local events
   */
  private detectChanges(
    externalEvents: SyncEvent[],
    localEvents: any[],
  ): {
    toCreate: SyncEvent[];
    toUpdate: SyncEvent[];
    toDelete: any[];
  } {
    const externalIds = new Set(externalEvents.map((e) => e.externalId));
    const localMap = new Map(localEvents.map((e) => [e.id, e]));

    const toCreate: SyncEvent[] = [];
    const toUpdate: SyncEvent[] = [];
    const toDelete: any[] = [];

    // Find events to create
    for (const extEvent of externalEvents) {
      const localEvent = Array.from(localMap.values()).find(
        (e) => e.external_id === extEvent.externalId,
      );
      if (!localEvent) {
        toCreate.push(extEvent);
      } else {
        // Check if updated
        if (extEvent.lastModified > new Date(localEvent.updated_at)) {
          toUpdate.push(extEvent);
        }
      }
    }

    // Find events to delete (in local but not in external)
    for (const localEvent of localEvents) {
      if (!externalIds.has(localEvent.external_id)) {
        toDelete.push(localEvent);
      }
    }

    return { toCreate, toUpdate, toDelete };
  }

  /**
   * Detect conflicts between changes
   */
  private async detectConflicts(
    changes: any,
    localEvents: any[],
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    for (const event of changes.toCreate) {
      // Check for time/location overlaps
      for (const localEvent of localEvents) {
        if (this.eventsOverlap(event, localEvent)) {
          conflicts.push({
            eventId: event.externalId,
            conflictType: "time_overlap",
            externalEvent: event,
            localEvent,
            resolution: "manual",
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve detected conflicts
   */
  private async resolveConflicts(
    conflicts: SyncConflict[],
    integration: any,
  ): Promise<SyncConflict[]> {
    const resolved: SyncConflict[] = [];

    for (const conflict of conflicts) {
      // Default strategy: keep external event (Outlook/Google as source of truth)
      conflict.resolution = "use_external";
      resolved.push(conflict);
    }

    return resolved;
  }

  /**
   * Create local event from external event
   */
  private async createLocalEvent(
    event: SyncEvent,
    integration: any,
  ): Promise<any | null> {
    try {
      const result = await this.db.query(
        `INSERT INTO calendar_events 
        (org_id, outlet_id, title, description, start_time, end_time, location, created_by, external_id, external_provider)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          integration.org_id,
          null, // Default outlet
          event.title,
          event.description,
          event.startTime.toISOString(),
          event.endTime.toISOString(),
          event.location,
          integration.user_id,
          event.externalId,
          integration.provider,
        ],
      );

      return result.rows[0];
    } catch (error) {
      logger.error("[Sync] Failed to create local event:", error);
      return null;
    }
  }

  /**
   * Update local event
   */
  private async updateLocalEvent(
    event: SyncEvent,
    integration: any,
  ): Promise<boolean> {
    try {
      const result = await this.db.query(
        `UPDATE calendar_events 
        SET title = $1, description = $2, start_time = $3, end_time = $4, location = $5, updated_by = $6, updated_at = CURRENT_TIMESTAMP
        WHERE external_id = $7 AND org_id = $8`,
        [
          event.title,
          event.description,
          event.startTime.toISOString(),
          event.endTime.toISOString(),
          event.location,
          integration.user_id,
          event.externalId,
          integration.org_id,
        ],
      );

      return result.rowCount! > 0;
    } catch (error) {
      logger.error("[Sync] Failed to update local event:", error);
      return false;
    }
  }

  /**
   * Check if event has conflict
   */
  private hasConflict(localEvent: any, externalEvent: SyncEvent): boolean {
    return (
      new Date(localEvent.updated_at) > externalEvent.lastModified ||
      this.eventsOverlap(externalEvent, localEvent)
    );
  }

  /**
   * Resolve conflict for a single event
   */
  private async resolveEventConflict(
    localEvent: any,
    externalEvent: SyncEvent,
    integration: any,
  ): Promise<{ applied: boolean }> {
    // Default: use external event (external as source of truth)
    const updated = await this.updateLocalEvent(externalEvent, integration);
    return { applied: updated };
  }

  /**
   * Find local event by external ID
   */
  private async findLocalEventByExternalId(
    externalId: string,
    orgId: string,
  ): Promise<any | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM calendar_events WHERE external_id = $1 AND org_id = $2",
        [externalId, orgId],
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error("[Sync] Failed to find local event:", error);
      return null;
    }
  }

  /**
   * Check if two events overlap in time and location
   */
  private eventsOverlap(event1: SyncEvent, event2: any): boolean {
    const start1 = event1.startTime.getTime();
    const end1 = event1.endTime.getTime();
    const start2 = new Date(event2.start_time).getTime();
    const end2 = new Date(event2.end_time).getTime();

    // Check time overlap
    const timeOverlap = start1 < end2 && end1 > start2;

    // Check location overlap (if both have location)
    const locationOverlap =
      event1.location &&
      event2.location &&
      event1.location.toLowerCase() === event2.location.toLowerCase();

    return timeOverlap && locationOverlap;
  }

  /**
   * Convert Outlook event to sync event
   */
  private convertOutlookEvent(outlookEvent: any): SyncEvent {
    return {
      externalId: outlookEvent.id,
      title: outlookEvent.subject,
      description: outlookEvent.bodyPreview,
      startTime: new Date(outlookEvent.start.dateTime),
      endTime: new Date(outlookEvent.end.dateTime),
      location: outlookEvent.location?.displayName,
      attendees: outlookEvent.attendees?.map((a: any) => ({
        email: a.emailAddress.address,
        name: a.emailAddress.name,
      })),
      isRecurring: !!outlookEvent.recurrence,
      timezone: outlookEvent.start.timeZone || "UTC",
      lastModified: new Date(outlookEvent.lastModifiedDateTime),
    };
  }

  /**
   * Convert Google event to sync event
   */
  private convertGoogleEvent(googleEvent: any): SyncEvent {
    return {
      externalId: googleEvent.id,
      title: googleEvent.summary,
      description: googleEvent.description,
      startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date),
      endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date),
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((a: any) => ({
        email: a.email,
        name: a.displayName,
      })),
      isRecurring: !!googleEvent.recurringEventId,
      timezone: googleEvent.start.timeZone || "UTC",
      lastModified: new Date(googleEvent.updated),
    };
  }

  /**
   * Get integration details
   */
  private async getIntegration(integrationId: string): Promise<any | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM calendar_integrations WHERE id = $1 AND is_active = true",
        [integrationId],
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error("[Sync] Failed to get integration:", error);
      return null;
    }
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(
    integrationId: string,
    status: string,
    error?: string,
  ): Promise<void> {
    try {
      const errorCount = error ? 1 : 0;
      await this.db.query(
        `UPDATE calendar_integrations 
        SET sync_status = $1, last_sync_at = CURRENT_TIMESTAMP, last_error = $2, error_count = error_count + $3
        WHERE id = $4`,
        [status, error || null, errorCount, integrationId],
      );
    } catch (error) {
      logger.error("[Sync] Failed to update sync status:", error);
    }
  }

  /**
   * Record sync log
   */
  private async recordSyncLog(
    integrationId: string,
    result: SyncResult,
    syncType: string,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO calendar_integration_sync_logs 
        (integration_id, sync_type, status, events_created, events_updated, events_deleted, conflicts_detected, conflicts_resolved, errors, started_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          integrationId,
          syncType,
          result.status,
          result.eventsCreated,
          result.eventsUpdated,
          result.eventsDeleted,
          result.conflictsDetected,
          result.conflictsResolved,
          result.errors,
          result.startedAt,
          result.completedAt,
        ],
      );
    } catch (error) {
      logger.error("[Sync] Failed to record sync log:", error);
    }
  }

  /**
   * Track sync change
   */
  private async trackSyncChange(
    integrationId: string,
    eventId: string,
    externalEventId: string,
    changeType: string,
    sourceSystem: string,
    externalId: string,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO calendar_integration_changes 
        (integration_id, event_id, change_type, source_system, external_event_id, sync_status)
        VALUES ($1, $2, $3, $4, $5, 'synced')`,
        [integrationId, eventId, changeType, sourceSystem, externalId],
      );
    } catch (error) {
      logger.error("[Sync] Failed to track sync change:", error);
    }
  }
}

// Export singleton
export const calendarSyncEngine = new CalendarIntegrationSyncEngine();
