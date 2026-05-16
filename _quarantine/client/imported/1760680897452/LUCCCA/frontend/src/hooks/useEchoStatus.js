import { useState, useEffect } from 'react';

export function useEchoStatus() {
  const [status, setStatus] = useState('offline');

  useEffect(() => {
    fetch('http://localhost:5000/api/echo/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.message === 'Echo AI Core Operational.') {
          setStatus('online');
        }
      })
      .catch(() => setStatus('offline'));
  }, []);

  return status;
}
