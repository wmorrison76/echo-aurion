/**
 * User Management Panel
 *
 * PURPOSE:
 *   - Create and manage users
 *   - Assign roles, outlets, departments
 *   - Activate/deactivate accounts
 *   - Integration with EcosystemControlPanel tabs
 *
 * INTEGRATION:
 *   - Rendered as "Users" tab in EcosystemControlPanel
 *   - Uses useAccessStore for roles, outlets, departments
 *   - Uses useUserStore for user CRUD operations
 */

import React, { useState } from "react";
import { create } from "zustand";
import { useAccessStore } from "./EcosystemControlPanel";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/glass";

/**
 * User Interface
 */
export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  outlets: string[];
  departments: string[];
  active: boolean;
  createdAt: Date;
  credentialsSent?: boolean;
  credentialsSentAt?: Date;
  temporaryPassword?: string;
}

/**
 * User Store
 */
export const useUserStore = create((set) => ({
  users: [] as User[],

  createUser: (user: Omit<User, "id" | "active" | "createdAt">) => {
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      active: true,
      createdAt: new Date(),
    };
    set((state) => ({ users: [...state.users, newUser] }));
    return newUser;
  },

  updateUser: (id: string, patch: Partial<User>) => {
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  },

  toggleActive: (id: string) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === id ? { ...u, active: !u.active } : u
      ),
    }));
  },

  deleteUser: (id: string) => {
    set((state) => ({
      users: state.users.filter((u) => u.id !== id),
    }));
  },

  generateTemporaryPassword: (id: string) => {
    const password = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    set((state) => ({
      users: state.users.map((u) =>
        u.id === id
          ? {
              ...u,
              temporaryPassword: password,
              credentialsSent: true,
              credentialsSentAt: new Date(),
            }
          : u
      ),
    }));
    return password;
  },
}));

/**
 * User Management Panel Component
 */
export default function UserManagementPanel() {
  const roles = useAccessStore((s) => s.roles);
  const outlets = useAccessStore((s) => s.outlets);
  const departments = useAccessStore((s) => s.departments);
  const users = useUserStore((s) => s.users);
  const createUser = useUserStore((s) => s.createUser);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    roleId: "",
    outlets: [] as string[],
    departments: [] as string[],
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleOutlet = (outlet: string) => {
    setFormData((prev) => ({
      ...prev,
      outlets: prev.outlets.includes(outlet)
        ? prev.outlets.filter((o) => o !== outlet)
        : [...prev.outlets, outlet],
    }));
  };

  const toggleDepartment = (dept: string) => {
    setFormData((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.roleId) {
      return;
    }

    createUser({
      name: formData.name,
      email: formData.email,
      roleId: formData.roleId,
      outlets: formData.outlets,
      departments: formData.departments,
    });

    setFormData({
      name: "",
      email: "",
      roleId: "",
      outlets: [],
      departments: [],
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setShowForm(false);
  };

  const isFormValid =
    formData.name.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.roleId.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Users</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage user accounts and their role assignments.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            showForm
              ? "bg-slate-200 text-slate-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
          <div className="w-2 h-2 bg-green-600 rounded-full" />
          <p className="text-sm font-medium text-green-900">
            User created successfully!
          </p>
        </div>
      )}

      {/* Create User Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Create New User</h3>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role *
            </label>
            <select
              value={formData.roleId}
              onChange={(e) => handleInputChange("roleId", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} (Level {role.level})
                </option>
              ))}
            </select>
          </div>

          {/* Outlets */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Outlets (Multi-select)
            </label>
            <div className="flex flex-wrap gap-2">
              {outlets.map((outlet: any) => (
                <button
                  key={outlet.id}
                  onClick={() => toggleOutlet(outlet.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.outlets.includes(outlet.id)
                      ? "bg-blue-600 text-white border border-blue-600"
                      : "bg-white text-slate-900 border border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {formData.outlets.includes(outlet.id) && (
                    <span className="mr-1">✓</span>
                  )}
                  {outlet.name}
                </button>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Departments (Multi-select)
            </label>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => toggleDepartment(dept)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.departments.includes(dept)
                      ? "bg-blue-600 text-white border border-blue-600"
                      : "bg-white text-slate-900 border border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {formData.departments.includes(dept) && (
                    <span className="mr-1">✓</span>
                  )}
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isFormValid
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            >
              Create User
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <UsersList />
    </div>
  );
}

/**
 * Users List Component
 */
function UsersList() {
  const users = useUserStore((s) => s.users);
  const toggleActive = useUserStore((s) => s.toggleActive);
  const deleteUser = useUserStore((s) => s.deleteUser);
  const updateUser = useUserStore((s) => s.updateUser);
  const roles = useAccessStore((s) => s.roles);

  const getRoleName = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.name || "Unknown";

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No users yet. Create your first user above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className={cn(
            "flex items-center justify-between p-4 rounded-lg border transition-colors",
            user.active
              ? "bg-white border-slate-200 hover:border-slate-300"
              : "bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex-1">
            <p
              className={cn(
                "font-medium",
                user.active ? "text-slate-900" : "text-slate-600"
              )}
            >
              {user.name}
            </p>
            <p className="text-sm text-slate-600">{user.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              {getRoleName(user.roleId)} • {user.outlets.join(", ") || "No outlets"} • {user.departments.join(", ") || "No departments"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                user.active
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {user.active ? "Active" : "Inactive"}
            </span>

            {/* Toggle Active */}
            <button
              onClick={() => toggleActive(user.id)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title={user.active ? "Deactivate user" : "Activate user"}
            >
              {user.active ? (
                <ToggleRight className="w-5 h-5 text-green-600" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {/* Delete */}
            <button
              onClick={() => deleteUser(user.id)}
              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete user"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
