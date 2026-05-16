// File: frontend/src/components/UserRoleManager.jsx

import React, { useState } from 'react';

const allPermissions = [
  'Recipes', 'Scheduling', 'CRM & Client Tracker', 'Echo AI',
  'Argus Monitor', 'Zelda Master', 'Red Phoenix', "Odin's Spear",
  'Cake Builder Admin', 'Offline Mode Control', 'Standalone Module License Entry'
];

const defaultRoles = {
  superAdmin: [...allPermissions],
  admin: ['Recipes', 'Scheduling', 'CRM & Client Tracker', 'Echo AI', 'Argus Monitor', 'Offline Mode Control'],
  standaloneUser: ['Recipes', 'Cake Builder Admin', 'Standalone Module License Entry'],
  viewer: ['Recipes', 'Scheduling']
};

export default function UserRoleManager() {
  const [roles, setRoles] = useState(defaultRoles);

  const handlePermissionChange = (role, permission) => {
    setRoles((prevRoles) => {
      const updatedPermissions = prevRoles[role].includes(permission)
        ? prevRoles[role].filter((p) => p !== permission)
        : [...prevRoles[role], permission];
      return { ...prevRoles, [role]: updatedPermissions };
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">User Role Manager</h2>
      {Object.keys(roles).map((role) => (
        <div key={role} className="mb-6">
          <h3 className="text-xl font-semibold mb-2 capitalize">{role}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {allPermissions.map((permission) => (
              <label key={permission} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={roles[role].includes(permission)}
                  onChange={() => handlePermissionChange(role, permission)}
                />
                <span>{permission}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
