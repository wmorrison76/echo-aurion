// AccessControlPanel.jsx
import React from 'react';
import { useRBAC } from './RBACProvider';

/**
 * Panel to manage roles and permissions.
 */
const AccessControlPanel = () => {
  const { roles, setRoles } = useRBAC();

  const toggleRole = (role) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="access-control-panel">
      <h3>Access Control</h3>
      <button onClick={() => toggleRole('admin')}>
        Toggle Admin (Current: {roles.includes('admin') ? 'Yes' : 'No'})
      </button>
    </div>
  );
};

export default AccessControlPanel;
