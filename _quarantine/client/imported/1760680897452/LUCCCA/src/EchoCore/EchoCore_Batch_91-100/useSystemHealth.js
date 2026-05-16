// useSystemHealth.js
import { useEffect, useState } from 'react';
import SystemHealthMonitor from './SystemHealthMonitor';

/**
 * Hook to monitor system health.
 */
export default function useSystemHealth() {
  const [status, setStatus] = useState('OK');

  useEffect(() => {
    const monitor = new SystemHealthMonitor();
    setStatus(monitor.getStatus());
  }, []);

  return status;
}
