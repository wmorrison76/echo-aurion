import { useState, useEffect } from 'react';
import { fetchEchoStatus } from '../utils/fetchEchoStatus';

export function useEchoStatus() {
  const [status, setStatus] = useState('offline');

  useEffect(() => {
    fetchEchoStatus().then(setStatus);
  }, []);

  return status;
}
