// useSystemHealth.js
// Hook to consume system health context.

import { useContext } from 'react';
import { SystemHealthContext } from './SystemHealthContext';
export default function useSystemHealth() {
  return useContext(SystemHealthContext);
}
