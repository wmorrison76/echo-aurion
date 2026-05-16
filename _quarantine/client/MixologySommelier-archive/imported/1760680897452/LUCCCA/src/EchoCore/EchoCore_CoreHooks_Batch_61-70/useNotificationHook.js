// useNotificationHook.js
import { useState } from 'react';

/**
 * Hook for in-app notifications.
 */
export default function useNotificationHook() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message) =>
    setNotifications((prev) => [...prev, { id: Date.now(), message }]);

  const removeNotification = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  return { notifications, addNotification, removeNotification };
}
