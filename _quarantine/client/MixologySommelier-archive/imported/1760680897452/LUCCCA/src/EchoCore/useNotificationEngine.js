// useNotificationEngine.js
// Hook for accessing the notification engine.

import { useContext } from 'react';
import { NotificationContext } from './NotificationContext';
export default function useNotificationEngine() {
  return useContext(NotificationContext);
}
