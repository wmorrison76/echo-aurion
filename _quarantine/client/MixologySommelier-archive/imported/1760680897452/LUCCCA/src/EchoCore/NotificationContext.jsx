// NotificationContext.jsx
// React context for global notification system.

import React, { createContext, useContext } from 'react';
export const NotificationContext = createContext(null);
export const useNotification = () => useContext(NotificationContext);
