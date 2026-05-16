// File: frontend/src/components/AdminPanel.jsx

import React, { useState } from 'react';
import { AdminPanelNav } from './AdminPanelNav';
import { AdminPanelGrid } from './AdminPanelGrid';
import { AdminModuleToggle } from './AdminModuleToggle';
import { Routes, Route } from 'react-router-dom';
import UserRoleManager from './UserRoleManager';
import useModuleToggleSync from '../hooks/useModuleToggleSync';
import OverrideVault from './OverrideVault';
import OverrideUnlock from './OverrideUnlock';
import DownloadOverridePDF from './DownloadOverridePDF';

// Roles and Permissions Definitions
const roles = {
  superAdmin: [
    'Recipes', 'Scheduling', 'CRM & Client Tracker', 'Echo AI',
    'Argus Monitor', 'Zelda Master', 'Red Phoenix', "Odin's Spear",
    'Cake Builder Admin', 'Offline Mode Control', 'Standalone Module License Entry',
    'User Role Manager', 'OverrideVault'
  ],
  admin: [
    'Recipes', 'Scheduling', 'CRM & Client Tracker', 'Echo AI',
    'Argus Monitor', 'Offline Mode Control'
  ],
  standaloneUser: [
    'Recipes', 'Cake Builder Admin', 'Standalone Module License Entry'
  ],
  viewer: ['Recipes', 'Scheduling']
};

const currentUserRole = 'superAdmin'; // This will later be dynamically pulled from user profile session

export default function AdminPanel() {
  const visibleModules = roles[currentUserRole] || [];
  const { moduleStates, toggleModule } = useModuleToggleSync();

  const groupedModules = {
    'Core Modules': ['Recipes', 'Scheduling', 'CRM & Client Tracker'],
    'AI Suite': ['Echo AI', 'Argus Monitor', 'Zelda Master', 'Red Phoenix', "Odin's Spear"],
    'Standalone Features': ['Cake Builder Admin', 'Offline Mode Control', 'Standalone Module License Entry'],
    'Admin Tools': ['User Role Manager', 'OverrideVault']
  };

  return (
    <div className="bg-white min-h-screen font-sans shadow-md rounded-lg border border-gray-200 overflow-hidden">
      <AdminPanelNav />
      <div className="p-6">
        <h1 className="text-3xl font-semibold mb-6 text-gray-900 tracking-tight">LUCCCA Admin Panel</h1>

        {Object.entries(groupedModules).map(([category, modules]) => (
          <div key={category} className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">{category}</h2>
            <AdminPanelGrid>
              {modules.map((moduleName) => (
                visibleModules.includes(moduleName) && (
                  <AdminModuleToggle
                    key={moduleName}
                    moduleName={moduleName}
                    defaultEnabled={moduleStates[moduleName] ?? true}
                    onToggle={() => toggleModule(moduleName)}
                  />
                )
              ))}
            </AdminPanelGrid>
          </div>
        ))}
      </div>

      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/roles" element={<UserRoleManager />} />
        <Route path="/admin/override" element={<OverrideVault />} />
        <Route path="/admin/unlock" element={<OverrideUnlock />} />
        <Route path="/admin/instructions" element={<DownloadOverridePDF />} />
      </Routes>
    </div>
  );
}
