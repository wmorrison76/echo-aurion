import { useState, useEffect } from 'react';
import { fetchSystemStatus } from '../utils/apiClient';

export function useSystemStatus() {
  const [status, setStatus] = useState({ system: '', status: '' });

  useEffect(() => {
    fetchSystemStatus().then(setStatus);
  }, []);

  return status;
}
