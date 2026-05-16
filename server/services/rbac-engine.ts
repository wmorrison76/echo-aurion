/**
 * RBAC Engine
 * Manages roles, permissions, teams, and delegations
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";

export interface Role {
  id: string;
  orgId: string;
  roleName: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  permissions: string[];
}

export interface Team {
  id: string;
  orgId: string;
  teamName: string;
  description?: string;
  teamType: "general" | "department" | "location";
  isActive: boolean;
  memberCount: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  roleId: string;
  isActive: boolean;
  joinedAt: string;
}

export interface Delegation {
  id: string;
  orgId: string;
  delegatorId: string;
  delegateId: string;
  delegationType: "full" | "events-only" | "conflicts-only";
  startDate: string;
  endDate: string;
  permissions: {
    canCreateEvents: boolean;
    canEditEvents: boolean;
    canDeleteEvents: boolean;
    canResolveConflicts: boolean;
    canViewAnalytics: boolean;
  };
  isActive: boolean;
  reason?: string;
}

/**
 * RBAC Engine
 */
export class RBACEngine {
  constructor(private db: Database) {}

  /**
   * Get user's roles and permissions
   */
  async getUserRoles(userId: string, orgId: string): Promise<Role[]> {
    try {
      const result = await this.db.query(
        `
        SELECT DISTINCT
          cr.id,
          cr.org_id as "orgId",
          cr.role_name as "roleName",
          cr.display_name as "displayName",
          cr.description,
          cr.is_system as "isSystem",
          cr.is_active as "isActive",
          ARRAY_AGG(DISTINCT crp.permission) as permissions
        FROM calendar_team_members ctm
        JOIN calendar_roles cr ON ctm.role_id = cr.id
        LEFT JOIN calendar_role_permissions crp ON cr.id = crp.role_id
        WHERE ctm.user_id = $1
          AND cr.org_id = $2
          AND ctm.is_active = TRUE
          AND cr.is_active = TRUE
        GROUP BY cr.id, cr.org_id, cr.role_name, cr.display_name
        `,
        [userId, orgId],
      );

      return result.rows;
    } catch (error) {
      logger.error("[RBAC] Error fetching user roles:", error);
      return [];
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    userId: string,
    orgId: string,
    permission: string,
  ): Promise<boolean> {
    try {
      const result = await this.db.query(
        `
        SELECT has_calendar_permission($1, $2, $3) as has_permission
        `,
        [userId, orgId, permission],
      );

      return result.rows[0]?.has_permission || false;
    } catch (error) {
      logger.error("[RBAC] Error checking permission:", error);
      return false;
    }
  }

  /**
   * Create a new team
   */
  async createTeam(
    orgId: string,
    teamName: string,
    description: string,
    teamType: "general" | "department" | "location",
    createdBy: string,
  ): Promise<Team | null> {
    try {
      const result = await this.db.query(
        `
        INSERT INTO calendar_teams (
          org_id, team_name, description, team_type, created_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
          id, org_id as "orgId", team_name as "teamName", 
          description, team_type as "teamType", is_active as "isActive",
          0 as "memberCount"
        `,
        [orgId, teamName, description, teamType, createdBy],
      );

      logger.info("[RBAC] Created team", {
        teamId: result.rows[0]?.id,
        orgId,
        teamName,
      });

      return result.rows[0];
    } catch (error) {
      logger.error("[RBAC] Error creating team:", error);
      return null;
    }
  }

  /**
   * Add member to team with role
   */
  async addTeamMember(
    teamId: string,
    userId: string,
    roleId: string,
    addedBy: string,
  ): Promise<TeamMember | null> {
    try {
      const result = await this.db.query(
        `
        INSERT INTO calendar_team_members (
          team_id, user_id, role_id, added_by
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (team_id, user_id) DO UPDATE
        SET is_active = TRUE, role_id = $3
        RETURNING 
          id, team_id as "teamId", user_id as "userId",
          role_id as "roleId", is_active as "isActive",
          joined_at as "joinedAt"
        `,
        [teamId, userId, roleId, addedBy],
      );

      logger.info("[RBAC] Added team member", {
        teamId,
        userId,
        roleId,
      });

      return result.rows[0];
    } catch (error) {
      logger.error("[RBAC] Error adding team member:", error);
      return null;
    }
  }

  /**
   * Remove member from team
   */
  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `
        UPDATE calendar_team_members
        SET is_active = FALSE
        WHERE team_id = $1 AND user_id = $2
        RETURNING id
        `,
        [teamId, userId],
      );

      logger.info("[RBAC] Removed team member", {
        teamId,
        userId,
      });

      return result.rowCount > 0;
    } catch (error) {
      logger.error("[RBAC] Error removing team member:", error);
      return false;
    }
  }

  /**
   * Create delegation
   */
  async createDelegation(
    orgId: string,
    delegatorId: string,
    delegateId: string,
    delegationType: "full" | "events-only" | "conflicts-only",
    startDate: string,
    endDate: string,
    permissions: {
      canCreateEvents: boolean;
      canEditEvents: boolean;
      canDeleteEvents: boolean;
      canResolveConflicts: boolean;
      canViewAnalytics: boolean;
    },
    reason?: string,
  ): Promise<Delegation | null> {
    try {
      const result = await this.db.query(
        `
        INSERT INTO calendar_delegations (
          org_id, delegator_id, delegate_id, delegation_type,
          start_date, end_date, can_create_events, can_edit_events,
          can_delete_events, can_resolve_conflicts, can_view_analytics, reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          id, org_id as "orgId", delegator_id as "delegatorId",
          delegate_id as "delegateId", delegation_type as "delegationType",
          start_date as "startDate", end_date as "endDate",
          is_active as "isActive", reason
        `,
        [
          orgId,
          delegatorId,
          delegateId,
          delegationType,
          startDate,
          endDate,
          permissions.canCreateEvents,
          permissions.canEditEvents,
          permissions.canDeleteEvents,
          permissions.canResolveConflicts,
          permissions.canViewAnalytics,
          reason,
        ],
      );

      logger.info("[RBAC] Created delegation", {
        delegatorId,
        delegateId,
        delegationType,
      });

      return result.rows[0];
    } catch (error) {
      logger.error("[RBAC] Error creating delegation:", error);
      return null;
    }
  }

  /**
   * Get active delegations for a user
   */
  async getActiveDelegations(userId: string): Promise<Delegation[]> {
    try {
      const result = await this.db.query(
        `
        SELECT
          id, org_id as "orgId", delegator_id as "delegatorId",
          delegate_id as "delegateId", delegation_type as "delegationType",
          start_date as "startDate", end_date as "endDate",
          can_create_events as "canCreateEvents",
          can_edit_events as "canEditEvents",
          can_delete_events as "canDeleteEvents",
          can_resolve_conflicts as "canResolveConflicts",
          can_view_analytics as "canViewAnalytics",
          is_active as "isActive", reason
        FROM calendar_delegations
        WHERE delegate_id = $1
          AND is_active = TRUE
          AND CURRENT_DATE BETWEEN start_date AND end_date
        ORDER BY start_date DESC
        `,
        [userId],
      );

      return result.rows.map((row) => ({
        ...row,
        permissions: {
          canCreateEvents: row.canCreateEvents,
          canEditEvents: row.canEditEvents,
          canDeleteEvents: row.canDeleteEvents,
          canResolveConflicts: row.canResolveConflicts,
          canViewAnalytics: row.canViewAnalytics,
        },
      }));
    } catch (error) {
      logger.error("[RBAC] Error fetching delegations:", error);
      return [];
    }
  }

  /**
   * Check if user has delegation access for an action
   */
  async hasDelegationAccess(
    userId: string,
    eventId: string,
    action:
      | "create"
      | "edit"
      | "delete"
      | "resolve_conflict"
      | "view_analytics",
  ): Promise<boolean> {
    try {
      const result = await this.db.query(
        `
        SELECT has_delegation_access($1, $2, $3) as has_access
        `,
        [userId, eventId, action],
      );

      return result.rows[0]?.has_access || false;
    } catch (error) {
      logger.error("[RBAC] Error checking delegation access:", error);
      return false;
    }
  }

  /**
   * Create custom role
   */
  async createRole(
    orgId: string,
    roleName: string,
    displayName: string,
    description: string,
    permissions: string[],
    createdBy: string,
  ): Promise<Role | null> {
    try {
      // Create role
      const roleResult = await this.db.query(
        `
        INSERT INTO calendar_roles (
          org_id, role_name, display_name, description, is_system
        )
        VALUES ($1, $2, $3, $4, FALSE)
        RETURNING id
        `,
        [orgId, roleName, displayName, description],
      );

      const roleId = roleResult.rows[0]?.id;

      // Add permissions
      for (const permission of permissions) {
        await this.db.query(
          `
          INSERT INTO calendar_role_permissions (role_id, permission)
          VALUES ($1, $2)
          `,
          [roleId, permission],
        );
      }

      logger.info("[RBAC] Created custom role", {
        roleId,
        orgId,
        roleName,
      });

      return {
        id: roleId,
        orgId,
        roleName,
        displayName,
        description,
        isSystem: false,
        isActive: true,
        permissions,
      };
    } catch (error) {
      logger.error("[RBAC] Error creating role:", error);
      return null;
    }
  }

  /**
   * Get list of teams for organization
   */
  async getTeams(orgId: string): Promise<Team[]> {
    try {
      const result = await this.db.query(
        `
        SELECT
          ct.id, ct.org_id as "orgId", ct.team_name as "teamName",
          ct.description, ct.team_type as "teamType",
          ct.is_active as "isActive",
          COUNT(DISTINCT ctm.id) as "memberCount"
        FROM calendar_teams ct
        LEFT JOIN calendar_team_members ctm ON ct.id = ctm.team_id
          AND ctm.is_active = TRUE
        WHERE ct.org_id = $1 AND ct.is_active = TRUE
        GROUP BY ct.id, ct.org_id, ct.team_name, ct.description, ct.team_type
        ORDER BY ct.team_name
        `,
        [orgId],
      );

      return result.rows;
    } catch (error) {
      logger.error("[RBAC] Error fetching teams:", error);
      return [];
    }
  }

  /**
   * Audit RBAC changes
   */
  async auditChange(
    orgId: string,
    auditType: string,
    entityType: string,
    entityId: string,
    changedBy: string,
    oldValues: any,
    newValues: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO calendar_role_audit (
          org_id, audit_type, entity_type, entity_id, changed_by,
          old_values, new_values, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          orgId,
          auditType,
          entityType,
          entityId,
          changedBy,
          JSON.stringify(oldValues),
          JSON.stringify(newValues),
          ipAddress,
          userAgent,
        ],
      );
    } catch (error) {
      logger.error("[RBAC] Error auditing change:", error);
    }
  }
}

export default RBACEngine;
