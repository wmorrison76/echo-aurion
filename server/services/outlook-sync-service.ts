/**
 * Outlook Sync Service
 * Manages bidirectional synchronization between system calendar events and Outlook
 * Handles version control, conflict detection, and subscription management
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { graphClient } from "../integrations/microsoft-graph";
import { createHash } from "crypto";

interface OutlookSyncEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  bodyPreview?: string;
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
}

const db = new Database();

class OutlookSyncService {
  /**
   * Sync a local event to Outlook
   */
  async syncToOutlook(
    orgId: string,
    userId: string,
    integrationId: string,
    eventId: string,
    eventData: any,
  ): Promise<boolean> {
    try {
      const client = await db.getClient();

      // Check if already synced
      const existingSync = await client.query(
        `
        SELECT * FROM calendar_outlook_sync_state
        WHERE event_id = $1 AND integration_id = $2
      `,
        [eventId, integrationId],
      );

      const isUpdate = existingSync.rows.length > 0;
      const localVersionHash = this.calculateVersionHash(eventData);

      const outlookEvent = {
        subject: eventData.title,
        start: {
          dateTime: eventData.start_time,
          timeZone: "UTC",
        },
        end: {
          dateTime: eventData.end_time,
          timeZone: "UTC",
        },
        location: eventData.location_room
          ? { displayName: eventData.location_room }
          : undefined,
        body: {
          content: eventData.description || eventData.notes || eventData.title,
          contentType: "text",
        },
      };

      let result: OutlookSyncEvent | null = null;

      if (isUpdate && existingSync.rows[0].outlook_event_id) {
        // Update existing Outlook event
        result = await graphClient.updateCalendarEvent(
          orgId,
          userId,
          existingSync.rows[0].outlook_event_id,
          outlookEvent as any,
        );
      } else {
        // Create new Outlook event
        result = await graphClient.createCalendarEvent(
          orgId,
          userId,
          outlookEvent as any,
        );
      }

      if (!result) {
        throw new Error("Failed to sync event to Outlook");
      }

      const outlookVersionHash = this.calculateVersionHash(result);

      // Store sync state
      if (isUpdate) {
        await client.query(
          `
          UPDATE calendar_outlook_sync_state
          SET outlook_event_id = $2,
              outlook_change_key = $3,
              sync_status = 'synced',
              last_sync_at = NOW(),
              local_version_hash = $4,
              outlook_version_hash = $5,
              has_conflict = false
          WHERE event_id = $1 AND integration_id = $6
        `,
          [
            eventId,
            result.id,
            result.id, // Outlook doesn't use change_key in this context
            localVersionHash,
            outlookVersionHash,
            integrationId,
          ],
        );
      } else {
        await client.query(
          `
          INSERT INTO calendar_outlook_sync_state (
            event_id, integration_id, outlook_event_id, outlook_change_key,
            sync_status, last_sync_at, local_version_hash, outlook_version_hash
          ) VALUES ($1, $2, $3, $4, 'synced', NOW(), $5, $6)
          ON CONFLICT (event_id, integration_id) DO UPDATE SET
            outlook_event_id = $3,
            sync_status = 'synced',
            last_sync_at = NOW()
        `,
          [
            eventId,
            integrationId,
            result.id,
            result.id,
            localVersionHash,
            outlookVersionHash,
          ],
        );
      }

      logger.info("[OutlookSync] Event synced to Outlook", {
        eventId,
        outlookEventId: result.id,
        isUpdate,
      });

      return true;
    } catch (error) {
      logger.error("[OutlookSync] Failed to sync to Outlook", {
        error: error instanceof Error ? error.message : String(error),
        eventId,
        integrationId,
      });

      // Update sync state to failed
      try {
        await db.query(
          `
          UPDATE calendar_outlook_sync_state
          SET sync_status = 'failed',
              sync_error_message = $2,
              last_sync_attempt_at = NOW(),
              sync_retry_count = sync_retry_count + 1
          WHERE event_id = $1 AND integration_id = $3
        `,
          [
            eventId,
            error instanceof Error ? error.message : String(error),
            integrationId,
          ],
        );
      } catch (updateError) {
        logger.warn("[OutlookSync] Failed to update sync state", {
          updateError,
        });
      }

      return false;
    }
  }

  /**
   * Sync events FROM Outlook into system
   */
  async syncFromOutlook(
    orgId: string,
    userId: string,
    integrationId: string,
  ): Promise<number> {
    try {
      const events = await graphClient.getCalendarEvents(orgId, userId, {
        startDateTime: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        endDateTime: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        top: 100,
      });

      let syncedCount = 0;

      for (const outlookEvent of events) {
        try {
          // Check if we already have this event
          const existingResult = await db.query(
            `
            SELECT event_id FROM calendar_outlook_sync_state
            WHERE outlook_event_id = $1 AND integration_id = $2
          `,
            [outlookEvent.id, integrationId],
          );

          if (existingResult.rows.length > 0) {
            // Event already synced, skip
            continue;
          }

          // Create new local event from Outlook
          const createResult = await db.query(
            `
            INSERT INTO calendar_events (
              org_id, outlet_id, title, description, start_time, end_time,
              date, location_room, department, status, created_by
            ) VALUES ($1, (
              SELECT id FROM calendar_outlets
              WHERE org_id = $1 AND is_system = true LIMIT 1
            ), $2, $3, $4, $5, $6, $7, 'Outlook', 'confirmed', $8)
            RETURNING id
          `,
            [
              orgId,
              outlookEvent.subject,
              outlookEvent.bodyPreview || "",
              outlookEvent.start.dateTime,
              outlookEvent.end.dateTime,
              outlookEvent.start.dateTime.split("T")[0],
              outlookEvent.location?.displayName,
              userId,
            ],
          );

          const eventId = createResult.rows[0].id;

          // Record sync state
          await db.query(
            `
            INSERT INTO calendar_outlook_sync_state (
              event_id, integration_id, outlook_event_id,
              sync_status, sync_direction, local_version_hash, outlook_version_hash
            ) VALUES ($1, $2, $3, 'synced', 'from_outlook', $4, $5)
          `,
            [
              eventId,
              integrationId,
              outlookEvent.id,
              this.calculateVersionHash({ title: outlookEvent.subject }),
              this.calculateVersionHash(outlookEvent),
            ],
          );

          syncedCount++;
        } catch (eventError) {
          logger.warn("[OutlookSync] Failed to sync individual Outlook event", {
            eventError,
            outlookEventId: outlookEvent.id,
          });
        }
      }

      logger.info("[OutlookSync] Synced from Outlook", {
        integrationId,
        syncedCount,
        totalOutlookEvents: events.length,
      });

      return syncedCount;
    } catch (error) {
      logger.error("[OutlookSync] Failed to sync from Outlook", {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      return 0;
    }
  }

  /**
   * Setup Outlook webhook subscription for real-time sync
   */
  async setupSubscription(
    orgId: string,
    integrationId: string,
    notificationUrl: string,
  ): Promise<string | null> {
    try {
      // Get integration details
      const intResult = await db.query(
        `
        SELECT * FROM calendar_integrations WHERE id = $1 AND org_id = $2
      `,
        [integrationId, orgId],
      );

      if (intResult.rows.length === 0) {
        throw new Error("Integration not found");
      }

      const integration = intResult.rows[0];

      // Create subscription via Graph API
      // Note: This would need implementation in microsoft-graph.ts
      const subscriptionId = await graphClient.createCalendarSubscription(
        orgId,
        integration.user_id,
        {
          resource: "me/calendar/events",
          notificationUrl,
          changeType: "created,updated,deleted",
          expirationDateTime: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 3 days
        } as any,
      );

      if (!subscriptionId) {
        throw new Error("Failed to create Outlook subscription");
      }

      // Store subscription
      await db.query(
        `
        INSERT INTO calendar_outlook_subscriptions (
          integration_id, subscription_id, resource_type, notification_url,
          is_active, subscribed_at, expires_at
        ) VALUES ($1, $2, $3, $4, true, NOW(), NOW() + INTERVAL '3 days')
        ON CONFLICT (subscription_id) DO UPDATE SET
          is_active = true,
          subscribed_at = NOW()
      `,
        [integrationId, subscriptionId, "me/calendar/events", notificationUrl],
      );

      logger.info("[OutlookSync] Subscription created", {
        integrationId,
        subscriptionId,
      });

      return subscriptionId;
    } catch (error) {
      logger.error("[OutlookSync] Failed to setup subscription", {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      return null;
    }
  }

  /**
   * Detect version conflicts between local and Outlook
   */
  async detectConflicts(
    eventId: string,
    integrationId: string,
  ): Promise<boolean> {
    try {
      const syncResult = await db.query(
        `
        SELECT local_version_hash, outlook_version_hash, has_conflict
        FROM calendar_outlook_sync_state
        WHERE event_id = $1 AND integration_id = $2
      `,
        [eventId, integrationId],
      );

      if (syncResult.rows.length === 0) {
        return false;
      }

      const syncState = syncResult.rows[0];

      // If hashes differ, there's a conflict
      if (
        syncState.local_version_hash &&
        syncState.outlook_version_hash &&
        syncState.local_version_hash !== syncState.outlook_version_hash
      ) {
        await db.query(
          `
          UPDATE calendar_outlook_sync_state
          SET has_conflict = true,
              conflict_reason = 'Version mismatch detected',
              sync_status = 'conflict'
          WHERE event_id = $1 AND integration_id = $2
        `,
          [eventId, integrationId],
        );

        logger.warn("[OutlookSync] Conflict detected", {
          eventId,
          integrationId,
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error("[OutlookSync] Failed to detect conflicts", {
        error: error instanceof Error ? error.message : String(error),
        eventId,
        integrationId,
      });
      return false;
    }
  }

  /**
   * Calculate version hash for conflict detection
   */
  private calculateVersionHash(obj: any): string {
    const str = JSON.stringify({
      title: obj.title || obj.subject,
      start: obj.start_time || obj.start?.dateTime,
      end: obj.end_time || obj.end?.dateTime,
      location: obj.location_room || obj.location?.displayName,
    });

    return createHash("sha256").update(str).digest("hex");
  }

  /**
   * Renew expiring subscriptions
   */
  async renewExpiredSubscriptions(): Promise<number> {
    try {
      const expiringResult = await db.query(
        `
        SELECT * FROM calendar_outlook_subscriptions
        WHERE is_active = true
        AND expires_at < NOW() + INTERVAL '6 hours'
        AND expiration_reminder_sent = false
        LIMIT 10
      `,
      );

      let renewedCount = 0;

      for (const sub of expiringResult.rows) {
        // Renew in Outlook (would need Graph API implementation)
        const renewed = (await graphClient.renewSubscription(
          sub.subscription_id,
        )) as any;

        if (renewed) {
          await db.query(
            `
            UPDATE calendar_outlook_subscriptions
            SET expires_at = $2,
                expiration_reminder_sent = false,
                updated_at = NOW()
            WHERE subscription_id = $1
          `,
            [sub.subscription_id, renewed.expirationDateTime],
          );

          renewedCount++;
        }
      }

      logger.info("[OutlookSync] Subscriptions renewed", { renewedCount });
      return renewedCount;
    } catch (error) {
      logger.error("[OutlookSync] Failed to renew subscriptions", {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}

export const outlookSyncService = new OutlookSyncService();
export default outlookSyncService;
