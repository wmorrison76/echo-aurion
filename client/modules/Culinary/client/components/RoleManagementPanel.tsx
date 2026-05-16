/**
 * Role Management Panel
 * Manages user roles, permissions, and outlet assignments
 */

import React, { useState, useCallback } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  PermissionGuard,
  RestrictedContent,
} from "@/components/PermissionGuard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  UserRole,
  OutletUserRole,
  Permission,
} from "@/types/roles-permissions";
import {
  UserRole as UserRoleEnum,
  Permission as PermissionEnum,
} from "@/types/roles-permissions";

interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  outletRoles: OutletUserRole[];
}

interface Outlet {
  id: string;
  name: string;
  location?: string;
}

interface RoleManagementPanelProps {
  users: User[];
  outlets: Outlet[];
  onRoleChange?: (
    userId: string,
    outletId: string,
    role: UserRole,
  ) => Promise<void>;
  onRoleRemove?: (userId: string, outletId: string) => Promise<void>;
  loading?: boolean;
}

export function RoleManagementPanel({
  users,
  outlets,
  onRoleChange,
  onRoleRemove,
  loading = false,
}: RoleManagementPanelProps) {
  const permissions = usePermissions();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  if (!permissions.canManageAllUsers()) {
    return (
      <RestrictedContent
        title="Role Management"
        message="You don't have permission to manage user roles."
      />
    );
  }

  const user = selectedUser ? users.find((u) => u.id === selectedUser) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <UserRoleCard
                key={user.id}
                user={user}
                outlets={outlets}
                onSelect={() => setSelectedUser(user.id)}
                isSelected={selectedUser === user.id}
                onRoleChange={onRoleChange}
                onRoleRemove={onRoleRemove}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Outlet Role</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignOutletRoleDialog
              user={user}
              outlets={outlets}
              assignedOutlets={user.outletRoles.map((or) => or.outletId)}
              onAssign={async (outletId, role) => {
                setIsAssigning(true);
                try {
                  await onRoleChange?.(user.id, outletId, role);
                } finally {
                  setIsAssigning(false);
                }
              }}
              isLoading={isAssigning}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * User Role Card Component
 */
interface UserRoleCardProps {
  user: User;
  outlets: Outlet[];
  onSelect: () => void;
  isSelected: boolean;
  onRoleChange?: (
    userId: string,
    outletId: string,
    role: UserRole,
  ) => Promise<void>;
  onRoleRemove?: (userId: string, outletId: string) => Promise<void>;
}

function UserRoleCard({
  user,
  outlets,
  onSelect,
  isSelected,
  onRoleChange,
  onRoleRemove,
}: UserRoleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleRoleChange = useCallback(
    async (outletId: string, newRole: UserRole) => {
      setIsSaving(true);
      try {
        await onRoleChange?.(user.id, outletId, newRole);
      } finally {
        setIsSaving(false);
      }
    },
    [user.id, onRoleChange],
  );

  const handleRoleRemove = useCallback(
    async (outletId: string) => {
      setIsSaving(true);
      try {
        await onRoleRemove?.(user.id, outletId);
      } finally {
        setIsSaving(false);
      }
    },
    [user.id, onRoleRemove],
  );

  return (
    <div
      className={`rounded-lg border p-4 cursor-pointer transition-colors ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{user.username}</h4>
          <p className="text-sm text-gray-600">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="default">{user.role}</Badge>
            {user.outletRoles.map((or) => {
              const outlet = outlets.find((o) => o.id === or.outletId);
              return (
                <div key={or.outletId} className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {outlet?.name || or.outletId}: {or.role}
                  </Badge>
                  <PermissionGuard
                    permission={PermissionEnum.MANAGE_USERS}
                    fallback={null}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoleRemove(or.outletId);
                      }}
                      disabled={isSaving}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </PermissionGuard>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Assign Outlet Role Dialog
 */
interface AssignOutletRoleDialogProps {
  user: User;
  outlets: Outlet[];
  assignedOutlets: string[];
  onAssign: (outletId: string, role: UserRole) => Promise<void>;
  isLoading: boolean;
}

function AssignOutletRoleDialog({
  user,
  outlets,
  assignedOutlets,
  onAssign,
  isLoading,
}: AssignOutletRoleDialogProps) {
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    UserRoleEnum.STAFF,
  );
  const [isSaving, setIsSaving] = useState(false);

  const availableOutlets = outlets.filter(
    (o) => !assignedOutlets.includes(o.id),
  );

  const handleAssign = async () => {
    if (!selectedOutlet) return;

    setIsSaving(true);
    try {
      await onAssign(selectedOutlet, selectedRole);
      setSelectedOutlet("");
      setSelectedRole(UserRoleEnum.STAFF);
    } finally {
      setIsSaving(false);
    }
  };

  if (availableOutlets.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        {user.username} is already assigned to all outlets.
      </p>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Assign to Outlet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign {user.username} to Outlet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Outlet
            </label>
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger>
                <SelectValue placeholder="Select outlet" />
              </SelectTrigger>
              <SelectContent>
                {availableOutlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                    {outlet.location && ` (${outlet.location})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <Select
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val as UserRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRoleEnum.ADMIN}>Admin</SelectItem>
                <SelectItem value={UserRoleEnum.CHEF}>Chef</SelectItem>
                <SelectItem value={UserRoleEnum.MANAGER}>Manager</SelectItem>
                <SelectItem value={UserRoleEnum.STAFF}>Staff</SelectItem>
                <SelectItem value={UserRoleEnum.FOH}>FOH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedOutlet || isSaving}
            >
              Assign Role
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Outlet Role Summary Component
 */
interface OutletRoleSummaryProps {
  outletId: string;
  users: User[];
  outlets: Outlet[];
}

export function OutletRoleSummary({
  outletId,
  users,
  outlets,
}: OutletRoleSummaryProps) {
  const outlet = outlets.find((o) => o.id === outletId);
  const outletUsers = users.filter((u) =>
    u.outletRoles.some((or) => or.outletId === outletId),
  );

  if (!outlet) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{outlet.name} - Team</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {outletUsers.length === 0 ? (
            <p className="text-sm text-gray-600">
              No users assigned to this outlet.
            </p>
          ) : (
            outletUsers.map((user) => {
              const role = user.outletRoles.find(
                (or) => or.outletId === outletId,
              )?.role;
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{user.username}</p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                  </div>
                  <Badge>{role}</Badge>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
