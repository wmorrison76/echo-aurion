import React from 'react';
import { useSystemStatus } from '../hooks/useSystemStatus';

export function SystemStatusDisplay() {
  const status = useSystemStatus();

  return (
    <div className="system-status-display">
      <h3>{status.system}</h3>
      <p>Status: {status.status}</p>
    </div>
  );
}
