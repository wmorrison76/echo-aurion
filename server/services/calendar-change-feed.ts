import { db } from "../db.js";
import { logger } from "../utils/logger.js";
import { io } from "../websocket.js";

export interface ChangeFeedEntry {
  id: string;
  orgId: string;
  beoId: string;
  changeType: string;
  changeSummary?: string;
  changedFields?: Record<string, any>;
  changedByUserId: string;
  changedByName?: string;
  affectedDepartmentId?: string;
  isNotified: boolean;
  createdAt: string;
}

class CalendarChangeFeedService {
  /**
   * Log a BEO change to the feed
   */
  async logBEOChange(
    beoId: string,
    changeType: string,
    changeSummary: string,
    changedFields: Record<string, any>,
    userId: string,
    orgId: string,
  ): Promise<ChangeFeedEntry> {
    logger.info("[ChangeFeed] Logging BEO change", {
      beoId,
      changeType,
    });

    try {
      // Get BEO info for affected department
      const beoResult = await db.query(
        `SELECT department_id FROM beo_banquet_orders WHERE id = $1`,
        [beoId],
      );

      const departmentId = beoResult.rows[0]?.department_id;

      // Get user info
      const userResult = await db.query(
        `SELECT email FROM auth.users WHERE id = $1`,
        [userId],
      );

      const userName = userResult.rows[0]?.email || "System";

      // Insert change feed entry
      const result = await db.query(
        `
        INSERT INTO beo_change_feed (
          org_id,
          beo_id,
          change_type,
          change_summary,
          changed_fields,
          changed_by_user_id,
          changed_by_name,
          affected_department_id,
          is_notified,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW())
        RETURNING 
          id,
          org_id as "orgId",
          beo_id as "beoId",
          change_type as "changeType",
          change_summary as "changeSummary",
          changed_fields as "changedFields",
          changed_by_user_id as "changedByUserId",
          changed_by_name as "changedByName",
          affected_department_id as "affectedDepartmentId",
          is_notified as "isNotified",
          created_at as "createdAt"
        `,
        [
          orgId,
          beoId,
          changeType,
          changeSummary,
          JSON.stringify(changedFields),
          userId,
          userName,
          departmentId,
        ],
      );

      const entry = result.rows[0];

      logger.info("[ChangeFeed] Change logged successfully", {
        feedId: entry.id,
        beoId,
      });

      return entry;
    } catch (error) {
      logger.error("[ChangeFeed] Error logging change", error);
      throw error;
    }
  }

  /**
   * Get change feed for a BEO
   */
  async getBEOChangeFeed(
    beoId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ChangeFeedEntry[]> {
    try {
      const result = await db.query(
        `
        SELECT 
          id,
          org_id as "orgId",
          beo_id as "beoId",
          change_type as "changeType",
          change_summary as "changeSummary",
          changed_fields as "changedFields",
          changed_by_user_id as "changedByUserId",
          changed_by_name as "changedByName",
          affected_department_id as "affectedDepartmentId",
          is_notified as "isNotified",
          created_at as "createdAt"
        FROM beo_change_feed
        WHERE beo_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [beoId, limit, offset],
      );

      return result.rows;
    } catch (error) {
      logger.error("[ChangeFeed] Error fetching BEO change feed", error);
      throw error;
    }
  }

  /**
   * Get recent changes for organization
   */
  async getOrgChangeFeed(
    orgId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<ChangeFeedEntry[]> {
    try {
      const result = await db.query(
        `
        SELECT 
          id,
          org_id as "orgId",
          beo_id as "beoId",
          change_type as "changeType",
          change_summary as "changeSummary",
          changed_fields as "changedFields",
          changed_by_user_id as "changedByUserId",
          changed_by_name as "changedByName",
          affected_department_id as "affectedDepartmentId",
          is_notified as "isNotified",
          created_at as "createdAt"
        FROM beo_change_feed
        WHERE org_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [orgId, limit, offset],
      );

      return result.rows;
    } catch (error) {
      logger.error("[ChangeFeed] Error fetching org change feed", error);
      throw error;
    }
  }

  /**
   * Get unnotified changes for a department
   */
  async getUnnotifiedChanges(
    departmentId: string,
    limit: number = 50,
  ): Promise<ChangeFeedEntry[]> {
    try {
      const result = await db.query(
        `
        SELECT 
          id,
          org_id as "orgId",
          beo_id as "beoId",
          change_type as "changeType",
          change_summary as "changeSummary",
          changed_fields as "changedFields",
          changed_by_user_id as "changedByUserId",
          changed_by_name as "changedByName",
          affected_department_id as "affectedDepartmentId",
          is_notified as "isNotified",
          created_at as "createdAt"
        FROM beo_change_feed
        WHERE affected_department_id = $1 AND is_notified = FALSE
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [departmentId, limit],
      );

      return result.rows;
    } catch (error) {
      logger.error("[ChangeFeed] Error fetching unnotified changes", error);
      throw error;
    }
  }

  /**
   * Mark changes as notified
   */
  async markAsNotified(changeIds: string[]): Promise<void> {
    if (changeIds.length === 0) return;

    try {
      const placeholders = changeIds.map((_, i) => `$${i + 1}`).join(",");

      await db.query(
        `
        UPDATE beo_change_feed
        SET is_notified = TRUE, notified_at = NOW()
        WHERE id IN (${placeholders})
        `,
        changeIds,
      );

      logger.info("[ChangeFeed] Marked changes as notified", {
        count: changeIds.length,
      });
    } catch (error) {
      logger.error("[ChangeFeed] Error marking changes as notified", error);
      throw error;
    }
  }

  /**
   * Get changes by type (created, updated, approved, etc.)
   */
  async getChangesByType(
    orgId: string,
    changeType: string,
    limit: number = 50,
  ): Promise<ChangeFeedEntry[]> {
    try {
      const result = await db.query(
        `
        SELECT 
          id,
          org_id as "orgId",
          beo_id as "beoId",
          change_type as "changeType",
          change_summary as "changeSummary",
          changed_fields as "changedFields",
          changed_by_user_id as "changedByUserId",
          changed_by_name as "changedByName",
          affected_department_id as "affectedDepartmentId",
          is_notified as "isNotified",
          created_at as "createdAt"
        FROM beo_change_feed
        WHERE org_id = $1 AND change_type = $2
        ORDER BY created_at DESC
        LIMIT $3
        `,
        [orgId, changeType, limit],
      );

      return result.rows;
    } catch (error) {
      logger.error("[ChangeFeed] Error fetching changes by type", error);
      throw error;
    }
  }

  /**
   * Broadcast BEO update to Maestro dashboard via WebSocket
   */
  async notifyMaestroOnBEOUpdate(
    beoId: string,
    changeType: string,
    changedFields?: Record<string, any>,
  ): Promise<void> {
    try {
      // Get BEO info
      const beoResult = await db.query(
        `
        SELECT 
          id,
          event_id as "eventId",
          beo_number as "beoNumber",
          content_data as "contentData",
          department_id as "departmentId"
        FROM beo_banquet_orders
        WHERE id = $1
        `,
        [beoId],
      );

      if (beoResult.rows.length === 0) return;

      const beo = beoResult.rows[0];

      // Extract relevant data for maestro notification
      const guestCount = beo.contentData?.guestCount || 0;
      const previousGuestCount = changedFields?.guest_count?.old || guestCount;

      // Prepare notification payload
      const notification = {
        type: "beo_updated",
        beoId,
        beoNumber: beo.beoNumber,
        eventId: beo.eventId,
        changeType,
        timestamp: new Date().toISOString(),
        data: {
          guestCount,
          guestCountChange: guestCount - previousGuestCount,
          changedFields: changedFields || {},
        },
      };

      // Broadcast to department room
      const departmentRoom = `department:${beo.departmentId}`;
      io.to(departmentRoom).emit("beo_change", notification);

      // Broadcast to event room
      const eventRoom = `event:${beo.eventId}`;
      io.to(eventRoom).emit("beo_change", notification);

      logger.info("[ChangeFeed] Broadcasted BEO update to Maestro", {
        beoId,
        departmentRoom,
        eventRoom,
      });
    } catch (error) {
      logger.error("[ChangeFeed] Error notifying Maestro", error);
      // Don't throw - notifications should not block main operations
    }
  }

  /**
   * Get change feed with user details (for UI display)
   */
  async getBEOChangeFeedWithUsers(
    beoId: string,
    limit: number = 50,
  ): Promise<
    Array<{
      id: string;
      changeType: string;
      changeSummary?: string;
      changedByName: string;
      changedByAvatar?: string;
      createdAt: string;
      changedFields?: Record<string, any>;
    }>
  > {
    try {
      const result = await db.query(
        `
        SELECT 
          bcf.id,
          bcf.change_type as "changeType",
          bcf.change_summary as "changeSummary",
          bcf.changed_by_name as "changedByName",
          bcf.changed_fields as "changedFields",
          bcf.created_at as "createdAt",
          u.raw_user_meta_data ->> 'avatar_url' as "changedByAvatar"
        FROM beo_change_feed bcf
        LEFT JOIN auth.users u ON bcf.changed_by_user_id = u.id
        WHERE bcf.beo_id = $1
        ORDER BY bcf.created_at DESC
        LIMIT $2
        `,
        [beoId, limit],
      );

      return result.rows;
    } catch (error) {
      logger.error("[ChangeFeed] Error fetching change feed with users", error);
      throw error;
    }
  }

  /**
   * Get statistics on BEO changes
   */
  async getBEOChangeStatistics(beoId: string): Promise<{
    totalChanges: number;
    changesByType: Record<string, number>;
    lastChangedAt: string;
    lastChangedBy: string;
  }> {
    try {
      const result = await db.query(
        `
        SELECT 
          COUNT(*) as total_changes,
          MAX(created_at) as last_changed_at,
          (ARRAY_AGG(changed_by_name))[1] as last_changed_by
        FROM beo_change_feed
        WHERE beo_id = $1
        `,
        [beoId],
      );

      const stats = result.rows[0];

      // Get breakdown by type
      const typeResult = await db.query(
        `
        SELECT change_type, COUNT(*) as count
        FROM beo_change_feed
        WHERE beo_id = $1
        GROUP BY change_type
        `,
        [beoId],
      );

      const changesByType: Record<string, number> = {};
      typeResult.rows.forEach((row) => {
        changesByType[row.change_type] = parseInt(row.count, 10);
      });

      return {
        totalChanges: parseInt(stats.total_changes, 10),
        changesByType,
        lastChangedAt: stats.last_changed_at,
        lastChangedBy: stats.last_changed_by,
      };
    } catch (error) {
      logger.error("[ChangeFeed] Error getting change statistics", error);
      throw error;
    }
  }

  /**
   * Clean up old change feed entries (retention policy)
   */
  async cleanupOldChanges(daysToKeep: number = 90): Promise<number> {
    logger.info("[ChangeFeed] Cleaning up old changes", { daysToKeep });

    try {
      const result = await db.query(
        `
        DELETE FROM beo_change_feed
        WHERE created_at < NOW() - INTERVAL '1 day' * $1
        `,
        [daysToKeep],
      );

      const deletedCount = result.rowCount || 0;

      logger.info("[ChangeFeed] Cleanup completed", {
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      logger.error("[ChangeFeed] Error cleaning up changes", error);
      throw error;
    }
  }

  /**
   * Get department changes for dashboard notifications
   */
  async getDepartmentRecentChanges(
    departmentId: string,
    orgId: string,
    hoursBack: number = 24,
  ): Promise<
    Array<{
      id: string;
      beoId: string;
      changeType: string;
      changeSummary?: string;
      changedByName: string;
      eventId: string;
      createdAt: string;
    }>
  > {
    try {
      const result = await db.query(
        `
        SELECT 
          bcf.id,
          bcf.beo_id as "beoId",
          bcf.change_type as "changeType",
          bcf.change_summary as "changeSummary",
          bcf.changed_by_name as "changedByName",
          bb.event_id as "eventId",
          bcf.created_at as "createdAt"
        FROM beo_change_feed bcf
        JOIN beo_banquet_orders bb ON bcf.beo_id = bb.id
        WHERE bb.department_id = $1 
          AND bcf.org_id = $2
          AND bcf.created_at > NOW() - INTERVAL '1 hour' * $3
        ORDER BY bcf.created_at DESC
        LIMIT 20
        `,
        [departmentId, orgId, hoursBack],
      );

      return result.rows;
    } catch (error) {
      logger.error(
        "[ChangeFeed] Error getting department recent changes",
        error,
      );
      throw error;
    }
  }
}

export const calendarChangeFeedService = new CalendarChangeFeedService();
