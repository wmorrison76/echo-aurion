/**
 * Genesis Auth Store
 * In-memory auth snapshot seeded from GenesisConfig
 * Allows switching users for testing RBAC
 * Storage key: luccca:genesis:auth:v1 (optional persistence)
 */

import { getGenesisConfig } from "@/lib/genesis-config-store";
import type { User, Team } from "@/../shared/types/genesis-permissions";

const STORAGE_KEY = "luccca:genesis:auth:v1";

let currentUser: User | null = null;
let users: Map<string, User> = new Map();
let teams: Map<string, Team> = new Map();

/**
 * Initialize auth from Genesis config
 */
export function initializeAuth(): void {
  const config = getGenesisConfig();

  users.clear();
  teams.clear();

  // Create users from outlets
  config.outlets.forEach((outlet) => {
    const user: User = {
      userId: `user_${outlet.id}`,
      name: outlet.name,
      role: "OUTLET_MANAGER",
      outletId: outlet.id,
      permissions: [
        "PROCUREMENT_VIEW",
        "OFFSETS_VIEW",
        "VENDOR_SCHEDULE_VIEW",
        "CLAIM_QUEUE",
        "FULFILL_QUEUE",
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    users.set(user.userId, user);
  });

  // Create users from commissaries
  config.commissaries.forEach((commissary) => {
    const user: User = {
      userId: `user_${commissary.id}`,
      name: commissary.name,
      role: "COMMISSARY_HEAD",
      outletId: commissary.id,
      permissions: [
        "PROCUREMENT_VIEW",
        "PROCUREMENT_RUN",
        "OFFSETS_EDIT",
        "OFFSETS_VIEW",
        "VENDOR_SCHEDULE_VIEW",
        "AURUM_DRAFT_VIEW",
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    users.set(user.userId, user);
  });

  // Add system admin user
  const adminUser: User = {
    userId: "user_admin",
    name: "System Admin",
    role: "SYSTEM_ADMIN",
    permissions: [
      "PROCUREMENT_RUN",
      "PROCUREMENT_VIEW",
      "VENDOR_SCHEDULE_EDIT",
      "VENDOR_SCHEDULE_VIEW",
      "OFFSETS_EDIT",
      "OFFSETS_VIEW",
      "AURUM_DRAFT_VIEW",
      "AURUM_DRAFT_EXPORT",
      "AUDIT_VIEW",
      "CONFIG_EDIT",
      "CONFIG_VIEW",
      "MANAGE_ROLES",
      "VIEW_REWARDS",
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  users.set(adminUser.userId, adminUser);

  // Create a team per outlet group
  if (config.outlets.length > 0) {
    const team: Team = {
      teamId: "team_outlets",
      name: "All Outlets",
      description: "All outlet locations",
      members: Array.from(users.values())
        .filter((u) => u.role === "OUTLET_MANAGER")
        .map((u) => u.userId),
      permissions: ["PROCUREMENT_VIEW"],
      createdAt: new Date().toISOString(),
    };
    teams.set(team.teamId, team);
  }

  if (config.commissaries.length > 0) {
    const team: Team = {
      teamId: "team_commissaries",
      name: "All Commissaries",
      description: "All commissary operations",
      members: Array.from(users.values())
        .filter((u) => u.role === "COMMISSARY_HEAD")
        .map((u) => u.userId),
      permissions: ["PROCUREMENT_RUN", "OFFSETS_EDIT", "AURUM_DRAFT_VIEW"],
      createdAt: new Date().toISOString(),
    };
    teams.set(team.teamId, team);
  }

  // Set current user to admin by default
  currentUser = adminUser;

  // Persist to storage (optional)
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentUserId: currentUser.userId,
        users: Array.from(users.values()),
        teams: Array.from(teams.values()),
      }),
    );
  } catch (e) {
    console.error("Failed to persist auth data:", e);
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  if (!currentUser && users.size === 0) {
    initializeAuth();
  }
  return currentUser;
}

/**
 * Set current user (for testing RBAC)
 */
export function setCurrentUser(userId: string): boolean {
  const user = users.get(userId);
  if (user) {
    currentUser = user;
    return true;
  }
  return false;
}

/**
 * List all users
 */
export function listUsers(): User[] {
  if (users.size === 0) {
    initializeAuth();
  }
  return Array.from(users.values());
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): User | null {
  return users.get(userId) || null;
}

/**
 * List all teams
 */
export function listTeams(): Team[] {
  if (teams.size === 0) {
    initializeAuth();
  }
  return Array.from(teams.values());
}

/**
 * Get team by ID
 */
export function getTeamById(teamId: string): Team | null {
  return teams.get(teamId) || null;
}

/**
 * Get user's permissions
 */
export function getUserPermissions(userId: string): string[] {
  const user = users.get(userId);
  if (!user) return [];

  const permissions = new Set(user.permissions);

  // Add team permissions
  teams.forEach((team) => {
    if (team.members.includes(userId)) {
      team.permissions.forEach((p) => permissions.add(p));
    }
  });

  return Array.from(permissions);
}

/**
 * Clear auth (for testing)
 */
export function clearAuth(): void {
  currentUser = null;
  users.clear();
  teams.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear auth:", e);
  }
}
