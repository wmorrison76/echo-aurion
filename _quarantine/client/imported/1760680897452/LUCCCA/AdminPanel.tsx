import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export const AdminPanel = ({ onSave }) => {
  const [permissions, setPermissions] = useState({ alerts: true, rbac: true });

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="w-5 h-5" /> Admin Permissions
      </h2>
      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={permissions.alerts}
            onChange={() => togglePermission('alerts')}
          />
          Alerts Enabled
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={permissions.rbac}
            onChange={() => togglePermission('rbac')}
          />
          Role-Based Access Control
        </label>
      </div>
      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => onSave(permissions)}
      >
        Save Settings
      </button>
    </motion.div>
  );
};