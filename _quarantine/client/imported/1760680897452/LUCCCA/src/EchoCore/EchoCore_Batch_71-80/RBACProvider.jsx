// RBACProvider.jsx
import React, { createContext, useContext, useState } from 'react';

/**
 * Provides Role-Based Access Control (RBAC) context.
 */
const RBACContext = createContext();

export const useRBAC = () => useContext(RBACContext);

const RBACProvider = ({ children }) => {
  const [roles, setRoles] = useState([]);

  const hasPermission = (role) => roles.includes(role);

  return (
    <RBACContext.Provider value={{ roles, setRoles, hasPermission }}>
      {children}
    </RBACContext.Provider>
  );
};

export default RBACProvider;
