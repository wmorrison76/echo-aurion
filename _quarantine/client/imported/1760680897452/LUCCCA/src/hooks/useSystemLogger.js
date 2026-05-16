import { useEffect } from 'react';
import { logSystemEvent } from '../utils/logger';

export function useSystemLogger(message) {
  useEffect(() => {
    if (message) {
      logSystemEvent(message);
    }
  }, [message]);
}
