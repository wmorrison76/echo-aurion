// File: EchoControlPanel.jsx
// Centralized system control panel with theme, avatar, and system toggles

import React from 'react';
import EchoAvatarSelect from '../components/interaction/EchoAvatarSelect';
import EchoNotificationBell from '../components/panels/EchoNotificationBell';

const EchoControlPanel = () => {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold text-cyan-500">Echo Control Panel</h2>
      <EchoAvatarSelect />
      <EchoNotificationBell />
    </div>
  );
};

export default EchoControlPanel;