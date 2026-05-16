/**
 * Role Assignment Service
 * Manages user role assignments and outlet access control
 */

import { supabase } from "@/lib/auth-service";
import type { UserRole, OutletUserRole } from "@/types/roles-permissions";

export interface RoleAssignmentResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Assign user to outlet with role
 */
export async function assignUserToOutlet(
  userId: string,
  outletId: string,
  role: UserRole,
  assignedBy: string,
): Promise<RoleAssignmentResult> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    // Check if already assigned
    const { data: existing } = await supabase
      .from("outlet_user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("outlet_id", outletId)
      .single();

    if (existing) {
      // Update existing assignment
      const { data, error } = await supabase
        .from("outlet_user_roles")
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("outlet_id", outletId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Log audit entry
      await logAuditEntry(assignedBy, outletId, "role_updated", "user_role", userId, {
        role,
      });

      return { success: true, data };
    } else {
      // Create new assignment
      const { data, error } = await supabase
        .from("outlet_user_roles")
        .insert({
          user_id: userId,
          outlet_id: outletId,
          role,
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Log audit entry
      await logAuditEntry(assignedBy, outletId, "role_assigned", "user_role", userId, {
        role,
      });

      return { success: true, data };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Remove user from outlet
 */
export async function removeUserFromOutlet(
  userId: string,
  outletId: string,
  removedBy: string,
): Promise<RoleAssignmentResult> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { error } = await supabase
      .from("outlet_user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("outlet_id", outletId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit entry
    await logAuditEntry(removedBy, outletId, "role_removed", "user_role", userId);

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get user's outlet roles
 */
export async function getUserOutletRoles(
  userId: string,
): Promise<OutletUserRole[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("outlet_user_roles")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user outlet roles:", error);
      return [];
    }

    return (
      data?.map((d) => ({
        userId: d.user_id,
        outletId: d.outlet_id,
        role: d.role,
        assignedAt: new Date(d.assigned_at).getTime(),
        assignedBy: d.assigned_by,
      })) || []
    );
  } catch (error) {
    console.error("Error fetching user outlet roles:", error);
    return [];
  }
}

/**
 * Get outlet users
 */
export async function getOutletUsers(
  outletId: string,
): Promise<Array<{ userId: string; username: string; role: UserRole }>> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("outlet_user_roles")
      .select(
        `
        user_id,
        role,
        users(username, email)
      `,
      )
      .eq("outlet_id", outletId);

    if (error) {
      console.error("Error fetching outlet users:", error);
      return [];
    }

    return (
      data?.map((d: any) => ({
        userId: d.user_id,
        username: d.users?.username || "Unknown",
        role: d.role,
      })) || []
    );
  } catch (error) {
    console.error("Error fetching outlet users:", error);
    return [];
  }
}

/**
 * Bulk assign users to outlet
 */
export async function bulkAssignUsersToOutlet(
  userIds: string[],
  outletId: string,
  role: UserRole,
  assignedBy: string,
): Promise<RoleAssignmentResult> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const assignments = userIds.map((userId) => ({
      user_id: userId,
      outlet_id: outletId,
      role,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("outlet_user_roles")
      .upsert(assignments, {
        onConflict: "user_id,outlet_id",
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Change user's organization-level role
 */
export async function updateUserRole(
  userId: string,
  role: UserRole,
  updatedBy: string,
): Promise<RoleAssignmentResult> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit entry
    await logAuditEntry(
      updatedBy,
      data.organization_id,
      "role_updated",
      "user",
      userId,
      { role },
    );

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Log audit entry for role changes
 */
export async function logAuditEntry(
  userId: string,
  outletId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changes?: Record<string, any>,
): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      outlet_id: outletId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging audit entry:", error);
  }
}

/**
 * Get audit logs for outlet
 */
export async function getOutletAuditLogs(
  outletId: string,
  limit: number = 100,
): Promise<
  Array<{
    id: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    timestamp: number;
    changes?: Record<string, any>;
  }>
> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("outlet_id", outletId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching audit logs:", error);
      return [];
    }

    return (
      data?.map((d) => ({
        id: d.id,
        userId: d.user_id,
        action: d.action,
        resourceType: d.resource_type,
        resourceId: d.resource_id,
        timestamp: new Date(d.timestamp).getTime(),
        changes: d.changes,
      })) || []
    );
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
}

/**
 * Check if user has role in outlet
 */
export async function userHasOutletRole(
  userId: string,
  outletId: string,
  role: UserRole,
): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from("outlet_user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("outlet_id", outletId)
      .eq("role", role)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}
