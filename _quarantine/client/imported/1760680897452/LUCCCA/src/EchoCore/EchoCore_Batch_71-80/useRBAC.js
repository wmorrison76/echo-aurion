// useRBAC.js
import { useContext } from 'react';
import { RBACContext } from './RBACProvider';

/**
 * Hook for accessing RBAC context.
 */
export default function useRBAC() {
  return useContext(RBACContext);
}
