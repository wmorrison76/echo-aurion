// SystemHealthContext.jsx
// Context for system health data.

import React, { createContext, useContext } from 'react';
export const SystemHealthContext = createContext(null);
export const useSystemHealth = () => useContext(SystemHealthContext);
