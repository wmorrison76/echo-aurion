import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
  requireOrgAdmin,
  AuthenticatedRequest,
} from "../middleware/supabaseAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import { featureGate } from "../middleware/featureGate";
import { tier3Limiter } from "../middleware/rateLimit";

const router: Router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "",
);

// Security middleware: Auth -> Org Access -> Rate Limiting -> Admin Check
router.use(verifySupabaseAuth);
router.use(verifyOrganizationAccess);
router.use(tier3Limiter);
router.use(requireOrgAdmin);

// ==================== ORGANIZATION MANAGEMENT ====================

// Get organization details
router.get(
  "/organizations/:orgId",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: "Organization retrieved successfully",
    });
  }),
);

// List organizations (super admin only)
router.get(
  "/organizations",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throwAppError("User not authenticated", 401);

    const { data, error } = await supabase
      .from("organization_members")
      .select("org_id, organizations(*)")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) throw error;

    const organizations = data?.map((item: any) => item.organizations) || [];

    return res.status(200).json({
      success: true,
      data: organizations,
      message: "Organizations retrieved successfully",
    });
  }),
);

// Update organization
router.put(
  "/organizations/:orgId",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;
    const { name, description, settings } = req.body;

    if (!orgId) throwAppError("Organization ID is required", 400);

    const { data, error } = await supabase
      .from("organizations")
      .update({ name, description, settings, updated_at: new Date() })
      .eq("id", orgId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: "Organization updated successfully",
    });
  }),
);

// ==================== USER MANAGEMENT ====================

// List users in organization
router.get(
  "/users",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.org_id;
    if (!orgId) throwAppError("Organization context required", 401);

    const { data, error } = await supabase
      .from("organization_members")
      .select("*, profiles(id, email, full_name, avatar_url)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Users retrieved successfully",
    });
  }),
);

// Invite user to organization
router.post(
  "/users/invite",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.org_id;
    const { email, role = "editor" } = req.body;

    if (!orgId || !email) {
      throwAppError("Organization ID and email are required", 400);
    }

    // Insert invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("organization_invitations")
      .insert({
        org_id: orgId,
        email,
        role,
        status: "pending",
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    return res.status(201).json({
      success: true,
      data: invitation,
      message: `Invitation sent to ${email}`,
    });
  }),
);

// Update user role
router.put(
  "/users/:userId/role",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.org_id;
    const { userId } = req.params;
    const { role } = req.body;

    if (!orgId || !userId || !role) {
      throwAppError("Organization ID, user ID, and role are required", 400);
    }

    const { data, error } = await supabase
      .from("organization_members")
      .update({ role, updated_at: new Date() })
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: "User role updated successfully",
    });
  }),
);

// Remove user from organization
router.delete(
  "/users/:userId",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.org_id;
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    if (!orgId || !userId) {
      throwAppError("Organization ID and user ID are required", 400);
    }

    if (userId === currentUserId) {
      throwAppError("Cannot remove yourself from organization", 400);
    }

    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "User removed from organization",
    });
  }),
);

// ==================== TIER & FEATURE MANAGEMENT ====================

// Get tier details
router.get(
  "/tiers/:tier",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tier } = req.params;

    const { data: tierData, error: tierError } = await supabase
      .from("tier_features")
      .select("*")
      .eq("tier", tier);

    if (tierError) throw tierError;

    return res.status(200).json({
      success: true,
      data: tierData || [],
      message: `Features for ${tier} tier retrieved`,
    });
  }),
);

// Enable/disable feature for tier
router.put(
  "/tiers/:tier/features/:feature",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tier, feature } = req.params;
    const { enabled, limits } = req.body;

    if (!tier || !feature) {
      throwAppError("Tier and feature name are required", 400);
    }

    const { data, error } = await supabase
      .from("tier_features")
      .upsert({
        tier,
        feature_name: feature,
        enabled,
        limits: limits || {},
        updated_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: `Feature ${feature} updated for ${tier} tier`,
    });
  }),
);

// Upgrade organization tier
router.put(
  "/organizations/:orgId/tier",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;
    const { tier } = req.body;

    if (!orgId || !tier) {
      throwAppError("Organization ID and tier are required", 400);
    }

    const { data, error } = await supabase
      .from("organizations")
      .update({
        subscription_tier: tier,
        updated_at: new Date(),
      })
      .eq("id", orgId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: `Organization upgraded to ${tier} tier`,
    });
  }),
);

// ==================== AUDIT LOGGING ====================

// Get audit logs for organization
router.get(
  "/audit-logs",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.org_id;
    const { limit = 100, offset = 0 } = req.query;

    if (!orgId) throwAppError("Organization context required", 401);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("workspace_id", orgId)
      .order("created_at", { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1,
      );

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Audit logs retrieved successfully",
    });
  }),
);

// Get audit log statistics
router.get(
  "/audit-stats",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.org_id;

    if (!orgId) throwAppError("Organization context required", 401);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("action, created_at", { count: "exact" })
      .eq("workspace_id", orgId)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (error) throw error;

    // Aggregate by action
    const stats: { [key: string]: number } = {};
    data?.forEach((log: any) => {
      stats[log.action] = (stats[log.action] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: stats,
      message: "Audit statistics retrieved successfully",
    });
  }),
);

// ==================== SYSTEM SNAPSHOTS ====================

// List snapshots for organization
router.get(
  "/snapshots",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.org_id;

    if (!orgId) throwAppError("Organization context required", 401);

    const { data, error } = await supabase
      .from("system_snapshots")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Snapshots retrieved successfully",
    });
  }),
);

// Restore from snapshot
router.post(
  "/snapshots/:snapshotId/restore",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { snapshotId } = req.params;
    const orgId = req.org_id;

    if (!snapshotId || !orgId) {
      throwAppError("Snapshot ID and organization context required", 400);
    }

    // Get snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("system_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .eq("org_id", orgId)
      .single();

    if (snapshotError) throw snapshotError;

    // Update restore count
    const { data, error } = await supabase
      .from("system_snapshots")
      .update({
        restore_count: (snapshot?.restore_count || 0) + 1,
        last_restored_at: new Date(),
      })
      .eq("id", snapshotId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: "Snapshot restored successfully",
    });
  }),
);

export default router;
