import React from 'react';
import { AuthProvider } from './AuthContext';
import { ScheduleProvider } from './ScheduleContext';
// Import other contexts as we create them

/**
 * Combines all context providers
 * Only the contexts needed for a route will actually load
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ScheduleProvider>
        {/* Add other providers here */}
        {children}
      </ScheduleProvider>
    </AuthProvider>
  );
}

