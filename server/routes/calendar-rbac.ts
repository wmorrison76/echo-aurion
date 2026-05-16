/**
 * Calendar RBAC REST API
 * Endpoints for role-based access control, teams, and delegations
 */

import { Router, Request, Response } from "express";
import { RBACEngine } from "../services/rbac-engine";
import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";

const router = Router();
const db = new Database();
const rbacEngine = new RBACEngine(db);

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Verify user organization context
 */
const verifyOrgContext = (req: Request, res: Response, next: Function) => {
  const userId = req.user?.id;
  const orgId = req.user?.org_id;

  if (!userId || !orgId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized - missing user or organization context",
      timestamp: new Date().toISOString(),
    });
  }

  res.locals.userId = userId;
  res.locals.orgId = orgId;
  res.locals.ipAddress = req.ip;
  res.locals.userAgent = req.get("user-agent");

  next();
};

router.use(verifyOrgContext);

// =====================================================
// TEAM ENDPOINTS
// =====================================================

/**
 * POST /api/calendar/permissions/teams
 * Create a new team within the organization
 *
 * Body:
 * - teamName: string (required)
 * - description: string (optional)
 * - teamType: "general" | "department" | "location" (required)
 */
router.post("/teams", async (req: Request, res: Response) => {
  try {
    const { teamName, description, teamType } = req.body;
    const { orgId, userId } = res.locals;

    if (!teamName || !teamType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: teamName, teamType",
        timestamp: new Date().toISOString(),
      });
    }

    if (!["general", "department", "location"].includes(teamType)) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid teamType. Must be "general", "department", or "location"',
        timestamp: new Date().toISOString(),
      });
    }

    const team = await rbacEngine.createTeam(
      orgId,
      teamName,
      description,
      teamType,
      userId,
    );

    logger.info(`[RBAC] Team created: ${team.id}`, {
      teamId: team.id,
      orgId,
      userId,
    });

    res.status(201).json({
      success: true,
      data: team,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Team creation failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to create team",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/permissions/teams
 * List all teams in the organization
 */
router.get("/teams", async (req: Request, res: Response) => {
  try {
    const { orgId } = res.locals;

    const teams = await db.query(
      "SELECT id, org_id, team_name, description, team_type, is_active, created_at FROM calendar_teams WHERE org_id = $1 AND is_active = true ORDER BY team_name",
      [orgId],
    );

    res.json({
      success: true,
      data: teams.rows,
      count: teams.rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Team list failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to list teams",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/permissions/teams/:teamId
 * Get a specific team's details
 */
router.get("/teams/:teamId", async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { orgId } = res.locals;

    const team = await db.query(
      "SELECT id, org_id, team_name, description, team_type, is_active, created_at FROM calendar_teams WHERE id = $1 AND org_id = $2",
      [teamId, orgId],
    );

    if (team.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Team not found",
        timestamp: new Date().toISOString(),
      });
    }

    const members = await db.query(
      "SELECT ctm.id, ctm.user_id, ctm.role_id, r.display_name, ctm.joined_at FROM calendar_team_members ctm LEFT JOIN calendar_roles r ON ctm.role_id = r.id WHERE ctm.team_id = $1 AND ctm.is_active = true",
      [teamId],
    );

    res.json({
      success: true,
      data: {
        ...team.rows[0],
        members: members.rows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Team lookup failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch team",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/calendar/permissions/teams/:teamId/members
 * Add a member to a team
 *
 * Body:
 * - userId: string (required)
 * - roleId: string (required)
 */
router.post("/teams/:teamId/members", async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { userId: newUserId, roleId } = req.body;
    const { orgId, userId } = res.locals;

    if (!newUserId || !roleId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userId, roleId",
        timestamp: new Date().toISOString(),
      });
    }

    const member = await rbacEngine.addTeamMember(
      teamId,
      newUserId,
      roleId,
      userId,
    );

    logger.info(`[RBAC] Member added to team: ${teamId}`, {
      teamId,
      userId: newUserId,
      orgId,
      addedBy: userId,
    });

    res.status(201).json({
      success: true,
      data: member,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Add team member failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to add team member",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/calendar/permissions/teams/:teamId/members/:memberId
 * Remove a member from a team
 */
router.delete(
  "/teams/:teamId/members/:memberId",
  async (req: Request, res: Response) => {
    try {
      const { teamId, memberId } = req.params;
      const { orgId } = res.locals;

      const result = await db.query(
        "UPDATE calendar_team_members SET is_active = false WHERE id = $1 AND team_id = $2",
        [memberId, teamId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: "Member not found in team",
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`[RBAC] Member removed from team: ${teamId}`, {
        teamId,
        memberId,
        orgId,
      });

      res.json({
        success: true,
        message: "Member removed from team",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[RBAC] Remove team member failed", error);
      res.status(500).json({
        success: false,
        error: "Failed to remove team member",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// =====================================================
// ROLE ENDPOINTS
// =====================================================

/**
 * POST /api/calendar/permissions/roles
 * Create a custom role within the organization
 *
 * Body:
 * - roleName: string (required, kebab-case)
 * - displayName: string (required)
 * - description: string (optional)
 * - permissions: string[] (optional)
 */
router.post("/roles", async (req: Request, res: Response) => {
  try {
    const { roleName, displayName, description, permissions } = req.body;
    const { orgId, userId } = res.locals;

    if (!roleName || !displayName) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: roleName, displayName",
        timestamp: new Date().toISOString(),
      });
    }

    const role = await rbacEngine.createCustomRole(
      orgId,
      roleName,
      displayName,
      description,
      permissions || [],
      userId,
    );

    logger.info(`[RBAC] Role created: ${role.id}`, {
      roleId: role.id,
      orgId,
      userId,
    });

    res.status(201).json({
      success: true,
      data: role,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Role creation failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to create role",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/permissions/roles
 * List all roles in the organization
 */
router.get("/roles", async (req: Request, res: Response) => {
  try {
    const { orgId } = res.locals;

    const roles = await db.query(
      "SELECT id, org_id, role_name, display_name, description, is_system, is_active FROM calendar_roles WHERE org_id = $1 ORDER BY display_name",
      [orgId],
    );

    const rolesWithPermissions = await Promise.all(
      roles.rows.map(async (role) => {
        const perms = await db.query(
          "SELECT permission FROM calendar_role_permissions WHERE role_id = $1",
          [role.id],
        );
        return {
          ...role,
          permissions: perms.rows.map((p) => p.permission),
        };
      }),
    );

    res.json({
      success: true,
      data: rolesWithPermissions,
      count: rolesWithPermissions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Role list failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to list roles",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/permissions/roles/:roleId
 * Get a specific role's details
 */
router.get("/roles/:roleId", async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const { orgId } = res.locals;

    const role = await db.query(
      "SELECT id, org_id, role_name, display_name, description, is_system, is_active FROM calendar_roles WHERE id = $1 AND org_id = $2",
      [roleId, orgId],
    );

    if (role.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Role not found",
        timestamp: new Date().toISOString(),
      });
    }

    const perms = await db.query(
      "SELECT permission FROM calendar_role_permissions WHERE role_id = $1 ORDER BY permission",
      [roleId],
    );

    res.json({
      success: true,
      data: {
        ...role.rows[0],
        permissions: perms.rows.map((p) => p.permission),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Role lookup failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch role",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PATCH /api/calendar/permissions/roles/:roleId
 * Update a role's permissions
 *
 * Body:
 * - permissions: string[] (required)
 */
router.patch("/roles/:roleId", async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;
    const { orgId } = res.locals;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: "Permissions must be an array",
        timestamp: new Date().toISOString(),
      });
    }

    const role = await db.query(
      "SELECT id FROM calendar_roles WHERE id = $1 AND org_id = $2",
      [roleId, orgId],
    );

    if (role.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Role not found",
        timestamp: new Date().toISOString(),
      });
    }

    await db.query("DELETE FROM calendar_role_permissions WHERE role_id = $1", [
      roleId,
    ]);

    for (const permission of permissions) {
      await db.query(
        "INSERT INTO calendar_role_permissions (role_id, permission) VALUES ($1, $2)",
        [roleId, permission],
      );
    }

    logger.info(`[RBAC] Role permissions updated: ${roleId}`, {
      roleId,
      orgId,
      permissionCount: permissions.length,
    });

    res.json({
      success: true,
      message: "Role permissions updated",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Role update failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to update role",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// DELEGATION ENDPOINTS
// =====================================================

/**
 * POST /api/calendar/permissions/delegations
 * Create a time-limited delegation
 *
 * Body:
 * - delegateId: string (required)
 * - delegationType: "full" | "events-only" | "conflicts-only" (required)
 * - startDate: ISO string (required)
 * - endDate: ISO string (required)
 * - reason: string (optional)
 */
router.post("/delegations", async (req: Request, res: Response) => {
  try {
    const { delegateId, delegationType, startDate, endDate, reason } = req.body;
    const { orgId, userId } = res.locals;

    if (!delegateId || !delegationType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: delegateId, delegationType, startDate, endDate",
        timestamp: new Date().toISOString(),
      });
    }

    if (!["full", "events-only", "conflicts-only"].includes(delegationType)) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid delegationType. Must be "full", "events-only", or "conflicts-only"',
        timestamp: new Date().toISOString(),
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: "startDate must be before endDate",
        timestamp: new Date().toISOString(),
      });
    }

    const delegation = await rbacEngine.createDelegation(
      userId,
      delegateId,
      delegationType,
      startDate,
      endDate,
      reason,
    );

    logger.info(`[RBAC] Delegation created: ${delegation.id}`, {
      delegationId: delegation.id,
      delegatorId: userId,
      delegateId,
      orgId,
    });

    res.status(201).json({
      success: true,
      data: delegation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Delegation creation failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to create delegation",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/permissions/delegations
 * List all delegations for the user (both given and received)
 */
router.get("/delegations", async (req: Request, res: Response) => {
  try {
    const { userId, orgId } = res.locals;

    const delegations = await db.query(
      `SELECT id, org_id, delegator_id, delegate_id, delegation_type, start_date, end_date, reason, is_active, created_at 
       FROM calendar_delegations 
       WHERE org_id = $1 AND (delegator_id = $2 OR delegate_id = $2) AND is_active = true
       ORDER BY start_date DESC`,
      [orgId, userId],
    );

    res.json({
      success: true,
      data: delegations.rows,
      count: delegations.rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Delegations list failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to list delegations",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/permissions/delegations/:delegationId
 * Get a specific delegation's details
 */
router.get(
  "/delegations/:delegationId",
  async (req: Request, res: Response) => {
    try {
      const { delegationId } = req.params;
      const { orgId } = res.locals;

      const delegation = await db.query(
        `SELECT id, org_id, delegator_id, delegate_id, delegation_type, start_date, end_date, reason, is_active, created_at 
       FROM calendar_delegations 
       WHERE id = $1 AND org_id = $2`,
        [delegationId, orgId],
      );

      if (delegation.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Delegation not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: delegation.rows[0],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[RBAC] Delegation lookup failed", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch delegation",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * DELETE /api/calendar/permissions/delegations/:delegationId
 * Revoke a delegation
 */
router.delete(
  "/delegations/:delegationId",
  async (req: Request, res: Response) => {
    try {
      const { delegationId } = req.params;
      const { orgId, userId } = res.locals;

      const delegation = await db.query(
        "SELECT delegator_id FROM calendar_delegations WHERE id = $1 AND org_id = $2",
        [delegationId, orgId],
      );

      if (delegation.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Delegation not found",
          timestamp: new Date().toISOString(),
        });
      }

      if (delegation.rows[0].delegator_id !== userId) {
        return res.status(403).json({
          success: false,
          error: "Only the delegator can revoke a delegation",
          timestamp: new Date().toISOString(),
        });
      }

      await db.query(
        "UPDATE calendar_delegations SET is_active = false WHERE id = $1",
        [delegationId],
      );

      logger.info(`[RBAC] Delegation revoked: ${delegationId}`, {
        delegationId,
        orgId,
        userId,
      });

      res.json({
        success: true,
        message: "Delegation revoked",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[RBAC] Delegation revocation failed", error);
      res.status(500).json({
        success: false,
        error: "Failed to revoke delegation",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// =====================================================
// PERMISSION CHECK ENDPOINT
// =====================================================

/**
 * POST /api/calendar/permissions/check
 * Check if user has a specific permission
 *
 * Body:
 * - permission: string (required)
 * - eventId: string (optional, for event-level checks)
 */
router.post("/check", async (req: Request, res: Response) => {
  try {
    const { permission, eventId } = req.body;
    const { userId, orgId } = res.locals;

    if (!permission) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: permission",
        timestamp: new Date().toISOString(),
      });
    }

    if (eventId) {
      const hasPermission = await rbacEngine.checkEventPermission(
        userId,
        eventId,
        permission as any,
      );

      return res.json({
        success: true,
        data: {
          permission,
          eventId,
          allowed: hasPermission,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const hasPermission = await rbacEngine.hasPermission(
      userId,
      orgId,
      permission,
    );

    res.json({
      success: true,
      data: {
        permission,
        allowed: hasPermission,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] Permission check failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to check permission",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/permissions/user
 * Get all permissions for the current user
 */
router.get("/user", async (req: Request, res: Response) => {
  try {
    const { userId, orgId } = res.locals;

    const userRoles = await db.query(
      `SELECT DISTINCT cr.id, cr.role_name, cr.display_name, cr.description
       FROM calendar_roles cr
       INNER JOIN calendar_user_roles cur ON cr.id = cur.role_id
       WHERE cur.user_id = $1 AND cr.org_id = $2`,
      [userId, orgId],
    );

    const allPermissions = await db.query(
      `SELECT DISTINCT crp.permission
       FROM calendar_role_permissions crp
       INNER JOIN calendar_roles cr ON crp.role_id = cr.id
       INNER JOIN calendar_user_roles cur ON cr.id = cur.role_id
       WHERE cur.user_id = $1 AND cr.org_id = $2
       ORDER BY crp.permission`,
      [userId, orgId],
    );

    const teamMemberships = await db.query(
      `SELECT ctm.team_id, ct.team_name, cr.display_name as role
       FROM calendar_team_members ctm
       INNER JOIN calendar_teams ct ON ctm.team_id = ct.id
       INNER JOIN calendar_roles cr ON ctm.role_id = cr.id
       WHERE ctm.user_id = $1 AND ct.org_id = $2 AND ctm.is_active = true`,
      [userId, orgId],
    );

    res.json({
      success: true,
      data: {
        roles: userRoles.rows,
        permissions: allPermissions.rows.map((p) => p.permission),
        teams: teamMemberships.rows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RBAC] User permissions lookup failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user permissions",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
