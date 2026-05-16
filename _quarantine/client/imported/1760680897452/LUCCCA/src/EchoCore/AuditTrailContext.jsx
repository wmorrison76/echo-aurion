// AuditTrailContext.jsx
// React context for audit trail data.

import React, { createContext, useContext } from 'react';
export const AuditTrailContext = createContext(null);
export const useAuditTrail = () => useContext(AuditTrailContext);
