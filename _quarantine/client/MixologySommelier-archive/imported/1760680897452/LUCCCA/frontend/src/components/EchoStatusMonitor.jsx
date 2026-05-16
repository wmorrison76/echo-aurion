import React from 'react';
import { useEchoStatus } from '../hooks/useEchoStatus';

export function EchoStatusMonitor() {
  const status = useEchoStatus();

  return (
    <div className="echo-status-monitor">
      <h3>Echo AI Status:</h3>
      <p>{status === 'online' ? 'Online and Responsive' : 'Offline or Unreachable'}</p>
    </div>
  );
}
