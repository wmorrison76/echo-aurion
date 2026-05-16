// useAuditTrailEngine.js
// Hook for accessing the audit trail engine.

import { useContext } from 'react';
import { AuditTrailContext } from './AuditTrailContext';
export default function useAuditTrailEngine() {
  return useContext(AuditTrailContext);
}
