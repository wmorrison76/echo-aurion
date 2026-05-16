import { db } from "../db.js";
import { logger } from "../utils/logger.js";

export interface VisibilityRule {
  id: string;
  orgId: string;
  userId: string;
  visibilityScope: "all_events" | "own_outlet" | "own_departments" | "custom";
  allowedOutletIds: string[];
  allowedDepartmentIds: string[];
  canViewAllEvents: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VisibilityPreferences {
  visibilityScope: "all_events" | "own_outlet" | "own_departments" | "custom";
  allowedOutlets: string[];
  allowedDepartments: string[];
}

class CalendarVisibilityService {
  /**
   * Get visibility rules for a user
   */
  async getVisibilityRules(
    userId: string,
    orgId: string,
  ): Promise<VisibilityRule | null> {
    try {
      const result = await db.query(
        `
        SELECT 
          id,
          org_id as "orgId",
          user_id as "userId",
          visibility_scope as "visibilityScope",
          allowed_outlet_ids as "allowedOutletIds",
          allowed_department_ids as "allowedDepartmentIds",
          can_view_all_events as "canViewAllEvents",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM calendar_event_visibility_rules
        WHERE user_id = $1 AND org_id = $2
        `,
        [userId, orgId],
      );

      if (result.rows.length === 0) {
        // Create default rules if none exist
        return await this.createDefaultVisibilityRules(userId, orgId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error("[Visibility] Error fetching visibility rules", error);
      throw error;
    }
  }

  /**
   * Get user's department assignments
   */
  async getUserDepartments(userId: string, orgId: string): Promise<string[]> {
    try {
      const result = await db.query(
        `
        SELECT DISTINCT department_id
        FROM employees
        WHERE user_id = $1 AND org_id = $2 AND deleted_at IS NULL
        `,
        [userId, orgId],
      );

      return result.rows.map((row) => row.department_id);
    } catch (error) {
      logger.error("[Visibility] Error fetching user departments", error);
      return [];
    }
  }

  /**
   * Get user's outlet assignments
   */
  async getUserOutlets(userId: string, orgId: string): Promise<string[]> {
    try {
      const result = await db.query(
        `
        SELECT DISTINCT outlet_id
        FROM employees
        WHERE user_id = $1 AND org_id = $2 AND outlet_id IS NOT NULL AND deleted_at IS NULL
        `,
        [userId, orgId],
      );

      return result.rows.map((row) => row.outlet_id);
    } catch (error) {
      logger.error("[Visibility] Error fetching user outlets", error);
      return [];
    }
  }

  /**
   * Get user's role to determine default visibility scope
   */
  async getUserRole(userId: string, orgId: string): Promise<string> {
    try {
      const result = await db.query(
        `
        SELECT DISTINCT role
        FROM employees
        WHERE user_id = $1 AND org_id = $2 AND deleted_at IS NULL
        LIMIT 1
        `,
        [userId, orgId],
      );

      return result.rows[0]?.role || "staff";
    } catch (error) {
      logger.error("[Visibility] Error fetching user role", error);
      return "staff";
    }
  }

  /**
   * Create default visibility rules based on user role
   */
  async createDefaultVisibilityRules(
    userId: string,
    orgId: string,
  ): Promise<VisibilityRule> {
    logger.info("[Visibility] Creating default visibility rules", {
      userId,
      orgId,
    });

    try {
      const role = await this.getUserRole(userId, orgId);
      const userDepts = await this.getUserDepartments(userId, orgId);
      const userOutlets = await this.getUserOutlets(userId, orgId);

      let visibilityScope: string = "own_departments";
      let canViewAll = false;

      // Determine scope based on role
      if (
        role === "executive_chef" ||
        role === "executive_director" ||
        role === "admin"
      ) {
        visibilityScope = "all_events";
        canViewAll = true;
      } else if (role === "outlet_manager" || role === "outlet_chef") {
        visibilityScope = "own_outlet";
      } else {
        visibilityScope = "own_departments";
      }

      // Insert default rules
      const result = await db.query(
        `
        INSERT INTO calendar_event_visibility_rules (
          org_id,
          user_id,
          visibility_scope,
          allowed_outlet_ids,
          allowed_department_ids,
          can_view_all_events,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (org_id, user_id) DO UPDATE
        SET 
          visibility_scope = $3,
          allowed_outlet_ids = $4,
          allowed_department_ids = $5,
          can_view_all_events = $6,
          updated_at = NOW()
        RETURNING 
          id,
          org_id as "orgId",
          user_id as "userId",
          visibility_scope as "visibilityScope",
          allowed_outlet_ids as "allowedOutletIds",
          allowed_department_ids as "allowedDepartmentIds",
          can_view_all_events as "canViewAllEvents",
          created_at as "createdAt",
          updated_at as "updatedAt"
        `,
        [orgId, userId, visibilityScope, userOutlets, userDepts, canViewAll],
      );

      return result.rows[0];
    } catch (error) {
      logger.error("[Visibility] Error creating default rules", error);
      throw error;
    }
  }

  /**
   * Update user's visibility preferences
   */
  async updateVisibilityPreferences(
    userId: string,
    orgId: string,
    preferences: Partial<VisibilityPreferences>,
  ): Promise<VisibilityRule> {
    logger.info("[Visibility] Updating visibility preferences", {
      userId,
      orgId,
      preferences,
    });

    try {
      const updates: Record<string, any> = {};
      const params: any[] = [orgId, userId];

      if (preferences.visibilityScope) {
        updates.visibility_scope = preferences.visibilityScope;
      }

      if (preferences.allowedDepartments) {
        updates.allowed_department_ids = preferences.allowedDepartments;
      }

      if (preferences.allowedOutlets) {
        updates.allowed_outlet_ids = preferences.allowedOutlets;
      }

      if (Object.keys(updates).length === 0) {
        // No updates, just return current rules
        return (await this.getVisibilityRules(userId, orgId)) as VisibilityRule;
      }

      updates.updated_at = new Date().toISOString();

      const updateClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 3}`)
        .join(", ");

      Object.values(updates).forEach((val) => params.push(val));

      const result = await db.query(
        `
        UPDATE calendar_event_visibility_rules
        SET ${updateClause}
        WHERE org_id = $1 AND user_id = $2
        RETURNING 
          id,
          org_id as "orgId",
          user_id as "userId",
          visibility_scope as "visibilityScope",
          allowed_outlet_ids as "allowedOutletIds",
          allowed_department_ids as "allowedDepartmentIds",
          can_view_all_events as "canViewAllEvents",
          created_at as "createdAt",
          updated_at as "updatedAt"
        `,
        params,
      );

      logger.info("[Visibility] Preferences updated successfully", {
        userId,
      });

      return result.rows[0];
    } catch (error) {
      logger.error("[Visibility] Error updating preferences", error);
      throw error;
    }
  }

  /**
   * Check if user can view a specific event
   */
  async canUserViewEvent(
    userId: string,
    eventId: string,
    orgId: string,
  ): Promise<boolean> {
    try {
      const result = await db.query(
        `
        SELECT can_user_view_event($1, $2, $3) as can_view
        `,
        [eventId, userId, orgId],
      );

      return result.rows[0]?.can_view || false;
    } catch (error) {
      logger.error("[Visibility] Error checking event visibility", error);
      return false;
    }
  }

  /**
   * Filter events based on user's visibility rules
   */
  async filterEventsByVisibility(
    userId: string,
    orgId: string,
    events: Array<{
      id: string;
      departmentId?: string;
      outletId?: string;
      [key: string]: any;
    }>,
  ): Promise<
    Array<{
      id: string;
      departmentId?: string;
      outletId?: string;
      [key: string]: any;
    }>
  > {
    try {
      const rules = await this.getVisibilityRules(userId, orgId);

      if (!rules) {
        return [];
      }

      // If user can see all events, return all
      if (rules.canViewAllEvents) {
        return events;
      }

      const filtered: typeof events = [];

      for (const event of events) {
        const canView = await this.canUserViewEvent(userId, event.id, orgId);

        if (canView) {
          filtered.push(event);
        }
      }

      return filtered;
    } catch (error) {
      logger.error("[Visibility] Error filtering events", error);
      return [];
    }
  }

  /**
   * Get all events a user can view (server-side filtering)
   */
  async getUserVisibleEvents(
    userId: string,
    orgId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      departmentId?: string;
      outletId?: string;
      status?: string;
    },
  ): Promise<any[]> {
    logger.info("[Visibility] Fetching visible events for user", {
      userId,
      orgId,
    });

    try {
      const rules = await this.getVisibilityRules(userId, orgId);

      if (!rules) {
        return [];
      }

      let query = `
        SELECT 
          ce.id,
          ce.event_name as "eventName",
          ce.event_date as "eventDate",
          ce.event_time as "eventTime",
          ce.guest_count as "guestCount",
          ce.venue as "venue",
          ce.status,
          ce.department_id as "departmentId",
          ce.outlet_id as "outletId",
          ce.beo_id as "beoId",
          ce.created_at as "createdAt",
          ce.updated_at as "updatedAt"
        FROM calendar_events ce
        WHERE ce.org_id = $1
      `;

      const params: any[] = [orgId];
      let paramCount = 1;

      // Add visibility filters
      if (!rules.canViewAllEvents) {
        if (rules.visibilityScope === "all_events") {
          // No additional filter needed
        } else if (rules.visibilityScope === "own_outlet") {
          paramCount++;
          query += ` AND ce.outlet_id = $${paramCount}`;
          params.push(rules.allowedOutletIds[0] || null);
        } else if (rules.visibilityScope === "own_departments") {
          paramCount++;
          query += ` AND ce.department_id = ANY($${paramCount})`;
          params.push(rules.allowedDepartmentIds || []);
        } else if (rules.visibilityScope === "custom") {
          paramCount++;
          query += ` AND ce.department_id = ANY($${paramCount})`;
          params.push(rules.allowedDepartmentIds || []);
        }
      }

      // Add optional filters
      if (filters?.startDate) {
        paramCount++;
        query += ` AND ce.event_date >= $${paramCount}`;
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        paramCount++;
        query += ` AND ce.event_date <= $${paramCount}`;
        params.push(filters.endDate);
      }

      if (filters?.departmentId) {
        paramCount++;
        query += ` AND ce.department_id = $${paramCount}`;
        params.push(filters.departmentId);
      }

      if (filters?.outletId) {
        paramCount++;
        query += ` AND ce.outlet_id = $${paramCount}`;
        params.push(filters.outletId);
      }

      if (filters?.status) {
        paramCount++;
        query += ` AND ce.status = $${paramCount}`;
        params.push(filters.status);
      }

      query += ` ORDER BY ce.event_date ASC`;

      const result = await db.query(query, params);

      return result.rows;
    } catch (error) {
      logger.error("[Visibility] Error fetching user visible events", error);
      throw error;
    }
  }

  /**
   * Get event visibility status for multiple events
   */
  async getEventsVisibility(
    userId: string,
    orgId: string,
    eventIds: string[],
  ): Promise<Record<string, boolean>> {
    try {
      const visibility: Record<string, boolean> = {};

      for (const eventId of eventIds) {
        visibility[eventId] = await this.canUserViewEvent(
          userId,
          eventId,
          orgId,
        );
      }

      return visibility;
    } catch (error) {
      logger.error("[Visibility] Error getting events visibility", error);
      throw error;
    }
  }

  /**
   * Grant user access to specific departments
   */
  async grantDepartmentAccess(
    userId: string,
    orgId: string,
    departmentIds: string[],
  ): Promise<VisibilityRule> {
    logger.info("[Visibility] Granting department access", {
      userId,
      departmentIds,
    });

    try {
      return await this.updateVisibilityPreferences(userId, orgId, {
        visibilityScope: "custom",
        allowedDepartments: departmentIds,
      });
    } catch (error) {
      logger.error("[Visibility] Error granting department access", error);
      throw error;
    }
  }

  /**
   * Revoke user access to all but their primary departments
   */
  async resetToDefaultAccess(
    userId: string,
    orgId: string,
  ): Promise<VisibilityRule> {
    logger.info("[Visibility] Resetting to default access", { userId });

    try {
      const userDepts = await this.getUserDepartments(userId, orgId);
      const userOutlets = await this.getUserOutlets(userId, orgId);
      const role = await this.getUserRole(userId, orgId);

      let scope = "own_departments";
      if (
        role === "executive_chef" ||
        role === "executive_director" ||
        role === "admin"
      ) {
        scope = "all_events";
      } else if (role === "outlet_manager" || role === "outlet_chef") {
        scope = "own_outlet";
      }

      return await this.updateVisibilityPreferences(userId, orgId, {
        visibilityScope: scope as any,
        allowedDepartments: userDepts,
        allowedOutlets: userOutlets,
      });
    } catch (error) {
      logger.error("[Visibility] Error resetting access", error);
      throw error;
    }
  }
}

export const calendarVisibilityService = new CalendarVisibilityService();
