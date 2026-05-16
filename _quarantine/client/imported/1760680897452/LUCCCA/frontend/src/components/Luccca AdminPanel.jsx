import React from 'react';
import { EchoResponsePanel } from './EchoResponsePanel';
import { StatusIndicator } from './StatusIndicator';

export function LucccaAdminPanel() {
  return (
    <div className="admin-panel">
      <h1>LUCCCA Admin Panel</h1>
      <StatusIndicator status="online" />
      <EchoResponsePanel />
    </div>
  );
}
