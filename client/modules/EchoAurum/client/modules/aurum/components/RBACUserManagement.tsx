import React, { useMemo, useState } from "react";
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  Users,
  AlertCircle,
  Check,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt: string;
  lastActive?: string;
  status: "active" | "inactive";
}
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}
const AVAILABLE_ROLES: Role[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full system access",
    permissions: [
      "manage_users",
      "manage_roles",
      "view_all_approvals",
      "approve_any",
      "manage_workflows",
      "manage_system",
    ],
    userCount: 0,
  },
  {
    id: "finance_manager",
    name: "Finance Manager",
    description: "Manage financial operations",
    permissions: [
      "view_reports",
      "approve_transactions",
      "create_journals",
      "manage_bank_reconciliation",
      "view_audit_trail",
    ],
    userCount: 0,
  },
  {
    id: "approver",
    name: "Approver",
    description: "Review and approve transactions",
    permissions: [
      "view_approvals",
      "approve_transactions",
      "view_own_approvals",
      "add_comments",
    ],
    userCount: 0,
  },
  {
    id: "accountant",
    name: "Accountant",
    description: "Data entry and reporting",
    permissions: [
      "create_entries",
      "view_reports",
      "edit_own_entries",
      "view_approval_status",
    ],
    userCount: 0,
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access",
    permissions: ["view_reports", "view_dashboard"],
    userCount: 0,
  },
];
const AVAILABLE_PERMISSIONS = [
  { id: "manage_users", label: "Manage Users" },
  { id: "manage_roles", label: "Manage Roles" },
  { id: "view_all_approvals", label: "View All Approvals" },
  { id: "view_own_approvals", label: "View Own Approvals" },
  { id: "approve_transactions", label: "Approve Transactions" },
  { id: "approve_any", label: "Approve Any Transaction" },
  { id: "reject_transactions", label: "Reject Transactions" },
  { id: "manage_workflows", label: "Manage Workflows" },
  { id: "create_journals", label: "Create Journal Entries" },
  { id: "edit_own_entries", label: "Edit Own Entries" },
  { id: "manage_bank_reconciliation", label: "Manage Bank Reconciliation" },
  { id: "create_entries", label: "Create Entries" },
  { id: "view_reports", label: "View Reports" },
  { id: "view_dashboard", label: "View Dashboard" },
  { id: "view_audit_trail", label: "View Audit Trail" },
  { id: "manage_system", label: "Manage System" },
  { id: "add_comments", label: "Add Comments" },
];
interface RBACUserManagementProps {
  onUserSaved?: (user: User) => void;
}
export function RBACUserManagement({ onUserSaved }: RBACUserManagementProps) {
  const [users, setUsers] = useState<User[]>([
    {
      id: "user_1",
      name: "John Admin",
      email: "john.admin@company.com",
      role: "admin",
      permissions: [
        "manage_users",
        "manage_roles",
        "view_all_approvals",
        "approve_any",
        "manage_workflows",
        "manage_system",
      ],
      createdAt: "2024-01-15",
      lastActive: "2024-01-20",
      status: "active",
    },
    {
      id: "user_2",
      name: "Jane Finance",
      email: "jane.finance@company.com",
      role: "finance_manager",
      permissions: [
        "view_reports",
        "approve_transactions",
        "create_journals",
        "manage_bank_reconciliation",
        "view_audit_trail",
      ],
      createdAt: "2024-01-16",
      lastActive: "2024-01-20",
      status: "active",
    },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    status: "active",
    permissions: [],
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || user.role === filterRole;
      const matchesStatus =
        filterStatus === "all" || user.status === filterStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);
  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    users.forEach((user) => {
      stats[user.role] = (stats[user.role] || 0) + 1;
    });
    return stats;
  }, [users]);
  const handleAddUser = async () => {
    setLoading(true);
    try {
      if (!newUser.name || !newUser.email || !newUser.role) {
        return;
      }
      const user: User = {
        id: `user_${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions || [],
        createdAt: new Date().toISOString().split("T")[0],
        status: "active",
      };
      setUsers([...users, user]);
      setNewUser({ status: "active", permissions: [] });
      setShowForm(false);
      onUserSaved?.(user);
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateUser = async () => {
    setLoading(true);
    try {
      if (editingUser) {
        const updatedUsers = users.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                role: editingUser.role,
                permissions: editingUser.permissions,
                status: editingUser.status,
              }
            : u,
        );
        setUsers(updatedUsers);
        onUserSaved?.(editingUser);
        setEditingUser(null);
      }
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteUser = (id: string) => {
    setUsers(users.filter((u) => u.id !== id));
  };
  const handleRoleChange = (userId: string, newRole: string) => {
    const selectedRole = AVAILABLE_ROLES.find((r) => r.id === newRole);
    if (editingUser?.id === userId) {
      setEditingUser({
        ...editingUser,
        role: newRole,
        permissions: selectedRole?.permissions || [],
      });
    } else {
      setNewUser({
        ...newUser,
        role: newRole,
        permissions: selectedRole?.permissions || [],
      });
    }
  };
  return (
    <div className="space-y-6">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold text-foreground">
            {" "}
            User Management{" "}
          </h2>{" "}
          <p className="text-sm text-muted-foreground mt-1">
            {" "}
            Manage user roles and permissions{" "}
          </p>{" "}
        </div>{" "}
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gap-2 bg-aurum-600 hover:bg-aurum-700"
        >
          {" "}
          <Plus className="w-4 h-4" /> Add User{" "}
        </Button>{" "}
      </div>{" "}
      {/* Role Statistics */}{" "}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {" "}
        {AVAILABLE_ROLES.map((role) => (
          <div
            key={role.id}
            className="bg-surface rounded-lg border border-border p-4"
          >
            {" "}
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {" "}
              {role.name}{" "}
            </div>{" "}
            <div className="text-2xl font-bold text-foreground">
              {" "}
              {roleStats[role.id] || 0}{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
      {/* Add/Edit User Form */}{" "}
      {showForm && (
        <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
          {" "}
          <h3 className="font-semibold text-foreground">Add New User</h3>{" "}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {" "}
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium text-foreground">
                {" "}
                Full Name{" "}
              </label>{" "}
              <Input
                value={newUser.name || ""}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                placeholder="John Doe"
                className="h-9"
              />{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium text-foreground">
                {" "}
                Email{" "}
              </label>{" "}
              <Input
                value={newUser.email || ""}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                placeholder="john@company.com"
                type="email"
                className="h-9"
              />{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium text-foreground">
                {" "}
                Role{" "}
              </label>{" "}
              <Select
                value={newUser.role || "all"}
                onValueChange={(val) => handleRoleChange("new", val)}
              >
                {" "}
                <SelectTrigger className="h-9">
                  {" "}
                  <SelectValue placeholder="Select role" />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {" "}
                      {role.name}{" "}
                    </SelectItem>
                  ))}{" "}
                </SelectContent>{" "}
              </Select>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex gap-3">
            {" "}
            <Button
              onClick={handleAddUser}
              disabled={
                loading || !newUser.name || !newUser.email || !newUser.role
              }
              className="gap-2"
            >
              {" "}
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}{" "}
              Create User{" "}
            </Button>{" "}
            <Button onClick={() => setShowForm(false)} variant="outline">
              {" "}
              Cancel{" "}
            </Button>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Filters */}{" "}
      <div className="bg-surface rounded-lg border border-border p-4 space-y-4">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <Filter className="w-4 h-4 text-muted-foreground" />{" "}
          <span className="text-sm font-medium text-foreground">
            Filters
          </span>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {" "}
          <div className="space-y-2">
            {" "}
            <label className="text-sm font-medium text-foreground">
              {" "}
              Search{" "}
            </label>{" "}
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <label className="text-sm font-medium text-foreground">
              Role
            </label>{" "}
            <Select value={filterRole} onValueChange={setFilterRole}>
              {" "}
              <SelectTrigger className="h-9">
                {" "}
                <SelectValue placeholder="All roles" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="all">All roles</SelectItem>{" "}
                {AVAILABLE_ROLES.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {" "}
                    {role.name}{" "}
                  </SelectItem>
                ))}{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <label className="text-sm font-medium text-foreground">
              {" "}
              Status{" "}
            </label>{" "}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              {" "}
              <SelectTrigger className="h-9">
                {" "}
                <SelectValue placeholder="All statuses" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="all">All statuses</SelectItem>{" "}
                <SelectItem value="active">Active</SelectItem>{" "}
                <SelectItem value="inactive">Inactive</SelectItem>{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Users List */}{" "}
      <div className="space-y-3">
        {" "}
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-surface rounded-lg border border-border p-4"
            >
              {" "}
              {editingUser?.id === user.id ? (
                <div className="space-y-4">
                  {" "}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {" "}
                        Name{" "}
                      </p>{" "}
                      <p className="text-foreground font-semibold">
                        {" "}
                        {editingUser.name}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {" "}
                        Email{" "}
                      </p>{" "}
                      <p className="text-foreground font-semibold">
                        {" "}
                        {editingUser.email}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div className="space-y-2">
                      {" "}
                      <label className="text-sm font-medium text-foreground">
                        {" "}
                        Role{" "}
                      </label>{" "}
                      <Select
                        value={editingUser.role}
                        onValueChange={(val) => handleRoleChange(user.id, val)}
                      >
                        {" "}
                        <SelectTrigger className="h-9">
                          {" "}
                          <SelectValue />{" "}
                        </SelectTrigger>{" "}
                        <SelectContent>
                          {" "}
                          {AVAILABLE_ROLES.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {" "}
                              {role.name}{" "}
                            </SelectItem>
                          ))}{" "}
                        </SelectContent>{" "}
                      </Select>{" "}
                    </div>{" "}
                    <div className="space-y-2">
                      {" "}
                      <label className="text-sm font-medium text-foreground">
                        {" "}
                        Status{" "}
                      </label>{" "}
                      <Select
                        value={editingUser.status}
                        onValueChange={(val) =>
                          setEditingUser({ ...editingUser, status: val as any })
                        }
                      >
                        {" "}
                        <SelectTrigger className="h-9">
                          {" "}
                          <SelectValue />{" "}
                        </SelectTrigger>{" "}
                        <SelectContent>
                          {" "}
                          <SelectItem value="active">Active</SelectItem>{" "}
                          <SelectItem value="inactive">
                            Inactive
                          </SelectItem>{" "}
                        </SelectContent>{" "}
                      </Select>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="space-y-2">
                    {" "}
                    <label className="text-sm font-medium text-foreground">
                      {" "}
                      Permissions{" "}
                    </label>{" "}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {" "}
                      {AVAILABLE_PERMISSIONS.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {" "}
                          <input
                            type="checkbox"
                            checked={editingUser.permissions.includes(perm.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingUser({
                                  ...editingUser,
                                  permissions: [
                                    ...editingUser.permissions,
                                    perm.id,
                                  ],
                                });
                              } else {
                                setEditingUser({
                                  ...editingUser,
                                  permissions: editingUser.permissions.filter(
                                    (p) => p !== perm.id,
                                  ),
                                });
                              }
                            }}
                            className="rounded"
                          />{" "}
                          <span className="text-sm text-foreground">
                            {" "}
                            {perm.label}{" "}
                          </span>{" "}
                        </label>
                      ))}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="flex gap-3 pt-4 border-t">
                    {" "}
                    <Button
                      onClick={handleUpdateUser}
                      disabled={loading}
                      className="gap-2"
                    >
                      {" "}
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}{" "}
                      Save Changes{" "}
                    </Button>{" "}
                    <Button
                      onClick={() => setEditingUser(null)}
                      variant="outline"
                      disabled={loading}
                    >
                      {" "}
                      Cancel{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  {" "}
                  <div className="flex-1">
                    {" "}
                    <div className="flex items-center gap-2 mb-2">
                      {" "}
                      <h3 className="font-semibold text-foreground">
                        {" "}
                        {user.name}{" "}
                      </h3>{" "}
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                          user.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-surface text-gray-800",
                        )}
                      >
                        {" "}
                        {user.status.charAt(0).toUpperCase() +
                          user.status.slice(1)}{" "}
                      </span>{" "}
                    </div>{" "}
                    <p className="text-sm text-muted-foreground mb-3">
                      {" "}
                      {user.email}{" "}
                    </p>{" "}
                    <div className="flex items-center gap-2 mb-2">
                      {" "}
                      <Shield className="w-4 h-4 text-aurum-600" />{" "}
                      <span className="text-sm font-medium text-foreground">
                        {" "}
                        {
                          AVAILABLE_ROLES.find((r) => r.id === user.role)?.name
                        }{" "}
                      </span>{" "}
                    </div>{" "}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {" "}
                      {user.permissions.slice(0, 3).map((perm) => (
                        <span
                          key={perm}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground"
                        >
                          {" "}
                          {AVAILABLE_PERMISSIONS.find((p) => p.id === perm)
                            ?.label || perm}{" "}
                        </span>
                      ))}{" "}
                      {user.permissions.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                          {" "}
                          +{user.permissions.length - 3} more{" "}
                        </span>
                      )}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="flex gap-2 ml-4">
                    {" "}
                    <Button
                      onClick={() => setEditingUser(user)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {" "}
                      <Edit2 className="w-4 h-4" />{" "}
                    </Button>{" "}
                    <Button
                      onClick={() => handleDeleteUser(user.id)}
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 hover:text-red-700"
                    >
                      {" "}
                      <Trash2 className="w-4 h-4" />{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>
              )}{" "}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-surface rounded-lg border border-border">
            {" "}
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />{" "}
            <h3 className="font-semibold text-foreground mb-1">
              {" "}
              No users found{" "}
            </h3>{" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              {users.length === 0
                ? "Add your first user to get started."
                : "No users match your current filters."}{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
